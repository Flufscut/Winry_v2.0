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

// Mock user for local development
const mockUser = {
  id: 'local-dev-user',
  email: 'dev@local.com',
  firstName: 'Local',
  lastName: 'Developer',
  profileImageUrl: null,
};

export async function setupAuth(app: Express) {
  app.use(getSession());
  
  // Create a mock user in the database for development
  try {
    // First check if user already exists
    const existingUser = await storage.getUser(mockUser.id);
    if (!existingUser) {
      await storage.upsertUser(mockUser);
      console.log('✓ Mock user created for local development');
    } else {
      console.log('✓ Mock user already exists for local development');
    }
  } catch (error) {
    console.log('Note: Could not create mock user:', error);
    // Try to create user manually with environment-aware schema
    try {
      if (process.env.NODE_ENV === 'development') {
        // REF: Use local SQLite schema for development
        const { db, users } = await import('./db-local');
        await db.insert(users).values({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          profileImageUrl: mockUser.profileImageUrl,
        });
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
      console.log('✓ Mock user created with direct database insert');
    } catch (sqlError) {
      console.log('Failed to create user with direct database insert:', sqlError);
    }
  }

  // Simple auth routes for development
  app.get("/api/login", (req, res) => {
    // Auto-login for development
    (req.session as any).user = mockUser;
    console.log('✓ Auto-login for local development');
    res.redirect('/');
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
  
  app.get("/api/callback", (req, res) => {
    // Auto-login callback
    (req.session as any).user = mockUser;
    res.redirect('/');
  });
}

// Simple auth middleware for development
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Auto-authenticate for development
  const user = (req.session as any).user || mockUser;
  
  // Attach user to request object
  (req as any).user = {
    claims: {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
    }
  };
  
  next();
}; 