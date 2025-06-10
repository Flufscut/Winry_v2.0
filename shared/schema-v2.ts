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
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// MULTI-TENANT CORE TABLES
// ============================================================================

// Organizations table - Core multi-tenant entity
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  tier: varchar("tier", { length: 50 }).notNull(), // individual, team, agency, admin
  settings: jsonb("settings").default('{}'),
  billingEmail: varchar("billing_email", { length: 255 }),
  billingStatus: varchar("billing_status", { length: 50 }).default("active"), // active, suspended, cancelled
  usageLimits: jsonb("usage_limits").default('{}'), // Monthly limits based on tier
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("organizations_name_idx").on(table.name),
  tierIdx: index("organizations_tier_idx").on(table.tier),
}));

// Account tiers configuration
export const accountTiers = pgTable("account_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // individual, team, agency, admin
  displayName: varchar("display_name", { length: 100 }).notNull(),
  features: jsonb("features").notNull(), // Feature flags and capabilities
  limits: jsonb("limits").notNull(), // Usage limits (prospects/month, users, etc.)
  priceMonthly: integer("price_monthly").default(0), // Price in cents
  priceYearly: integer("price_yearly").default(0), // Price in cents
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaigns table - For multi-client campaign management
export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  description: text("description"),
  
  // External service integration IDs
  n8nWorkflowId: varchar("n8n_workflow_id", { length: 255 }),
  n8nWebhookId: varchar("n8n_webhook_id", { length: 255 }),
  supabaseProjectId: varchar("supabase_project_id", { length: 255 }),
  supabaseProjectUrl: varchar("supabase_project_url", { length: 500 }),
  googleDriveFolderId: varchar("googledrive_folder_id", { length: 255 }),
  replyioOrganizationId: varchar("replyio_organization_id", { length: 255 }),
  
  // Campaign configuration
  settings: jsonb("settings").default('{}'),
  status: varchar("status", { length: 50 }).default("pending"), // pending, provisioning, active, paused, failed
  provisioningStatus: jsonb("provisioning_status").default('{}'), // Track multi-step provisioning
  
  // Metadata
  createdBy: varchar("created_by").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("campaigns_org_idx").on(table.organizationId),
  statusIdx: index("campaigns_status_idx").on(table.status),
  clientIdx: index("campaigns_client_idx").on(table.clientName),
  createdByIdx: index("campaigns_created_by_idx").on(table.createdBy),
}));

// Session storage table - unchanged
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Updated users table with organization relationship
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  oauthProvider: varchar("oauth_provider"),
  oauthId: varchar("oauth_id"),
  preferences: jsonb("preferences"),
  
  // Multi-tenant fields
  primaryOrganizationId: uuid("primary_organization_id").references(() => organizations.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  primaryOrgIdx: index("users_primary_org_idx").on(table.primaryOrganizationId),
}));

// User roles and permissions for organizations
export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(), // admin, member, viewer
  permissions: jsonb("permissions").default('{}'), // Granular permissions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgUserIdx: unique("user_roles_org_user_unique").on(table.organizationId, table.userId),
  orgIdx: index("user_roles_org_idx").on(table.organizationId),
  userIdx: index("user_roles_user_idx").on(table.userId),
}));

// Updated clients table - now scoped to organizations
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("clients_org_idx").on(table.organizationId),
  userIdIdx: index("clients_user_id_idx").on(table.userId),
  orgUserIdx: index("clients_org_user_idx").on(table.organizationId, table.userId),
}));

// Updated prospects table with organization and campaign context
export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // Prospect data
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  company: varchar("company").notNull(),
  title: varchar("title").notNull(),
  email: varchar("email").notNull(),
  linkedinUrl: varchar("linkedin_url"),
  
  // Processing status
  status: varchar("status").notNull().default("processing"),
  researchResults: jsonb("research_results"),
  webhookPayload: jsonb("webhook_payload"),
  errorMessage: text("error_message"),
  sentToReplyioCampaignId: integer("sent_to_replyio_campaign_id"),
  n8nExecutionId: varchar("n8n_execution_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("prospects_org_idx").on(table.organizationId),
  campaignIdx: index("prospects_campaign_idx").on(table.campaignId),
  userClientIdx: index("prospects_user_client_idx").on(table.userId, table.clientId),
  statusIdx: index("prospects_status_idx").on(table.status),
  orgCampaignIdx: index("prospects_org_campaign_idx").on(table.organizationId, table.campaignId),
}));

// Updated CSV uploads table with organization context
export const csvUploads = pgTable("csv_uploads", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  totalRows: integer("total_rows").notNull(),
  processedRows: integer("processed_rows").notNull().default(0),
  status: varchar("status").notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("csv_uploads_org_idx").on(table.organizationId),
  campaignIdx: index("csv_uploads_campaign_idx").on(table.campaignId),
  clientIdx: index("csv_uploads_client_idx").on(table.clientId),
}));

// Updated user settings table with organization context
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  replyIoApiKey: varchar("reply_io_api_key"),
  replyIoCampaignId: varchar("reply_io_campaign_id"),
  replyIoAutoSend: boolean("reply_io_auto_send").default(true),
  webhookUrl: varchar("webhook_url"),
  webhookTimeout: integer("webhook_timeout").default(300),
  batchSize: integer("batch_size").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("user_settings_org_idx").on(table.organizationId),
  clientIdx: index("user_settings_client_idx").on(table.clientId),
  orgUserClientIdx: unique("user_settings_org_user_client_unique").on(table.organizationId, table.userId, table.clientId),
}));

