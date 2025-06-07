/**
 * FILE: db-local.ts
 * PURPOSE: SQLite database configuration for local development
 * DEPENDENCIES: drizzle-orm/better-sqlite3, better-sqlite3
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Local development database setup with SQLite compatibility
 * REF: Handles schema differences between PostgreSQL (production) and SQLite (local)
 * REF: CRITICAL - Only loads in development environment to prevent production conflicts
 * TODO: Add proper migration system for schema changes
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { 
  text, 
  integer, 
  sqliteTable 
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// REF: CRITICAL - Prevent ANY SQLite operations in production environment
if (process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: db-local.ts should never be imported in production environment');
}

// REF: SQLite database instance - created only when needed (lazy initialization)
let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * REF: Get SQLite database instance (lazy initialization)
 * Only creates database when actually needed, prevents top-level execution
 */
function getSqliteInstance(): Database.Database {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Cannot access SQLite in production environment');
  }
  
  if (!_sqlite) {
    console.log('🔄 Creating SQLite database instance...');
    _sqlite = new Database('local.db');
    console.log('✅ SQLite database instance created');
    
    // Initialize tables when database is first created
    initializeTables(_sqlite);
  }
  
  return _sqlite;
}

/**
 * REF: Get Drizzle database instance (lazy initialization)
 */
function getDrizzleInstance() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Cannot access Drizzle SQLite in production environment');
  }
  
  if (!_db) {
    const sqlite = getSqliteInstance();
    _db = drizzle(sqlite);
    console.log('✓ SQLite database initialized successfully');
  }
  
  return _db;
}

