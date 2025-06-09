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
import connectPgSimple from 'connect-pg-simple';
import { storage } from './storage.js';

// Use the shared storage instance to prevent database conflicts

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

// Client creation schema
const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  description: z.string().optional(),
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
  console.log('🔧 Configuring session middleware...');
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
  console.log('🔧 SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
  console.log('🔧 DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  const sessionConfig: any = {
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
  };

  // Use PostgreSQL session store in production
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    console.log('🔧 Using PostgreSQL session store for production');
    const pgStore = connectPgSimple(session);
    sessionConfig.store = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: 7 * 24 * 60 * 60, // 1 week in seconds
      tableName: 'user_sessions', // REF: Use different table name to avoid conflict with app's sessions table
    });
  } else {
    console.log('🔧 Using in-memory session store for development');
  }
  
  return session(sessionConfig);
}

// Authentication middleware
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = (req as any).session;
  
  console.log('🔍 Auth middleware - Session check:', {
    hasSession: !!session,
    sessionId: session?.id,
    userId: session?.userId,
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  
  if (!session || !session.userId) {
    console.log('❌ Auth middleware - No session or userId');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Get user from database
  storage.getUser(session.userId).then(user => {
    if (!user) {
      console.log('❌ Auth middleware - User not found in database:', session.userId);
      session.destroy();
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    console.log('✅ Auth middleware - User authenticated:', user.email);
    // Add user to request object
    (req as any).user = user;
    next();
  }).catch(err => {
    console.error('❌ Auth middleware error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });
}

// Optional authentication middleware
export function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = (req as any).session;
  
  if (session && session.userId) {
    storage.getUser(session.userId).then(user => {
      if (user) {
        (req as any).user = user;
      }
      next();
    }).catch(err => {
      console.error('Optional auth error:', err);
      next();
    });
  } else {
    next();
  }
}

// Create default client for new user
async function createDefaultClient(userId: string): Promise<Client> {
  const client = await storage.createClient({
    userId,
    name: 'Default',
    description: 'Default workspace',
  });
  
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

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
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
          // Check if user exists with this OAuth provider and ID
          let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
          
          if (!user) {
            // Create new user
            const email = profile.emails?.[0]?.value || `google_${profile.id}@noemail.com`;
            user = await storage.createUser({
              id: generateUserId(),
              email,
              firstName: profile.name?.givenName || 'Google',
              lastName: profile.name?.familyName || 'User',
              oauthProvider: 'google',
              oauthId: profile.id,
              profileImageUrl: profile.photos?.[0]?.value,
            });
            
            // Create default client for new user
            await createDefaultClient(user.id);
          } else if (!user.oauthProvider) {
            // Link existing user to OAuth
            user = await storage.updateUser(user.id, {
              oauthProvider: 'google',
              oauthId: profile.id,
              profileImageUrl: profile.photos?.[0]?.value,
            });
          }

          done(null, user);
        } catch (err) {
          console.error('OAuth strategy error:', err);
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
    // Check if test user already exists
    storage.getUserByEmail('test@example.com').then(async (existingUser) => {
      if (!existingUser) {
        const testUser = await storage.createUser({
          id: 'user_test_123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: '$2b$12$BrkeuBkvqBPI1Q74KlLkyupQsfVAk1TSGqBNIGRKqh4ZADjpRhT.6', // password: 'password123'
        });
        
        await createDefaultClient(testUser.id);
        console.log('✅ Test user created for development');
      }
    }).catch(err => {
      console.error('Failed to create test user:', err);
    });
  }
  
  // Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      console.log('📝 Processing signup request...');
      const body = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(body.email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Account with this email already exists' 
        });
      }
      
      // Create new user
      const passwordHash = await hashPassword(body.password);
      const user = await storage.createUser({
        id: generateUserId(),
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash,
      });
      
      // Create default client for new user
      await createDefaultClient(user.id);
      
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
      const user = await storage.getUserByEmail(body.email);
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
      
      // Explicitly save session to ensure it's persisted to PostgreSQL
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('❌ Session save error during login:', err);
          return res.status(500).json({ success: false, message: 'Session save failed' });
        }
        
        console.log('✅ User logged in successfully and session saved:', user.email);
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
        });
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
    storage.getClientsByUser(user.id).then(clients => {
      res.json(clients); // Return clients array directly, not wrapped in object
    }).catch(err => {
      console.error('Error getting user clients:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    });
  });

  // Create new client endpoint
  app.post('/api/clients', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Validate client data
      const validatedData = createClientSchema.parse(req.body);
      
      const client = await storage.createClient({
        ...validatedData,
        userId
      });
      
      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create client' });
      }
    }
  });

  // Get current client endpoint
  app.get('/api/current-client', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Get current client from session or default to first client
      let currentClientId = (req as any).session.currentClientId;
      
      if (!currentClientId) {
        // Default to the first/default client
        const clients = await storage.getClientsByUser(userId);
        const defaultClient = clients.find(c => c.name === 'Default') || clients[0];
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req as any).session.currentClientId = currentClientId;
        }
      }
      
      if (!currentClientId) {
        return res.status(404).json({ message: 'No client found' });
      }
      
      const clients = await storage.getClientsByUser(userId);
      const client = clients.find(c => c.id === currentClientId);
      
      if (!client) {
        // Clear invalid session and get default
        delete (req as any).session.currentClientId;
        const defaultClient = clients.find(c => c.name === 'Default') || clients[0];
        if (defaultClient) {
          (req as any).session.currentClientId = defaultClient.id;
          return res.json(defaultClient);
        }
        return res.status(404).json({ message: 'No valid client found' });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error fetching current client:', error);
      res.status(500).json({ message: 'Failed to fetch current client' });
    }
  });

  // Switch client endpoint
  app.post('/api/switch-client/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const clientId = parseInt(req.params.id);
      
      // Verify client ownership
      const clients = await storage.getClientsByUser(userId);
      const client = clients.find(c => c.id === clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Update session with new current client
      (req as any).session.currentClientId = clientId;
      
      res.json({ 
        message: 'Client switched successfully', 
        client: client 
      });
    } catch (error) {
      console.error('Error switching client:', error);
      res.status(500).json({ message: 'Failed to switch client' });
    }
  });
  
  console.log('✅ Auth: Simple authentication system configured');
}

// Development helper endpoint to create a session with test user
function createDevLoginEndpoint(app: express.Express) {
  app.get('/api/dev-login', async (req: any, res) => {
    try {
      console.log('🔧 DEV: Creating session with test user...');
      
      // Get test user from database
      const testUser = await storage.getUserByEmail('test@example.com');
      if (!testUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Test user not found. Please restart server to create test user.' 
        });
      }
      
      // Create session
      (req as any).session.userId = testUser.id;
      
      console.log('✅ DEV: Session created with test user:', testUser.email);
      res.json({ 
        success: true, 
        message: 'Development session created',
        user: { 
          id: testUser.id, 
          email: testUser.email, 
          firstName: testUser.firstName, 
          lastName: testUser.lastName 
        } 
      });
      
    } catch (error) {
      console.error('❌ DEV: Login error:', error);
      res.status(500).json({ success: false, message: 'Development login failed' });
    }
  });
}

function noOpDevLogin(app: express.Express) {
  // No-op in production
}

export const addDevLoginEndpoint = process.env.NODE_ENV === 'development' ? createDevLoginEndpoint : noOpDevLogin;

// Export for use in other modules
export { User, Client }; 