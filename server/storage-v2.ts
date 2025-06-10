import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, asc, count, sql, inArray, isNull } from "drizzle-orm";
import type { 
  User, 
  Organization, 
  Campaign,
  UserRole,
  Document,
  ProspectFeedback,
  InsertOrganization,
  InsertCampaign,
  InsertUserRole,
  InsertDocument,
  InsertProspectFeedback,
  InsertClient,
  Client,
  InsertProspect,
  Prospect,
  InsertCsvUpload,
  CsvUpload,
  InsertUserSettings,
  UserSettings,
  InsertReplyioAccount,
  ReplyioAccount,
  UpdateReplyioAccount,
  InsertReplyioCampaign,
  ReplyioCampaign,
  UpdateReplyioCampaign,
} from "../shared/schema-v2";
import {
  users,
  organizations,
  campaigns,
  userRoles,
  documents,
  prospectFeedback,
  clients,
  prospects,
  csvUploads,
  userSettings,
  replyioAccounts,
  replyioCampaigns,
  accountTiers,
} from "../shared/schema-v2";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client);

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

export class OrganizationService {
  // Create a new organization
  static async create(data: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(data).returning();
    return organization;
  }

  // Get organization by ID
  static async getById(id: string): Promise<Organization | null> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return result[0] || null;
  }

  // Get organization by user ID (primary organization)
  static async getByUserId(userId: string): Promise<Organization | null> {
    const result = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        tier: organizations.tier,
        settings: organizations.settings,
        billingEmail: organizations.billingEmail,
        billingStatus: organizations.billingStatus,
        usageLimits: organizations.usageLimits,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .innerJoin(users, eq(users.primaryOrganizationId, organizations.id))
      .where(eq(users.id, userId))
      .limit(1);
    return result[0] || null;
  }

  // Get organizations for a user (including roles)
  static async getForUser(userId: string): Promise<Array<Organization & { role: string }>> {
    const result = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        tier: organizations.tier,
        settings: organizations.settings,
        billingEmail: organizations.billingEmail,
        billingStatus: organizations.billingStatus,
        usageLimits: organizations.usageLimits,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        role: userRoles.role,
      })
      .from(organizations)
      .innerJoin(userRoles, eq(userRoles.organizationId, organizations.id))
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.isActive, true)
      ))
      .orderBy(asc(organizations.name));
    return result;
  }

  // Update organization
  static async update(id: string, data: Partial<InsertOrganization>): Promise<Organization | null> {
    const [organization] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return organization || null;
  }

  // Check if user has permission for organization
  static async checkUserPermission(userId: string, organizationId: string, permission?: string): Promise<boolean> {
    const result = await db
      .select({ role: userRoles.role, permissions: userRoles.permissions })
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.isActive, true)
      ))
      .limit(1);

    if (!result[0]) return false;

    // Admin role has all permissions
    if (result[0].role === 'admin') return true;

    // If specific permission is requested, check permissions object
    if (permission) {
      const permissions = result[0].permissions as Record<string, any>;
      return permissions[permission] === true;
    }

    return true; // User exists in organization
  }

  // Get account tier info
  static async getAccountTier(tier: string) {
    const result = await db
      .select()
      .from(accountTiers)
      .where(eq(accountTiers.name, tier))
      .limit(1);
    return result[0] || null;
  }
}

// ============================================================================
// USER ROLE MANAGEMENT
// ============================================================================

export class UserRoleService {
  // Add user to organization
  static async addUserToOrganization(data: InsertUserRole): Promise<UserRole> {
    const [userRole] = await db.insert(userRoles).values(data).returning();
    return userRole;
  }

  // Update user role
  static async updateRole(organizationId: string, userId: string, role: string, permissions: Record<string, any> = {}): Promise<UserRole | null> {
    const [userRole] = await db
      .update(userRoles)
      .set({ role, permissions, updatedAt: new Date() })
      .where(and(
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.userId, userId)
      ))
      .returning();
    return userRole || null;
  }

  // Remove user from organization
  static async removeUser(organizationId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(userRoles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.userId, userId)
      ));
    return result.rowCount > 0;
  }

  // Get organization members
  static async getOrganizationMembers(organizationId: string): Promise<Array<UserRole & { user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'> }>> {
    const result = await db
      .select({
        id: userRoles.id,
        organizationId: userRoles.organizationId,
        userId: userRoles.userId,
        role: userRoles.role,
        permissions: userRoles.permissions,
        isActive: userRoles.isActive,
        createdAt: userRoles.createdAt,
        updatedAt: userRoles.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(and(
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.isActive, true)
      ))
      .orderBy(asc(userRoles.role), asc(users.firstName));
    return result;
  }
}