// Updated Reply.io accounts with organization context
export const replyioAccounts = pgTable("replyio_accounts", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  apiKey: varchar("api_key").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("replyio_accounts_org_idx").on(table.organizationId),
  userIdIdx: index("replyio_accounts_user_id_idx").on(table.userId),
  clientIdx: index("replyio_accounts_client_idx").on(table.clientId),
  orgUserClientDefaultIdx: unique("replyio_accounts_org_user_client_default_unique").on(table.organizationId, table.userId, table.clientId, table.isDefault),
}));

// Updated Reply.io campaigns table
export const replyioCampaigns = pgTable("replyio_campaigns", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => replyioAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull(),
  campaignName: varchar("campaign_name").notNull(),
  campaignStatus: varchar("campaign_status"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountIdIdx: index("replyio_campaigns_account_id_idx").on(table.accountId),
  accountCampaignIdx: unique("replyio_campaigns_account_campaign_unique").on(table.accountId, table.campaignId),
}));

// Document management for AI enhancement
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  
  // File information
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  
  // Content and processing
  contentText: text("content_text"),
  processingStatus: varchar("processing_status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  embeddingVector: jsonb("embedding_vector"), // Store vector embeddings
  
  // Metadata
  tags: jsonb("tags").default('[]'),
  metadata: jsonb("metadata").default('{}'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("documents_org_idx").on(table.organizationId),
  campaignIdx: index("documents_campaign_idx").on(table.campaignId),
  statusIdx: index("documents_status_idx").on(table.processingStatus),
  uploadedByIdx: index("documents_uploaded_by_idx").on(table.uploadedBy),
}));

// Feedback collection for AI training
export const prospectFeedback = pgTable("prospect_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  prospectId: integer("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Feedback data
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // email_content, research_quality, personalization
  rating: integer("rating").notNull(), // 1-5 scale
  comments: text("comments"),
  tags: jsonb("tags").default('[]'),
  
  // Context
  originalContent: jsonb("original_content"), // The content being rated
  suggestedImprovements: text("suggested_improvements"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orgIdx: index("prospect_feedback_org_idx").on(table.organizationId),
  prospectIdx: index("prospect_feedback_prospect_idx").on(table.prospectId),
  typeIdx: index("prospect_feedback_type_idx").on(table.feedbackType),
  ratingIdx: index("prospect_feedback_rating_idx").on(table.rating),
}));

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Organization schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1).max(255),
  tier: z.enum(["individual", "team", "agency", "admin"]),
  billingEmail: z.string().email().optional(),
});

export const updateOrganizationSchema = insertOrganizationSchema.partial().extend({
  id: z.string().uuid(),
});

// Campaign schemas
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  clientName: z.string().min(1).max(255),
  createdBy: z.string(),
});

export const updateCampaignSchema = insertCampaignSchema.partial().extend({
  id: z.string().uuid(),
});

// User role schemas
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.string().uuid(),
  userId: z.string(),
  role: z.enum(["admin", "member", "viewer"]),
});

// Document schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.string().uuid(),
  uploadedBy: z.string(),
  filename: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(50),
  fileSize: z.number().positive(),
  filePath: z.string().min(1).max(500),
});

// Feedback schemas
export const insertProspectFeedbackSchema = createInsertSchema(prospectFeedback).omit({
  id: true,
  createdAt: true,
}).extend({
  organizationId: z.string().uuid(),
  prospectId: z.number(),
  userId: z.string(),
  feedbackType: z.enum(["email_content", "research_quality", "personalization"]),
  rating: z.number().min(1).max(5),
});

// Legacy schemas (for backwards compatibility)
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
  organizationId: z.string().uuid(),
  name: z.string().min(1, "Client name is required").max(100),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const insertProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.string().uuid(),
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
}).extend({
  organizationId: z.string().uuid(),
  fileName: z.string().min(1, "File name is required"),
  totalRows: z.number().min(0),
  processedRows: z.number().min(0).default(0),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.string().uuid(),
  batchSize: z.number().min(1).max(100).default(10),
  webhookTimeout: z.number().min(30).max(600).default(300),
});

export const insertReplyioAccountSchema = createInsertSchema(replyioAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  apiKey: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const updateReplyioAccountSchema = insertReplyioAccountSchema.partial().extend({
  id: z.number(),
});

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

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Core types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type ProspectFeedback = typeof prospectFeedback.$inferSelect;
export type InsertProspectFeedback = z.infer<typeof insertProspectFeedbackSchema>;

// Legacy types (for backwards compatibility)
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
export type UpdateReplyioAccount = z.infer<typeof updateReplyioAccountSchema>;
export type ReplyioAccount = typeof replyioAccounts.$inferSelect;
export type InsertReplyioCampaign = z.infer<typeof insertReplyioCampaignSchema>;
export type UpdateReplyioCampaign = z.infer<typeof updateReplyioCampaignSchema>;
export type ReplyioCampaign = typeof replyioCampaigns.$inferSelect; 