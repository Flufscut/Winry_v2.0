/**
 * FILE: auth-multi-user.ts
 * PURPOSE: Complete multi-user authentication system with signup/login capabilities
 * DEPENDENCIES: express, bcrypt, passport, oauth strategies
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Replaces auth-local.ts with full multi-user authentication
 * REF: Supports username/password and OAuth (Google/Outlook) authentication
 * REF: Maintains session management and user registration
 */

import type { Express, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto";

// REF: Authentication configuration
const AUTH_CONFIG = {
  sessionSecret: process.env.SESSION_SECRET || 'winry-ai-session-secret-' + Date.now(),
  saltRounds: 12,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/auth/google/callback"
  }
};

// REF: Validation schemas for authentication
const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignupData = z.infer<typeof signupSchema>;
type LoginData = z.infer<typeof loginSchema>;

// REF: Enhanced session configuration for production-ready authentication
export function getSession() {
  return session({
    secret: AUTH_CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax'
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
  return 'user_' + crypto.randomBytes(16).toString('hex');
}

// REF: Setup Passport strategies
function setupPassportStrategies() {
  // REF: Local username/password strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
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
  if (AUTH_CONFIG.google.clientId && AUTH_CONFIG.google.clientSecret) {
    passport.use(new GoogleStrategy({
      clientID: AUTH_CONFIG.google.clientId,
      clientSecret: AUTH_CONFIG.google.clientSecret,
      callbackURL: AUTH_CONFIG.google.callbackURL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // REF: Check if user already exists
        let user = await storage.getUserByEmail(email);
        
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
          
          user = await storage.createUser(newUser);
          
          // REF: Create default client for new user
          await storage.createClient({
            userId: user.id,
            name: 'Default',
            description: 'Default workspace',
            isActive: true,
          });
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
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// REF: Main authentication setup function
export async function setupAuth(app: Express) {
  // REF: Configure session management
  app.use(getSession());
  
  // REF: Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // REF: Setup authentication strategies
  setupPassportStrategies();

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
      const existingUser = await storage.getUserByEmail(email);
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
      const userId = crypto.randomUUID();
      const newUser = await storage.createUser({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        oauthProvider: null,
        oauthId: null,
        profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + " " + lastName)}&background=7C3AED&color=ffffff`,
        preferences: JSON.stringify({}),
      });

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
      const user = await storage.getUserByEmail(email);
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
  app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // GET /auth/google/callback - Google OAuth callback
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
    (req, res) => {
      // REF: Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

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
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    const user = (req as any).user;
    res.json({
      id: user.claims.sub,
      email: user.claims.email,
      firstName: user.claims.first_name,
      lastName: user.claims.last_name,
      profileImageUrl: user.claims.profile_image_url
    });
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
  if (req.isAuthenticated()) {
    // REF: Convert user to expected format for existing code compatibility
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
    return next();
  }
  
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
      const existingUser = await storage.getUserByEmail(email);
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
      const userId = crypto.randomUUID();
      const newUser = await storage.createUser({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        oauthProvider: null,
        oauthId: null,
        profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + " " + lastName)}&background=7C3AED&color=ffffff`,
        preferences: JSON.stringify({}),
      });

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
      const user = await storage.getUserByEmail(email);
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