// ============================================================================
// CAMPAIGN MANAGEMENT
// ============================================================================

export class CampaignService {
  // Create a new campaign
  static async create(data: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(data).returning();
    return campaign;
  }

  // Get campaign by ID (with org check)
  static async getById(id: string, organizationId: string): Promise<Campaign | null> {
    const result = await db
      .select()
      .from(campaigns)
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || null;
  }

  // Get campaigns for organization
  static async getForOrganization(organizationId: string, isActive?: boolean): Promise<Campaign[]> {
    const conditions = [eq(campaigns.organizationId, organizationId)];
    if (isActive !== undefined) {
      conditions.push(eq(campaigns.isActive, isActive));
    }

    const result = await db
      .select()
      .from(campaigns)
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt));
    return result;
  }

  // Update campaign
  static async update(id: string, organizationId: string, data: Partial<InsertCampaign>): Promise<Campaign | null> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ))
      .returning();
    return campaign || null;
  }

  // Update provisioning status
  static async updateProvisioningStatus(id: string, organizationId: string, status: string, provisioningStatus: Record<string, any>): Promise<Campaign | null> {
    const [campaign] = await db
      .update(campaigns)
      .set({ 
        status, 
        provisioningStatus, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ))
      .returning();
    return campaign || null;
  }

  // Delete campaign
  static async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .update(campaigns)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ));
    return result.rowCount > 0;
  }
}

// ============================================================================
// MULTI-TENANT LEGACY SERVICES (UPDATED)
// ============================================================================

export class ClientService {
  // Create client with organization context
  static async create(data: InsertClient, organizationId: string): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values({ ...data, organizationId })
      .returning();
    return client;
  }

  // Get client by ID with organization check
  static async getById(id: number, organizationId: string): Promise<Client | null> {
    const result = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, id),
        eq(clients.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || null;
  }

  // Get clients for organization and user
  static async getForUser(userId: string, organizationId: string): Promise<Client[]> {
    const result = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.userId, userId),
        eq(clients.organizationId, organizationId),
        eq(clients.isActive, true)
      ))
      .orderBy(asc(clients.name));
    return result;
  }

  // Get all clients for organization
  static async getForOrganization(organizationId: string): Promise<Client[]> {
    const result = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.organizationId, organizationId),
        eq(clients.isActive, true)
      ))
      .orderBy(asc(clients.name));
    return result;
  }

  // Update client
  static async update(id: number, organizationId: string, data: Partial<InsertClient>): Promise<Client | null> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(clients.id, id),
        eq(clients.organizationId, organizationId)
      ))
      .returning();
    return client || null;
  }

  // Delete client
  static async delete(id: number, organizationId: string): Promise<boolean> {
    const result = await db
      .update(clients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(clients.id, id),
        eq(clients.organizationId, organizationId)
      ));
    return result.rowCount > 0;
  }
}

export class ProspectService {
  // Create prospect with organization and campaign context
  static async create(data: InsertProspect, organizationId: string, campaignId?: string): Promise<Prospect> {
    const [prospect] = await db
      .insert(prospects)
      .values({ ...data, organizationId, campaignId })
      .returning();
    return prospect;
  }

