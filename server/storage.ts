/**
 * FILE: storage.ts
 * PURPOSE: Database storage operations with unified database system
 * DEPENDENCIES: ./db.ts (unified database system), drizzle-orm
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Main storage interface for all database operations
 * REF: Uses unified database system that automatically selects PostgreSQL or SQLite based on environment
 * TODO: Add connection pooling for production environment
 */

import { eq, desc, and, count, sql, isNotNull } from "drizzle-orm";

// REF: Import unified database system and schema
import { getDatabase } from './db.js';
// REF: Don't import shared schema directly - get it from database instance
// import * as sharedSchema from '@shared/schema.js';

// REF: Initialize database connection using unified system
let users: any, prospects: any, csvUploads: any, userSettings: any, replyioAccounts: any, replyioCampaigns: any, clients: any, db: any;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function initializeStorage() {
  if (isInitialized) {
    return;
  }
  
  // REF: Prevent multiple concurrent initializations
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      console.log('🔄 Storage: Initializing unified database system...');
      
      // REF: Use unified database system from db.ts
      const dbInstance = await getDatabase();
      db = dbInstance.db;
      
      // REF: Get schema from database instance (environment-specific)
      users = dbInstance.schema.users;
      prospects = dbInstance.schema.prospects;
      csvUploads = dbInstance.schema.csvUploads;
      userSettings = dbInstance.schema.userSettings;
      replyioAccounts = dbInstance.schema.replyioAccounts;
      replyioCampaigns = dbInstance.schema.replyioCampaigns;
      clients = dbInstance.schema.clients;
      
      isInitialized = true;
      console.log('✅ Storage: Unified database system initialized successfully');
    } catch (error) {
      console.error('❌ Storage: Failed to initialize database:', error);
      initPromise = null; // Reset promise on error to allow retry
      throw error;
    }
  })();
  
  await initPromise;
}

// REF: Export initialization promise for external coordination
export const storageInitialization = initializeStorage();