// SQLite-compatible schema definitions
export const sessions = sqliteTable('sessions', {
  sid: text('sid').primaryKey(),
  sess: text('sess').notNull(),
  expire: text('expire').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  profileImageUrl: text('profile_image_url'),
  passwordHash: text('password_hash'), // Hashed password for username/password auth
  oauthProvider: text('oauth_provider'), // 'google', 'outlook', etc.
  oauthId: text('oauth_id'), // OAuth provider user ID
  preferences: text('preferences'), // JSON as text in SQLite
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

export const prospects = sqliteTable('prospects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  company: text('company').notNull(),
  title: text('title').notNull(),
  email: text('email').notNull(),
  linkedinUrl: text('linkedin_url'),
  status: text('status').notNull().default('processing'),
  researchResults: text('research_results'), // JSON as text in SQLite
  webhookPayload: text('webhook_payload'), // JSON as text in SQLite
  errorMessage: text('error_message'),
  sentToReplyioCampaignId: integer('sent_to_replyio_campaign_id'), // REF: Track which Reply.io campaign this prospect was sent to
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

export const csvUploads = sqliteTable('csv_uploads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').notNull(),
  fileName: text('file_name').notNull(),
  totalRows: integer('total_rows').notNull(),
  processedRows: integer('processed_rows').notNull().default(0),
  status: text('status').notNull().default('processing'),
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

// User settings table for storing Reply.io configuration and other preferences
export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').notNull(),
  replyIoApiKey: text('reply_io_api_key'), // Encrypted Reply.io API key
  replyIoCampaignId: text('reply_io_campaign_id'), // Default campaign ID
  replyIoAutoSend: integer('reply_io_auto_send').default(1), // Auto-send to Reply.io when research completes (SQLite: 1=true, 0=false)
  webhookUrl: text('webhook_url'), // n8n webhook URL
  webhookTimeout: integer('webhook_timeout').default(300), // Webhook timeout in seconds
  batchSize: integer('batch_size').default(10), // Batch processing size
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

/**
 * REF: Initialize SQLite tables (called only when database is created)
 */
function initializeTables(sqlite: Database.Database) {
  console.log('🔄 Initializing SQLite tables...');
  
  // Create tables with proper SQLite syntax
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      password_hash TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      email TEXT NOT NULL,
      linkedin_url TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      research_results TEXT,
      webhook_payload TEXT,
      error_message TEXT,
      sent_to_replyio_campaign_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS csv_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      processed_rows INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'processing',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      reply_io_api_key TEXT,
      reply_io_campaign_id TEXT,
      reply_io_auto_send INTEGER DEFAULT 1,
      webhook_url TEXT,
      webhook_timeout INTEGER DEFAULT 300,
      batch_size INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      UNIQUE(user_id, client_id)
    );

    CREATE TABLE IF NOT EXISTS replyio_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS replyio_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      campaign_name TEXT NOT NULL,
      campaign_status TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES replyio_accounts(id) ON DELETE CASCADE,
      UNIQUE(account_id, campaign_id)
    );

    CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    CREATE INDEX IF NOT EXISTS IDX_clients_user_id ON clients(user_id);
    CREATE INDEX IF NOT EXISTS IDX_prospects_client_id ON prospects(client_id);
    CREATE INDEX IF NOT EXISTS IDX_prospects_user_client ON prospects(user_id, client_id);
    CREATE INDEX IF NOT EXISTS IDX_csv_uploads_client_id ON csv_uploads(client_id);
    CREATE INDEX IF NOT EXISTS IDX_user_settings_client_id ON user_settings(client_id);
    CREATE INDEX IF NOT EXISTS IDX_replyio_accounts_user_id ON replyio_accounts(user_id);
    CREATE INDEX IF NOT EXISTS IDX_replyio_accounts_client_id ON replyio_accounts(client_id);
    CREATE INDEX IF NOT EXISTS IDX_replyio_campaigns_account_id ON replyio_campaigns(account_id);
  `);
}

// REF: Migration to add sentToReplyioCampaignId column to existing prospects table
try {
  getSqliteInstance().exec(`ALTER TABLE prospects ADD COLUMN sent_to_replyio_campaign_id INTEGER;`);
  console.log('✓ Added sentToReplyioCampaignId column to prospects table');
} catch (error) {
  console.log('sentToReplyioCampaignId column already exists or migration not needed');
}

// REF: Create index for the new column after ensuring it exists
try {
  getSqliteInstance().exec(`CREATE INDEX IF NOT EXISTS IDX_prospects_sent_to_campaign ON prospects(sent_to_replyio_campaign_id);`);
  console.log('✓ Created index for sentToReplyioCampaignId column');
} catch (error) {
  console.log('Index for sentToReplyioCampaignId already exists or column not found');
}

// REF: Check if we need to migrate existing database or if this is a fresh install
try {
  // Test if users table exists and has data
  const userCount = getSqliteInstance().prepare(`SELECT COUNT(*) as count FROM users`).get() as { count: number };
  const needsMigration = userCount.count > 0;
  
  if (needsMigration) {
    console.log('=== MIGRATING EXISTING DATABASE ===');
    
    // REF: Add migration for existing databases to add the auto_send column
    try {
      getSqliteInstance().exec(`ALTER TABLE user_settings ADD COLUMN reply_io_auto_send INTEGER DEFAULT 1;`);
      console.log('✓ Added reply_io_auto_send column to existing user_settings table');
    } catch (error) {
      console.log('reply_io_auto_send column already exists or migration not needed');
    }

    // REF: Migration for multi-tenant client support - create default clients for existing users
    try {
      // First, get all users
      const existingUsers = getSqliteInstance().prepare(`SELECT id FROM users`).all() as { id: string }[];
      
      for (const user of existingUsers) {
        // Check if user already has a default client
        const existingClient = getSqliteInstance().prepare(`SELECT id FROM clients WHERE user_id = ? AND name = 'Default'`).get(user.id) as { id: number } | undefined;
        
        if (!existingClient) {
          // Create default client for existing user
          const insertClient = getSqliteInstance().prepare(`INSERT INTO clients (user_id, name, description, is_active) VALUES (?, ?, ?, ?)`);
          const result = insertClient.run(user.id, 'Default', 'Default client workspace', 1);
          console.log(`✓ Created default client for user ${user.id} with ID ${result.lastInsertRowid}`);
        }
      }
      
      console.log('✓ Ensured all users have default clients');
    } catch (error) {
      console.log('Default client creation skipped or already completed');
    }

    // REF: Add client_id columns to existing tables via ALTER TABLE
    try {
      getSqliteInstance().exec(`ALTER TABLE prospects ADD COLUMN client_id INTEGER;`);
      console.log('✓ Added client_id column to prospects table');
    } catch (error) {
      console.log('client_id column already exists in prospects table');
    }

    try {
      getSqliteInstance().exec(`ALTER TABLE csv_uploads ADD COLUMN client_id INTEGER;`);
      console.log('✓ Added client_id column to csv_uploads table');
    } catch (error) {
      console.log('client_id column already exists in csv_uploads table');
    }

    try {
      getSqliteInstance().exec(`ALTER TABLE user_settings ADD COLUMN client_id INTEGER;`);
      console.log('✓ Added client_id column to user_settings table');
    } catch (error) {
      console.log('client_id column already exists in user_settings table');
    }

    try {
      getSqliteInstance().exec(`ALTER TABLE replyio_accounts ADD COLUMN client_id INTEGER;`);
      console.log('✓ Added client_id column to replyio_accounts table');
    } catch (error) {
      console.log('client_id column already exists in replyio_accounts table');
    }

    // REF: Update existing records to use the default client
    try {
      // Get all users and their default clients
      const usersWithClients = getSqliteInstance().prepare(`
        SELECT u.id as user_id, c.id as client_id 
        FROM users u 
        LEFT JOIN clients c ON u.id = c.user_id AND c.name = 'Default'
      `).all() as { user_id: string; client_id: number }[];
      
      for (const { user_id, client_id } of usersWithClients) {
        if (client_id) {
          // Update prospects
          const prospectsUpdated = getSqliteInstance().prepare(`UPDATE prospects SET client_id = ? WHERE user_id = ? AND client_id IS NULL`).run(client_id, user_id);
          
          // Update csv_uploads  
          const csvUpdated = getSqliteInstance().prepare(`UPDATE csv_uploads SET client_id = ? WHERE user_id = ? AND client_id IS NULL`).run(client_id, user_id);
          
          // Update user_settings
          const settingsUpdated = getSqliteInstance().prepare(`UPDATE user_settings SET client_id = ? WHERE user_id = ? AND client_id IS NULL`).run(client_id, user_id);
          
          // Update replyio_accounts
          const accountsUpdated = getSqliteInstance().prepare(`UPDATE replyio_accounts SET client_id = ? WHERE user_id = ? AND client_id IS NULL`).run(client_id, user_id);
          
          console.log(`✓ Updated records for user ${user_id} to use client ${client_id}`);
        }
      }
      
      console.log('✓ Updated existing records to use default clients');
    } catch (error) {
      console.log('Record migration skipped or already completed');
    }
    
  } else {
    console.log('=== FRESH DATABASE DETECTED ===');
    console.log('✓ No migration needed - fresh installation');
  }
  
} catch (error) {
  console.log('Migration check failed - treating as fresh installation');
}

// Reply.io Accounts table for storing multiple API keys per user
export const replyioAccounts = sqliteTable('replyio_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  clientId: integer('client_id').notNull(),
  name: text('name').notNull(), // User-friendly name (e.g., "Main Account", "Sales Team")
  apiKey: text('api_key').notNull(), // Encrypted Reply.io API key
  isDefault: integer('is_default').default(0), // Only one default per user per client (SQLite: 1=true, 0=false)
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

// Reply.io Campaigns table for storing multiple campaigns per API key
export const replyioCampaigns = sqliteTable('replyio_campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull(),
  campaignId: integer('campaign_id').notNull(), // Reply.io campaign ID
  campaignName: text('campaign_name').notNull(), // Campaign name from Reply.io
  campaignStatus: text('campaign_status'), // active, paused, etc.
  isDefault: integer('is_default').default(0), // Only one default per account (SQLite: 1=true, 0=false)
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

// Create insert schemas for local development
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Client name is required").max(100),
  description: z.string().optional(),
  isActive: z.number().int().min(0).max(1).optional().default(1), // SQLite compatibility - use 1 for true, 0 for false
});

export const insertProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Title is required"),
  email: z.string().email("Valid email is required"),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  clientId: z.number().min(1, "Client ID is required"),
});

export const insertCsvUploadSchema = createInsertSchema(csvUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  replyIoApiKey: z.string().optional(),
  replyIoCampaignId: z.string().optional(),
  replyIoAutoSend: z.number().int().min(0).max(1).optional(), // SQLite compatibility
  webhookUrl: z.string().url().optional().or(z.literal("")),
  webhookTimeout: z.number().min(30).max(1800).optional(),
  batchSize: z.number().min(1).max(100).optional(),
});

// Validation schemas for Reply.io accounts
export const insertReplyioAccountSchema = createInsertSchema(replyioAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1).max(100),
  apiKey: z.string().min(1),
  isDefault: z.number().int().min(0).max(1).optional().default(0), // SQLite compatibility
});

export const updateReplyioAccountSchema = insertReplyioAccountSchema.partial().extend({
  id: z.number(),
});

// Validation schemas for Reply.io campaigns
export const insertReplyioCampaignSchema = createInsertSchema(replyioCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  accountId: z.number(),
  campaignId: z.number(),
  campaignName: z.string().min(1).max(200),
  campaignStatus: z.string().optional(),
  isDefault: z.number().int().min(0).max(1).optional().default(0), // SQLite compatibility
});

export const updateReplyioCampaignSchema = insertReplyioCampaignSchema.partial().extend({
  id: z.number(),
});

// Create local schema with SQLite tables and validation schemas
const localSchema = {
  // Table definitions
  sessions,
  users,
  clients,
  prospects,
  csvUploads,
  userSettings,
  replyioAccounts,
  replyioCampaigns,
  // Validation schemas
  insertUserSchema,
  insertClientSchema,
  insertProspectSchema,
  insertCsvUploadSchema,
  insertUserSettingsSchema,
  insertReplyioAccountSchema,
  updateReplyioAccountSchema,
  insertReplyioCampaignSchema,
  updateReplyioCampaignSchema,
};

// Export types - using local schema
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;
export type InsertCsvUpload = z.infer<typeof insertCsvUploadSchema>;
export type CsvUpload = typeof csvUploads.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertReplyioAccount = z.infer<typeof insertReplyioAccountSchema>;
export type ReplyioAccount = typeof replyioAccounts.$inferSelect;
export type UpdateReplyioAccount = z.infer<typeof updateReplyioAccountSchema>;
export type InsertReplyioCampaign = z.infer<typeof insertReplyioCampaignSchema>;
export type ReplyioCampaign = typeof replyioCampaigns.$inferSelect;
export type UpdateReplyioCampaign = z.infer<typeof updateReplyioCampaignSchema>;

// REF: Export database and pool instances (lazy initialization)
export const db = getDrizzleInstance();
export const pool = getSqliteInstance();
export const schema = localSchema; 