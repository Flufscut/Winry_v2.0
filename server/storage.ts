/**
 * FILE: storage.ts
 * PURPOSE: Database storage operations with environment-specific schema handling
 * DEPENDENCIES: drizzle-orm, local or shared schema based on environment
 * LAST_UPDATED: Current date
 * 
 * REF: Main storage interface for all database operations
 * REF: Uses local SQLite schema for development, PostgreSQL schema for production
 * TODO: Add connection pooling for production environment
 */

import { eq, desc, and, count, sql } from "drizzle-orm";

// REF: Import appropriate schema based on environment
let users: any, prospects: any, csvUploads: any, userSettings: any, replyioAccounts: any, replyioCampaigns: any, db: any;

// REF: Initialize database connection and schema based on environment
async function initializeDatabase() {
  if (process.env.NODE_ENV === 'development') {
    // REF: Use local SQLite schema for development
    const localDb = await import('./db-local');
    users = localDb.users;
    prospects = localDb.prospects;
    csvUploads = localDb.csvUploads;
    userSettings = localDb.userSettings;
    replyioAccounts = localDb.replyioAccounts;
    replyioCampaigns = localDb.replyioCampaigns;
    db = localDb.db;
  } else {
    // REF: Use shared PostgreSQL schema for production
    const sharedSchema = await import('@shared/schema');
    const prodDb = await import('./db');
    users = sharedSchema.users;
    prospects = sharedSchema.prospects;
    csvUploads = sharedSchema.csvUploads;
    userSettings = sharedSchema.userSettings;
    replyioAccounts = sharedSchema.replyioAccounts;
    replyioCampaigns = sharedSchema.replyioCampaigns;
    db = prodDb.db;
  }
}

// REF: Initialize on module load
const dbInitPromise = initializeDatabase();

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<any>;
  upsertUser(user: any): Promise<any>;
  
  // Prospect operations
  createProspect(prospect: any): Promise<any>;
  getProspect(id: number): Promise<any>;
  getProspectsByUser(userId: string): Promise<any[]>;
  updateProspectStatus(id: number, status: string, results?: any, errorMessage?: string): Promise<any>;
  searchProspects(userId: string, query?: string, status?: string): Promise<any[]>;
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
  getReplyioCampaigns(accountId: number): Promise<any[]>;
  getReplyioCampaign(id: number): Promise<any>;
  updateReplyioCampaign(id: number, updates: any): Promise<any>;
  deleteReplyioCampaign(id: number): Promise<boolean>;
  setDefaultReplyioCampaign(accountId: number, campaignId: number): Promise<any>;
  getDefaultReplyioConfiguration(userId: string): Promise<{ account: any, campaign: any } | null>;
  
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
  getUserStats(userId: string): Promise<{
    totalProspects: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // REF: Ensure database is initialized before operations
  private async ensureInitialized() {
    await dbInitPromise;
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

  async searchProspects(userId: string, query?: string, status?: string): Promise<any[]> {
    await this.ensureInitialized();
    let whereClause = eq(prospects.userId, userId);
    
    if (query) {
      if (process.env.NODE_ENV === 'development') {
        // REF: SQLite uses LIKE instead of ILIKE
        whereClause = and(
          whereClause,
          sql`(
            ${prospects.firstName} LIKE ${`%${query}%`} OR 
            ${prospects.lastName} LIKE ${`%${query}%`} OR 
            ${prospects.company} LIKE ${`%${query}%`} OR 
            ${prospects.email} LIKE ${`%${query}%`}
          )`
        );
      } else {
        // REF: PostgreSQL supports ILIKE for case-insensitive search
        whereClause = and(
          whereClause,
          sql`(
            ${prospects.firstName} ILIKE ${`%${query}%`} OR 
            ${prospects.lastName} ILIKE ${`%${query}%`} OR 
            ${prospects.company} ILIKE ${`%${query}%`} OR 
            ${prospects.email} ILIKE ${`%${query}%`}
          )`
        );
      }
    }
    
    if (status && status !== 'all') {
      whereClause = and(whereClause, eq(prospects.status, status));
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

  async getDefaultReplyioConfiguration(userId: string): Promise<{ account: any, campaign: any } | null> {
    await this.ensureInitialized();
    
    // REF: Get the default account for the user
    const accountResult = await db
      .select()
      .from(replyioAccounts)
      .where(sql`${replyioAccounts.userId} = ${userId} AND ${replyioAccounts.isDefault} = 1`)
      .limit(1);

    if (accountResult.length === 0) {
      // REF: No default account, fall back to first account
      const fallbackAccount = await db
        .select()
        .from(replyioAccounts)
        .where(eq(replyioAccounts.userId, userId))
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
      .where(sql`${replyioCampaigns.accountId} = ${accountResult[0].id} AND ${replyioCampaigns.isDefault} = 1`)
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
  async getUserStats(userId: string): Promise<{
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
      .where(eq(prospects.userId, userId));

    const completedResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.status, "completed")));

    const processingResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.status, "processing")));

    const failedResult = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.status, "failed")));

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
