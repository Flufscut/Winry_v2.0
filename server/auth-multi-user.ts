/**
 * FILE: auth-multi-user.ts
 * PURPOSE: Production-ready authentication system with unified database
 * DEPENDENCIES: passport, express-session, bcrypt, ./db.ts (unified database)
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Multi-user authentication supporting manual signup/login and OAuth
 * REF: Uses unified database system for both development and production
 * REF: Production-ready with proper session storage and PostgreSQL support
 */

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// REF: Import unified database system and schema
import { getDatabase } from './db.js';
import * as sharedSchema from '@shared/schema.js';

// REF: Production-ready authentication configuration
const AUTH_CONFIG = {
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
  baseUrl: process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'https://winry-ai-production.up.railway.app'
    : 'http://localhost:5001',
  saltRounds: 12,
};

// REF: Validation schemas
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

// REF: Database and schema references
let db: any;
let users: any;
let clients: any;
let isInitialized = false;

// REF: Initialize authentication database connection
async function initializeAuthDatabase() {
  if (isInitialized) {
    return;
  }

  try {
    console.log('🔄 Auth: Initializing unified database system...');
    
    // REF: Use unified database system from db.ts
    db = await getDatabase();
    users = sharedSchema.users;
    clients = sharedSchema.clients;
    
    isInitialized = true;
    console.log('✅ Auth: Unified database system initialized successfully');
  } catch (error) {
    console.error('❌ Auth: Failed to initialize database:', error);
    throw error;
  }
}

// REF: Auto-initialize on module load
const authInitPromise = initializeAuthDatabase();

/**
 * REF: Production-ready session configuration
 * PURPOSE: Provides persistent session storage suitable for production deployment
 */
export function getSession() {
  return session({
    secret: AUTH_CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: true, // REF: Create session for tracking auth state
    rolling: true, // REF: Reset session expiry on each request
    name: 'winry.sid', // REF: Custom session name for security
    cookie: {
      httpOnly: true,
      secure: AUTH_CONFIG.isProduction, // REF: HTTPS only in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // REF: 1 week
      sameSite: 'lax', // REF: Balance security and functionality
      path: '/', // REF: Available across entire application
    },
  });
}

// REF: Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// REF: Generate secure user ID
export function generateUserId(): string {
  return 'user_' + randomUUID();
}