  // Get prospect by ID with organization check
  static async getById(id: number, organizationId: string): Promise<Prospect | null> {
    const result = await db
      .select()
      .from(prospects)
      .where(and(
        eq(prospects.id, id),
        eq(prospects.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || null;
  }

  // Get prospects for campaign
  static async getForCampaign(campaignId: string, organizationId: string): Promise<Prospect[]> {
    const result = await db
      .select()
      .from(prospects)
      .where(and(
        eq(prospects.campaignId, campaignId),
        eq(prospects.organizationId, organizationId)
      ))
      .orderBy(desc(prospects.createdAt));
    return result;
  }

  // Get prospects for client
  static async getForClient(clientId: number, organizationId: string): Promise<Prospect[]> {
    const result = await db
      .select()
      .from(prospects)
      .where(and(
        eq(prospects.clientId, clientId),
        eq(prospects.organizationId, organizationId)
      ))
      .orderBy(desc(prospects.createdAt));
    return result;
  }

  // Get prospects for organization with pagination
  static async getForOrganization(
    organizationId: string, 
    offset: number = 0, 
    limit: number = 50,
    campaignId?: string,
    status?: string
  ): Promise<{ prospects: Prospect[], total: number }> {
    const conditions = [eq(prospects.organizationId, organizationId)];
    
    if (campaignId) {
      conditions.push(eq(prospects.campaignId, campaignId));
    }
    
    if (status) {
      conditions.push(eq(prospects.status, status));
    }

    const [prospectsResult, totalResult] = await Promise.all([
      db
        .select()
        .from(prospects)
        .where(and(...conditions))
        .orderBy(desc(prospects.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(prospects)
        .where(and(...conditions))
    ]);

    return {
      prospects: prospectsResult,
      total: totalResult[0].count
    };
  }

  // Update prospect
  static async update(id: number, organizationId: string, data: Partial<InsertProspect>): Promise<Prospect | null> {
    const [prospect] = await db
      .update(prospects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(prospects.id, id),
        eq(prospects.organizationId, organizationId)
      ))
      .returning();
    return prospect || null;
  }

  // Update prospect status and results
  static async updateResearchResults(
    id: number, 
    organizationId: string, 
    status: string, 
    researchResults?: any, 
    errorMessage?: string
  ): Promise<Prospect | null> {
    const [prospect] = await db
      .update(prospects)
      .set({ 
        status, 
        researchResults, 
        errorMessage,
        updatedAt: new Date() 
      })
      .where(and(
        eq(prospects.id, id),
        eq(prospects.organizationId, organizationId)
      ))
      .returning();
    return prospect || null;
  }

  // Delete prospect
  static async delete(id: number, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(prospects)
      .where(and(
        eq(prospects.id, id),
        eq(prospects.organizationId, organizationId)
      ));
    return result.rowCount > 0;
  }

  // Get prospect statistics for organization
  static async getStats(organizationId: string, campaignId?: string): Promise<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const conditions = [eq(prospects.organizationId, organizationId)];
    if (campaignId) {
      conditions.push(eq(prospects.campaignId, campaignId));
    }

    const stats = await db
      .select({
        status: prospects.status,
        count: count()
      })
      .from(prospects)
      .where(and(...conditions))
      .groupBy(prospects.status);

    const result = {
      total: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    stats.forEach(stat => {
      result.total += stat.count;
      if (stat.status === 'processing') {
        result.processing = stat.count;
      } else if (stat.status === 'completed') {
        result.completed = stat.count;
      } else if (stat.status === 'failed') {
        result.failed = stat.count;
      }
    });

    return result;
  }
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export class DocumentService {
  // Create document
  static async create(data: InsertDocument, organizationId: string): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values({ ...data, organizationId })
      .returning();
    return document;
  }

  // Get document by ID with organization check
  static async getById(id: string, organizationId: string): Promise<Document | null> {
    const result = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || null;
  }

  // Get documents for organization
  static async getForOrganization(organizationId: string, campaignId?: string): Promise<Document[]> {
    const conditions = [eq(documents.organizationId, organizationId)];
    if (campaignId) {
      conditions.push(eq(documents.campaignId, campaignId));
    }

    const result = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
    return result;
  }

  // Update document processing status
  static async updateProcessingStatus(
    id: string, 
    organizationId: string, 
    status: string, 
    contentText?: string,
    embeddingVector?: any
  ): Promise<Document | null> {
    const updateData: any = { 
      processingStatus: status, 
      updatedAt: new Date() 
    };
    
    if (contentText) updateData.contentText = contentText;
    if (embeddingVector) updateData.embeddingVector = embeddingVector;

    const [document] = await db
      .update(documents)
      .set(updateData)
      .where(and(
        eq(documents.id, id),
        eq(documents.organizationId, organizationId)
      ))
      .returning();
    return document || null;
  }

  // Delete document
  static async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.organizationId, organizationId)
      ));
    return result.rowCount > 0;
  }
}

