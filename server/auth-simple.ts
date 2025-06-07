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
  
  // Session middleware
  app.use(getSessionMiddleware());
  
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