import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For manual signup/login
  oauthProvider: varchar("oauth_provider"), // google, etc.
  oauthId: varchar("oauth_id"), // OAuth provider user ID
  preferences: jsonb("preferences"), // User preferences stored as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table for multi-tenant client separation
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("clients_user_id_idx").on(table.userId),
}));

// Prospects table for storing prospect data and research results
export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  company: varchar("company").notNull(),
  title: varchar("title").notNull(),
  email: varchar("email").notNull(),
  linkedinUrl: varchar("linkedin_url"),
  status: varchar("status").notNull().default("processing"), // processing, completed, failed
  researchResults: jsonb("research_results"), // Store the complete JSON response
  webhookPayload: jsonb("webhook_payload"), // Store the original request payload
  errorMessage: text("error_message"), // Store error details if processing fails
  sentToReplyioCampaignId: integer("sent_to_replyio_campaign_id"), // Track which campaign the prospect was sent to
  n8nExecutionId: varchar("n8n_execution_id"), // REF: Track n8n workflow execution ID for real-time monitoring
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userClientIdx: index("prospects_user_client_idx").on(table.userId, table.clientId),
  clientIdx: index("prospects_client_idx").on(table.clientId),
}));

// CSV uploads table to track batch uploads
export const csvUploads = pgTable("csv_uploads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  totalRows: integer("total_rows").notNull(),
  processedRows: integer("processed_rows").notNull().default(0),
  status: varchar("status").notNull().default("processing"), // processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("csv_uploads_client_idx").on(table.clientId),
}));

// User settings table for storing Reply.io configuration and other preferences
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  replyIoApiKey: varchar("reply_io_api_key"), // Encrypted Reply.io API key
  replyIoCampaignId: varchar("reply_io_campaign_id"), // Default campaign ID
  replyIoAutoSend: boolean("reply_io_auto_send").default(true), // Auto-send to Reply.io when research completes
  webhookUrl: varchar("webhook_url"), // n8n webhook URL
  webhookTimeout: integer("webhook_timeout").default(300), // Webhook timeout in seconds
  batchSize: integer("batch_size").default(10), // Batch processing size
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("user_settings_client_idx").on(table.clientId),
  userClientIdx: unique("user_settings_user_client_unique").on(table.userId, table.clientId),
}));

// Reply.io Accounts table for storing multiple API keys per user
export const replyioAccounts = pgTable("replyio_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // User-friendly name (e.g., "Main Account", "Sales Team")
  apiKey: varchar("api_key").notNull(), // Encrypted Reply.io API key
  ownerEmail: varchar("owner_email"), // Owner email from Reply.io API
  isDefault: boolean("is_default").default(false), // Only one default per user per client
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("replyio_accounts_user_id_idx").on(table.userId),
  clientIdx: index("replyio_accounts_client_idx").on(table.clientId),
  userClientDefaultIdx: unique("replyio_accounts_user_client_default_unique").on(table.userId, table.clientId, table.isDefault),
}));

// Reply.io Campaigns table for storing multiple campaigns per API key
export const replyioCampaigns = pgTable("replyio_campaigns", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => replyioAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull(), // Reply.io campaign ID
  campaignName: varchar("campaign_name").notNull(), // Campaign name from Reply.io
  campaignStatus: varchar("campaign_status"), // active, paused, etc.
  isDefault: boolean("is_default").default(false), // Only one default per account
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountIdIdx: index("replyio_campaigns_account_id_idx").on(table.accountId),
  // REF: Only enforce unique default constraint when isDefault=true, allow multiple isDefault=false
  accountCampaignIdx: unique("replyio_campaigns_account_campaign_unique").on(table.accountId, table.campaignId),
}));

// Validation schemas for Reply.io accounts
export const insertReplyioAccountSchema = createInsertSchema(replyioAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1).max(100),
  apiKey: z.string().min(1),
  ownerEmail: z.string().email().optional(),
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

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  passwordHash: true,
  oauthProvider: true,
  oauthId: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Client name is required").max(100),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
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
  replyIoAutoSend: z.boolean().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  webhookTimeout: z.number().min(30).max(1800).optional(),
  batchSize: z.number().min(1).max(100).optional(),
});

// Export types
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