// REF: Helper to ensure initialization
async function ensureInitialized() {
  await storageInitialization;
  return { db, users, prospects, csvUploads, userSettings, replyioAccounts, replyioCampaigns, clients };
}

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(user: any): Promise<any>;
  upsertUser(user: any): Promise<any>;
  updateUser(id: string, updates: any): Promise<any>;
  updateUserPreferences(userId: string, preferences: any): Promise<any>;
  
  // Client operations - for multi-tenant support
  getClientsByUser(userId: string): Promise<any[]>;
  getClientsWithCounts(userId: string): Promise<any[]>;
  getClient(id: number): Promise<any>;
  createClient(client: any): Promise<any>;
  updateClient(id: number, updates: any): Promise<any>;
  deleteClient(id: number): Promise<boolean>;
  getDefaultClient(userId: string): Promise<any>;
  
  // Prospect operations
  createProspect(prospect: any): Promise<any>;
  getProspect(id: number): Promise<any>;
  getProspectsByUser(userId: string): Promise<any[]>;
  getProspectsByClient(userId: string, clientId: number): Promise<any[]>;
  updateProspectStatus(id: number, status: string, results?: any, errorMessage?: string): Promise<any>;
  searchProspects(userId: string, query?: string, status?: string, clientId?: number): Promise<any[]>;
  deleteProspect(id: number, userId: string): Promise<boolean>;
  
  // CSV upload operations
  createCsvUpload(upload: any): Promise<any>;
  updateCsvUploadProgress(id: number, processedRows: number, status?: string): Promise<any>;
  getCsvUploadsByUser(userId: string): Promise<any[]>;
  
  // User settings operations
  getUserSettings(userId: string): Promise<any>;
  upsertUserSettings(userId: string, settings: any): Promise<any>;
  
  // Reply.io account operations
  createReplyioAccount(account: any): Promise<any>;
  getReplyioAccounts(userId: string): Promise<any[]>;
  getReplyioAccount(id: number): Promise<any>;
  updateReplyioAccount(id: number, updates: any): Promise<any>;
  deleteReplyioAccount(id: number): Promise<boolean>;
  setDefaultReplyioAccount(userId: string, accountId: number): Promise<any>;
  
  // Reply.io campaign operations
  createReplyioCampaign(campaign: any): Promise<any>;
  upsertReplyioCampaign(campaign: any): Promise<any>;
  getReplyioCampaigns(accountId: number): Promise<any[]>;
  getReplyioCampaign(id: number): Promise<any>;
  updateReplyioCampaign(id: number, updates: any): Promise<any>;
  deleteReplyioCampaign(id: number): Promise<boolean>;
  setDefaultReplyioCampaign(accountId: number, campaignId: number): Promise<any>;
  getDefaultReplyioConfiguration(userId: string, clientId?: number): Promise<{ account: any, campaign: any } | null>;
  
  // Prospect campaign tracking
  updateProspectCampaign(prospectId: number, campaignId: number): Promise<any>;
  getProspectsByCampaign(userId: string, campaignId: number): Promise<any[]>;
  getUserStatsByCampaign(userId: string, campaignId: number): Promise<{
    totalProspects: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  }>;
  
  // Dashboard stats
  getUserStats(userId: string, clientId?: number): Promise<{
    totalProspects: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  }>;

  // Analytics functions for advanced Pipeline Analytics dashboard
  getTimeSeriesAnalytics(userId: string, clientId?: number, period?: string): Promise<any>;
  getPipelineFlowAnalytics(userId: string, clientId?: number): Promise<any>;
  getOperationalAnalytics(userId: string, clientId?: number): Promise<any>;
  getProspectIntelligenceAnalytics(userId: string, clientId?: number): Promise<any>;
  getResponseTimingAnalytics(userId: string, clientId?: number, replyIoStats?: any): Promise<any>;
  getProspectQualityAnalytics(userId: string, clientId?: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // REF: Ensure database is initialized before operations
  private async ensureInitialized() {
    await storageInitialization;
  }

  // REF: Helper function to get current timestamp in appropriate format
  private getCurrentTimestamp(): string | Date {
    if (process.env.NODE_ENV === 'development') {
      // REF: SQLite uses ISO string format for timestamps
      return new Date().toISOString();
    } else {
      // REF: PostgreSQL uses Date objects
      return new Date();
    }
  }

  // REF: Helper function to parse JSON for SQLite compatibility
  private parseJsonField(field: any): any {
    if (process.env.NODE_ENV === 'development' && typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return field;
      }
    }
    return field;
  }

  // REF: Helper function to stringify JSON for SQLite storage
  private stringifyJsonField(field: any): string | any {
    if (process.env.NODE_ENV === 'development' && field && typeof field === 'object') {
      return JSON.stringify(field);
    }
    return field;
  }

  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<any> {
    await this.ensureInitialized();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<any> {
    await this.ensureInitialized();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: any): Promise<any> {
    await this.ensureInitialized();
    const timestampedData = {
      ...userData,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    const [user] = await db
      .insert(users)
      .values(timestampedData)
      .returning();
    return user;
  }

  async upsertUser(userData: any): Promise<any> {
    await this.ensureInitialized();
    const timestampedData = {
      ...userData,
      updatedAt: this.getCurrentTimestamp(),
    };

    if (process.env.NODE_ENV === 'development') {
      // REF: SQLite doesn't support onConflictDoUpdate, use manual upsert
      const existingUser = await this.getUser(userData.id);
      if (existingUser) {
        const [user] = await db
          .update(users)
          .set(timestampedData)
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      } else {
        const [user] = await db
          .insert(users)
          .values({
            ...timestampedData,
            createdAt: this.getCurrentTimestamp(),
          })
          .returning();
        return user;
      }
    } else {
      // REF: PostgreSQL supports proper upsert
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: timestampedData,
        })
        .returning();
      return user;
    }
  }

  async updateUser(id: string, updates: any): Promise<any> {
    await this.ensureInitialized();
    const updateData = {
      ...updates,
      updatedAt: this.getCurrentTimestamp(),
    };

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    await this.ensureInitialized();
    const updateData = {
      ...preferences,
      updatedAt: this.getCurrentTimestamp(),
    };

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  // Client operations - for multi-tenant support
  async getClientsByUser(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    return await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));
  }

  async getClientsWithCounts(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    
    // Get all clients for the user
    const userClients = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));

    // Get counts for each client
    const clientsWithCounts = await Promise.all(
      userClients.map(async (client) => {
        // Count prospects for this client
        const [prospectCount] = await db
          .select({ count: count() })
          .from(prospects)
          .where(eq(prospects.clientId, client.id));

        // Count API keys (Reply.io accounts) for this client
        const [apiKeyCount] = await db
          .select({ count: count() })
          .from(replyioAccounts)
          .where(eq(replyioAccounts.clientId, client.id));

        // Count campaigns for this client (via accounts)
        const clientAccounts = await db
          .select({ id: replyioAccounts.id })
          .from(replyioAccounts)
          .where(eq(replyioAccounts.clientId, client.id));
        
        let campaignCount = 0;
        if (clientAccounts.length > 0) {
          const accountIds = clientAccounts.map(acc => acc.id);
          for (const accountId of accountIds) {
            const [campaignCountResult] = await db
              .select({ count: count() })
              .from(replyioCampaigns)
              .where(eq(replyioCampaigns.accountId, accountId));
            campaignCount += campaignCountResult.count;
          }
        }

        return {
          ...client,
          prospectCount: prospectCount.count || 0,
          apiKeyCount: apiKeyCount.count || 0,
          campaignCount: campaignCount || 0,
        };
      })
    );

    return clientsWithCounts;
  }

  async getClient(id: number): Promise<any> {
    await this.ensureInitialized();
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async createClient(clientData: any): Promise<any> {
    await this.ensureInitialized();
    const timestampedData = {
      ...clientData,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    const [client] = await db
      .insert(clients)
      .values(timestampedData)
      .returning();
    return client;
  }

  async updateClient(id: number, updates: any): Promise<any> {
    await this.ensureInitialized();
    const updateData = {
      ...updates,
      updatedAt: this.getCurrentTimestamp(),
    };

    const [client] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id));
    return result.changes > 0;
  }

  async getDefaultClient(userId: string): Promise<any> {
    await this.ensureInitialized();
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(clients.createdAt)
      .limit(1);
    return client;
  }

  // Prospect operations
  async createProspect(prospect: any): Promise<any> {
    await this.ensureInitialized();
    const prospectData = {
      ...prospect,
      researchResults: this.stringifyJsonField(prospect.researchResults),
      webhookPayload: this.stringifyJsonField(prospect.webhookPayload),
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    const [newProspect] = await db
      .insert(prospects)
      .values(prospectData)
      .returning();
    
    // REF: Parse JSON fields for consistent return format
    return {
      ...newProspect,
      researchResults: this.parseJsonField(newProspect.researchResults),
      webhookPayload: this.parseJsonField(newProspect.webhookPayload),
    };
  }

  async getProspect(id: number): Promise<any> {
    await this.ensureInitialized();
    const [prospect] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, id));
    
    if (!prospect) return undefined;

    // REF: Parse JSON fields for SQLite compatibility
    return {
      ...prospect,
      researchResults: this.parseJsonField(prospect.researchResults),
      webhookPayload: this.parseJsonField(prospect.webhookPayload),
    };
  }

  async getProspectsByUser(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    const results = await db
      .select()
      .from(prospects)
      .where(eq(prospects.userId, userId))
      .orderBy(desc(prospects.createdAt));

    // REF: Parse JSON fields for each prospect
    return results.map((prospect: any) => ({
      ...prospect,
      researchResults: this.parseJsonField(prospect.researchResults),
      webhookPayload: this.parseJsonField(prospect.webhookPayload),
    }));
  }

  async getProspectsByClient(userId: string, clientId: number): Promise<any[]> {
    await this.ensureInitialized();
    const results = await db
      .select()
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.clientId, clientId)))
      .orderBy(desc(prospects.createdAt));

    // REF: Parse JSON fields for each prospect
    return results.map(prospect => ({
      ...prospect,
      researchResults: this.parseJsonField(prospect.researchResults),
      webhookPayload: this.parseJsonField(prospect.webhookPayload),
    }));
  }

  async updateProspectStatus(
    id: number, 
    status: string, 
    results?: any, 
    errorMessage?: string
  ): Promise<any> {
    await this.ensureInitialized();
    const updateData: any = {
      status,
      updatedAt: this.getCurrentTimestamp(),
    };

    if (results !== undefined) {
      updateData.researchResults = this.stringifyJsonField(results);
    }

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    const [updatedProspect] = await db
      .update(prospects)
      .set(updateData)
      .where(eq(prospects.id, id))
      .returning();

    if (!updatedProspect) return undefined;

    // REF: Parse JSON fields for consistent return format
    return {
      ...updatedProspect,
      researchResults: this.parseJsonField(updatedProspect.researchResults),
      webhookPayload: this.parseJsonField(updatedProspect.webhookPayload),
    };
  }

  async searchProspects(userId: string, query?: string, status?: string, clientId?: number): Promise<any[]> {
    await this.ensureInitialized();
    let whereClause: any = eq(prospects.userId, userId);
    
    if (query) {
      const searchClause = process.env.NODE_ENV === 'development' 
        ? sql`(
            ${prospects.firstName} LIKE ${`%${query}%`} OR 
            ${prospects.lastName} LIKE ${`%${query}%`} OR 
            ${prospects.company} LIKE ${`%${query}%`} OR 
            ${prospects.email} LIKE ${`%${query}%`}
          )`
        : sql`(
            ${prospects.firstName} ILIKE ${`%${query}%`} OR 
            ${prospects.lastName} ILIKE ${`%${query}%`} OR 
            ${prospects.company} ILIKE ${`%${query}%`} OR 
            ${prospects.email} ILIKE ${`%${query}%`}
          )`;
      whereClause = and(whereClause, searchClause) || whereClause;
    }
    
    if (status && status !== 'all') {
      whereClause = and(whereClause, eq(prospects.status, status)) || whereClause;
    }

    // REF: Filter by clientId for multi-tenant workspace isolation
    if (clientId) {
      whereClause = and(whereClause, eq(prospects.clientId, clientId)) || whereClause;
    }

    const results = await db
      .select()
      .from(prospects)
      .where(whereClause)
      .orderBy(desc(prospects.createdAt));

    // REF: Parse JSON fields for each prospect
    return results.map((prospect: any) => ({
      ...prospect,
      researchResults: this.parseJsonField(prospect.researchResults),
      webhookPayload: this.parseJsonField(prospect.webhookPayload),
    }));
  }

  // CSV upload operations
  async createCsvUpload(upload: any): Promise<any> {
    await this.ensureInitialized();
    const uploadData = {
      ...upload,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    const [newUpload] = await db
      .insert(csvUploads)
      .values(uploadData)
      .returning();
    return newUpload;
  }

  async updateCsvUploadProgress(
    id: number, 
    processedRows: number, 
    status?: string
  ): Promise<any> {
    await this.ensureInitialized();
    const updateData: any = {
      processedRows,
      updatedAt: this.getCurrentTimestamp(),
    };
    
    if (status) {
      updateData.status = status;
    }

    const [updatedUpload] = await db
      .update(csvUploads)
      .set(updateData)
      .where(eq(csvUploads.id, id))
      .returning();
    return updatedUpload;
  }

  async getCsvUploadsByUser(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    return await db
      .select()
      .from(csvUploads)
      .where(eq(csvUploads.userId, userId))
      .orderBy(desc(csvUploads.createdAt));
  }

  async deleteProspect(id: number, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db
      .delete(prospects)
      .where(and(eq(prospects.id, id), eq(prospects.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<any> {
    await this.ensureInitialized();
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(userId: string, settingsData: any): Promise<any> {
    await this.ensureInitialized();
    const timestampedData = {
      ...settingsData,
      userId,
      updatedAt: this.getCurrentTimestamp(),
    };

    if (process.env.NODE_ENV === 'development') {
      // REF: SQLite doesn't support onConflictDoUpdate, use manual upsert
      const existingSettings = await this.getUserSettings(userId);
      if (existingSettings) {
        const [updatedSettings] = await db
          .update(userSettings)
          .set(timestampedData)
          .where(eq(userSettings.userId, userId))
          .returning();
        return updatedSettings;
      } else {
        const [newSettings] = await db
          .insert(userSettings)
          .values({
            ...timestampedData,
            createdAt: this.getCurrentTimestamp(),
          })
          .returning();
        return newSettings;
      }
    } else {
      // REF: PostgreSQL supports proper upsert
      const [upsertedSettings] = await db
        .insert(userSettings)
        .values(timestampedData)
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: timestampedData,
        })
        .returning();
      return upsertedSettings;
    }
  }

  // Reply.io account operations
  async createReplyioAccount(account: any): Promise<any> {
    await this.ensureInitialized();
    const accountData = {
      ...account,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    const [newAccount] = await db
      .insert(replyioAccounts)
      .values(accountData)
      .returning();
    return newAccount;
  }

  async getReplyioAccounts(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    return await db
      .select()
      .from(replyioAccounts)
      .where(eq(replyioAccounts.userId, userId))
      .orderBy(desc(replyioAccounts.createdAt));
  }

  async getReplyioAccount(id: number): Promise<any> {
    await this.ensureInitialized();
    const [account] = await db
      .select()
      .from(replyioAccounts)
      .where(eq(replyioAccounts.id, id));
    
    if (!account) return undefined;

    return account;
  }

  async updateReplyioAccount(id: number, updates: any): Promise<any> {
    await this.ensureInitialized();
    const updateData: any = {
      ...updates,
      updatedAt: this.getCurrentTimestamp(),
    };

    const [updatedAccount] = await db
      .update(replyioAccounts)
      .set(updateData)
      .where(eq(replyioAccounts.id, id))
      .returning();

    if (!updatedAccount) return undefined;

    return updatedAccount;
  }

  async deleteReplyioAccount(id: number): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db
      .delete(replyioAccounts)
      .where(eq(replyioAccounts.id, id))
      .returning();
    
    return result.length > 0;
  }

  async setDefaultReplyioAccount(userId: string, accountId: number): Promise<any> {
    await this.ensureInitialized();
    const [updatedAccount] = await db
      .update(replyioAccounts)
      .set({
        isDefault: false,
        updatedAt: this.getCurrentTimestamp(),
      })
      .where(eq(replyioAccounts.userId, userId))
      .returning();

    const [defaultAccount] = await db
      .update(replyioAccounts)
      .set({
        isDefault: true,
        updatedAt: this.getCurrentTimestamp(),
      })
      .where(eq(replyioAccounts.id, accountId))
      .returning();

    return defaultAccount;
  }

  // Reply.io campaign operations
  async createReplyioCampaign(campaign: any): Promise<any> {
    await this.ensureInitialized();
    const campaignData = {
      ...campaign,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    const [newCampaign] = await db
      .insert(replyioCampaigns)
      .values(campaignData)
      .returning();
    return newCampaign;
  }

  // REF: Upsert campaign to handle existing campaigns during sync
  async upsertReplyioCampaign(campaign: any): Promise<any> {
    await this.ensureInitialized();
    const campaignData = {
      ...campaign,
      updatedAt: this.getCurrentTimestamp(),
    };

    if (process.env.NODE_ENV === 'development') {
      // REF: SQLite doesn't support onConflictDoUpdate for composite keys, use manual upsert
      const existingCampaign = await db
        .select()
        .from(replyioCampaigns)
        .where(and(
          eq(replyioCampaigns.accountId, campaign.accountId),
          eq(replyioCampaigns.campaignId, campaign.campaignId)
        ))
        .limit(1);

      if (existingCampaign.length > 0) {
        const [updatedCampaign] = await db
          .update(replyioCampaigns)
          .set(campaignData)
          .where(eq(replyioCampaigns.id, existingCampaign[0].id))
          .returning();
        return updatedCampaign;
      } else {
        const campaignDataWithCreated = {
          ...campaignData,
          createdAt: this.getCurrentTimestamp(),
        };
        const [newCampaign] = await db
          .insert(replyioCampaigns)
          .values(campaignDataWithCreated)
          .returning();
        return newCampaign;
      }
    } else {
      // REF: PostgreSQL supports proper upsert with composite key
      const campaignDataWithCreated = {
        ...campaignData,
        createdAt: this.getCurrentTimestamp(),
      };

      const [upsertedCampaign] = await db
        .insert(replyioCampaigns)
        .values(campaignDataWithCreated)
        .onConflictDoUpdate({
          target: [replyioCampaigns.accountId, replyioCampaigns.campaignId],
          set: {
            campaignName: campaignData.campaignName,
            campaignStatus: campaignData.campaignStatus,
            ownerEmail: campaignData.ownerEmail,
            updatedAt: campaignData.updatedAt,
          },
        })
        .returning();
      return upsertedCampaign;
    }
  }

  async getReplyioCampaigns(accountId: number): Promise<any[]> {
    await this.ensureInitialized();
    return await db
      .select()
      .from(replyioCampaigns)
      .where(eq(replyioCampaigns.accountId, accountId))
      .orderBy(desc(replyioCampaigns.createdAt));
  }

  async getReplyioCampaign(id: number): Promise<any> {
    await this.ensureInitialized();
    const [campaign] = await db
      .select()
      .from(replyioCampaigns)
      .where(eq(replyioCampaigns.id, id));
    
    if (!campaign) return undefined;

    return campaign;
  }

  async updateReplyioCampaign(id: number, updates: any): Promise<any> {
    await this.ensureInitialized();
    const updateData: any = {
      ...updates,
      updatedAt: this.getCurrentTimestamp(),
    };

    const [updatedCampaign] = await db
      .update(replyioCampaigns)
      .set(updateData)
      .where(eq(replyioCampaigns.id, id))
      .returning();

    if (!updatedCampaign) return undefined;

    return updatedCampaign;
  }

  async deleteReplyioCampaign(id: number): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db
      .delete(replyioCampaigns)
      .where(eq(replyioCampaigns.id, id))
      .returning();
    
    return result.length > 0;
  }

  async setDefaultReplyioCampaign(accountId: number, campaignId: number): Promise<any> {
    await this.ensureInitialized();
    const [updatedCampaign] = await db
      .update(replyioCampaigns)
      .set({
        isDefault: false,
        updatedAt: this.getCurrentTimestamp(),
      })
      .where(eq(replyioCampaigns.accountId, accountId))
      .returning();

    const [defaultCampaign] = await db
      .update(replyioCampaigns)
      .set({
        isDefault: true,
        updatedAt: this.getCurrentTimestamp(),
      })
      .where(eq(replyioCampaigns.id, campaignId))
      .returning();

    return defaultCampaign;
  }

  async getDefaultReplyioConfiguration(userId: string, clientId?: number): Promise<{ account: any, campaign: any } | null> {
    await this.ensureInitialized();
    
    // REF: Get the default account for the user, optionally filtered by client
    const baseCondition = and(
      eq(replyioAccounts.userId, userId),
      eq(replyioAccounts.isDefault, true)
    );
    
    const whereCondition = clientId 
      ? and(baseCondition, eq(replyioAccounts.clientId, clientId))
      : baseCondition;
    
    const accountResult = await db
      .select()
      .from(replyioAccounts)
      .where(whereCondition)
      .limit(1);

    if (accountResult.length === 0) {
      // REF: No default account, fall back to first account
      let fallbackCondition = eq(replyioAccounts.userId, userId);
      if (clientId) {
        fallbackCondition = and(eq(replyioAccounts.userId, userId), eq(replyioAccounts.clientId, clientId));
      }
      
      const fallbackAccount = await db
        .select()
        .from(replyioAccounts)
        .where(fallbackCondition)
        .orderBy(desc(replyioAccounts.createdAt))
        .limit(1);
      
      if (fallbackAccount.length === 0) {
        return null;
      }
      
      accountResult[0] = fallbackAccount[0];
    }

    // REF: Get the default campaign for the default account
    const campaignResult = await db
      .select()
      .from(replyioCampaigns)
      .where(and(
        eq(replyioCampaigns.accountId, accountResult[0].id),
        eq(replyioCampaigns.isDefault, true)
      ))
      .limit(1);

    if (campaignResult.length === 0) {
      // REF: No default campaign, fall back to first campaign for the account
      const fallbackCampaign = await db
        .select()
        .from(replyioCampaigns)
        .where(eq(replyioCampaigns.accountId, accountResult[0].id))
        .orderBy(desc(replyioCampaigns.createdAt))
        .limit(1);
      
      if (fallbackCampaign.length === 0) {
        return null;
      }
      
      campaignResult[0] = fallbackCampaign[0];
    }

    return {
      account: accountResult[0],
      campaign: campaignResult[0],
    };
  }

  // Prospect campaign tracking
  async updateProspectCampaign(prospectId: number, campaignId: number): Promise<any> {
    await this.ensureInitialized();
    const updateData: any = {
      sentToReplyioCampaignId: campaignId,
      updatedAt: this.getCurrentTimestamp(),
    };

    const [updatedProspect] = await db
      .update(prospects)
      .set(updateData)
      .where(eq(prospects.id, prospectId))
      .returning();

    if (!updatedProspect) return undefined;

    return updatedProspect;
  }

  async getProspectsByCampaign(userId: string, campaignId: number): Promise<any[]> {
    await this.ensureInitialized();
    const results = await db
      .select()
      .from(prospects)
      .where(and(
        eq(prospects.userId, userId), 
        sql`${prospects.sentToReplyioCampaignId} = ${campaignId}`
      ))
      .orderBy(desc(prospects.createdAt));

    // REF: Parse JSON fields for each prospect
    return results.map((prospect: any) => ({
      ...prospect,
      researchResults: this.parseJsonField(prospect.researchResults),
      webhookPayload: this.parseJsonField(prospect.webhookPayload),
    }));
  }

  async getUserStatsByCampaign(userId: string, campaignId: number): Promise<{
    totalProspects: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  }> {
    await this.ensureInitialized();
    const totalResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(
        eq(prospects.userId, userId), 
        sql`${prospects.sentToReplyioCampaignId} = ${campaignId}`
      ));

    const completedResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(
        eq(prospects.userId, userId), 
        eq(prospects.status, "completed"), 
        sql`${prospects.sentToReplyioCampaignId} = ${campaignId}`
      ));

    const processingResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(
        eq(prospects.userId, userId), 
        eq(prospects.status, "processing"), 
        sql`${prospects.sentToReplyioCampaignId} = ${campaignId}`
      ));

    const failedResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(
        eq(prospects.userId, userId), 
        eq(prospects.status, "failed"), 
        sql`${prospects.sentToReplyioCampaignId} = ${campaignId}`
      ));

    const totalProspects = totalResult[0]?.count || 0;
    const completed = completedResult[0]?.count || 0;
    const processing = processingResult[0]?.count || 0;
    const failed = failedResult[0]?.count || 0;

    const successRate = totalProspects > 0 ? Math.round((completed / totalProspects) * 100) : 0;

    return {
      totalProspects,
      completed,
      processing,
      failed,
      successRate,
    };
  }

  // Dashboard stats
  async getUserStats(userId: string, clientId?: number): Promise<{
    totalProspects: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  }> {
    await this.ensureInitialized();
    
    // REF: Base filter by userId, optionally filter by clientId for workspace isolation
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);
    
    const totalResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(baseWhere);

    const completedResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, "completed")));

    const processingResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, "processing")));

    const failedResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, "failed")));

    const totalProspects = totalResult[0]?.count || 0;
    const completed = completedResult[0]?.count || 0;
    const processing = processingResult[0]?.count || 0;
    const failed = failedResult[0]?.count || 0;

    const successRate = totalProspects > 0 ? Math.round((completed / totalProspects) * 100) : 0;

    return {
      totalProspects,
      completed,
      processing,
      failed,
      successRate,
    };
  }

  // Analytics functions for advanced Pipeline Analytics dashboard
  async getTimeSeriesAnalytics(userId: string, clientId?: number, period?: string): Promise<any> {
    await this.ensureInitialized();

    // REF: Set default period if not provided
    const analysisPeriod = period || '30d';

    // REF: Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (analysisPeriod) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // REF: Base filter by userId, optionally filter by clientId for workspace isolation
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);

    // REF: Get daily prospect upload counts (SQLite compatible)
    const dailyUploads = await db
      .select({
        date: sql`date(${prospects.createdAt})`.as('date'),
        count: count().as('count')
      })
      .from(prospects)
      .where(and(
        baseWhere,
        sql`${prospects.createdAt} >= ${startDate.toISOString()}`,
        sql`${prospects.createdAt} <= ${endDate.toISOString()}`
      ))
      .groupBy(sql`date(${prospects.createdAt})`)
      .orderBy(sql`date(${prospects.createdAt})`);

    // REF: Get daily completion counts (SQLite compatible)
    const dailyCompletions = await db
      .select({
        date: sql`date(${prospects.updatedAt})`.as('date'),
        count: count().as('count')
      })
      .from(prospects)
      .where(and(
        baseWhere,
        eq(prospects.status, 'completed'),
        sql`${prospects.updatedAt} >= ${startDate.toISOString()}`,
        sql`${prospects.updatedAt} <= ${endDate.toISOString()}`
      ))
      .groupBy(sql`date(${prospects.updatedAt})`)
      .orderBy(sql`date(${prospects.updatedAt})`);

    // REF: Calculate processing times for completed prospects (SQLite compatible)
    const processingTimes = await db
      .select({
        date: sql`date(${prospects.updatedAt})`.as('date'),
        avgProcessingTime: sql`avg(julianday(${prospects.updatedAt}) - julianday(${prospects.createdAt})) * 86400`.as('avgProcessingTime')
      })
      .from(prospects)
      .where(and(
        baseWhere,
        eq(prospects.status, 'completed'),
        sql`${prospects.updatedAt} >= ${startDate.toISOString()}`,
        sql`${prospects.updatedAt} <= ${endDate.toISOString()}`
      ))
      .groupBy(sql`date(${prospects.updatedAt})`)
      .orderBy(sql`date(${prospects.updatedAt})`);

    return {
      dailyUploads,
      dailyCompletions,
      processingTimes,
      period: analysisPeriod,
      startDate,
      endDate
    };
  }

  async getPipelineFlowAnalytics(userId: string, clientId?: number): Promise<any> {
    await this.ensureInitialized();
    
    // REF: Base filter by userId, optionally filter by clientId for workspace isolation
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);

    // REF: Count prospects at each stage
    const totalUploaded = await db
      .select({ count: count() })
      .from(prospects)
      .where(baseWhere);

    const researchCompleted = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, 'completed')));

    const sentToReply = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, sql`${prospects.sentToReplyioCampaignId} IS NOT NULL`));

    const processing = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, 'processing')));

    const failed = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, 'failed')));

    // REF: Build Sankey flow data structure
    const nodes = [
      { id: 'uploaded', name: 'Prospects Uploaded', value: totalUploaded[0]?.count || 0 },
      { id: 'completed', name: 'Research Completed', value: researchCompleted[0]?.count || 0 },
      { id: 'sent', name: 'Sent to Outreach', value: sentToReply[0]?.count || 0 },
      { id: 'processing', name: 'Processing', value: processing[0]?.count || 0 },
      { id: 'failed', name: 'Failed', value: failed[0]?.count || 0 }
    ];

    const links = [
      { source: 'uploaded', target: 'completed', value: researchCompleted[0]?.count || 0 },
      { source: 'uploaded', target: 'processing', value: processing[0]?.count || 0 },
      { source: 'uploaded', target: 'failed', value: failed[0]?.count || 0 },
      { source: 'completed', target: 'sent', value: sentToReply[0]?.count || 0 }
    ];

    return { nodes, links };
  }

  async getOperationalAnalytics(userId: string, clientId?: number): Promise<any> {
    await this.ensureInitialized();
    
    // REF: Base filter by userId, optionally filter by clientId for workspace isolation
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);

    // REF: Get error pattern analysis (SQLite compatible)
    const errorPatterns = await db
      .select({
        errorType: sql`CASE 
          WHEN ${prospects.errorMessage} LIKE '%timeout%' THEN 'Timeout'
          WHEN ${prospects.errorMessage} LIKE '%network%' THEN 'Network'
          WHEN ${prospects.errorMessage} LIKE '%linkedin%' THEN 'LinkedIn Access'
          WHEN ${prospects.errorMessage} IS NOT NULL THEN 'Other'
          ELSE 'No Error'
        END`.as('errorType'),
        count: count().as('count')
      })
      .from(prospects)
      .where(baseWhere)
      .groupBy(sql`CASE 
        WHEN ${prospects.errorMessage} LIKE '%timeout%' THEN 'Timeout'
        WHEN ${prospects.errorMessage} LIKE '%network%' THEN 'Network'
        WHEN ${prospects.errorMessage} LIKE '%linkedin%' THEN 'LinkedIn Access'
        WHEN ${prospects.errorMessage} IS NOT NULL THEN 'Other'
        ELSE 'No Error'
      END`);

    // REF: Get processing queue health (SQLite compatible)
    const queueHealth = await db
      .select({
        status: prospects.status,
        count: count().as('count'),
        avgAge: sql`avg((julianday('now') - julianday(${prospects.createdAt})) * 24)`.as('avgAge')
      })
      .from(prospects)
      .where(baseWhere)
      .groupBy(prospects.status);

    // REF: Get success rate by company size (from research results)
    const companySuccessRates = await db
      .select({
        company: prospects.company,
        status: prospects.status,
        hasResearch: sql`CASE WHEN ${prospects.researchResults} IS NOT NULL THEN 1 ELSE 0 END`.as('hasResearch')
      })
      .from(prospects)
      .where(baseWhere);

    return {
      errorPatterns,
      queueHealth,
      companySuccessRates,
      lastUpdated: new Date()
    };
  }

  async getProspectIntelligenceAnalytics(userId: string, clientId?: number): Promise<any> {
    await this.ensureInitialized();
    
    // REF: Base filter by userId, optionally filter by clientId for workspace isolation  
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);

    // REF: Get title/role distribution
    const titleDistribution = await db
      .select({
        title: prospects.title,
        count: count().as('count')
      })
      .from(prospects)
      .where(baseWhere)
      .groupBy(prospects.title)
      .orderBy(desc(count()));

    // REF: Get company distribution
    const companyDistribution = await db
      .select({
        company: prospects.company,
        count: count().as('count'),
        successRate: sql`AVG(CASE WHEN ${prospects.status} = 'completed' THEN 100.0 ELSE 0.0 END)`.as('successRate')
      })
      .from(prospects)
      .where(baseWhere)
      .groupBy(prospects.company)
      .orderBy(desc(count()));

    // REF: Get prospects with research results for analysis
    const prospectsWithResearch = await db
      .select({
        company: prospects.company,
        title: prospects.title,
        researchResults: prospects.researchResults,
        status: prospects.status
      })
      .from(prospects)
      .where(and(baseWhere, sql`${prospects.researchResults} IS NOT NULL`));

    // REF: Analyze industry patterns from research results
    const industryPatterns: any[] = [];
    const researchQuality: any[] = [];

    prospectsWithResearch.forEach((prospect) => {
      if (prospect.researchResults && typeof prospect.researchResults === 'object') {
        const research = prospect.researchResults as any;
        
        // Extract industry information if available
        if (research.companyInfo?.industry) {
          industryPatterns.push({
            industry: research.companyInfo.industry,
            company: prospect.company,
            status: prospect.status
          });
        }

        // Analyze research completeness
        const completeness = [
          research.companyInfo ? 1 : 0,
          research.personInfo ? 1 : 0,
          research.painPoints ? 1 : 0,
          research.personalizedMessage ? 1 : 0
        ].reduce((a, b) => a + b, 0) / 4 * 100;

        researchQuality.push({
          company: prospect.company,
          completeness,
          status: prospect.status
        });
      }
    });

    return {
      titleDistribution,
      companyDistribution,
      industryPatterns,
      researchQuality,
      totalAnalyzed: prospectsWithResearch.length
    };
  }

  async getResponseTimingAnalytics(userId: string, clientId?: number, replyIoStats?: any): Promise<any> {
    await this.ensureInitialized();
    
    // REF: Base filter by userId, optionally filter by clientId for workspace isolation
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);

    // REF: Get prospect creation timing patterns (SQLite compatible)
    const hourlyPattern = await db
      .select({
        hour: sql`strftime('%H', ${prospects.createdAt})`.as('hour'),
        count: count().as('count'),
        successRate: sql`avg(CASE WHEN ${prospects.status} = 'completed' THEN 100.0 ELSE 0.0 END)`.as('successRate')
      })
      .from(prospects)
      .where(baseWhere)
      .groupBy(sql`strftime('%H', ${prospects.createdAt})`)
      .orderBy(sql`strftime('%H', ${prospects.createdAt})`);

    const dailyPattern = await db
      .select({
        dayOfWeek: sql`strftime('%w', ${prospects.createdAt})`.as('dayOfWeek'),
        count: count().as('count'),
        successRate: sql`avg(CASE WHEN ${prospects.status} = 'completed' THEN 100.0 ELSE 0.0 END)`.as('successRate')
      })
      .from(prospects)
      .where(baseWhere)
      .groupBy(sql`strftime('%w', ${prospects.createdAt})`)
      .orderBy(sql`strftime('%w', ${prospects.createdAt})`);

    // REF: Calculate average processing times by time of day (SQLite compatible)
    const processingByHour = await db
      .select({
        hour: sql`strftime('%H', ${prospects.createdAt})`.as('hour'),
        avgProcessingTime: sql`avg((julianday(${prospects.updatedAt}) - julianday(${prospects.createdAt})) * 24)`.as('avgProcessingTime')
      })
      .from(prospects)
      .where(and(baseWhere, eq(prospects.status, 'completed')))
      .groupBy(sql`strftime('%H', ${prospects.createdAt})`)
      .orderBy(sql`strftime('%H', ${prospects.createdAt})`);

    return {
      hourlyPattern,
      dailyPattern,
      processingByHour,
      replyIoStats: replyIoStats || null,
      lastUpdated: new Date()
    };
  }

  async getProspectQualityAnalytics(userId: string, clientId?: number): Promise<any> {
    await this.ensureInitialized();
    
    // REF: Base filter by userId, optionally filter by clientId for workspace isolation
    const baseWhere = clientId 
      ? and(eq(prospects.userId, userId), eq(prospects.clientId, clientId))
      : eq(prospects.userId, userId);

    // REF: Get all prospects with research results for analysis
    const prospectData = await db
      .select({
        id: prospects.id,
        company: prospects.company,
        title: prospects.title,
        status: prospects.status,
        researchResults: prospects.researchResults,
        sentToReplyioCampaignId: prospects.sentToReplyioCampaignId,
        createdAt: prospects.createdAt,
        updatedAt: prospects.updatedAt
      })
      .from(prospects)
      .where(and(baseWhere, isNotNull(prospects.researchResults)));

    // REF: Calculate prospect quality metrics from research data
    const qualityAnalytics = prospectData.map((prospect: any) => {
      const research = prospect.researchResults;
      
      // REF: Calculate research depth score (0-100)
      const researchDepthScore = this.calculateResearchDepthScore(research);
      
      // REF: Calculate prospect authority score based on title and company
      const authorityScore = this.calculateAuthorityScore(research);
      
      // REF: Calculate industry attractiveness score
      const industryScore = this.calculateIndustryScore(research);
      
      // REF: Calculate personalization quality score
      const personalizationScore = this.calculatePersonalizationScore(research);
      
      // REF: Calculate company size indicator
      const companySizeScore = this.calculateCompanySizeScore(research);
      
      // REF: Overall prospect quality score (weighted average)
      const overallScore = Math.round(
        (researchDepthScore * 0.25) + 
        (authorityScore * 0.30) + 
        (industryScore * 0.20) + 
        (personalizationScore * 0.15) + 
        (companySizeScore * 0.10)
      );

      return {
        id: prospect.id,
        company: prospect.company,
        title: prospect.title,
        status: prospect.status,
        wasSentToReply: !!prospect.sentToReplyioCampaignId,
        industry: research?.industry || 'Unknown',
        location: research?.location || 'Unknown',
        scores: {
          overall: overallScore,
          researchDepth: researchDepthScore,
          authority: authorityScore,
          industry: industryScore,
          personalization: personalizationScore,
          companySize: companySizeScore
        },
        painPointsCount: this.extractPainPointsCount(research),
        businessGoalsSpecificity: this.extractBusinessGoalsSpecificity(research),
        industryCategory: this.categorizeIndustry(research?.industry)
      };
    });

    // REF: Calculate industry performance metrics
    const industryPerformance = this.calculateIndustryPerformance(qualityAnalytics);
    
    // REF: Calculate authority level performance
    const authorityPerformance = this.calculateAuthorityPerformance(qualityAnalytics);
    
    // REF: Calculate research ROI metrics
    const researchROI = this.calculateResearchROIMetrics(qualityAnalytics);

    return {
      prospects: qualityAnalytics,
      industryPerformance,
      authorityPerformance,
      researchROI,
      totalAnalyzed: qualityAnalytics.length,
      averageQualityScore: Math.round(
        qualityAnalytics.reduce((sum, p) => sum + p.scores.overall, 0) / qualityAnalytics.length
      ),
      lastUpdated: new Date()
    };
  }

  // REF: Helper function to calculate research depth score based on content quality
  private calculateResearchDepthScore(research: any): number {
    if (!research) return 0;
    
    let score = 0;
    
    // REF: Industry analysis depth (0-25 points)
    const industryLength = research.industry?.length || 0;
    score += Math.min(25, Math.floor(industryLength / 50));
    
    // REF: Pain points specificity (0-25 points)
    const painPointsLength = research.painPoints?.length || 0;
    score += Math.min(25, Math.floor(painPointsLength / 40));
    
    // REF: Business goals detail (0-20 points)
    const businessGoalsLength = research.businessGoals?.length || 0;
    score += Math.min(20, Math.floor(businessGoalsLength / 35));
    
    // REF: Competitive analysis presence (0-15 points)
    if (research.competitors && research.competitors.length > 100) score += 15;
    else if (research.competitors && research.competitors.length > 50) score += 10;
    else if (research.competitors) score += 5;
    
    // REF: Company news and research (0-15 points)
    if (research.companyNews && research.companyNews !== 'No major company news') score += 8;
    if (research.locationResearch && research.locationResearch.length > 100) score += 7;
    
    return Math.min(100, score);
  }

  // REF: Helper function to calculate prospect authority score based on title and company
  private calculateAuthorityScore(research: any): number {
    if (!research) return 0;
    
    const title = research.primaryJobTitle?.toLowerCase() || research.title?.toLowerCase() || '';
    let score = 0;
    
    // REF: Executive level titles (70-100 points)
    if (title.includes('ceo') || title.includes('president') || title.includes('founder')) score = 100;
    else if (title.includes('vp') || title.includes('vice president') || title.includes('chief')) score = 90;
    else if (title.includes('director') || title.includes('head of')) score = 80;
    else if (title.includes('managing director') || title.includes('principal')) score = 85;
    
    // REF: Manager level titles (40-70 points)
    else if (title.includes('senior manager') || title.includes('manager')) score = 65;
    else if (title.includes('senior') && (title.includes('analyst') || title.includes('specialist'))) score = 55;
    else if (title.includes('lead') || title.includes('supervisor')) score = 50;
    
    // REF: Individual contributor titles (20-40 points)
    else if (title.includes('analyst') || title.includes('specialist') || title.includes('coordinator')) score = 35;
    else score = 25; // Default for other titles
    
    // REF: Company size bonus (based on description indicators)
    const industry = research.industry?.toLowerCase() || '';
    if (industry.includes('billion') || industry.includes('fortune')) score += 15;
    else if (industry.includes('million') || industry.includes('large')) score += 10;
    else if (industry.includes('established') || industry.includes('leading')) score += 5;
    
    return Math.min(100, score);
  }

  // REF: Helper function to calculate industry attractiveness score
  private calculateIndustryScore(research: any): number {
    if (!research) return 50; // Default neutral score
    
    const industry = research.industry?.toLowerCase() || '';
    
    // REF: High-value industries (technology, finance, healthcare)
    if (industry.includes('technology') || industry.includes('software') || industry.includes('saas')) return 95;
    if (industry.includes('finance') || industry.includes('banking') || industry.includes('investment')) return 90;
    if (industry.includes('healthcare') || industry.includes('medical') || industry.includes('pharmaceutical')) return 85;
    if (industry.includes('real estate') || industry.includes('property') || industry.includes('development')) return 80;
    
    // REF: Medium-value industries
    if (industry.includes('manufacturing') || industry.includes('construction') || industry.includes('engineering')) return 70;
    if (industry.includes('consulting') || industry.includes('professional services')) return 75;
    if (industry.includes('education') || industry.includes('university')) return 65;
    
    // REF: Nonprofit and government (lower budget but stable)
    if (industry.includes('nonprofit') || industry.includes('government') || industry.includes('public')) return 55;
    
    return 60; // Default for other industries
  }

  // REF: Helper function to calculate personalization quality score
  private calculatePersonalizationScore(research: any): number {
    if (!research) return 0;
    
    let score = 0;
    
    // REF: Email personalization quality (0-40 points)
    const emailBody = research.emailBody || research.fullOutput?.['Email Body'] || '';
    if (emailBody.includes(research.firstname)) score += 10;
    if (emailBody.includes(research.primaryJobCompany || research.company)) score += 10;
    if (emailBody.toLowerCase().includes('budget') || emailBody.toLowerCase().includes('cost')) score += 5;
    if (emailBody.length > 500) score += 10; // Detailed personalization
    else if (emailBody.length > 200) score += 5;
    
    // REF: Pain point alignment (0-30 points)
    const painPoints = research.painPoints?.toLowerCase() || '';
    if (painPoints.includes('specific') && painPoints.length > 200) score += 30;
    else if (painPoints.includes('challenge') && painPoints.length > 100) score += 20;
    else if (painPoints.length > 50) score += 10;
    
    // REF: Business goals specificity (0-30 points)
    const businessGoals = research.businessGoals?.toLowerCase() || '';
    if (businessGoals.includes('months') || businessGoals.includes('timeline')) score += 15;
    if (businessGoals.includes('specific') || businessGoals.includes('metric')) score += 15;
    
    return Math.min(100, score);
  }

  // REF: Helper function to calculate company size score
  private calculateCompanySizeScore(research: any): number {
    if (!research) return 50;
    
    const industry = research.industry?.toLowerCase() || '';
    const companyInfo = research.overallCompanySummary?.toLowerCase() || '';
    
    let score = 50; // Default medium size
    
    // REF: Look for size indicators
    if (industry.includes('fortune 500') || companyInfo.includes('billion')) score = 100;
    else if (industry.includes('large') || companyInfo.includes('million')) score = 85;
    else if (companyInfo.includes('established') || companyInfo.includes('leading')) score = 75;
    else if (industry.includes('startup') || companyInfo.includes('small')) score = 40;
    else if (industry.includes('nonprofit')) score = 45;
    
    // REF: Employee count indicators
    if (companyInfo.includes('3,000') || companyInfo.includes('thousand')) score += 20;
    else if (companyInfo.includes('hundreds')) score += 10;
    
    return Math.min(100, score);
  }

  // REF: Helper functions for extracting specific insights
  private extractPainPointsCount(research: any): number {
    const painPoints = research?.painPoints || '';
    return (painPoints.match(/including|challenge|issue|problem/gi) || []).length;
  }

  private extractBusinessGoalsSpecificity(research: any): number {
    const goals = research?.businessGoals || '';
    const specificTerms = goals.match(/\d+|months|quarter|year|metric|target|goal/gi) || [];
    return specificTerms.length;
  }

  private categorizeIndustry(industry: string): string {
    if (!industry) return 'Other';
    const lower = industry.toLowerCase();
    
    if (lower.includes('technology') || lower.includes('software')) return 'Technology';
    if (lower.includes('finance') || lower.includes('banking')) return 'Finance';
    if (lower.includes('healthcare') || lower.includes('medical')) return 'Healthcare';
    if (lower.includes('real estate') || lower.includes('property')) return 'Real Estate';
    if (lower.includes('manufacturing') || lower.includes('construction')) return 'Manufacturing';
    if (lower.includes('nonprofit') || lower.includes('housing')) return 'Nonprofit';
    if (lower.includes('education') || lower.includes('university')) return 'Education';
    if (lower.includes('consulting') || lower.includes('professional')) return 'Consulting';
    
    return 'Other';
  }

  private calculateIndustryPerformance(prospects: any[]): any[] {
    const industryMap = new Map();
    
    prospects.forEach(prospect => {
      const industry = prospect.industryCategory;
      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          industry,
          totalProspects: 0,
          sentToReply: 0,
          averageQualityScore: 0,
          totalQualityScore: 0
        });
      }
      
      const data = industryMap.get(industry);
      data.totalProspects++;
      if (prospect.wasSentToReply) data.sentToReply++;
      data.totalQualityScore += prospect.scores.overall;
    });
    
    return Array.from(industryMap.values()).map(data => ({
      ...data,
      averageQualityScore: Math.round(data.totalQualityScore / data.totalProspects),
      sendRate: Math.round((data.sentToReply / data.totalProspects) * 100)
    })).sort((a, b) => b.averageQualityScore - a.averageQualityScore);
  }

  private calculateAuthorityPerformance(prospects: any[]): any[] {
    const authorityBuckets = [
      { min: 90, max: 100, label: 'Executive' },
      { min: 70, max: 89, label: 'Senior Manager' },
      { min: 50, max: 69, label: 'Manager' },
      { min: 0, max: 49, label: 'Individual Contributor' }
    ];
    
    return authorityBuckets.map(bucket => {
      const prospectsInBucket = prospects.filter(p => 
        p.scores.authority >= bucket.min && p.scores.authority <= bucket.max
      );
      
      const sentCount = prospectsInBucket.filter(p => p.wasSentToReply).length;
      
      return {
        authorityLevel: bucket.label,
        totalProspects: prospectsInBucket.length,
        sentToReply: sentCount,
        sendRate: prospectsInBucket.length > 0 ? Math.round((sentCount / prospectsInBucket.length) * 100) : 0,
        averageQualityScore: prospectsInBucket.length > 0 ? 
          Math.round(prospectsInBucket.reduce((sum, p) => sum + p.scores.overall, 0) / prospectsInBucket.length) : 0
      };
    }).filter(data => data.totalProspects > 0);
  }

  private calculateResearchROIMetrics(prospects: any[]): any {
    const totalProspects = prospects.length;
    const sentProspects = prospects.filter(p => p.wasSentToReply).length;
    const highQualityProspects = prospects.filter(p => p.scores.overall >= 80).length;
    const averageResearchDepth = Math.round(
      prospects.reduce((sum, p) => sum + p.scores.researchDepth, 0) / totalProspects
    );
    
    return {
      totalProspects,
      sentProspects,
      sendRate: Math.round((sentProspects / totalProspects) * 100),
      highQualityProspects,
      highQualityRate: Math.round((highQualityProspects / totalProspects) * 100),
      averageResearchDepth,
      researchEfficiencyScore: Math.round((sentProspects / totalProspects) * averageResearchDepth)
    };
  }
}

