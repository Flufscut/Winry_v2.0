/**
 * FILE: db-local.ts
 * PURPOSE: SQLite database configuration for local development
 * DEPENDENCIES: drizzle-orm/better-sqlite3, better-sqlite3
 * LAST_UPDATED: Current date
 * 
 * REF: Local development database setup with SQLite compatibility
 * REF: Handles schema differences between PostgreSQL (production) and SQLite (local)
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

// Create or connect to SQLite database
const sqlite = new Database('local.db');

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
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

export const prospects = sqliteTable('prospects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
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
  userId: text('user_id').notNull().unique(),
  replyIoApiKey: text('reply_io_api_key'), // Encrypted Reply.io API key
  replyIoCampaignId: text('reply_io_campaign_id'), // Default campaign ID
  replyIoAutoSend: integer('reply_io_auto_send', { mode: 'boolean' }).default(true), // Auto-send to Reply.io when research completes
  webhookUrl: text('webhook_url'), // n8n webhook URL
  webhookTimeout: integer('webhook_timeout').default(300), // Webhook timeout in seconds
  batchSize: integer('batch_size').default(10), // Batch processing size
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
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
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS csv_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    reply_io_api_key TEXT,
    reply_io_campaign_id TEXT,
    reply_io_auto_send INTEGER DEFAULT 1,
    webhook_url TEXT,
    webhook_timeout INTEGER DEFAULT 300,
    batch_size INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS replyio_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
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
  CREATE INDEX IF NOT EXISTS IDX_replyio_accounts_user_id ON replyio_accounts(user_id);
  CREATE INDEX IF NOT EXISTS IDX_replyio_campaigns_account_id ON replyio_campaigns(account_id);
`);

// REF: Migration to add sentToReplyioCampaignId column to existing prospects table
try {
  sqlite.exec(`ALTER TABLE prospects ADD COLUMN sent_to_replyio_campaign_id INTEGER;`);
  console.log('✓ Added sentToReplyioCampaignId column to prospects table');
} catch (error) {
  console.log('sentToReplyioCampaignId column already exists or migration not needed');
}

// REF: Create index for the new column after ensuring it exists
try {
  sqlite.exec(`CREATE INDEX IF NOT EXISTS IDX_prospects_sent_to_campaign ON prospects(sent_to_replyio_campaign_id);`);
  console.log('✓ Created index for sentToReplyioCampaignId column');
} catch (error) {
  console.log('Index for sentToReplyioCampaignId already exists or column not found');
}

// REF: Add migration for existing databases to add the auto_send column
try {
  sqlite.exec(`ALTER TABLE user_settings ADD COLUMN reply_io_auto_send INTEGER DEFAULT 1;`);
  console.log('Added reply_io_auto_send column to existing user_settings table');
} catch (error) {
  // REF: Column already exists or other error - this is fine for existing installations
  console.log('reply_io_auto_send column already exists or migration not needed');
}

// Reply.io Accounts table for storing multiple API keys per user
export const replyioAccounts = sqliteTable('replyio_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  name: text('name').notNull(), // User-friendly name (e.g., "Main Account", "Sales Team")
  apiKey: text('api_key').notNull(), // Encrypted Reply.io API key
  isDefault: integer('is_default', { mode: 'boolean' }).default(false), // Only one default per user
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
  isDefault: integer('is_default', { mode: 'boolean' }).default(false), // Only one default per account
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

// Create local schema with SQLite tables
const localSchema = {
  sessions,
  users,
  prospects,
  csvUploads,
  userSettings,
  replyioAccounts,
  replyioCampaigns,
};

// Create insert schemas for local development
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
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
  replyIoAutoSend: z.boolean().optional(),
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
  isDefault: z.boolean().optional(),
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
  isDefault: z.boolean().optional(),
});

export const updateReplyioCampaignSchema = insertReplyioCampaignSchema.partial().extend({
  id: z.number(),
});

// Export types - using local schema
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
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

console.log('✓ SQLite database initialized successfully');

export const db = drizzle({ client: sqlite, schema: localSchema });
export { sqlite as pool }; 