import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Simple session configuration for local development
export function getSession() {
  return session({
    secret: 'local-dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for local HTTP
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

// REF: Mock user for local development
const mockUser = {
  id: 'local-dev-user',
  email: 'dev@local.com',
  firstName: 'Local',
  lastName: 'Developer',
  profileImageUrl: null,
};

export async function setupAuth(app: Express) {
  // REF: Configure session management for local development
  app.use(getSession());

  // REF: Ensure mock user exists in database for development
  try {
    const existingUser = await storage.getUser(mockUser.id);
    if (existingUser) {
      console.log('✓ Mock user already exists for local development');
    } else {
      await storage.upsertUser(mockUser);
      console.log('✓ Mock user created for local development');
    }
    
    // REF: Ensure default client exists for mock user
    const clients = await storage.getClientsByUser(mockUser.id);
    if (clients.length === 0) {
      await storage.createClient({
        userId: mockUser.id,
        name: 'Default',
        description: 'Default client workspace',
        isActive: true,
      });
      console.log('✓ Default client created for mock user');
    } else {
      console.log('✓ Default client already exists for mock user');
    }
  } catch (error) {
    console.log('Note: Could not create mock user:', error);
    // Try to create user manually with environment-aware schema
    try {
      if (process.env.NODE_ENV === 'development') {
        // REF: Use local SQLite schema for development
        const { db, users, clients } = await import('./db-local');
        await db.insert(users).values({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          profileImageUrl: mockUser.profileImageUrl,
        });
        
        // REF: Create default client for new user
        await db.insert(clients).values({
          userId: mockUser.id,
          name: 'Default',
          description: 'Default client workspace',
          isActive: 1,
        });
        console.log('✓ Mock user and default client created with direct database insert');
      } else {
        // REF: Use shared PostgreSQL schema for production
        const { db } = await import('./db');
        const { users } = await import('@shared/schema');
        await db.insert(users).values({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          profileImageUrl: mockUser.profileImageUrl,
        }).onConflictDoNothing();
      }
    } catch (sqlError) {
      console.log('Failed to create user with direct database insert:', sqlError);
    }
  }

  // REF: Enhanced auth routes for development with proper logout support
  app.get("/api/login", (req, res) => {
    // REF: Manual login for development - clear logout cookie and create session
    res.clearCookie('dev-logged-out', { 
      httpOnly: true,
      path: '/',
      domain: 'localhost'
    });
    res.clearCookie('dev-logged-out'); // Also clear without domain
    (req.session as any).user = mockUser;
    console.log('✓ Manual login for local development - logout cookie cleared');
    res.redirect('/');
  });

  app.get("/api/logout", (req, res) => {
    // REF: Proper logout for development - set logout flag and destroy session
    console.log('🔓 Logout requested for local development');
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      // REF: Set logout flag in a separate cookie that persists beyond session
      res.cookie('dev-logged-out', 'true', { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      console.log('✓ Session destroyed and logout flag set');
      res.redirect('/');
    });
  });
  
  app.get("/api/callback", (req, res) => {
    // REF: Auto-login callback - only if not explicitly logged out
    if (!req.cookies || !req.cookies['dev-logged-out']) {
      (req.session as any).user = mockUser;
    }
    res.redirect('/');
  });
}

// REF: Enhanced auth middleware for development with logout state respect
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log('🔍 AUTH MIDDLEWARE: Checking authentication for', req.path);
  
  // REF: Check if user explicitly logged out (handle missing cookies object)
  if (req.cookies && req.cookies['dev-logged-out']) {
    console.log('🔍 AUTH MIDDLEWARE: User logged out');
    return res.status(401).json({ message: "Logged out - please login again" });
  }
  
  // REF: Check for existing session user
  const sessionUser = (req.session as any).user;
  console.log('🔍 AUTH MIDDLEWARE: Session user =', sessionUser);
  
  if (sessionUser) {
    // REF: User has active session
    (req as any).user = {
      claims: {
        sub: sessionUser.id,
        email: sessionUser.email,
        first_name: sessionUser.firstName,
        last_name: sessionUser.lastName,
      }
    };
    console.log('🔍 AUTH MIDDLEWARE: Set req.user =', (req as any).user);
    return next();
  }
  
  // REF: No session and not logged out - auto-login for development convenience
  // But only for non-API requests to avoid interfering with auth checks
  const isApiRequest = req.path.startsWith('/api/');
  
  if (!isApiRequest) {
    // REF: Auto-login for page requests only
    (req.session as any).user = mockUser;
    (req as any).user = {
      claims: {
        sub: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.firstName,
        last_name: mockUser.lastName,
      }
    };
    console.log('🔍 AUTH MIDDLEWARE: Auto-logged in for page request');
    return next();
  } else {
    // REF: API requests require explicit authentication
    console.log('🔍 AUTH MIDDLEWARE: API request requires explicit auth');
    return res.status(401).json({ message: "Authentication required" });
  }
}; 