// ============================================================================
// FEEDBACK MANAGEMENT
// ============================================================================

export class FeedbackService {
  // Create feedback
  static async create(data: InsertProspectFeedback, organizationId: string): Promise<ProspectFeedback> {
    const [feedback] = await db
      .insert(prospectFeedback)
      .values({ ...data, organizationId })
      .returning();
    return feedback;
  }

  // Get feedback for prospect
  static async getForProspect(prospectId: number, organizationId: string): Promise<ProspectFeedback[]> {
    const result = await db
      .select()
      .from(prospectFeedback)
      .where(and(
        eq(prospectFeedback.prospectId, prospectId),
        eq(prospectFeedback.organizationId, organizationId)
      ))
      .orderBy(desc(prospectFeedback.createdAt));
    return result;
  }

  // Get feedback analytics for organization
  static async getAnalytics(organizationId: string, feedbackType?: string): Promise<{
    averageRating: number;
    totalFeedback: number;
    ratingDistribution: Record<number, number>;
  }> {
    const conditions = [eq(prospectFeedback.organizationId, organizationId)];
    if (feedbackType) {
      conditions.push(eq(prospectFeedback.feedbackType, feedbackType));
    }

    const stats = await db
      .select({
        rating: prospectFeedback.rating,
        count: count()
      })
      .from(prospectFeedback)
      .where(and(...conditions))
      .groupBy(prospectFeedback.rating);

    let totalFeedback = 0;
    let totalRating = 0;
    const ratingDistribution: Record<number, number> = {};

    stats.forEach(stat => {
      totalFeedback += stat.count;
      totalRating += stat.rating * stat.count;
      ratingDistribution[stat.rating] = stat.count;
    });

    return {
      averageRating: totalFeedback > 0 ? totalRating / totalFeedback : 0,
      totalFeedback,
      ratingDistribution
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Initialize default organization for user
export async function ensureUserHasOrganization(user: User): Promise<Organization> {
  // Check if user already has a primary organization
  if (user.primaryOrganizationId) {
    const org = await OrganizationService.getById(user.primaryOrganizationId);
    if (org) return org;
  }

  // Create a new individual organization for the user
  const organization = await OrganizationService.create({
    name: `${user.firstName || user.email}'s Organization`,
    tier: 'individual',
    billingEmail: user.email || undefined,
  });

  // Add user as admin to the organization
  await UserRoleService.addUserToOrganization({
    organizationId: organization.id,
    userId: user.id,
    role: 'admin',
    permissions: {
      prospects: { create: true, read: true, update: true, delete: true },
      campaigns: { manage: true },
      analytics: { view: true },
      settings: { admin: true },
      organization: { manage: true },
      users: { invite: true }
    }
  });

  // Update user's primary organization
  await db
    .update(users)
    .set({ primaryOrganizationId: organization.id })
    .where(eq(users.id, user.id));

  return organization;
}

// Create security context for multi-tenant operations
export interface SecurityContext {
  userId: string;
  organizationId: string;
  role: string;
  permissions: Record<string, any>;
}

export async function createSecurityContext(userId: string, organizationId?: string): Promise<SecurityContext | null> {
  // If no organization specified, use user's primary organization
  if (!organizationId) {
    const user = await db
      .select({ primaryOrganizationId: users.primaryOrganizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user[0]?.primaryOrganizationId) return null;
    organizationId = user[0].primaryOrganizationId;
  }

  // Get user's role and permissions for the organization
  const userRole = await db
    .select({ role: userRoles.role, permissions: userRoles.permissions })
    .from(userRoles)
    .where(and(
      eq(userRoles.userId, userId),
      eq(userRoles.organizationId, organizationId),
      eq(userRoles.isActive, true)
    ))
    .limit(1);

  if (!userRole[0]) return null;

  return {
    userId,
    organizationId,
    role: userRole[0].role,
    permissions: userRole[0].permissions as Record<string, any>
  };
}

// Export existing services for backwards compatibility (these now include org context)
export * from "../server/storage";

// Re-export new services
export {
  OrganizationService,
  UserRoleService,
  CampaignService,
  ClientService,
  ProspectService,
  DocumentService,
  FeedbackService
}; 