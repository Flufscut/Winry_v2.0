import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Simple session configuration for local development
export function getSession() {
  return session({
    secret: 'local-dev-secret-key',
    resave: false,
    saveUninitialized: true,
    name: 'connect.sid',
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for local HTTP
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax', // REF: Allow same-site requests for development
      path: '/', // REF: Explicit path
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
    // REF: Manual login for development - clear logout cookies and create session
    res.clearCookie('dev-logged-out', { 
      httpOnly: true,
      path: '/'
    });
    (req.session as any).user = mockUser;
    console.log('✓ Manual login for local development - session created');
    console.log('🔍 SESSION DEBUG: Session ID:', req.sessionID);
    console.log('🔍 SESSION DEBUG: Session user set to:', (req.session as any).user);
    
    // REF: Force session save before redirect to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      console.log('✓ Session saved successfully');
    res.redirect('/');
    });
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
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
  console.log('🔍 AUTH MIDDLEWARE: Session ID:', req.sessionID);
  console.log('🔍 AUTH MIDDLEWARE: Session object:', JSON.stringify(req.session, null, 2));
  
  // REF: Check if user explicitly logged out (handle missing cookies object)
  if (req.cookies && req.cookies['dev-logged-out']) {
    console.log('🔍 AUTH MIDDLEWARE: User logged out');
    return res.status(401).json({ message: "Logged out - please login again" });
  }
  
  // REF: Check for existing session user
  const sessionUser = (req.session as any).user;
  console.log('🔍 AUTH MIDDLEWARE: Session user =', sessionUser ? 'FOUND' : 'NOT FOUND');
  
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
    console.log('🔍 AUTH MIDDLEWARE: Session authenticated');
    return next();
  }
  
  // REF: For development, be more permissive with authentication
  // REF: Auto-login for both API and page requests if not explicitly logged out
  console.log('🔍 AUTH MIDDLEWARE: No session found, auto-logging in for development');
    (req.session as any).user = mockUser;
    (req as any).user = {
      claims: {
        sub: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.firstName,
        last_name: mockUser.lastName,
      }
    };
  
  // REF: Force save the session
  req.session.save((err) => {
    if (err) {
      console.error('❌ Auto-login session save error:', err);
      return res.status(500).json({ message: "Session save failed" });
    }
    console.log('✓ Auto-login session saved successfully');
    return next();
  });
}; 