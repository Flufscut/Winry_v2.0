import {
  users,
  prospects,
  csvUploads,
  type User,
  type UpsertUser,
  type Prospect,
  type InsertProspect,
  type CsvUpload,
  type InsertCsvUpload,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Prospect operations
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  getProspect(id: number): Promise<Prospect | undefined>;
  getProspectsByUser(userId: string): Promise<Prospect[]>;
  updateProspectStatus(id: number, status: string, results?: any, errorMessage?: string): Promise<Prospect | undefined>;
  searchProspects(userId: string, query?: string, status?: string): Promise<Prospect[]>;
  
  // CSV upload operations
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  updateCsvUploadProgress(id: number, processedRows: number, status?: string): Promise<CsvUpload | undefined>;
  getCsvUploadsByUser(userId: string): Promise<CsvUpload[]>;
  
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
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Prospect operations
  async createProspect(prospect: InsertProspect): Promise<Prospect> {
    const [newProspect] = await db
      .insert(prospects)
      .values(prospect)
      .returning();
    return newProspect;
  }

  async getProspect(id: number): Promise<Prospect | undefined> {
    const [prospect] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, id));
    return prospect;
  }

  async getProspectsByUser(userId: string): Promise<Prospect[]> {
    return await db
      .select()
      .from(prospects)
      .where(eq(prospects.userId, userId))
      .orderBy(desc(prospects.createdAt));
  }

  async updateProspectStatus(
    id: number, 
    status: string, 
    results?: any, 
    errorMessage?: string
  ): Promise<Prospect | undefined> {
    const [updatedProspect] = await db
      .update(prospects)
      .set({
        status,
        researchResults: results,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, id))
      .returning();
    return updatedProspect;
  }

  async searchProspects(userId: string, query?: string, status?: string): Promise<Prospect[]> {
    let whereClause = eq(prospects.userId, userId);
    
    if (query) {
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
    
    if (status) {
      whereClause = and(whereClause, eq(prospects.status, status));
    }

    return await db
      .select()
      .from(prospects)
      .where(whereClause)
      .orderBy(desc(prospects.createdAt));
  }

  // CSV upload operations
  async createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload> {
    const [newUpload] = await db
      .insert(csvUploads)
      .values(upload)
      .returning();
    return newUpload;
  }

  async updateCsvUploadProgress(
    id: number, 
    processedRows: number, 
    status?: string
  ): Promise<CsvUpload | undefined> {
    const updateData: any = {
      processedRows,
      updatedAt: new Date(),
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

  async getCsvUploadsByUser(userId: string): Promise<CsvUpload[]> {
    return await db
      .select()
      .from(csvUploads)
      .where(eq(csvUploads.userId, userId))
      .orderBy(desc(csvUploads.createdAt));
  }

  // Dashboard stats
  async getUserStats(userId: string): Promise<{
    totalProspects: number;
    completed: number;
    processing: number;
    failed: number;
    successRate: number;
  }> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(prospects)
      .where(eq(prospects.userId, userId));

    const [completedResult] = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.status, "completed")));

    const [processingResult] = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.status, "processing")));

    const [failedResult] = await db
      .select({ count: count() })
      .from(prospects)
      .where(and(eq(prospects.userId, userId), eq(prospects.status, "failed")));

    const total = totalResult.count;
    const completed = completedResult.count;
    const processing = processingResult.count;
    const failed = failedResult.count;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalProspects: total,
      completed,
      processing,
      failed,
      successRate,
    };
  }
}

export const storage = new DatabaseStorage();