// REF: Setup Passport strategies
function setupPassportStrategies() {
  // REF: Local username/password strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const userResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = userResults[0];
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: 'Please use social login or reset your password' });
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // REF: Google OAuth strategy (if configured)
  if (AUTH_CONFIG.googleClientId && AUTH_CONFIG.googleClientSecret) {
    passport.use(new GoogleStrategy({
      clientID: AUTH_CONFIG.googleClientId,
      clientSecret: AUTH_CONFIG.googleClientSecret,
      callbackURL: AUTH_CONFIG.baseUrl + '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // REF: Check if user already exists
        const userResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
        let user = userResults[0];
        
        if (!user) {
          // REF: Create new user from Google profile
          const newUser = {
            id: generateUserId(),
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value || null,
            oauthProvider: 'google',
            oauthId: profile.id,
          };
          
          [user] = await db.insert(users).values(newUser).returning();
          
          // REF: Create default client for new user
          await db.insert(clients).values({
            userId: user.id,
            name: 'Default',
            description: 'Default workspace',
            isActive: true, // REF: Use boolean for PostgreSQL compatibility
          }).returning({ id: clients.id });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
    ));
  }

  // REF: Session serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const userResults = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const user = userResults[0];
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// REF: Main authentication setup function
export async function setupAuth(app: Express) {
  // REF: CRITICAL - Ensure database is initialized before setting up authentication
  console.log('🔄 Auth: Waiting for database initialization...');
  await authInitPromise;
  console.log('✅ Auth: Database initialization completed');
  
  // REF: Configure session management
  app.use(getSession());
  
  // REF: Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // REF: Setup authentication strategies AFTER database is ready
  console.log('🔄 Auth: Setting up Passport strategies...');
  setupPassportStrategies();
  console.log('✅ Auth: Passport strategies configured');

  // REF: Authentication routes
  
  // POST /auth/signup - User registration
  app.post('/auth/signup', async (req, res) => {
    try {
      console.log('📝 Processing signup request...');
      
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: validationResult.error.issues,
        });
      }

      const { firstName, lastName, email, password } = validationResult.data;

      // REF: Check if user already exists
      const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      // REF: Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // REF: Create new user
      const userId = randomUUID();
      const [newUser] = await db.insert(users).values({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        oauthProvider: null,
        oauthId: null,
        profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + " " + lastName)}&background=7C3AED&color=ffffff`,
        preferences: JSON.stringify({}),
      }).returning();

      // REF: Create default client for new user
      await db.insert(clients).values({
        userId: newUser.id,
        name: 'Default',
        description: 'Default workspace',
        isActive: true, // REF: Use boolean for PostgreSQL compatibility
      }).returning({ id: clients.id });

      // REF: Create session
      (req.session as any).user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
      };

      console.log(`✅ User created successfully: ${email}`);
      
      res.json({
        success: true,
        message: "Account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileImageUrl: newUser.profileImageUrl,
        },
      });

    } catch (error) {
      console.error('❌ Signup error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error during signup",
      });
    }
  });

  // POST /auth/login - User login
  app.post('/auth/login', async (req, res) => {
    try {
      console.log('🔑 Processing login request...');
      
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: validationResult.error.issues,
        });
      }

      const { email, password } = validationResult.data;

      // REF: Find user by email
      const userResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = userResults[0];
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // REF: Check if user has a password (OAuth users might not)
      if (!user.passwordHash) {
        return res.status(401).json({
          success: false,
          message: "This account was created with social login. Please sign in with the original method.",
        });
      }

      // REF: Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // REF: Create session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };

      console.log(`✅ User logged in successfully: ${email}`);
      
      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error during login",
      });
    }
  });

  // GET /auth/google - Google OAuth login
  app.get('/auth/google', (req, res, next) => {
    console.log('🔑 Google OAuth login initiated');
    console.log('OAuth Config:', {
      hasClientId: !!AUTH_CONFIG.googleClientId,
      hasClientSecret: !!AUTH_CONFIG.googleClientSecret,
      callbackURL: AUTH_CONFIG.baseUrl + '/auth/google/callback'
    });
    
    // REF: Check if Google OAuth is configured
    if (!AUTH_CONFIG.googleClientId || !AUTH_CONFIG.googleClientSecret) {
      return res.status(500).json({
        message: "Google OAuth is not configured on this server"
      });
    }
    
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });

  // GET /auth/google/callback - Google OAuth callback
  app.get('/auth/google/callback', (req, res, next) => {
    console.log('🔄 Google OAuth callback received');
    console.log('Callback URL accessed:', req.url);
    console.log('Query params:', req.query);
    
    // REF: Check if Google OAuth is configured
    if (!AUTH_CONFIG.googleClientId || !AUTH_CONFIG.googleClientSecret) {
      console.log('❌ OAuth not configured, redirecting to login');
      return res.redirect('/login?error=oauth_not_configured');
    }
    
    passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' })(req, res, async (err) => {
      if (err) {
        console.error('Google OAuth callback error:', err);
        return res.redirect('/login?error=oauth_failed');
      }
      
      try {
        const user = req.user as any;
        if (user) {
          // REF: Create default client for new OAuth users
          const existingClients = await db.select().from(clients).where(eq(clients.userId, user.id));
          if (existingClients.length === 0) {
            await db.insert(clients).values({
              userId: user.id,
              name: 'Default',
              description: 'Default workspace',
              isActive: true, // REF: Use boolean for PostgreSQL compatibility
            }).returning({ id: clients.id });
          }
          
          // REF: Set session for proper authentication context
          (req.session as any).user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          };
        }
        
        // REF: Successful authentication, redirect to dashboard immediately
        console.log('✅ OAuth callback success, redirecting to dashboard');
        return res.redirect('/dashboard');
      } catch (error) {
        console.error('OAuth callback processing error:', error);
        res.redirect('/login?error=oauth_processing_failed');
      }
    });
  });

  // POST /auth/logout - User logout
  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Logout failed' 
        });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        
        res.clearCookie('connect.sid'); // Clear session cookie
        res.json({ 
          success: true, 
          message: 'Logged out successfully' 
        });
      });
    });
  });

  // GET /api/auth/user - Get current user
  app.get('/api/auth/user', (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const passportUser = req.user as any;
      
      // REF: Debug session state for production troubleshooting
      console.log('🔒 Authentication check:', {
        hasSession: !!req.session,
        sessionUser: !!sessionUser,
        isAuthenticated: req.isAuthenticated(),
        passportUser: !!passportUser,
        sessionId: (req.session as any)?.id,
        cookies: req.headers.cookie ? 'present' : 'missing'
      });

      // REF: Check session-based authentication first (for login/signup)
      if (sessionUser) {
        return res.json({
          id: sessionUser.id,
          email: sessionUser.email,
          firstName: sessionUser.firstName,
          lastName: sessionUser.lastName,
          profileImageUrl: sessionUser.profileImageUrl
        });
      }

      // REF: Check passport-based authentication (for OAuth)
      if (req.isAuthenticated() && passportUser) {
        return res.json({
          id: passportUser.id,
          email: passportUser.email,
          firstName: passportUser.firstName,
          lastName: passportUser.lastName,
          profileImageUrl: passportUser.profileImageUrl
        });
      }

      // REF: Authentication failed
      console.log('🔒 Authentication failed:', {
        hasSession: !!req.session,
        sessionUser: !!sessionUser,
        isAuthenticated: req.isAuthenticated(),
        passportUser: !!passportUser,
        sessionId: (req.session as any)?.id,
        cookies: req.headers.cookie ? 'present' : 'missing'
      });
      
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    } catch (error) {
      console.error('❌ Auth check error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // GET /api/auth/status - Check authentication status
  app.get('/api/auth/status', (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? {
        id: (req.user as any)?.id,
        email: (req.user as any)?.email,
        firstName: (req.user as any)?.firstName,
        lastName: (req.user as any)?.lastName
      } : null
    });
  });
}

// REF: Authentication middleware for protecting routes
export const isAuthenticated: RequestHandler = (req, res, next) => {
  // REF: Check both Passport authentication and session-based authentication
  const sessionUser = (req.session as any)?.user;
  const passportUser = req.isAuthenticated() ? req.user as any : null;
  
  const user = passportUser || sessionUser;
  
  if (user) {
    // REF: Convert user to expected format for existing code compatibility
    (req as any).user = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl
      }
    };
    return next();
  }
  
  // REF: Add detailed authentication debugging for production
  console.log('🔒 Authentication failed:', {
    hasSession: !!req.session,
    sessionUser: !!sessionUser,
    isAuthenticated: req.isAuthenticated(),
    passportUser: !!passportUser,
    sessionId: req.sessionID,
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  
  res.status(401).json({ 
    success: false, 
    message: 'Authentication required' 
  });
};

// REF: Optional authentication middleware (doesn't block if not authenticated)
export const optionalAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    (req as any).user = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl
      }
    };
  }
  next();
};

export function setupMultiUserAuth(app: Express): void {
  console.log('🔐 Setting up multi-user authentication system...');

  // REF: Session configuration for multi-user authentication
  app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // REF: User signup endpoint
  app.post("/auth/signup", async (req, res) => {
    try {
      console.log('📝 Processing signup request...');
      
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: validationResult.error.issues,
        });
      }

      const { firstName, lastName, email, password } = validationResult.data;

      // REF: Check if user already exists
      const existingUser = await users.findFirst({ where: eq(users.email, email) });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      // REF: Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // REF: Create new user
      const userId = randomUUID();
      const [newUser] = await db.insert(users).values({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        oauthProvider: null,
        oauthId: null,
        profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + " " + lastName)}&background=7C3AED&color=ffffff`,
        preferences: JSON.stringify({}),
      }).returning();

      // REF: Create session
      (req.session as any).user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
      };

      console.log(`✅ User created successfully: ${email}`);
      
      res.json({
        success: true,
        message: "Account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileImageUrl: newUser.profileImageUrl,
        },
      });

    } catch (error) {
      console.error('❌ Signup error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error during signup",
      });
    }
  });

  // REF: User login endpoint
  app.post("/auth/login", async (req, res) => {
    try {
      console.log('🔑 Processing login request...');
      
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: validationResult.error.issues,
        });
      }

      const { email, password } = validationResult.data;

      // REF: Find user by email
      const userResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = userResults[0];
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // REF: Check if user has a password (OAuth users might not)
      if (!user.passwordHash) {
        return res.status(401).json({
          success: false,
          message: "This account was created with social login. Please sign in with the original method.",
        });
      }

      // REF: Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // REF: Create session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };

      console.log(`✅ User logged in successfully: ${email}`);
      
      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error during login",
      });
    }
  });

  // REF: User logout endpoint
  app.post("/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({
          success: false,
          message: "Error during logout",
        });
      }
      
      res.clearCookie('connect.sid'); // Clear session cookie
      console.log('✅ User logged out successfully');
      
      res.json({
        success: true,
        message: "Logout successful",
      });
    });
  });

  // REF: Get current user endpoint
  app.get("/auth/me", (req, res) => {
    const user = (req.session as any)?.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    res.json({
      success: true,
      user,
    });
  });

  // REF: Check authentication middleware
  app.use((req, res, next) => {
    // REF: Skip auth check for certain routes
    const publicRoutes = [
      '/auth/signup',
      '/auth/login',
      '/auth/logout',
      '/login',
      '/signup',
      '/favicon.ico',
      '/assets/',
      '/api/login', // Keep development login for now
    ];

    const isPublicRoute = publicRoutes.some(route => 
      req.path === route || req.path.startsWith(route)
    );

    if (isPublicRoute) {
      return next();
    }

    // REF: Check if user is authenticated
    const user = (req.session as any)?.user;
    if (!user) {
      // REF: For API routes, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }
      
      // REF: For page routes, redirect to login
      return res.redirect('/login');
    }

    // REF: Add user to request for downstream middleware
    (req as any).user = user;
    next();
  });

  console.log('✅ Multi-user authentication system configured');
} 