// Export the storage instance
export const storage = new DatabaseStorage();

/**
 * REF: Update Reply.io campaign status
 * PURPOSE: Fix campaign statuses that have performance metrics stored incorrectly
 * @param {number} campaignId - Reply.io campaign ID
 * @param {number} accountId - Reply.io account ID
 * @param {string} status - Correct campaign status
 */
export async function updateReplyIoCampaignStatus(campaignId: number, accountId: number, status: string): Promise<void> {
  try {
    // REF: Update the campaign status using Drizzle ORM
    await db
      .update(replyioCampaigns)
      .set({
        campaignStatus: status,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(replyioCampaigns.campaignId, campaignId),
        eq(replyioCampaigns.accountId, accountId)
      ));
    
    console.log(`Updated campaign ${campaignId} status to: ${status}`);
  } catch (error) {
    console.error('Error updating campaign status:', error);
    throw error;
  }
}

/**
 * REF: Update prospect with n8n execution ID for tracking
 * PURPOSE: Link prospects to their n8n workflow executions for monitoring
 * @param {number} prospectId - Prospect ID
 * @param {number} userId - User ID for security
 * @param {string} executionId - n8n execution ID
 * @param {string} status - Current execution status
 * @returns {Promise<Object|null>} - Updated prospect or null if not found
 */
