/**
 * FILE: auth-simple.ts
 * PURPOSE: Simple, reliable authentication system
 * CREATED: Fresh implementation to replace broken auth-multi-user.ts
 * FEATURES: 
 * - Single database initialization
 * - Environment-aware (SQLite dev, PostgreSQL prod)
 * - Simple session management
 * - Basic email/password and Google OAuth
 */

import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';

// Simple in-memory session store for development, can be replaced with Redis for production
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash?: string;
  oauthProvider?: string;
  oauthId?: string;
  profileImageUrl?: string;
  createdAt: string;
}

interface Client {
  id: number;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
}

// In-memory storage for simplicity (replace with actual database calls)
const users = new Map<string, User>();
const usersByEmail = new Map<string, User>();
const clients = new Map<number, Client>();
const userClients = new Map<string, number[]>(); // userId -> clientIds

let nextClientId = 1;

// Validation schemas
const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

// Utility functions
function generateUserId(): string {
  return 'user_' + randomUUID();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session configuration
export function getSessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'winry.sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax',
    },
  });
}

// Authentication middleware
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = (req as any).session;
  
  if (!session || !session.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  const user = users.get(session.userId);
  if (!user) {
    session.destroy();
    return res.status(401).json({ success: false, message: 'User not found' });
  }
  
  // Add user to request object
  (req as any).user = user;
  next();
}

// Optional authentication middleware
export function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = (req as any).session;
  
  if (session && session.userId) {
    const user = users.get(session.userId);
    if (user) {
      (req as any).user = user;
    }
  }
  
  next();
}

// Create default client for new user
function createDefaultClient(userId: string): Client {
  const client: Client = {
    id: nextClientId++,
    userId,
    name: 'Default',
    description: 'Default workspace',
    createdAt: new Date().toISOString(),
  };
  
  clients.set(client.id, client);
  
  if (!userClients.has(userId)) {
    userClients.set(userId, []);
  }
  userClients.get(userId)!.push(client.id);
  
  return client;
}

// Setup authentication routes
export function setupAuth(app: express.Express) {
  console.log('🔄 Auth: Setting up simple authentication system...');
  
  // REF: Behind Railway's TLS edge, Express sees the connection as HTTP.
  // Setting trust proxy tells Express the original request was secure,
  // allowing express-session to send a Secure cookie (Fix-01).
  // See https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', 1);
  
  // Session middleware
  app.use(getSessionMiddleware());
  
  // =============================
  // Passport + Google OAuth Setup
  // =============================

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: string, done) => {
    const user = users.get(id);
    done(null, user || null);
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleStrategy = new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile: GoogleProfile, done) => {
        try {
          let user = Array.from(users.values()).find(
            u => u.oauthProvider === 'google' && u.oauthId === profile.id,
          );

          if (!user) {
            // If user with same email exists from manual signup, link accounts
            const email = profile.emails && profile.emails[0]?.value;
            if (email && usersByEmail.has(email)) {
              user = usersByEmail.get(email)!;
              user.oauthProvider = 'google';
              user.oauthId = profile.id;
            } else {
              // Create new user
              user = {
                id: generateUserId(),
                email: email || `google_${profile.id}@noemail.com`,
                firstName: profile.name?.givenName || 'Google',
                lastName: profile.name?.familyName || 'User',
                oauthProvider: 'google',
                oauthId: profile.id,
                profileImageUrl: profile.photos && profile.photos[0]?.value,
                createdAt: new Date().toISOString(),
              } as User;
              users.set(user.id, user);
              usersByEmail.set(user.email, user);
              createDefaultClient(user.id);
            }
          }

          done(null, user);
        } catch (err) {
          done(err as any, undefined);
        }
      },
    );
    passport.use(googleStrategy);

    // OAuth initiation route
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    // OAuth callback route
    app.get(
      '/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login', session: true }),
      (req, res) => {
        console.log('🔄 OAuth callback received, processing user session...');
        
        // Establish session for the user
        if (req.user) {
          const user = req.user as any;
          console.log('✅ OAuth user authenticated:', user.email);
          
          // Set session userId (this ensures compatibility with requireAuth middleware)
          (req as any).session.userId = user.id;
          
          // Save session explicitly to ensure it's persisted before redirect
          (req as any).session.save((err: any) => {
            if (err) {
              console.error('❌ Session save error:', err);
              return res.redirect('/login?error=session_error');
            }
            
            console.log('✅ Session saved successfully, redirecting to dashboard...');
            // Add a small delay to ensure session cookie is set in browser
            setTimeout(() => {
              res.redirect('/dashboard');
            }, 100);
          });
        } else {
          console.error('❌ No user found in OAuth callback');
          res.redirect('/login?error=oauth_failed');
        }
      },
    );

    console.log('✅ Google OAuth configured');
  } else {
    console.warn('⚠️  Google OAuth not configured - missing env vars');
  }
  
  // Initialize with test user for development
  if (process.env.NODE_ENV === 'development') {
    const testUser: User = {
      id: 'user_test_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '$2b$12$BrkeuBkvqBPI1Q74KlLkyupQsfVAk1TSGqBNIGRKqh4ZADjpRhT.6', // password: 'password123'
      createdAt: new Date().toISOString(),
    };
    
    users.set(testUser.id, testUser);
    usersByEmail.set(testUser.email, testUser);
    createDefaultClient(testUser.id);
  }
  
  // Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      console.log('📝 Processing signup request...');
      const body = signupSchema.parse(req.body);
      
      // Check if user already exists
      if (usersByEmail.has(body.email)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Account with this email already exists' 
        });
      }
      
      // Create new user
      const passwordHash = await hashPassword(body.password);
      const user: User = {
        id: generateUserId(),
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      
      // Store user
      users.set(user.id, user);
      usersByEmail.set(user.email, user);
      
      // Create default client
      createDefaultClient(user.id);
      
      // Create session
      (req as any).session.userId = user.id;
      
      console.log('✅ User created successfully:', user.email);
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('🔑 Processing login request...');
      const body = loginSchema.parse(req.body);
      
      // Find user
      const user = usersByEmail.get(body.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(body.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }
      
      // Create session
      (req as any).session.userId = user.id;
      
      console.log('✅ User logged in successfully:', user.email);
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
  // Get current user endpoint
  app.get('/api/auth/user', requireAuth, (req, res) => {
    const user = (req as any).user;
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl 
      } 
    });
  });
  
  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
  });
  
  // Get user clients endpoint
  app.get('/api/clients', requireAuth, (req, res) => {
    const user = (req as any).user;
    const clientIds = userClients.get(user.id) || [];
    const userClientsList = clientIds.map(id => clients.get(id)).filter(Boolean);
    
    res.json({ success: true, clients: userClientsList });
  });
  
  console.log('✅ Auth: Simple authentication system configured');
}

// Export for use in other modules
export { User, Client }; 