export async function updateProspectN8nExecution(
  prospectId: number, 
  userId: number, 
  executionId: string, 
  status: string
) {
  try {
    const database = await getDatabase();
    
    // REF: Update prospect with n8n execution tracking data
    const updateData: any = {
      n8nExecutionId: executionId,
      status: status,
      updatedAt: new Date()
    };
    
    const result = await database.db
      .update(prospects)
      .set(updateData)
      .where(
        and(
          eq(prospects.id, prospectId),
          eq(prospects.userId, userId)
        )
      )
      .returning();
    
    console.log(`[STORAGE] Updated prospect ${prospectId} with n8n execution ${executionId}`);
    return result[0] || null;
  } catch (error) {
    console.error('[STORAGE] Error updating prospect n8n execution:', error);
    throw error;
  }
}

/**
 * REF: Get prospects by status for monitoring
 * PURPOSE: Retrieve prospects in specific processing states
 * @param {number} userId - User ID for filtering
 * @param {string} status - Prospect status to filter by
 * @returns {Promise<Array>} - Array of prospects with specified status
 */
export async function getProspectsByStatus(userId: number, status: string) {
  try {
    const database = await getDatabase();
    
    const result = await database.db
      .select()
      .from(prospects)
      .where(
        and(
          eq(prospects.userId, userId),
          eq(prospects.status, status)
        )
      )
      .orderBy(desc(prospects.createdAt));
    
    console.log(`[STORAGE] Found ${result.length} prospects with status: ${status}`);
    return result;
  } catch (error) {
    console.error('[STORAGE] Error getting prospects by status:', error);
    throw error;
  }
}
