import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateProspectN8nExecution, getProspectsByStatus } from './storage';
import { setupAuth, requireAuth, addDevLoginEndpoint } from "./auth-simple";
import { replyIoService } from "./replyio-service";
import { replyIoCachedService } from "./reply-io-cached-service";
import { apiCacheManager } from "./api-cache";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { eq, count, desc, sql } from "drizzle-orm";
import fs from 'fs';

// REF: Import unified database system and schema
import { getDatabase } from './db.js';
// REF: Don't import shared schema directly - get it from database instance
// import * as sharedSchema from '@shared/schema.js';

// REF: Temporary direct import of validation schemas to fix prospect creation
// import { insertProspectSchema, insertClientSchema } from './db-local.js';

// REF: Inline validation schemas to ensure they're available at runtime
const insertProspectSchema = z.object({
  userId: z.string(),
  clientId: z.number(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Title is required"),
  email: z.string().email("Valid email is required"),
  linkedinUrl: z.string().optional(),
});

const insertClientSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Client name is required"),
  description: z.string().optional(),
});

// REF: Verify schema is properly initialized
console.log('✅ Schema initialized:', { 
  insertProspectSchema: typeof insertProspectSchema,
  insertClientSchema: typeof insertClientSchema 
});



// REF: Function to send prospects to n8n for research processing
async function processBatchResearch(prospects: Array<{id: number, data: any}>, batchSize: number) {
  console.log(`🔬 Research batch processing requested for ${prospects.length} prospects (batch size: ${batchSize})`);
  
  const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e";
  
  for (const prospect of prospects) {
    try {
      // Mark prospect as processing first
      await storage.updateProspectStatus(prospect.id, 'processing');
      console.log(`✅ Marked prospect ${prospect.id} as processing`);
      
      // Send prospect data to n8n webhook for research
      // REF: n8n expects an array of objects with specific field names (with spaces)
      const n8nPayload = [{
        "First Name": prospect.data.firstName,
        "Last Name": prospect.data.lastName,
        "LinkedIn": prospect.data.linkedinUrl || "",
        "Title": prospect.data.title,
        "Company": prospect.data.company,
        "EMail": prospect.data.email
      }];
      
      console.log(`🚀 Sending prospect ${prospect.id} to n8n webhook:`, n8nPayload);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload)
      });
      
      if (response.ok) {
        console.log(`✅ Successfully sent prospect ${prospect.id} to n8n webhook`);
      } else {
        console.error(`❌ Failed to send prospect ${prospect.id} to n8n webhook: ${response.status} ${response.statusText}`);
        await storage.updateProspectStatus(prospect.id, 'error', null, `Failed to send to n8n: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to process prospect ${prospect.id}:`, error);
      await storage.updateProspectStatus(prospect.id, 'error', null, `Processing error: ${error.message}`);
    }
  }
}

// REF: Function to process CSV prospects and create them in the database
async function processCsvProspects(uploadId: number, userId: string, clientId: number, records: any[], mapping: any, hasHeaders: boolean, batchSize: number) {
  console.log(`📊 CSV processing started for upload ${uploadId}: ${records.length} records (batch size: ${batchSize})`);
  
  let processedCount = 0;
  let errorCount = 0;
  const createdProspects = [];
  
  try {
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, Math.min(i + batchSize, records.length));
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
      
      for (const record of batch) {
        try {
          // Map CSV columns to prospect fields
          const prospectData = {
            userId,
            clientId,
            firstName: record[mapping.firstName] || '',
            lastName: record[mapping.lastName] || '',
            company: record[mapping.company] || '',
            title: record[mapping.title] || '',
            email: record[mapping.email] || '',
            linkedinUrl: record[mapping.linkedinUrl] || '',
          };
          
          // Validate required fields
          if (!prospectData.firstName || !prospectData.lastName || !prospectData.company || !prospectData.title || !prospectData.email) {
            console.error(`❌ Skipping record with missing required fields:`, prospectData);
            errorCount++;
            continue;
          }
          
          // Create prospect in database
          const prospect = await storage.createProspect(prospectData);
          createdProspects.push({ id: prospect.id, data: prospectData });
          processedCount++;
          
          console.log(`✅ Created prospect ${prospect.id}: ${prospectData.firstName} ${prospectData.lastName}`);
          
        } catch (error) {
          console.error(`❌ Failed to create prospect from CSV record:`, error);
          errorCount++;
        }
      }
      
      // Update progress after each batch
      await storage.updateCsvUploadProgress(uploadId, processedCount, 'processing');
      console.log(`📊 Progress: ${processedCount}/${records.length} processed, ${errorCount} errors`);
      
      // Send batch to n8n for research processing
      if (createdProspects.length > 0) {
        const batchToProcess = createdProspects.slice(-batch.length);
        console.log(`🔬 Sending ${batchToProcess.length} prospects to n8n for research`);
        await processBatchResearch(batchToProcess, batchSize);
      }
    }
    
    // Update final status
    const finalStatus = errorCount === 0 ? 'completed' : 'completed_with_errors';
    await storage.updateCsvUploadProgress(uploadId, processedCount, finalStatus);
    
    console.log(`✅ CSV processing completed: ${processedCount} prospects created, ${errorCount} errors`);
    
  } catch (error) {
    console.error(`❌ Fatal error during CSV processing:`, error);
    await storage.updateCsvUploadProgress(uploadId, processedCount, 'failed');
  }
}

// REF: REMOVED duplicate database initialization to prevent conflicts with storage.ts
// Storage module handles database initialization centrally to prevent duplicate systems loading
// This fixes the infinite authentication loop issue in Railway production
let users: any, db: any, replyioAccounts: any, replyioCampaigns: any;

// REF: Initialize schema from database instance (environment-specific)
async function initializeSchema() {
  const dbInstance = await getDatabase();
  db = dbInstance.db;
  users = dbInstance.schema.users;
  replyioAccounts = dbInstance.schema.replyioAccounts;
  replyioCampaigns = dbInstance.schema.replyioCampaigns;
}

// REF: Use storage module's database instance instead of initializing our own
// This prevents the critical issue where multiple modules initialize database simultaneously

// Default application settings
const DEFAULT_SETTINGS = {
  webhookUrl: process.env.N8N_WEBHOOK_URL || "https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e",
  webhookTimeoutSeconds: 1800, // 30 minutes for complex workflows
  maxRetries: 1, // Add one retry for 524 errors
  retryDelaySeconds: 30, // Longer delay between retries
  batchSize: 10,
};

// In-memory settings storage (could be moved to database later)
let appSettings = { ...DEFAULT_SETTINGS };

// Helper function to get current app settings
async function getAppSettings() {
  return appSettings;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// REF: Removed hardcoded webhook URL - now using dynamic settings

export async function registerRoutes(app: Express): Promise<Server> {
  // REF: Initialize schema from database instance (environment-specific)
  await initializeSchema();

  // REF: Create HTTP server instance
  const server = createServer(app);

  // Auth middleware
  await setupAuth(app); // REF: Multi-user auth system with OAuth support

  // Development helper endpoint
  if (process.env.NODE_ENV === 'development') {
    const { addDevLoginEndpoint } = await import('./auth-simple.js');
    addDevLoginEndpoint(app);
  }

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = req.user; // Simple auth already provides user object
      console.log('🔍 AUTH DEBUG: user =', JSON.stringify(user, null, 2));
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
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user" });
    }
  });

  // REF: Simple development login - redirects to login page with test credentials info
  app.get('/api/login', async (req: any, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        success: false, 
        message: 'Development login not available in production' 
      });
    }

    // REF: Redirect to login page in development 
    res.redirect('/login?dev=true');
  });

  // REF: Logout Route - Destroys session and redirects to login
  app.get('/api/logout', async (req: any, res) => {
    try {
      console.log('🔑 Processing logout request...');

      // REF: Clear session data
      req.session.destroy((err: any) => {
        if (err) {
          console.error('❌ Session destruction error:', err);
          return res.status(500).json({
            success: false,
            message: 'Logout failed',
          });
        }
        
        // REF: Clear session cookie
        res.clearCookie('connect.sid');
        
        console.log('✅ Logout successful');
        
        // REF: Redirect to login page after successful logout
        res.redirect('/login');
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  });

  // Profile routes
  app.put('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate profile data
      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required").max(50),
        lastName: z.string().min(1, "Last name is required").max(50),
        email: z.string().email("Valid email is required").max(255),
        profileImageUrl: z.string().url().optional().or(z.literal('')),
        bio: z.string().max(500).optional(),
      });

      const validatedData = profileSchema.parse(req.body);
      
      // For now, just return the current user data (updateUser method pending)
      // TODO: Implement storage.updateUser method
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Simulate update success
      res.json({ ...user, ...validatedData });
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update profile" });
      }
    }
  });

  // Preferences routes
  app.get('/api/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's preferences from database
      const user = await storage.getUser(userId);
      
      // Default preferences if none exist
      const defaultPreferences = {
        // Notification preferences
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        weeklyReports: true,
        
        // Appearance preferences
        theme: 'dark',
        compactMode: false,
        animationsEnabled: true,
        fontSize: 14,
        
        // Data & Privacy preferences
        dataRetention: 90,
        analyticsSharing: false,
        crashReporting: true,
        
        // System preferences
        autoSave: true,
        batchSize: 10,
        timeZone: 'UTC',
        language: 'en',
        
        // Performance preferences
        cacheEnabled: true,
        backgroundSync: true,
      };
      
      // Return user preferences or defaults
      const preferences = user?.preferences ? JSON.parse(user.preferences) : defaultPreferences;
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.put('/api/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validation schema for preferences
      const preferencesSchema = z.object({
        // Notification preferences
        emailNotifications: z.boolean(),
        pushNotifications: z.boolean(),
        marketingEmails: z.boolean(),
        weeklyReports: z.boolean(),
        
        // Appearance preferences
        theme: z.enum(['light', 'dark', 'system'], { 
          errorMap: () => ({ message: "Theme must be 'light', 'dark', or 'system'" })
        }),
        compactMode: z.boolean(),
        animationsEnabled: z.boolean(),
        fontSize: z.number().int().min(10, "Font size must be at least 10px").max(20, "Font size cannot exceed 20px"),
        
        // Data & Privacy preferences
        dataRetention: z.number().int().min(1, "Data retention must be at least 1 day").max(365, "Data retention cannot exceed 365 days"),
        analyticsSharing: z.boolean(),
        crashReporting: z.boolean(),
        
        // System preferences
        autoSave: z.boolean(),
        batchSize: z.number().int().min(1, "Batch size must be at least 1").max(100, "Batch size cannot exceed 100"),
        timeZone: z.string().min(1, "Time zone is required"),
        language: z.string().min(2, "Language code must be at least 2 characters").max(5, "Language code cannot exceed 5 characters"),
        
        // Performance preferences
        cacheEnabled: z.boolean(),
        backgroundSync: z.boolean(),
      });

      const validatedPreferences = preferencesSchema.parse(req.body);
      
      // Save preferences to user record
      await storage.updateUser(userId, { preferences: JSON.stringify(validatedPreferences) });
      
      res.json({ 
        success: true, 
        message: "Preferences updated successfully",
        preferences: validatedPreferences 
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update preferences" });
      }
    }
  });

  // Settings endpoints
  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const settings = await getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const settingsSchema = z.object({
        webhookUrl: z.string().url(),
        webhookTimeoutSeconds: z.number().min(1).max(3600),
        maxRetries: z.number().min(0).max(10),
        retryDelaySeconds: z.number().min(1).max(60),
        batchSize: z.number().min(1).max(100),
      });

      const validatedSettings = settingsSchema.parse(req.body);
      
      // Update in-memory settings
      appSettings = { ...appSettings, ...validatedSettings };
      
      res.json(appSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  // Dashboard stats
  app.get('/api/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { campaignId, filterByCampaign } = req.query;
      
      // REF: Get current client from session for workspace isolation
      let currentClientId = (req.session as any).currentClientId;
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      let stats;
      
      // REF: Only filter by campaign if explicitly requested with filterByCampaign=true
      // This allows showing all prospects in the main view while supporting campaign-specific filtering
      if (campaignId && campaignId !== 'all' && filterByCampaign === 'true') {
        stats = await storage.getUserStatsByCampaign(userId, parseInt(campaignId));
      } else {
        // REF: Use client-filtered stats for workspace isolation
        stats = await storage.getUserStats(userId, currentClientId);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get stats for a specific campaign
  app.get('/api/stats/campaign/:campaignId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { campaignId } = req.params;
      
      if (!campaignId || isNaN(parseInt(campaignId))) {
        return res.status(400).json({ message: "Valid campaign ID is required" });
      }
      
      const stats = await storage.getUserStatsByCampaign(userId, parseInt(campaignId));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats by campaign:", error);
      res.status(500).json({ message: "Failed to fetch stats by campaign" });
    }
  });

  // Get prospects with search and filter
  app.get('/api/prospects', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { search, status, campaignId, filterByCampaign } = req.query;
      
      // REF: Get current client from session for workspace isolation
      let currentClientId = (req.session as any).currentClientId;
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      // DEBUG: Log detailed information about the request
      console.log('🔍 /api/prospects - Debug Info:', {
        userId,
        currentClientId,
        search,
        status,
        campaignId,
        filterByCampaign,
        sessionData: {
          sessionId: req.session?.id || 'no session',
          allSessionKeys: Object.keys(req.session || {}),
          currentClientIdInSession: (req.session as any)?.currentClientId
        },
        timestamp: new Date().toISOString()
      });
      
      let prospects;
      
      // REF: Only filter by campaign if explicitly requested with filterByCampaign=true
      // This allows showing all prospects in the main view while supporting campaign-specific filtering
      if (campaignId && campaignId !== 'all' && filterByCampaign === 'true') {
        prospects = await storage.getProspectsByCampaign(userId, parseInt(campaignId));
        
        // REF: Apply additional filters if needed
        if (search || (status && status !== 'all')) {
          prospects = prospects.filter(prospect => {
            let matchesSearch = true;
            let matchesStatus = true;
            
            if (search) {
              const searchLower = search.toLowerCase();
              matchesSearch = 
                prospect.firstName.toLowerCase().includes(searchLower) ||
                prospect.lastName.toLowerCase().includes(searchLower) ||
                prospect.company.toLowerCase().includes(searchLower) ||
                prospect.email.toLowerCase().includes(searchLower);
            }
            
            if (status && status !== 'all') {
              matchesStatus = prospect.status === status;
            }
            
            return matchesSearch && matchesStatus;
          });
        }
        
        console.log(`🔍 Campaign filtered prospects: ${prospects.length} found for campaign ${campaignId}`);
      } else {
        // REF: Use client-filtered search for workspace isolation
        prospects = await storage.searchProspects(
          userId,
          search as string,
          status === "all" ? undefined : status as string,
          currentClientId // REF: Pass clientId for workspace isolation
        );
        
        console.log(`🔍 Workspace filtered prospects: ${prospects.length} found for user ${userId} in client ${currentClientId}`);
      }
      
      // DEBUG: Log prospect summary for debugging
      if (prospects.length > 0) {
        console.log('🔍 First few prospects:', prospects.slice(0, 3).map(p => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          email: p.email,
          status: p.status,
          clientId: p.clientId,
          userId: p.userId
        })));
      } else {
        console.log('🔍 No prospects found - checking total prospects for this user...');
        const allUserProspects = await storage.getProspectsByUser(userId);
        console.log(`🔍 Total prospects for user ${userId}: ${allUserProspects.length}`);
        if (allUserProspects.length > 0) {
          console.log('🔍 User prospects by workspace:', allUserProspects.reduce((acc, p) => {
            acc[p.clientId] = (acc[p.clientId] || 0) + 1;
            return acc;
          }, {}));
        }
      }
      
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching prospects:", error);
      res.status(500).json({ message: "Failed to fetch prospects" });
    }
  });

  // Get prospects for a specific campaign
  app.get('/api/prospects/campaign/:campaignId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { campaignId } = req.params;
      
      if (!campaignId || isNaN(parseInt(campaignId))) {
        return res.status(400).json({ message: "Valid campaign ID is required" });
      }
      
      const prospects = await storage.getProspectsByCampaign(userId, parseInt(campaignId));
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching prospects by campaign:", error);
      res.status(500).json({ message: "Failed to fetch prospects by campaign" });
    }
  });

  // Get single prospect
  app.get('/api/prospects/:id', requireAuth, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const prospect = await storage.getProspect(prospectId);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Verify ownership
      if (prospect.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(prospect);
    } catch (error) {
      console.error("Error fetching prospect:", error);
      res.status(500).json({ message: "Failed to fetch prospect" });
    }
  });

  // Delete prospect
  app.delete('/api/prospects/:id', requireAuth, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const deleted = await storage.deleteProspect(prospectId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Prospect not found or not authorized to delete" });
      }
      
      res.json({ message: "Prospect deleted successfully" });
    } catch (error) {
      console.error("Error deleting prospect:", error);
      res.status(500).json({ message: "Failed to delete prospect" });
    }
  });

  // Retry failed prospect
  app.post('/api/prospects/:id/retry', requireAuth, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      console.log(`Retry request for prospect ${prospectId} by user ${userId}`);
      
      // Get the prospect to verify ownership and get data
      const prospect = await storage.getProspect(prospectId);
      console.log(`Found prospect:`, prospect);
      
      if (!prospect || prospect.userId !== userId) {
        console.log(`Prospect not found or unauthorized: prospect=${!!prospect}, userId match=${prospect?.userId === userId}`);
        return res.status(404).json({ message: "Prospect not found or not authorized" });
      }
      
      console.log(`Prospect status: ${prospect.status}`);
      if (prospect.status !== 'failed') {
        console.log(`Cannot retry prospect with status: ${prospect.status}`);
        return res.status(400).json({ message: "Only failed prospects can be retried" });
      }
      
      // Reset prospect status to processing
      console.log(`Updating prospect ${prospectId} status to processing`);
      const updatedProspect = await storage.updateProspectStatus(prospectId, 'processing');
      console.log(`Status update result:`, updatedProspect);
      
      // Extract only the prospect data fields needed for the webhook
      const prospectData = {
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        company: prospect.company,
        title: prospect.title,
        email: prospect.email,
        linkedinUrl: prospect.linkedinUrl || "",
      };
      
      console.log(`Extracted prospect data:`, prospectData);
      
      // Process prospect research asynchronously as a single-item batch
      console.log(`Starting research batch for prospect ${prospectId}`);
      try {
        await processBatchResearch([{ id: prospect.id, data: prospectData }], 1);
        console.log(`✅ Research batch started successfully for prospect ${prospectId}`);
      } catch (error) {
        console.error(`❌ Failed to start research batch for prospect ${prospectId}:`, error);
      }
      
      res.json({ message: "Prospect research restarted successfully" });
    } catch (error) {
      console.error("Error retrying prospect:", error);
      res.status(500).json({ message: "Failed to retry prospect research" });
    }
  });

  // Create new prospect
  app.post('/api/prospects', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Get current client from session or default to first client
      let currentClientId = (req.session as any).currentClientId;
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      if (!currentClientId) {
        return res.status(400).json({ message: 'No client workspace found. Please create a client workspace first.' });
      }
      
      // REF: Debug validation schema issue
      console.log('🔍 DEBUG: insertProspectSchema =', typeof insertProspectSchema, insertProspectSchema);
      console.log('🔍 DEBUG: req.body =', req.body);
      console.log('🔍 DEBUG: prospect data to validate =', {
        ...req.body,
        userId,
        clientId: currentClientId,
      });
      
      // Validate request body
      const prospectData = insertProspectSchema.parse({
        ...req.body,
        userId,
        clientId: currentClientId,
      });
      
      // Create prospect in database
      const prospect = await storage.createProspect(prospectData);
      
      // Process prospect research asynchronously as a single-item batch
      try {
        await processBatchResearch([{ id: prospect.id, data: prospectData }], 1);
        console.log(`✅ Research batch started successfully for prospect ${prospect.id}`);
      } catch (error) {
        console.error(`❌ Failed to start research batch for prospect ${prospect.id}:`, error);
      }
      
      res.json(prospect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating prospect:", error);
      res.status(500).json({ message: "Failed to create prospect" });
    }
  });

  // Upload CSV file
  app.post('/api/prospects/csv', requireAuth, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      const hasHeaders = req.body.hasHeaders === 'true';
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // REF: More flexible CSV validation - check both MIME type and file extension
      const isCSVFile = file.mimetype === 'text/csv' || 
                       file.mimetype === 'text/plain' || 
                       file.mimetype === 'application/csv' ||
                       file.mimetype === 'application/vnd.ms-excel' ||
                       file.originalname.toLowerCase().endsWith('.csv');
      
      if (!isCSVFile) {
        return res.status(400).json({ message: "File must be a CSV. Detected MIME type: " + file.mimetype });
      }
      
      // Parse CSV
      const csvContent = file.buffer.toString('utf-8');
      const records = parse(csvContent, { 
        columns: hasHeaders, 
        skip_empty_lines: true 
      });
      
      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }
      
      let headers: string[];
      let preview: any[];
      
      if (hasHeaders) {
        // Headers are the column names from the CSV
        headers = Object.keys(records[0]);
        preview = records.slice(0, 3);
      } else {
        // Generate generic column names (Column 1, Column 2, etc.)
        const firstRecord = records[0] as string[];
        headers = firstRecord.map((_, index) => `Column ${index + 1}`);
        preview = records.slice(0, 3).map((record: string[]) => {
          const obj: any = {};
          record.forEach((value, index) => {
            obj[`Column ${index + 1}`] = value;
          });
          return obj;
        });
      }
      
      res.json({
        headers,
        rowCount: records.length,
        preview
      });
      
    } catch (error) {
      console.error("Error processing CSV:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // Process CSV with column mapping
  app.post('/api/prospects/csv/process', requireAuth, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      const mapping = JSON.parse(req.body.mapping);
      const hasHeaders = req.body.hasHeaders === 'true';
      const batchSize = parseInt(req.body.batchSize) || 10;
      const startRow = parseInt(req.body.startRow) || 1;
      const maxRows = req.body.maxRows ? parseInt(req.body.maxRows) : null;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // REF: Get current client from session or default to first client
      let currentClientId = (req.session as any).currentClientId;
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      if (!currentClientId) {
        return res.status(400).json({ message: 'No active client workspace found. Please create a workspace first.' });
      }
      
      // Parse CSV
      const csvContent = file.buffer.toString('utf-8');
      const allRecords = parse(csvContent, { 
        columns: hasHeaders, 
        skip_empty_lines: true 
      });
      
      // Apply row range selection
      let records = allRecords;
      
      // Adjust startRow for zero-based indexing (user input is 1-based)
      const startIndex = startRow - 1;
      
      if (startIndex > 0) {
        records = records.slice(startIndex);
      }
      
      if (maxRows && maxRows > 0) {
        records = records.slice(0, maxRows);
      }
      
      // Create CSV upload record with client ID
      const csvUpload = await storage.createCsvUpload({
        userId,
        clientId: currentClientId,
        fileName: file.originalname,
        totalRows: records.length,
        processedRows: 0,
        status: "processing",
      });
      
      // Process prospects asynchronously
      processCsvProspects(csvUpload.id, userId, currentClientId, records, mapping, hasHeaders, batchSize);
      
      res.json({
        uploadId: csvUpload.id,
        totalRows: records.length,
        message: "CSV processing started"
      });
      
    } catch (error) {
      console.error("Error processing CSV:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // ===== REPLY.IO INTEGRATION ENDPOINTS =====

  // Get user's Reply.io settings
  app.get('/api/reply-io/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settings = await storage.getUserSettings(userId);
      
      console.log('=== REPLY.IO SETTINGS DEBUG ===');
      console.log('User ID:', userId);
      console.log('Raw settings from DB:', settings);
      
      // REF: Return settings without exposing encrypted API key
      if (settings) {
        const response = {
          replyIoCampaignId: settings.replyIoCampaignId || '', // REF: Convert null to empty string
          replyIoAutoSend: settings.replyIoAutoSend !== undefined ? settings.replyIoAutoSend : true, // REF: Default to true if not set
          hasApiKey: !!settings.replyIoApiKey,
          webhookUrl: settings.webhookUrl || '', // REF: Convert null to empty string
          webhookTimeout: settings.webhookTimeout,
          batchSize: settings.batchSize,
        };
        console.log('Response being sent:', response);
        res.json(response);
      } else {
        const response = {
          replyIoCampaignId: '',
          replyIoAutoSend: true, // REF: Default to auto-send enabled for new users
          hasApiKey: false,
          webhookUrl: '', // REF: Use empty string instead of null
          webhookTimeout: 30,
          batchSize: 10,
        };
        console.log('No settings found, sending defaults:', response);
        res.json(response);
      }
    } catch (error) {
      console.error('Error fetching Reply.io settings:', error);
      res.status(500).json({ message: 'Failed to fetch Reply.io settings' });
    }
  });

  // Save user's Reply.io settings
  app.post('/api/reply-io/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Preprocess request body to handle null values
      const processedBody = {
        ...req.body,
        webhookUrl: req.body.webhookUrl || '', // REF: Convert null/undefined to empty string
      };
      
      // REF: Validate settings data
      const settingsSchema = z.object({
        replyIoApiKey: z.string().min(1, "API key is required").optional(),
        replyIoCampaignId: z.string().min(1, "Campaign ID is required").optional(),
        replyIoAutoSend: z.boolean().optional(),
        webhookUrl: z.string().url().optional().or(z.literal("")),
        webhookTimeout: z.number().min(30).max(1800).optional(),
        batchSize: z.number().min(1).max(100).optional(),
      });

      const validatedSettings = settingsSchema.parse(processedBody);
      
      // REF: Encrypt API key if provided
      const settingsToSave: any = { ...validatedSettings };
      if (validatedSettings.replyIoApiKey) {
        settingsToSave.replyIoApiKey = replyIoService.encryptApiKey(validatedSettings.replyIoApiKey);
      }

      // REF: Save settings to database
      const savedSettings = await storage.upsertUserSettings(userId, settingsToSave);
      
      // REF: Return settings without exposing encrypted API key
      res.json({
        replyIoCampaignId: savedSettings.replyIoCampaignId,
        replyIoAutoSend: savedSettings.replyIoAutoSend !== undefined ? savedSettings.replyIoAutoSend : true,
        hasApiKey: !!savedSettings.replyIoApiKey,
        webhookUrl: savedSettings.webhookUrl || '', // REF: Ensure we return empty string instead of null
        webhookTimeout: savedSettings.webhookTimeout,
        batchSize: savedSettings.batchSize,
        message: "Settings saved successfully"
      });
    } catch (error) {
      console.error("Error saving Reply.io settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save Reply.io settings" });
      }
    }
  });

  // Test Reply.io connection
  app.post('/api/reply-io/test-connection', requireAuth, async (req: any, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      // REF: Test connection using Reply.io service
      const testResult = await replyIoService.validateConnection(apiKey);
      
      if (testResult.success) {
        res.json({
          success: true,
          message: "Connection successful",
          campaignsFound: testResult.data ? testResult.data.length : 0
        });
      } else {
        res.status(400).json({
          success: false,
          message: testResult.message
        });
      }
    } catch (error) {
      console.error("Error testing Reply.io connection:", error);
      res.status(500).json({ message: "Failed to test connection" });
    }
  });

  // Get detailed access information for an API key
  app.post('/api/reply-io/test-access-level', requireAuth, async (req: any, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      // REF: Get detailed access information using Reply.io service
      const accessInfo = await replyIoService.getAccountAccessInfo(apiKey);
      
      res.json({
        success: true,
        accessInfo: {
          accessLevel: accessInfo.accessLevel,
          accessibleCampaigns: accessInfo.accessibleCampaigns,
          totalCampaigns: accessInfo.totalCampaigns,
          permissions: accessInfo.permissions,
          userInfo: accessInfo.userInfo ? {
            email: accessInfo.userInfo.email,
            firstName: accessInfo.userInfo.firstName,
            lastName: accessInfo.userInfo.lastName,
            role: accessInfo.userInfo.role,
          } : null,
          accountInfo: accessInfo.accountInfo ? {
            name: accessInfo.accountInfo.name,
            plan: accessInfo.accountInfo.plan,
          } : null,
        }
      });
    } catch (error) {
      console.error("Error testing Reply.io access level:", error);
      res.status(500).json({ 
        message: "Failed to test access level",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Send selected prospects to Reply.io
  app.post('/api/reply-io/send-prospects', requireAuth, async (req: any, res) => {
    try {
      console.log('=== REPLY.IO SEND PROSPECTS DEBUG ===');
      console.log('Endpoint hit at:', new Date().toISOString());
      console.log('Request body:', req.body);
      
      const userId = req.user.id;
      const { prospectIds } = req.body; // REF: Remove campaignId dependency - always use default
      
      console.log('User ID:', userId);
      console.log('Prospect IDs:', prospectIds);
      
      // REF: Validate request data
      if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
        console.log('❌ Validation failed: No prospect IDs provided');
        return res.status(400).json({ message: "Prospect IDs are required" });
      }
      
              // REF: Get default Reply.io configuration (same as auto-send logic)
        console.log('📋 Getting default Reply.io configuration...');
        
        // REF: Get current client ID from session
        const currentClientId = req.session.user?.currentClientId || null;
        console.log(`📊 Using client ID ${currentClientId} for manual send`);
        
        const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account || !defaultConfig.campaign) {
        console.log('❌ No default Reply.io configuration found');
        return res.status(400).json({ 
          message: "No default Reply.io account and campaign configured. Please configure a default account and campaign in settings."
        });
      }

      const targetAccount = defaultConfig.account;
      const campaignId = defaultConfig.campaign.campaignId;
      
      console.log(`📋 Using default configuration: Account "${targetAccount.name}", Campaign "${defaultConfig.campaign.campaignName}" (ID: ${campaignId})`);

      // REF: Use the default account's API key
      const apiKey = replyIoService.decryptApiKey(targetAccount.apiKey);

      // REF: Fetch prospects to send
      console.log('Fetching prospects...');
      const prospects = [];
      for (const prospectId of prospectIds) {
        const prospect = await storage.getProspect(prospectId);
        if (prospect && prospect.userId === userId) {
          prospects.push(prospect);
          console.log(`✅ Added prospect: ${prospect.firstName} ${prospect.lastName}`);
        } else {
          console.log(`❌ Skipped prospect ID ${prospectId}: not found or not owned by user`);
        }
      }

      if (prospects.length === 0) {
        console.log('❌ No valid prospects found after filtering');
        return res.status(400).json({ message: "No valid prospects found" });
      }

      // REF: Send prospects to Reply.io in bulk
      console.log(`🚀 Sending ${prospects.length} prospects to default Reply.io campaign ${campaignId}`);
      
      const bulkResult = await replyIoService.sendBulkProspectsToReply(
        apiKey,
        prospects,
        campaignId,
        (processed, total, current) => {
          console.log(`Progress: ${processed}/${total} - Processing ${current.firstName} ${current.lastName}`);
        }
      );

      console.log('Bulk send result:', bulkResult);
      
      // REF: Update prospect campaign IDs for successful sends
      if (bulkResult.successful > 0) {
        console.log('Updating prospect campaign IDs...');
        for (const prospectId of prospectIds) {
          try {
            await storage.updateProspectCampaign(prospectId, campaignId);
            console.log(`✅ Updated prospect ${prospectId} with campaign ID ${campaignId}`);
          } catch (error) {
            console.error(`❌ Failed to update prospect ${prospectId} campaign ID:`, error);
          }
        }
      }

      // REF: Return detailed results
      const response = {
        success: true,
        totalSent: bulkResult.totalSent,
        successful: bulkResult.successful,
        failed: bulkResult.failed,
        errors: bulkResult.errors,
        message: `Successfully sent ${bulkResult.successful} out of ${bulkResult.totalSent} prospects to Reply.io`,
        usedAccount: targetAccount.name,
        usedCampaign: defaultConfig.campaign.campaignName,
        usedCampaignId: campaignId
      };
      
      console.log('Sending response:', response);
      res.json(response);

    } catch (error) {
      console.error("❌ Error sending prospects to Reply.io:", error);
      res.status(500).json({ message: "Failed to send prospects to Reply.io" });
    }
  });

  // ===== REPLY.IO CAMPAIGN STATISTICS ENDPOINTS =====

  // Get all user's Reply.io campaigns
  app.get('/api/reply-io/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Get user's Reply.io settings to get API key
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.replyIoApiKey) {
        return res.status(400).json({ message: "Reply.io API key not configured" });
      }

      // REF: Decrypt API key for use
      const apiKey = replyIoService.decryptApiKey(userSettings.replyIoApiKey);

      // REF: Fetch campaigns from Reply.io
      const campaigns = await replyIoService.getCampaigns(apiKey);

      res.json({
        success: true,
        campaigns,
        total: campaigns.length
      });
    } catch (error) {
      console.error('Error fetching Reply.io campaigns:', error);
      res.status(500).json({ 
        message: "Failed to fetch campaigns",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== REPLY.IO MULTI-ACCOUNT MANAGEMENT ENDPOINTS =====

  // Get all Reply.io accounts for user
  app.get('/api/reply-io/accounts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Get current client ID from session for multi-tenant filtering
      let currentClientId = (req.session as any).currentClientId;
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      if (!currentClientId) {
        return res.json({
          success: true,
          accounts: [],
          total: 0
        });
      }

      // REF: Filter accounts by current client
      const accounts = await db
        .select()
        .from(replyioAccounts)
        .where(sql`${replyioAccounts.userId} = ${userId} AND ${replyioAccounts.clientId} = ${currentClientId}`)
        .orderBy(desc(replyioAccounts.createdAt));
      
      // REF: Don't expose API keys in response
      const safeAccounts = accounts.map(account => ({
        id: account.id,
        name: account.name,
        isDefault: account.isDefault,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }));

      res.json({
        success: true,
        accounts: safeAccounts,
        total: safeAccounts.length
      });
    } catch (error) {
      console.error('Error fetching Reply.io accounts:', error);
      res.status(500).json({ 
        message: "Failed to fetch accounts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create new Reply.io account
  app.post('/api/reply-io/accounts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, apiKey } = req.body;

      if (!name || !apiKey) {
        return res.status(400).json({ message: "Name and API key are required" });
      }

      // REF: Get current client ID from session
      let currentClientId = (req.session as any).currentClientId;
      
      console.log('DEBUG: Account creation - session data:', {
        sessionId: req.sessionID,
        sessionData: req.session,
        currentClientId: currentClientId,
        userId: userId
      });
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        console.log('DEBUG: Using default client:', defaultClient);
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      if (!currentClientId) {
        console.log('DEBUG: No client found for user:', userId);
        return res.status(400).json({ message: "No client workspace found. Please create a client workspace first." });
      }

      // REF: Test the API key connection before storing
      try {
        await replyIoService.getCampaigns(apiKey);
      } catch (error) {
        return res.status(400).json({ 
          message: "Invalid API key or connection failed",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // REF: Encrypt the API key before storing
      const encryptedApiKey = replyIoService.encryptApiKey(apiKey);

      const account = await storage.createReplyioAccount({
        userId,
        clientId: currentClientId,
        name,
        apiKey: encryptedApiKey,
        isDefault: false
      });

      // REF: Automatically sync campaigns after account creation
      try {
        const liveCampaigns = await replyIoService.getCampaigns(apiKey);
        const syncedCampaigns = [];
        
        for (const campaign of liveCampaigns) {
          try {
            const newCampaign = await storage.createReplyioCampaign({
              accountId: account.id,
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignStatus: campaign.status,
              isDefault: false,
            });
            syncedCampaigns.push(newCampaign);
          } catch (error) {
            // REF: Campaign might already exist, skip
            console.log(`Campaign ${campaign.id} already exists, skipping`);
          }
        }
        
        console.log(`Auto-synced ${syncedCampaigns.length} campaigns for account ${account.name}`);
      } catch (error) {
        console.error('Error auto-syncing campaigns:', error);
        // REF: Don't fail account creation if campaign sync fails
      }

      // REF: Don't expose API key in response
      const safeAccount = {
        id: account.id,
        name: account.name,
        isDefault: account.isDefault,
        clientId: account.clientId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };

      res.json({
        success: true,
        account: safeAccount,
        message: "Account created successfully"
      });
    } catch (error) {
      console.error('Error creating Reply.io account:', error);
      res.status(500).json({ message: "Failed to create account", error: error.message });
    }
  });

  /**
   * REF: Client-specific Reply.io account endpoints
   * PURPOSE: Support client-specific account management that appears to be expected by frontend
   */
  app.get('/api/clients/:id/replyio-accounts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      
      // REF: Verify client ownership
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const allAccounts = await storage.getReplyioAccounts(userId);
      const accounts = allAccounts.filter((account: any) => account.clientId === clientId);
      
      // REF: Don't expose API keys in response
      const safeAccounts = accounts.map((account: any) => ({
        id: account.id,
        name: account.name,
        isDefault: account.isDefault,
        clientId: account.clientId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }));

      res.json(safeAccounts);
    } catch (error) {
      console.error('Error fetching client Reply.io accounts:', error);
      res.status(500).json({ message: 'Failed to fetch Reply.io accounts' });
    }
  });

  app.post('/api/clients/:id/replyio-accounts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      const { name, apiKey } = req.body;

      if (!name || !apiKey) {
        return res.status(400).json({ message: "Name and API key are required" });
      }

      // REF: Verify client ownership
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const account = await storage.createReplyioAccount({
        userId,
        clientId,
        name,
        apiKey,
        isDefault: false
      });

      // REF: Don't expose API key in response
      const safeAccount = {
        id: account.id,
        name: account.name,
        isDefault: account.isDefault,
        clientId: account.clientId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };

      res.json({
        success: true,
        account: safeAccount,
        message: "Account created successfully"
      });
    } catch (error) {
      console.error('Error creating Reply.io account:', error);
      res.status(500).json({ message: "Failed to create account", error: error.message });
    }
  });

  // Update Reply.io account
  app.put('/api/reply-io/accounts/:accountId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;
      const { name, apiKey } = req.body;

      // REF: Verify account belongs to user
      const existingAccount = await storage.getReplyioAccount(parseInt(accountId));
      if (!existingAccount || existingAccount.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      
      // REF: If API key is provided, test and encrypt it
      if (apiKey) {
        try {
          await replyIoService.getCampaigns(apiKey);
          updateData.apiKey = replyIoService.encryptApiKey(apiKey);
        } catch (error) {
          return res.status(400).json({ 
            message: "Invalid API key or connection failed",
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const updatedAccount = await storage.updateReplyioAccount(parseInt(accountId), updateData);

      res.json({
        success: true,
        account: {
          id: updatedAccount.id,
          name: updatedAccount.name,
          isDefault: updatedAccount.isDefault,
          createdAt: updatedAccount.createdAt,
          updatedAt: updatedAccount.updatedAt,
        }
      });
    } catch (error) {
      console.error('Error updating Reply.io account:', error);
      res.status(500).json({ 
        message: "Failed to update account",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete Reply.io account
  app.delete('/api/reply-io/accounts/:accountId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      // REF: Verify account belongs to user
      const existingAccount = await storage.getReplyioAccount(parseInt(accountId));
      if (!existingAccount || existingAccount.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      const deleted = await storage.deleteReplyioAccount(parseInt(accountId));
      
      if (deleted) {
        res.json({ success: true, message: "Account deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete account" });
      }
    } catch (error) {
      console.error('Error deleting Reply.io account:', error);
      res.status(500).json({ 
        message: "Failed to delete account",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Set default Reply.io account
  app.post('/api/reply-io/accounts/:accountId/set-default', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      // REF: Verify account belongs to user
      const existingAccount = await storage.getReplyioAccount(parseInt(accountId));
      if (!existingAccount || existingAccount.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      const defaultAccount = await storage.setDefaultReplyioAccount(userId, parseInt(accountId));

      res.json({
        success: true,
        account: {
          id: defaultAccount.id,
          name: defaultAccount.name,
          isDefault: defaultAccount.isDefault,
          createdAt: defaultAccount.createdAt,
          updatedAt: defaultAccount.updatedAt,
        }
      });
    } catch (error) {
      console.error('Error setting default Reply.io account:', error);
      res.status(500).json({ 
        message: "Failed to set default account",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get campaigns for a specific Reply.io account
  app.get('/api/reply-io/accounts/:accountId/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      // REF: Verify account belongs to user
      const existingAccount = await storage.getReplyioAccount(parseInt(accountId));
      if (!existingAccount || existingAccount.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      // REF: Get stored campaigns for this account
      const storedCampaigns = await storage.getReplyioCampaigns(parseInt(accountId));

      // REF: Also fetch fresh campaigns from Reply.io API
      try {
        const apiKey = replyIoService.decryptApiKey(existingAccount.apiKey);
        const liveCampaigns = await replyIoService.getCampaigns(apiKey);

        res.json({
          success: true,
          campaigns: {
            stored: storedCampaigns,
            live: liveCampaigns,
          },
          accountName: existingAccount.name
        });
      } catch (apiError) {
        // REF: If API call fails, return stored campaigns only
        res.json({
          success: true,
          campaigns: {
            stored: storedCampaigns,
            live: [],
          },
          accountName: existingAccount.name,
          warning: "Could not fetch live campaigns from Reply.io"
        });
      }
    } catch (error) {
      console.error('Error fetching campaigns for account:', error);
      res.status(500).json({ 
        message: "Failed to fetch campaigns",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save/sync campaigns for a Reply.io account
  app.post('/api/reply-io/accounts/:accountId/sync-campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      // REF: Verify account belongs to user
      const existingAccount = await storage.getReplyioAccount(parseInt(accountId));
      if (!existingAccount || existingAccount.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      // REF: Fetch campaigns from Reply.io API
      const apiKey = replyIoService.decryptApiKey(existingAccount.apiKey);
      const liveCampaigns = await replyIoService.getCampaigns(apiKey);

      // REF: Sync campaigns to database
      const syncedCampaigns = [];
      for (const campaign of liveCampaigns) {
        try {
          const newCampaign = await storage.createReplyioCampaign({
            accountId: parseInt(accountId),
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignStatus: campaign.status,
            isDefault: false,
          });
          syncedCampaigns.push(newCampaign);
        } catch (error) {
          // REF: Campaign might already exist, skip
          console.log(`Campaign ${campaign.id} already exists, skipping`);
        }
      }

      res.json({
        success: true,
        syncedCampaigns,
        total: syncedCampaigns.length,
        message: `Synced ${syncedCampaigns.length} new campaigns`
      });
    } catch (error) {
      console.error('Error syncing campaigns:', error);
      res.status(500).json({ 
        message: "Failed to sync campaigns",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Set default campaign for an account
  app.post('/api/reply-io/campaigns/:campaignId/set-default', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { campaignId } = req.params;

      // REF: Find campaign by Reply.io campaign ID across all user's accounts
      const userAccounts = await storage.getReplyioAccounts(userId);
      let existingCampaign = null;
      
      for (const account of userAccounts) {
        const campaigns = await storage.getReplyioCampaigns(account.id);
        const foundCampaign = campaigns.find(c => c.campaignId === parseInt(campaignId));
        if (foundCampaign) {
          existingCampaign = foundCampaign;
          break;
        }
      }
      
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // REF: Verify the account belongs to the user (already verified above by searching user's accounts)
      const account = await storage.getReplyioAccount(existingCampaign.accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // REF: Use the database row ID for the setDefaultReplyioCampaign call
      const defaultCampaign = await storage.setDefaultReplyioCampaign(existingCampaign.accountId, existingCampaign.id);

      res.json({
        success: true,
        campaign: defaultCampaign
      });
    } catch (error) {
      console.error('Error setting default campaign:', error);
      res.status(500).json({ 
        message: "Failed to set default campaign",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== END REPLY.IO MULTI-ACCOUNT ENDPOINTS =====

  // Get statistics for a specific campaign
  app.get('/api/reply-io/campaigns/:campaignId/statistics', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { campaignId } = req.params;
      
      if (!campaignId || isNaN(parseInt(campaignId))) {
        return res.status(400).json({ message: "Valid campaign ID is required" });
      }

      // REF: Get user's Reply.io settings to get API key
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.replyIoApiKey) {
        return res.status(400).json({ message: "Reply.io API key not configured" });
      }

      // REF: Decrypt API key for use
      const apiKey = replyIoService.decryptApiKey(userSettings.replyIoApiKey);

      // REF: Fetch campaign statistics from Reply.io
      const statistics = await replyIoService.getCampaignStatistics(apiKey, parseInt(campaignId));

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Error fetching campaign statistics:', error);
      res.status(500).json({ 
        message: "Failed to fetch campaign statistics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get contacts for a specific campaign
  app.get('/api/reply-io/campaigns/:campaignId/contacts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { campaignId } = req.params;
      
      if (!campaignId || isNaN(parseInt(campaignId))) {
        return res.status(400).json({ message: "Valid campaign ID is required" });
      }

      // REF: Get user's Reply.io settings to get API key
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.replyIoApiKey) {
        return res.status(400).json({ message: "Reply.io API key not configured" });
      }

      // REF: Decrypt API key for use
      const apiKey = replyIoService.decryptApiKey(userSettings.replyIoApiKey);

      // REF: Fetch campaign contacts from Reply.io
      const contacts = await replyIoService.getCampaignContacts(apiKey, parseInt(campaignId));

      res.json({
        success: true,
        contacts,
        total: contacts.length
      });
    } catch (error) {
      console.error('Error fetching campaign contacts:', error);
      res.status(500).json({ 
        message: "Failed to fetch campaign contacts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== REPLY.IO ANALYTICS & STATISTICS =====

  // REF: Cache for Reply.io statistics to prevent rate limiting
  const replyIoStatsCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_DURATION = 15000; // 15 seconds to respect Reply.io's 10-second limit

  // Get overall Reply.io statistics across all campaigns (Enhanced with Caching)
  app.get('/api/reply-io/statistics', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      const { filterByCampaign } = req.query;
      
      console.log(`📊 Fetching Reply.io statistics for user: ${userId}, client: ${currentClientId}`);
      
      // REF: Get default Reply.io configuration for the current workspace
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Use cached service to fetch campaigns with intelligent caching and rate limiting
      const apiKey = replyIoService.decryptApiKey(defaultConfig.account.apiKey);
      const campaigns = await replyIoCachedService.getCampaignStatistics(
        apiKey, 
        undefined, // Get all campaigns
        'medium' // Medium priority for statistics
      );

      // REF: Get stored campaigns to see if we have any defaults
      const accountCampaigns = await storage.getReplyioCampaigns(defaultConfig.account.id);
      const defaultCampaign = accountCampaigns.find(c => c.isDefault);
      
      let campaignStatistics;
      let dataLevel;
      
      // REF: If filterByCampaign is true and there's a default campaign, show stats only for that campaign
      if (filterByCampaign === 'true' && defaultCampaign) {
        // REF: Filter to show only the selected campaign
        const selectedCampaignData = campaigns.find((c: any) => c.id === defaultCampaign.campaignId);
        
        if (selectedCampaignData) {
          // REF: Cast to any to access fields not in our interface but present in Reply.io API response
          const campaignData = selectedCampaignData as any;
          campaignStatistics = {
            totalContacts: campaignData.peopleCount || 0,
            emailsSent: campaignData.deliveriesCount || 0,
            emailsOpened: campaignData.opensCount || 0,
            emailsClicked: 0, // Not available in basic campaign data
            emailsReplied: campaignData.repliesCount || 0,
            emailsBounced: campaignData.bouncesCount || 0,
          };
        } else {
          campaignStatistics = {
            totalContacts: 0,
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            emailsReplied: 0,
            emailsBounced: 0,
          };
        }
        dataLevel = 'campaign-specific';
      } else {
        // REF: Aggregate across all campaigns for overall statistics
        campaignStatistics = (campaigns as any[]).reduce((acc, campaign) => {
          // REF: Cast to any to access fields not in our interface but present in Reply.io API response
          const campaignData = campaign as any;
          acc.totalContacts += campaignData.peopleCount || 0;
          acc.emailsSent += campaignData.deliveriesCount || 0;
          acc.emailsOpened += campaignData.opensCount || 0;
          acc.emailsClicked += 0; // Not available in basic campaign data
          acc.emailsReplied += campaignData.repliesCount || 0;
          acc.emailsBounced += campaignData.bouncesCount || 0;
          return acc;
        }, {
          totalContacts: 0,
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          emailsReplied: 0,
          emailsBounced: 0,
        });
        dataLevel = 'all-campaigns';
      }
      
      // REF: Calculate rates from the aggregated data
      const calculatedRates = {
        openRate: campaignStatistics.emailsSent > 0 ? 
          Math.round((campaignStatistics.emailsOpened / campaignStatistics.emailsSent) * 100 * 100) / 100 : 0,
        clickRate: 0, // Not available in basic campaign data
        replyRate: campaignStatistics.emailsSent > 0 ? 
          Math.round((campaignStatistics.emailsReplied / campaignStatistics.emailsSent) * 100 * 100) / 100 : 0,
        bounceRate: campaignStatistics.emailsSent > 0 ? 
          Math.round((campaignStatistics.emailsBounced / campaignStatistics.emailsSent) * 100 * 100) / 100 : 0,
      };
      
      // REF: Create statistics response
      const baseStatistics = {
        totalCampaigns: campaigns.length,
        activeCampaigns: (campaigns as any[]).filter(c => String(c.status) === 'active' || String(c.status) === '2').length,
        pausedCampaigns: (campaigns as any[]).filter(c => String(c.status) === 'paused' || String(c.status) === '1' || String(c.status) === '4').length,
        inactiveCampaigns: (campaigns as any[]).filter(c => String(c.status) === 'inactive' || String(c.status) === '0').length,
        
        // REF: Use aggregated or filtered statistics
        ...campaignStatistics,
        ...calculatedRates,
        
        // REF: Show all campaigns for reference
        campaigns: (campaigns as any[]).map(campaign => {
          // REF: Cast to any to access fields not in our interface but present in Reply.io API response
          const campaignData = campaign as any;
          const isSelected = defaultCampaign ? campaign.id === defaultCampaign.campaignId : false;
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            status: campaign.status,
            isSelected, // REF: Mark which campaign is the default
            // REF: Real campaign statistics
            totalContacts: campaignData.peopleCount || 0,
            emailsSent: campaignData.deliveriesCount || 0,
            emailsOpened: campaignData.opensCount || 0,
            emailsClicked: 0, // Not available in basic campaign data
            emailsReplied: campaignData.repliesCount || 0,
            openRate: campaignData.deliveriesCount > 0 ? Math.round((campaignData.opensCount / campaignData.deliveriesCount) * 100 * 100) / 100 : 0,
            clickRate: 0, // Not available in basic campaign data
            replyRate: campaignData.deliveriesCount > 0 ? Math.round((campaignData.repliesCount / campaignData.deliveriesCount) * 100 * 100) / 100 : 0
          };
        }),
        
        // REF: Additional metadata
        selectedCampaign: defaultCampaign ? {
          campaignId: defaultCampaign.campaignId,
          campaignName: defaultCampaign.campaignName
        } : null,
        accountName: defaultConfig.account.accountName,
        dataLevel,
        lastUpdated: new Date().toISOString()
      };

      const response = {
        success: true,
        statistics: baseStatistics
      };

      console.log(`✅ Reply.io statistics fetched successfully (cached: ${campaigns.cached || false})`);
      res.json(response);
      
    } catch (error) {
      console.error('Error fetching Reply.io statistics:', error);
      
      // REF: Enhanced error handling with fallback to cached data
      if (error instanceof Error && error.message.includes('rate limit')) {
        return res.status(429).json({ 
          message: "Reply.io API rate limit reached. Please try again later.",
          retryAfter: 60000 // 1 minute
        });
      }
      
      res.status(500).json({ 
        message: "Failed to fetch Reply.io statistics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== ADVANCED REPLY.IO ANALYTICS ENDPOINTS =====

  // REF: NEW ENDPOINT - Advanced Campaign Analytics
  app.get('/api/reply-io/analytics/advanced', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      
      // REF: Check cache first to prevent rate limiting
      const cacheKey = `advanced_analytics_${userId}_${currentClientId || 'default'}`;
      const cached = replyIoStatsCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 2) { // Longer cache for advanced analytics
        console.log('Returning cached advanced analytics data');
        return res.json(cached.data);
      }
      
      // REF: Get default Reply.io configuration for the current workspace
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Fetch advanced analytics using cached service with intelligent rate limiting
      const apiKey = replyIoService.decryptApiKey(defaultConfig.account.apiKey);
      const advancedAnalytics = await replyIoCachedService.getAdvancedAnalytics(
        apiKey,
        'performance', // Performance analytics type  
        'medium' // Medium priority for advanced analytics
      );
      
      const response = {
        success: true,
        analytics: advancedAnalytics,
        accountName: defaultConfig.account.accountName,
        lastUpdated: new Date().toISOString()
      };
      
      // REF: Cache the results with longer duration for analytics
      replyIoStatsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching advanced Reply.io analytics:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch advanced analytics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // REF: NEW ENDPOINT - Campaign Optimization Recommendations
  app.get('/api/reply-io/campaigns/:campaignId/optimization', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      const { campaignId } = req.params;
      
      if (!campaignId || isNaN(parseInt(campaignId))) {
        return res.status(400).json({ 
          success: false,
          message: "Valid campaign ID is required" 
        });
      }
      
      // REF: Check cache first
      const cacheKey = `optimization_${campaignId}_${userId}_${currentClientId || 'default'}`;
      const cached = replyIoStatsCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 3) { // Longer cache for optimization data
        return res.json(cached.data);
      }
      
      // REF: Get default Reply.io configuration
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.status(400).json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Get optimization recommendations
      const recommendations = await replyIoService.getAutomatedOptimizationRecommendations(
        defaultConfig.account.apiKey, 
        parseInt(campaignId)
      );
      
      const response = {
        success: true,
        recommendations,
        accountName: defaultConfig.account.accountName,
        lastUpdated: new Date().toISOString()
      };
      
      // REF: Cache the results
      replyIoStatsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching campaign optimization recommendations:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch optimization recommendations",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // REF: NEW ENDPOINT - Bulk Campaign Performance Report
  app.get('/api/reply-io/analytics/performance-report', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      
      // REF: Check cache first
      const cacheKey = `performance_report_${userId}_${currentClientId || 'default'}`;
      const cached = replyIoStatsCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 4) { // Longer cache for reports
        return res.json(cached.data);
      }
      
      // REF: Get default Reply.io configuration
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Get all campaigns with statistics
      const campaigns = await replyIoService.getCampaignsWithStatistics(defaultConfig.account.apiKey);
      
      // REF: Calculate overall performance metrics
      const totalMetrics = campaigns.reduce((acc, campaign) => {
        acc.totalCampaigns += 1;
        acc.totalContacts += campaign.peopleCount || 0;
        acc.totalDeliveries += campaign.deliveriesCount || 0;
        acc.totalOpens += campaign.opensCount || 0;
        acc.totalReplies += campaign.repliesCount || 0;
        acc.totalBounces += campaign.bouncesCount || 0;
        acc.totalOptOuts += campaign.optOutsCount || 0;
        
        if (String(campaign.status) === '2' || String(campaign.status) === 'active') {
          acc.activeCampaigns += 1;
        }
        
        return acc;
      }, {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalContacts: 0,
        totalDeliveries: 0,
        totalOpens: 0,
        totalReplies: 0,
        totalBounces: 0,
        totalOptOuts: 0
      });
      
      // REF: Calculate rates
      const overallOpenRate = totalMetrics.totalDeliveries > 0 
        ? Math.round((totalMetrics.totalOpens / totalMetrics.totalDeliveries) * 100 * 100) / 100 
        : 0;
      const overallReplyRate = totalMetrics.totalDeliveries > 0 
        ? Math.round((totalMetrics.totalReplies / totalMetrics.totalDeliveries) * 100 * 100) / 100 
        : 0;
      const overallBounceRate = totalMetrics.totalDeliveries > 0 
        ? Math.round((totalMetrics.totalBounces / totalMetrics.totalDeliveries) * 100 * 100) / 100 
        : 0;
      
      // REF: Get top performing campaigns
      const campaignPerformance = campaigns.map(campaign => {
        const openRate = campaign.deliveriesCount > 0 
          ? Math.round((campaign.opensCount / campaign.deliveriesCount) * 100 * 100) / 100 
          : 0;
        const replyRate = campaign.deliveriesCount > 0 
          ? Math.round((campaign.repliesCount / campaign.deliveriesCount) * 100 * 100) / 100 
          : 0;
        
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          contacts: campaign.peopleCount || 0,
          deliveries: campaign.deliveriesCount || 0,
          opens: campaign.opensCount || 0,
          replies: campaign.repliesCount || 0,
          openRate,
          replyRate
        };
      }).sort((a, b) => b.replyRate - a.replyRate);
      
      const response = {
        success: true,
        report: {
          summary: {
            ...totalMetrics,
            overallOpenRate,
            overallReplyRate,
            overallBounceRate
          },
          topCampaigns: campaignPerformance.slice(0, 5),
          allCampaigns: campaignPerformance,
          generatedAt: new Date().toISOString()
        },
        accountName: defaultConfig.account.accountName
      };
      
      // REF: Cache the results
      replyIoStatsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate performance report",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== END ADVANCED REPLY.IO ANALYTICS ENDPOINTS =====

  // Test endpoint for connectivity
  app.get('/webhook/test', (req, res) => {
    console.log('=== TEST ENDPOINT HIT ===');
    res.json({ message: 'Webhook endpoint is reachable', timestamp: new Date().toISOString() });
  });

  // Test Reply.io API keys for all accounts
  app.get('/api/reply-io/test-keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Get all user's Reply.io accounts
      const userAccounts = await storage.getReplyioAccounts(userId);
      if (!userAccounts || userAccounts.length === 0) {
        return res.status(400).json({ message: "No Reply.io accounts configured" });
      }

      const results = [];
      
      for (const account of userAccounts) {
        try {
          // REF: Decrypt API key for testing
          const apiKey = replyIoService.decryptApiKey(account.apiKey);
          
          // REF: Test the API key by trying to fetch campaigns
          const campaigns = await replyIoService.getCampaigns(apiKey);
          
          results.push({
            accountId: account.id,
            accountName: account.accountName,
            isDefault: account.isDefault,
            status: 'valid',
            campaignsFound: campaigns.length,
            campaigns: campaigns.slice(0, 3) // Show first 3 campaigns
          });
        } catch (error) {
          results.push({
            accountId: account.id,
            accountName: account.accountName,
            isDefault: account.isDefault,
            status: 'invalid',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        success: true,
        results,
        summary: {
          total: userAccounts.length,
          valid: results.filter(r => r.status === 'valid').length,
          invalid: results.filter(r => r.status === 'invalid').length
        }
      });
    } catch (error) {
      console.error('Error testing Reply.io API keys:', error);
      res.status(500).json({ 
        message: "Failed to test API keys",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Working webhook outside /api path - NO AUTH REQUIRED
  app.post('/webhook/n8n-results', async (req, res) => {
    console.log('!!! WORKING WEBHOOK HIT !!!');
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    async function processProspectData(data: any) {
      try {
        console.log('=== PROCESSING PROSPECT DATA ===');
        console.log('Data keys:', Object.keys(data));
        console.log('Email:', data.email);
        console.log('Name:', data.firstname, data.lastname);
        
        // Find matching prospect by email or name
        const allUsers = await db.select().from(users);
        let matchedProspect = null;
        
        for (const user of allUsers) {
          const userProspects = await storage.getProspectsByUser(user.id);
          console.log(`Checking ${userProspects.length} prospects for user ${user.id}`);
          
          // Try to match by email first, then by name
          matchedProspect = userProspects.find(p => {
            const emailMatch = data.email && p.email === data.email;
            const nameMatch = data.firstname && data.lastname && 
              p.firstName?.toLowerCase() === data.firstname.toLowerCase() && 
              p.lastName?.toLowerCase() === data.lastname.toLowerCase();
            
            console.log(`Checking prospect ${p.firstName} ${p.lastName} (${p.email})`);
            console.log(`Email match: ${emailMatch}, Name match: ${nameMatch}`);
            
            return emailMatch || nameMatch;
          });
          
          if (matchedProspect) {
            console.log(`✅ Found matching prospect: ${matchedProspect.firstName} ${matchedProspect.lastName} (ID: ${matchedProspect.id})`);
            
            // Extract and organize all research data
            const researchData = {
              firstname: data.firstname,
              lastname: data.lastname,
              location: data.location,
              linkedinUrl: data.linkedinUrl,
              email: data.email,
              website: data.website,
              primaryJobCompany: data['Primary Job Company'],
              primaryJobTitle: data['Primary Job Title'],
              primaryJobCompanyLinkedInUrl: data['Primary Job Company LinkedIn URL'],
              industry: data.Industry,
              painPoints: data['Pain Points'],
              businessGoals: data['Business Goals'],
              competitors: data.Competitors,
              competitiveAdvantages: data['Competitive Advantages'],
              locationResearch: data['Location Research'],
              almaMaterResearch: data['Alma Mater Research'],
              linkedInPostSummary: data['LinkedIn Post Summary'],
              companyLinkedInPostSummary: data['Company LinkedIn Post Summary'],
              companyNews: data['Company News'],
              overallProspectSummary: data['Overall Prospect Summary'],
              overallCompanySummary: data['Overall Company Summary'],
              emailSubject: data['Email Subject'],
              emailBody: data['Email Body'],
              fullOutput: data
            };
            
            console.log('Research data prepared:', Object.keys(researchData));
            
            // Only mark as completed if we have the essential research data (especially email content)
            // This indicates the n8n workflow has fully completed its research and email generation
            const hasEssentialData = researchData.emailSubject && researchData.emailBody;
            
            if (hasEssentialData) {
              // Update prospect with research results and mark as completed
              await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
              console.log(`✅ Successfully updated prospect ${matchedProspect.id} with complete research data and marked as completed`);
              
              // REF: Attempt auto-send to Reply.io if enabled
              const updatedProspect = { ...matchedProspect, status: 'completed', researchResults: researchData };
              await autoSendToReplyIo(updatedProspect);
            } else {
              // Update prospect with partial research data but keep as processing
              await storage.updateProspectStatus(matchedProspect.id, 'processing', researchData);
              console.log(`📝 Updated prospect ${matchedProspect.id} with partial research data, keeping as processing (missing email content)`);
            }
            break;
          }
        }
        
        if (!matchedProspect) {
          console.log(`❌ No matching prospect found for ${data.firstname} ${data.lastname} (${data.email})`);
        }
      } catch (error) {
        console.error('❌ Error processing prospect:', error);
      }
    }
    
    // Process the research data - handle multiple possible data formats
    console.log('Raw body type:', typeof req.body);
    console.log('Raw body keys:', req.body ? Object.keys(req.body) : 'no keys');
    
    // Handle direct object (single prospect data)
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      if (req.body.firstname || req.body.lastname || req.body.email) {
        console.log('Processing single prospect research data...');
        const data = req.body;
        console.log('Processing research for:', data.firstname, data.lastname);
        await processProspectData(data);
      }
    }
    
    // Handle array format
    if (req.body && Array.isArray(req.body)) {
      console.log('Processing array of research data...');
      
      for (const item of req.body) {
        // Handle wrapped data format { data: {...} }
        if (item.data && typeof item.data === 'object') {
          const data = item.data;
          console.log('Processing research for:', data.firstname, data.lastname);
          await processProspectData(data);
        }
        // Handle direct data format
        else if (item.firstname || item.lastname || item.email) {
          console.log('Processing direct research for:', item.firstname, item.lastname);
          await processProspectData(item);
        }
      }
    }
    
    res.json({ success: true, message: 'Data received', data: req.body });
  });

  // Add simple log for route registration
  console.log('REGISTERING WEBHOOK ROUTE: /api/webhook/n8n-data');

  // Fresh webhook endpoint to receive n8n data - ALL HTTP METHODS  
  app.all('/api/webhook/n8n-data', async (req, res) => {
    // Write to dedicated webhook log file
    const webhookLogPath = './webhook_debug.log';
    const logEntry = `
=== WEBHOOK HIT: ${new Date().toISOString()} ===
Method: ${req.method}
Headers: ${JSON.stringify(req.headers, null, 2)}
Body type: ${typeof req.body}
Body content: ${JSON.stringify(req.body, null, 2)}
Query params: ${JSON.stringify(req.query)}
URL: ${req.url}
===============================================

`;
    fs.appendFileSync(webhookLogPath, logEntry);
    
    console.log('!!! FRESH WEBHOOK ENDPOINT HIT !!!');
    console.log('Method:', req.method);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body content:', JSON.stringify(req.body, null, 2));
    console.log('Query params:', req.query);
    console.log('URL:', req.url);
    
    async function processProspectData(data: any) {
      try {
        console.log('=== PROCESSING PROSPECT DATA ===');
        console.log('Data keys:', Object.keys(data));
        console.log('Email:', data.email);
        console.log('Name:', data.firstname, data.lastname);
        
        // Find matching prospect by email or name
        const allUsers = await db.select().from(users);
        let matchedProspect = null;
        
        for (const user of allUsers) {
          const userProspects = await storage.getProspectsByUser(user.id);
          console.log(`Checking ${userProspects.length} prospects for user ${user.id}`);
          
          // Try to match by email first, then by name
          matchedProspect = userProspects.find(p => {
            const emailMatch = data.email && p.email === data.email;
            const nameMatch = data.firstname && data.lastname && 
              p.firstName?.toLowerCase() === data.firstname.toLowerCase() && 
              p.lastName?.toLowerCase() === data.lastname.toLowerCase();
            
            console.log(`Checking prospect ${p.firstName} ${p.lastName} (${p.email})`);
            console.log(`Email match: ${emailMatch}, Name match: ${nameMatch}`);
            
            return emailMatch || nameMatch;
          });
          
          if (matchedProspect) {
            console.log(`✅ Found matching prospect: ${matchedProspect.firstName} ${matchedProspect.lastName} (ID: ${matchedProspect.id})`);
            
            // Extract and organize all research data - handle both old and new formats
            const researchData = {
              firstname: data.firstname,
              lastname: data.lastname,
              location: data.location,
              linkedinUrl: data.linkedinUrl,
              email: data.email,
              website: data.website,
              primaryJobCompany: data['Primary Job Company'],
              primaryJobTitle: data['Primary Job Title'],
              primaryJobCompanyLinkedInUrl: data['Primary Job Company LinkedIn URL'],
              industry: data.Industry,
              painPoints: data['Pain Points'],
              businessGoals: data['Business Goals'],
              competitors: data.Competitors,
              competitiveAdvantages: data['Competitive Advantages'],
              locationResearch: data['Location Research'],
              almaMaterResearch: data['Alma Mater Research'],
              linkedInPostSummary: data['LinkedIn Post Summary'],
              companyLinkedInPostSummary: data['Company LinkedIn Post Summary'],
              companyNews: data['Company News'],
              overallProspectSummary: data['Overall Prospect Summary'],
              overallCompanySummary: data['Overall Company Summary'],
              // Handle both old format (direct) and new format (nested in Email object)
              emailSubject: data['Email Subject'] || data.Email?.subject,
              emailBody: data['Email Body'] || data.Email?.body,
              fullOutput: data
            };
            
            console.log('Research data prepared:', Object.keys(researchData));
            
            // Only mark as completed if we have the essential research data (especially email content)
            const hasEssentialData = researchData.emailSubject && researchData.emailBody;
            
            if (hasEssentialData) {
              await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
              console.log(`✅ Successfully updated prospect ${matchedProspect.id} with complete research data and marked as completed`);
              
              // REF: Attempt auto-send to Reply.io if enabled
              const updatedProspect = { ...matchedProspect, status: 'completed', researchResults: researchData };
              console.log(`🔄 [WEBHOOK DEBUG] About to call autoSendToReplyIo for prospect ${matchedProspect.id}`);
              console.log(`🔄 [WEBHOOK DEBUG] Prospect data:`, JSON.stringify({
                id: updatedProspect.id,
                firstName: updatedProspect.firstName,
                lastName: updatedProspect.lastName,
                userId: updatedProspect.userId,
                clientId: updatedProspect.clientId
              }));
              
              try {
                await autoSendToReplyIo(updatedProspect);
                console.log(`✅ [WEBHOOK DEBUG] autoSendToReplyIo completed for prospect ${matchedProspect.id}`);
              } catch (autoSendError) {
                console.error(`❌ [WEBHOOK DEBUG] autoSendToReplyIo failed for prospect ${matchedProspect.id}:`, autoSendError);
              }
            } else {
              await storage.updateProspectStatus(matchedProspect.id, 'processing', researchData);
              console.log(`📝 Updated prospect ${matchedProspect.id} with partial research data, keeping as processing (missing email content)`);
            }
            break;
          }
        }
        
        if (!matchedProspect) {
          console.log(`❌ No matching prospect found for ${data.firstname} ${data.lastname} (${data.email})`);
        }
      } catch (error) {
        console.error('❌ Error processing prospect:', error);
      }
    }

    // Process the research data from n8n - handle multiple formats
    try {
      console.log('Raw body type:', typeof req.body);
      console.log('Raw body keys:', req.body ? Object.keys(req.body) : 'no keys');
      
      // Format 1: Direct object (old format)
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        if (req.body.firstname || req.body.lastname || req.body.email) {
          console.log('Processing single prospect research data (old format)...');
          await processProspectData(req.body);
        }
      }
      
      // Format 2: Array with wrapped output (new format)
      if (req.body && Array.isArray(req.body)) {
        console.log('Processing array of research data...');
        
        for (const item of req.body) {
          // Handle wrapped data format { output: {...} }
          if (item.output && typeof item.output === 'object') {
            console.log('Processing wrapped research data (new format)...');
            await processProspectData(item.output);
          }
          // Handle direct data format
          else if (item.firstname || item.lastname || item.email) {
            console.log('Processing direct research data...');
            await processProspectData(item);
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook data:', error);
    }
    
    res.json({ 
      success: true, 
      method: req.method, 
      message: 'Data received and processed successfully',
      timestamp: new Date().toISOString()
    });
  });

  // REF: Enhanced Reply.io reporting routes
  app.post('/api/reply-io/reports/generate', requireAuth, async (req, res) => {
    try {
      const { reportType, dateFrom, dateTo, campaignIds, groupBy } = req.body;
      
      if (!reportType || !dateFrom || !dateTo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Report type, date range is required' 
        });
      }

      const userId = req.user.id;
      const replyIoSettings = await storage.getUserSettings(userId);
      if (!replyIoSettings?.replyIoApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reply.io API key not configured' 
        });
      }

      const apiKey = replyIoService.decryptApiKey(replyIoSettings.replyIoApiKey);
      
      const reportRequest = {
        reportType,
        dateFrom,
        dateTo,
        campaignIds,
        includeDetails: true,
        groupBy: groupBy || 'day',
      };

      let reportGeneration;
      switch (reportType) {
        case 'campaign_performance':
          reportGeneration = await replyIoService.generateCampaignPerformanceReport(apiKey, reportRequest);
          break;
        case 'email_activity':
          reportGeneration = await replyIoService.generateEmailActivityReport(apiKey, reportRequest);
          break;
        case 'contact_journey':
          reportGeneration = await replyIoService.generateContactJourneyReport(apiKey, reportRequest);
          break;
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid report type' 
          });
      }

      res.json({
        success: true,
        data: reportGeneration,
      });
    } catch (error: any) {
      console.error('Error generating Reply.io report:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate report',
        error: error.message,
      });
    }
  });

  app.get('/api/reply-io/reports/:reportId/status', requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      
      const userId = req.user.id;
      const replyIoSettings = await storage.getUserSettings(userId);
      if (!replyIoSettings?.replyIoApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reply.io API key not configured' 
        });
      }

      const apiKey = replyIoService.decryptApiKey(replyIoSettings.replyIoApiKey);
      const reportStatus = await replyIoService.getReportStatus(apiKey, reportId);

      res.json({
        success: true,
        data: reportStatus,
      });
    } catch (error: any) {
      console.error('Error getting report status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get report status',
        error: error.message,
      });
    }
  });

  app.get('/api/reply-io/reports/:reportId/download', requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { reportType } = req.query;
      
      const userId = req.user.id;
      const replyIoSettings = await storage.getUserSettings(userId);
      if (!replyIoSettings?.replyIoApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reply.io API key not configured' 
        });
      }

      const apiKey = replyIoService.decryptApiKey(replyIoSettings.replyIoApiKey);
      
      let reportData;
      switch (reportType) {
        case 'campaign_performance':
          reportData = await replyIoService.getCampaignPerformanceReport(apiKey, reportId);
          break;
        case 'email_activity':
          reportData = await replyIoService.getEmailActivityReport(apiKey, reportId);
          break;
        case 'contact_journey':
          reportData = await replyIoService.getContactJourneyReport(apiKey, reportId);
          break;
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid report type' 
          });
      }

      res.json({
        success: true,
        data: reportData,
      });
    } catch (error: any) {
      console.error('Error downloading report:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to download report',
        error: error.message,
      });
    }
  });

  app.post('/api/reply-io/reports/comprehensive', requireAuth, async (req, res) => {
    try {
      const { dateFrom, dateTo, campaignIds } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Date range is required' 
        });
      }

      const userId = req.user.id;
      const replyIoSettings = await storage.getUserSettings(userId);
      if (!replyIoSettings?.replyIoApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reply.io API key not configured' 
        });
      }

      const apiKey = replyIoService.decryptApiKey(replyIoSettings.replyIoApiKey);
      const comprehensiveData = await replyIoService.generateComprehensiveAnalytics(
        apiKey,
        new Date(dateFrom),
        new Date(dateTo),
        campaignIds
      );

      res.json({
        success: true,
        data: comprehensiveData,
      });
    } catch (error: any) {
      console.error('Error generating comprehensive analytics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate comprehensive analytics',
        error: error.message,
      });
    }
  });

  app.get('/api/reply-io/reports/export', requireAuth, async (req, res) => {
    try {
      const { dateFrom, dateTo, campaignIds, format = 'json' } = req.query;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Date range is required' 
        });
      }

      const userId = req.user.id;
      const replyIoSettings = await storage.getUserSettings(userId);
      if (!replyIoSettings?.replyIoApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reply.io API key not configured' 
        });
      }

      const apiKey = replyIoService.decryptApiKey(replyIoSettings.replyIoApiKey);
      
      // Get Winry.AI analytics
      const prospects = await storage.getProspectsByUser(userId);
      
      // Generate basic prospect analytics
      const prospectAnalytics = {
        totalProspects: prospects.length,
        completedProspects: prospects.filter(p => p.status === 'completed').length,
        processingProspects: prospects.filter(p => p.status === 'processing').length,
        failedProspects: prospects.filter(p => p.status === 'failed').length,
        successRate: prospects.length > 0 ? 
          (prospects.filter(p => p.status === 'completed').length / prospects.length * 100).toFixed(2) : '0',
      };
      
      // Get comprehensive Reply.io analytics
      const replyIoData = await replyIoService.generateComprehensiveAnalytics(
        apiKey,
        new Date(dateFrom as string),
        new Date(dateTo as string),
        campaignIds ? (campaignIds as string).split(',').map(Number) : undefined
      );

      // Combine data for export
      const combinedReport = {
        generatedAt: new Date().toISOString(),
        dateRange: { from: dateFrom, to: dateTo },
        winryAnalytics: prospectAnalytics,
        replyIoAnalytics: replyIoData,
        pipelineMetrics: {
          totalProspectsUploaded: prospects.length,
          successfullyProcessed: prospects.filter(p => p.status === 'completed').length,
          sentToReplyIo: prospects.filter(p => p.sentToReply).length,
          conversionRate: prospects.length > 0 ? 
            (prospects.filter(p => p.sentToReply).length / prospects.length * 100).toFixed(2) : '0',
        },
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertReportToCSV(combinedReport);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="prospect-pipeline-report-${dateFrom}-to-${dateTo}.csv"`);
        res.send(csv);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="prospect-pipeline-report-${dateFrom}-to-${dateTo}.json"`);
        res.json({
          success: true,
          data: combinedReport,
        });
      }
    } catch (error: any) {
      console.error('Error exporting comprehensive report:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to export comprehensive report',
        error: error.message,
      });
    }
  });

  // Helper function to convert report to CSV
  function convertReportToCSV(report: any): string {
    const lines = [];
    
    // Add header information
    lines.push('Winry.AI Pipeline Report');
    lines.push(`Generated At,${report.generatedAt}`);
    lines.push(`Date Range,${report.dateRange.from} to ${report.dateRange.to}`);
    lines.push('');
    
    // Pipeline Metrics
    lines.push('Pipeline Metrics');
    lines.push('Metric,Value');
    lines.push(`Total Prospects Uploaded,${report.pipelineMetrics.totalProspectsUploaded}`);
    lines.push(`Successfully Processed,${report.pipelineMetrics.successfullyProcessed}`);
    lines.push(`Sent to Reply.io,${report.pipelineMetrics.sentToReplyIo}`);
    lines.push(`Conversion Rate,${report.pipelineMetrics.conversionRate}%`);
    lines.push('');
    
    // Reply.io Campaign Performance
    if (report.replyIoAnalytics?.performanceReport?.campaigns) {
      lines.push('Reply.io Campaign Performance');
      lines.push('Campaign Name,Emails Sent,Open Rate,Click Rate,Reply Rate,Bounce Rate');
      report.replyIoAnalytics.performanceReport.campaigns.forEach((campaign: any) => {
        const latest = campaign.timeSeries[campaign.timeSeries.length - 1] || {};
        lines.push(`${campaign.campaignName},${latest.emailsSent || 0},${latest.openRate || 0}%,${latest.clickRate || 0}%,${latest.replyRate || 0}%,${latest.bounceRate || 0}%`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * REF: Auto-send prospect to Reply.io if user has auto-send enabled
   * PURPOSE: Automatically send completed prospects to Reply.io based on user settings
   * @param {any} prospect - The prospect that was just completed
   * @returns {Promise<void>}
   * 
   * BUSINESS_LOGIC:
   * - Check if user has Reply.io auto-send enabled
   * - Verify user has valid Reply.io credentials and campaign ID
   * - Send prospect to Reply.io campaign
   * - Log success/failure but don't fail the research completion
   * 
   * ERROR_HANDLING:
   * - Catches and logs errors without affecting research completion
   * - Auto-send failures are non-blocking
   */
  async function autoSendToReplyIo(prospect: any): Promise<void> {
    try {
      // REF: Add file-based debug logging to track function calls
      const debugLog = `[${new Date().toISOString()}] AUTO-SEND CALLED for prospect ${prospect.id}: ${prospect.firstName} ${prospect.lastName}\n`;
      fs.appendFileSync('./auto_send_debug.log', debugLog);
      
      console.log(`🤖 [AUTO-SEND DEBUG] Starting auto-send check for prospect ${prospect.id}: ${prospect.firstName} ${prospect.lastName}`);
      console.log(`🔍 [AUTO-SEND DEBUG] Prospect userId: ${prospect.userId}, clientId: ${prospect.clientId}`);
      
      // REF: Get user's Reply.io settings (may not exist in multi-tenant system)
      const userSettings = await storage.getUserSettings(prospect.userId);
      console.log(`⚙️ [AUTO-SEND DEBUG] User settings retrieved:`, userSettings ? 'Found' : 'Not found');
      
      // REF: Check if auto-send is enabled (default to true if no settings or not set)
      const autoSendEnabled = userSettings?.replyIoAutoSend !== undefined ? userSettings.replyIoAutoSend : true;
      console.log(`🔄 [AUTO-SEND DEBUG] Auto-send enabled: ${autoSendEnabled} (from settings: ${userSettings ? 'yes' : 'default'})`);
      
      if (!autoSendEnabled) {
        console.log(`🚫 [AUTO-SEND DEBUG] Auto-send disabled for user ${prospect.userId}`);
        return;
      }

      // REF: Try to get default Reply.io configuration from new multi-account system
      let apiKey: string | null = null;
      let campaignId: number | null = null;
      
      try {
        console.log(`🔍 [AUTO-SEND DEBUG] Attempting to get multi-account configuration for user ${prospect.userId}, client ${prospect.clientId}...`);
        const defaultConfig = await storage.getDefaultReplyioConfiguration(prospect.userId, prospect.clientId);
        console.log(`📊 [AUTO-SEND DEBUG] Default config result:`, defaultConfig ? 'Found' : 'Not found');
        
        if (defaultConfig && defaultConfig.account && defaultConfig.campaign) {
          apiKey = replyIoService.decryptApiKey(defaultConfig.account.apiKey);
          campaignId = defaultConfig.campaign.campaignId;
          console.log(`📋 [AUTO-SEND DEBUG] Using multi-account configuration: Account "${defaultConfig.account.name}", Campaign "${defaultConfig.campaign.campaignName}" (ID: ${campaignId})`);
        } else {
          console.log(`⚠️ [AUTO-SEND DEBUG] Multi-account config incomplete - Account: ${!!defaultConfig?.account}, Campaign: ${!!defaultConfig?.campaign}`);
        }
      } catch (error) {
        console.log(`⚠️ [AUTO-SEND DEBUG] Could not get multi-account configuration:`, error);
      }

      // REF: Fall back to legacy single API key system for backward compatibility
      if (!apiKey || !campaignId) {
        console.log(`📋 [AUTO-SEND DEBUG] Falling back to legacy single API key configuration`);
        
        if (!userSettings || !userSettings.replyIoApiKey || !userSettings.replyIoCampaignId) {
          console.log(`⚠️ [AUTO-SEND DEBUG] Reply.io not fully configured for user ${prospect.userId} (User settings: ${!!userSettings}, Legacy API key: ${!!userSettings?.replyIoApiKey}, Campaign ID: ${!!userSettings?.replyIoCampaignId})`);
          return;
        }
        
        apiKey = replyIoService.decryptApiKey(userSettings.replyIoApiKey);
        campaignId = parseInt(userSettings.replyIoCampaignId);
        console.log(`📋 [AUTO-SEND DEBUG] Using legacy configuration: Campaign ID ${campaignId}`);
      }

      console.log(`🚀 [AUTO-SEND DEBUG] Auto-sending prospect ${prospect.id} to Reply.io campaign ${campaignId}`);
      
      const response = await replyIoService.sendProspectToReply(apiKey, prospect, campaignId);
      
      if (response.success) {
        console.log(`✅ [AUTO-SEND DEBUG] Auto-send successful for prospect ${prospect.id}: ${prospect.firstName} ${prospect.lastName}`);
        
        // Update prospect with campaign ID
        await storage.updateProspectCampaign(prospect.id, campaignId);
        console.log(`💾 [AUTO-SEND DEBUG] Updated prospect ${prospect.id} with campaign ID ${campaignId}`);
      } else {
        console.log(`❌ [AUTO-SEND DEBUG] Auto-send failed for prospect ${prospect.id}:`, response.message);
      }
      
    } catch (error) {
      console.error(`💥 [AUTO-SEND DEBUG] Error in auto-send for prospect ${prospect.id}:`, error);
      // REF: Don't throw error - auto-send failures should not block research completion
    }
  }

  // REF: Temporary route to fix campaign statuses (remove performance metrics from status field)
  app.post('/api/reply-io/fix-campaign-statuses', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // REF: Get all Reply.io accounts for the user
      const accounts = await getReplyIoAccounts(userId);
      
      let totalFixed = 0;
      
      for (const account of accounts) {
        try {
          // REF: Get live campaigns from Reply.io API
          const liveCampaigns = await replyIoService.getCampaigns(account.apiKey);
          
          // REF: Get stored campaigns from database
          const storedCampaigns = await getReplyIoCampaigns(account.id);
          
          // REF: Fix each stored campaign by mapping correct status from live campaigns
          for (const storedCampaign of storedCampaigns) {
            const liveCampaign = liveCampaigns.find(lc => lc.id === storedCampaign.campaignId);
            
            if (liveCampaign) {
              // REF: Map Reply.io status numbers to status strings
              let correctStatus = 'inactive';
              if (liveCampaign.status === 'active' || liveCampaign.status === 2) {
                correctStatus = 'active';
              } else if (liveCampaign.status === 'paused' || liveCampaign.status === 1) {
                correctStatus = 'paused';
              }
              
              // REF: Update the stored campaign with correct status
              await updateReplyIoCampaignStatus(storedCampaign.campaignId, account.id, correctStatus);
              totalFixed++;
              
              console.log(`Fixed campaign ${storedCampaign.campaignName}: ${storedCampaign.campaignStatus} -> ${correctStatus}`);
            }
          }
        } catch (error) {
          console.error(`Error fixing campaigns for account ${account.id}:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Fixed ${totalFixed} campaign statuses`,
        totalFixed
      });
    } catch (error) {
      console.error('Error fixing campaign statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix campaign statuses'
      });
    }
  });

  // ========================================
  // CLIENT MANAGEMENT ENDPOINTS
  // ========================================

  /**
   * REF: Get all clients for the authenticated user
   * METHOD: GET
   * AUTH: Required
   * PURPOSE: List all client workspaces for multi-tenant management
   */
  app.get('/api/clients', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clients = await storage.getClientsByUser(userId);
      
      // Add counts for each client
      const clientsWithCounts = await Promise.all(
        clients.map(async (client: any) => {
          // Count prospects for this client
          const clientProspects = await storage.getProspectsByClient(userId, client.id);
          const prospectCount = clientProspects.length;

          // Count API keys (Reply.io accounts) for this client  
          const apiKeyCount = await db.select({ count: count() })
            .from(replyioAccounts)
            .where(eq(replyioAccounts.clientId, client.id));

          // Count campaigns for this client (via accounts)
          const clientAccounts = await db.select({ id: replyioAccounts.id })
            .from(replyioAccounts)
            .where(eq(replyioAccounts.clientId, client.id));
          
          let totalCampaigns = 0;
          if (clientAccounts.length > 0) {
            for (const account of clientAccounts) {
              const campaigns = await db.select({ count: count() })
                .from(replyioCampaigns)
                .where(eq(replyioCampaigns.accountId, account.id));
              totalCampaigns += campaigns[0]?.count || 0;
            }
          }

          return {
            ...client,
            counts: {
              prospects: prospectCount,
              apiKeys: apiKeyCount[0]?.count || 0,
              campaigns: totalCampaigns,
            }
          };
        })
      );
      
      res.json(clientsWithCounts);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  /**
   * REF: Get a specific client by ID
   * METHOD: GET
   * AUTH: Required  
   * PURPOSE: Retrieve client details for editing or display
   */
  app.get('/api/clients/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ message: 'Failed to fetch client' });
    }
  });

  /**
   * REF: Create a new client workspace
   * METHOD: POST
   * AUTH: Required
   * PURPOSE: Add new client workspace for multi-tenant organization
   */
  app.post('/api/clients', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Validate client data using schema
      const validatedData = insertClientSchema.parse({
        ...req.body,
        userId
      });
      
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ message: 'Invalid client data', errors: error });
      } else {
        res.status(500).json({ message: 'Failed to create client' });
      }
    }
  });

  /**
   * REF: Update an existing client
   * METHOD: PUT
   * AUTH: Required
   * PURPOSE: Modify client workspace details
   */
  app.put('/api/clients/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      
      // REF: Verify client ownership
      const existingClient = await storage.getClient(clientId);
      if (!existingClient || existingClient.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // REF: Validate update data
      const updateData = insertClientSchema.partial().parse(req.body);
      
      const updatedClient = await storage.updateClient(clientId, updateData);
      res.json(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ message: 'Invalid client data', errors: error });
      } else {
        res.status(500).json({ message: 'Failed to update client' });
      }
    }
  });

  /**
   * REF: Delete a client workspace
   * METHOD: DELETE
   * AUTH: Required
   * PURPOSE: Remove client workspace and all associated data
   */
  app.delete('/api/clients/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      
      
      // REF: Verify client ownership
      const existingClient = await storage.getClient(clientId);
      if (!existingClient || existingClient.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // REF: Prevent deletion of last client
      const userClients = await storage.getClientsByUser(userId);
      if (userClients.length <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last client workspace' });
      }
      
      const success = await storage.deleteClient(clientId);
      if (success) {
        res.json({ message: 'Client deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete client' });
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ message: 'Failed to delete client' });
    }
  });

  /**
   * REF: Get prospects for a specific client
   * METHOD: GET
   * AUTH: Required
   * PURPOSE: List prospects filtered by client workspace
   */
  app.get('/api/clients/:id/prospects', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      
      // REF: Verify client ownership
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const prospects = await storage.getProspectsByClient(userId, clientId);
      res.json(prospects);
    } catch (error) {
      console.error('Error fetching client prospects:', error);
      res.status(500).json({ message: 'Failed to fetch client prospects' });
    }
  });

  /**
   * REF: Get current active client session
   * METHOD: GET
   * AUTH: Required
   * PURPOSE: Retrieve the current client context for the user session
   */
  app.get('/api/current-client', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // REF: Get current client from session or default to first client
      let currentClientId = (req.session as any).currentClientId;
      
      if (!currentClientId) {
        // REF: Default to the first/default client
        const defaultClient = await storage.getDefaultClient(userId);
        currentClientId = defaultClient?.id;
        if (currentClientId) {
          (req.session as any).currentClientId = currentClientId;
        }
      }
      
      if (!currentClientId) {
        return res.status(404).json({ message: 'No client found' });
      }
      
      const client = await storage.getClient(currentClientId);
      if (!client || client.userId !== userId) {
        // REF: Clear invalid session and get default
        delete (req.session as any).currentClientId;
        const defaultClient = await storage.getDefaultClient(userId);
        if (defaultClient) {
          (req.session as any).currentClientId = defaultClient.id;
          return res.json(defaultClient);
        }
        return res.status(404).json({ message: 'No valid client found' });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error fetching current client:', error);
      res.status(500).json({ message: 'Failed to fetch current client' });
    }
  });

  /**
   * REF: Switch to a different client
   * METHOD: POST
   * AUTH: Required
   * PURPOSE: Change the active client context for the user session
   */
  app.post('/api/switch-client/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientId = parseInt(req.params.id);
      
      // REF: Verify client ownership
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== userId) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // REF: Update session with new current client
      (req.session as any).currentClientId = clientId;
      
      res.json({ 
        message: 'Client switched successfully', 
        client: client 
      });
    } catch (error) {
      console.error('Error switching client:', error);
      res.status(500).json({ message: 'Failed to switch client' });
    }
  });

  /**
   * REF: Get clients with counts for prospects, API keys, and campaigns
   * METHOD: GET
   * AUTH: Required  
   * PURPOSE: Retrieve clients with detailed statistics for dashboard display
   */
  app.get('/api/clients/with-counts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all clients for the user
      const clients = await storage.getClientsByUser(userId);
      
      // Get counts for each client
      const clientsWithCounts = await Promise.all(
        clients.map(async (client: any) => {
          // Count prospects for this client
          const clientProspects = await storage.getProspectsByClient(userId, client.id);
          const prospectCount = clientProspects.length;

          // Count API keys (Reply.io accounts) for this client  
          const apiKeyCount = await db.select({ count: count() })
            .from(replyioAccounts)
            .where(eq(replyioAccounts.clientId, client.id));

          // Count campaigns for this client (via accounts)
          const clientAccounts = await db.select({ id: replyioAccounts.id })
            .from(replyioAccounts)
            .where(eq(replyioAccounts.clientId, client.id));
          
          let totalCampaigns = 0;
          if (clientAccounts.length > 0) {
            for (const account of clientAccounts) {
              const campaigns = await db.select({ count: count() })
                .from(replyioCampaigns)
                .where(eq(replyioCampaigns.accountId, account.id));
              totalCampaigns += campaigns[0]?.count || 0;
            }
          }

          return {
            ...client,
            counts: {
              prospects: prospectCount,
              apiKeys: apiKeyCount[0]?.count || 0,
              campaigns: totalCampaigns,
            }
          };
        })
      );

      res.json(clientsWithCounts);
    } catch (error) {
      console.error('Error fetching clients with counts:', error);
      res.status(500).json({ message: 'Failed to fetch clients with counts' });
    }
  });

  /**
   * REF: Get all clients (existing endpoint)
   * METHOD: GET
   * AUTH: Required  
   * PURPOSE: Retrieve basic client list for workspace management
   */
  app.get('/api/clients', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clients = await storage.getClientsByUser(userId);
      
      // Add counts for each client
      const clientsWithCounts = await Promise.all(
        clients.map(async (client: any) => {
          // Count prospects for this client
          const clientProspects = await storage.getProspectsByClient(userId, client.id);
          const prospectCount = clientProspects.length;

          // Count API keys (Reply.io accounts) for this client  
          const apiKeyCount = await db.select({ count: count() })
            .from(replyioAccounts)
            .where(eq(replyioAccounts.clientId, client.id));

          // Count campaigns for this client (via accounts)
          const clientAccounts = await db.select({ id: replyioAccounts.id })
            .from(replyioAccounts)
            .where(eq(replyioAccounts.clientId, client.id));
          
          let totalCampaigns = 0;
          if (clientAccounts.length > 0) {
            for (const account of clientAccounts) {
              const campaigns = await db.select({ count: count() })
                .from(replyioCampaigns)
                .where(eq(replyioCampaigns.accountId, account.id));
              totalCampaigns += campaigns[0]?.count || 0;
            }
          }

          return {
            ...client,
            counts: {
              prospects: prospectCount,
              apiKeys: apiKeyCount[0]?.count || 0,
              campaigns: totalCampaigns,
            }
          };
        })
      );
      
      res.json(clientsWithCounts);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  // DEBUG: Test auto-send function manually
  app.post('/api/debug/test-auto-send', requireAuth, async (req: any, res) => {
    try {
      const { prospectId } = req.body;
      const userId = getUserId(req);
      
      // Get the prospect
      const prospects = await storage.getProspectsByUser(userId);
      const prospect = prospects.find(p => p.id === prospectId);
      
      if (!prospect) {
        return res.status(404).json({ success: false, message: 'Prospect not found' });
      }
      
      console.log(`🔍 DEBUG: Testing auto-send for prospect ${prospect.id}: ${prospect.firstName} ${prospect.lastName}`);
      
      // Call the auto-send function and capture any output
      await autoSendToReplyIo(prospect);
      
      res.json({ 
        success: true, 
        message: `Auto-send test completed for ${prospect.firstName} ${prospect.lastName}`,
        prospect: {
          id: prospect.id,
          name: `${prospect.firstName} ${prospect.lastName}`,
          status: prospect.status
        }
      });
    } catch (error) {
      console.error('Debug auto-send error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // REF: Test endpoint to manually trigger auto-send for debugging
  app.post('/api/debug/manual-auto-send/:prospectId', requireAuth, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.prospectId);
      const userId = req.user.id;
      
      // Get the prospect
      const prospect = await storage.getProspect(prospectId);
      if (!prospect || prospect.userId !== userId) {
        return res.status(404).json({ message: 'Prospect not found' });
      }
      
      console.log(`🧪 [MANUAL AUTO-SEND TEST] Testing auto-send for prospect ${prospectId}`);
      
      // Call auto-send function directly
      await autoSendToReplyIo(prospect);
      
      // Check if prospect was updated
      const updatedProspect = await storage.getProspect(prospectId);
      
      res.json({
        success: true,
        message: 'Manual auto-send test completed',
        prospect: {
          id: updatedProspect.id,
          firstName: updatedProspect.firstName,
          lastName: updatedProspect.lastName,
          sentToReplyioCampaignId: updatedProspect.sentToReplyioCampaignId
        }
      });
    } catch (error) {
      console.error('Manual auto-send test error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Manual auto-send test failed',
        error: error.message 
      });
    }
  });

  // REF: Temporary route to fix campaign statuses (remove performance metrics from status field)
  app.post('/api/reply-io/fix-campaign-statuses', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // REF: Get all Reply.io accounts for the user
      const accounts = await getReplyIoAccounts(userId);
      
      let totalFixed = 0;
      
      for (const account of accounts) {
        try {
          // REF: Get live campaigns from Reply.io API
          const liveCampaigns = await replyIoService.getCampaigns(account.apiKey);
          
          // REF: Get stored campaigns from database
          const storedCampaigns = await getReplyIoCampaigns(account.id);
          
          // REF: Fix each stored campaign by mapping correct status from live campaigns
          for (const storedCampaign of storedCampaigns) {
            const liveCampaign = liveCampaigns.find(lc => lc.id === storedCampaign.campaignId);
            
            if (liveCampaign) {
              // REF: Map Reply.io status numbers to status strings
              let correctStatus = 'inactive';
              if (liveCampaign.status === 'active' || liveCampaign.status === 2) {
                correctStatus = 'active';
              } else if (liveCampaign.status === 'paused' || liveCampaign.status === 1) {
                correctStatus = 'paused';
              }
              
              // REF: Update the stored campaign with correct status
              await updateReplyIoCampaignStatus(storedCampaign.campaignId, account.id, correctStatus);
              totalFixed++;
              
              console.log(`Fixed campaign ${storedCampaign.campaignName}: ${storedCampaign.campaignStatus} -> ${correctStatus}`);
            }
          }
        } catch (error) {
          console.error(`Error fixing campaigns for account ${account.id}:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Fixed ${totalFixed} campaign statuses`,
        totalFixed
      });
    } catch (error) {
      console.error('Error fixing campaign statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix campaign statuses'
      });
    }
  });

  // Advanced Analytics Endpoints

  // REF: Temporarily disabled all analytics endpoints to resolve authentication issues
  // app.get('/api/analytics/time-series', requireAuth, async (req: any, res) => {
  //   // Endpoint disabled to resolve authentication issues
  // });

  // app.get('/api/analytics/pipeline-flow', requireAuth, async (req: any, res) => {
  //   // Endpoint disabled to resolve authentication issues
  // });

  // app.get('/api/analytics/operational', requireAuth, async (req: any, res) => {
  //   // Endpoint disabled to resolve authentication issues
  // });

  // Company and prospect intelligence from research results
  // REF: Temporarily disabled problematic analytics endpoints to resolve prospect profile issues
  // app.get('/api/analytics/prospect-intelligence', requireAuth, async (req: any, res) => {
  //   // Endpoint disabled to resolve authentication issues
  // });

  // app.get('/api/analytics/response-timing', requireAuth, async (req: any, res) => {
  //   // Endpoint disabled to resolve authentication issues  
  // });

  // General API endpoints continue...

  // REF: Temporarily disabled problematic analytics endpoint
  // app.get('/api/analytics/prospect-quality', requireAuth, async (req: any, res) => {
  //   // Endpoint disabled to resolve prospect profile issues
  // });

  // ===== ADVANCED REPLY.IO ANALYTICS ENDPOINTS =====

  // REF: NEW ENDPOINT - Advanced Campaign Analytics
  app.get('/api/reply-io/analytics/advanced', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      
      // REF: Check cache first to prevent rate limiting
      const cacheKey = `advanced_analytics_${userId}_${currentClientId || 'default'}`;
      const cached = replyIoStatsCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 2) { // Longer cache for advanced analytics
        console.log('Returning cached advanced analytics data');
        return res.json(cached.data);
      }
      
      // REF: Get default Reply.io configuration for the current workspace
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Fetch advanced analytics using cached service with intelligent rate limiting
      const apiKey = replyIoService.decryptApiKey(defaultConfig.account.apiKey);
      const advancedAnalytics = await replyIoCachedService.getAdvancedAnalytics(
        apiKey,
        'performance', // Performance analytics type  
        'medium' // Medium priority for advanced analytics
      );
      
      const response = {
        success: true,
        analytics: advancedAnalytics,
        accountName: defaultConfig.account.accountName,
        lastUpdated: new Date().toISOString()
      };
      
      // REF: Cache the results with longer duration for analytics
      replyIoStatsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching advanced Reply.io analytics:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch advanced analytics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // REF: NEW ENDPOINT - Campaign Optimization Recommendations
  app.get('/api/reply-io/campaigns/:campaignId/optimization', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      const { campaignId } = req.params;
      
      if (!campaignId || isNaN(parseInt(campaignId))) {
        return res.status(400).json({ 
          success: false,
          message: "Valid campaign ID is required" 
        });
      }
      
      // REF: Check cache first
      const cacheKey = `optimization_${campaignId}_${userId}_${currentClientId || 'default'}`;
      const cached = replyIoStatsCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 3) { // Longer cache for optimization data
        return res.json(cached.data);
      }
      
      // REF: Get default Reply.io configuration
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.status(400).json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Get optimization recommendations
      const recommendations = await replyIoService.getAutomatedOptimizationRecommendations(
        defaultConfig.account.apiKey, 
        parseInt(campaignId)
      );
      
      const response = {
        success: true,
        recommendations,
        accountName: defaultConfig.account.accountName,
        lastUpdated: new Date().toISOString()
      };
      
      // REF: Cache the results
      replyIoStatsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching campaign optimization recommendations:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch optimization recommendations",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // REF: NEW ENDPOINT - Bulk Campaign Performance Report
  app.get('/api/reply-io/analytics/performance-report', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentClientId = req.session.currentClientId;
      
      // REF: Check cache first
      const cacheKey = `performance_report_${userId}_${currentClientId || 'default'}`;
      const cached = replyIoStatsCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 4) { // Longer cache for reports
        return res.json(cached.data);
      }
      
      // REF: Get default Reply.io configuration
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId, currentClientId);
      
      if (!defaultConfig || !defaultConfig.account?.apiKey) {
        return res.json({
          success: false,
          message: "No Reply.io account configured for this workspace"
        });
      }
      
      // REF: Get all campaigns with statistics
      const campaigns = await replyIoService.getCampaignsWithStatistics(defaultConfig.account.apiKey);
      
      // REF: Calculate overall performance metrics
      const totalMetrics = campaigns.reduce((acc, campaign) => {
        acc.totalCampaigns += 1;
        acc.totalContacts += campaign.peopleCount || 0;
        acc.totalDeliveries += campaign.deliveriesCount || 0;
        acc.totalOpens += campaign.opensCount || 0;
        acc.totalReplies += campaign.repliesCount || 0;
        acc.totalBounces += campaign.bouncesCount || 0;
        acc.totalOptOuts += campaign.optOutsCount || 0;
        
        if (String(campaign.status) === '2' || String(campaign.status) === 'active') {
          acc.activeCampaigns += 1;
        }
        
        return acc;
      }, {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalContacts: 0,
        totalDeliveries: 0,
        totalOpens: 0,
        totalReplies: 0,
        totalBounces: 0,
        totalOptOuts: 0
      });
      
      // REF: Calculate rates
      const overallOpenRate = totalMetrics.totalDeliveries > 0 
        ? Math.round((totalMetrics.totalOpens / totalMetrics.totalDeliveries) * 100 * 100) / 100 
        : 0;
      const overallReplyRate = totalMetrics.totalDeliveries > 0 
        ? Math.round((totalMetrics.totalReplies / totalMetrics.totalDeliveries) * 100 * 100) / 100 
        : 0;
      const overallBounceRate = totalMetrics.totalDeliveries > 0 
        ? Math.round((totalMetrics.totalBounces / totalMetrics.totalDeliveries) * 100 * 100) / 100 
        : 0;
      
      // REF: Get top performing campaigns
      const campaignPerformance = campaigns.map(campaign => {
        const openRate = campaign.deliveriesCount > 0 
          ? Math.round((campaign.opensCount / campaign.deliveriesCount) * 100 * 100) / 100 
          : 0;
        const replyRate = campaign.deliveriesCount > 0 
          ? Math.round((campaign.repliesCount / campaign.deliveriesCount) * 100 * 100) / 100 
          : 0;
        
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          contacts: campaign.peopleCount || 0,
          deliveries: campaign.deliveriesCount || 0,
          opens: campaign.opensCount || 0,
          replies: campaign.repliesCount || 0,
          openRate,
          replyRate
        };
      }).sort((a, b) => b.replyRate - a.replyRate);
      
      const response = {
        success: true,
        report: {
          summary: {
            ...totalMetrics,
            overallOpenRate,
            overallReplyRate,
            overallBounceRate
          },
          topCampaigns: campaignPerformance.slice(0, 5),
          allCampaigns: campaignPerformance,
          generatedAt: new Date().toISOString()
        },
        accountName: defaultConfig.account.accountName
      };
      
      // REF: Cache the results
      replyIoStatsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate performance report",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== END ADVANCED REPLY.IO ANALYTICS ENDPOINTS =====

  // ===== PRODUCTION HEALTH MONITORING ENDPOINTS =====
  
  // REF: Import monitoring utilities
  const { healthCheckHandler, metricsHandler, requestMonitoringMiddleware } = await import('./monitoring');
  
  // REF: Add request monitoring middleware to all routes
  app.use(requestMonitoringMiddleware());
  
  // REF: Health check endpoint for load balancers and monitoring
  app.get('/health', healthCheckHandler);
  app.get('/api/health', healthCheckHandler);
  
  // REF: Simple n8n connectivity test endpoint
  app.get('/api/n8n-test', async (req, res) => {
    try {
      const apiKey = process.env.N8N_API_KEY;
      const baseUrl = process.env.N8N_API_BASE_URL || 'https://salesleopard.app.n8n.cloud';
      
      res.json({
        success: true,
        message: 'n8n API environment check',
        hasApiKey: !!apiKey,
        hasBaseUrl: !!baseUrl,
        keyLength: apiKey ? apiKey.length : 0,
        baseUrl: baseUrl
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'n8n environment check failed',
        error: error.message
      });
    }
  });
  
  // REF: Detailed metrics endpoint for monitoring dashboards
  app.get('/api/metrics', requireAuth, metricsHandler);
  
  // REF: Production-ready status endpoint
  app.get('/api/status', requireAuth, async (req: any, res) => {
    try {
      const { healthMonitor } = await import('./monitoring');
      const health = healthMonitor.getHealthStatus();
      const systemMetrics = await healthMonitor.collectSystemMetrics();
      
      res.json({
        status: health.status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        health: health,
        system: {
          memory: {
            usage: `${Math.round(systemMetrics.memory.usagePercent)}%`,
            total: `${Math.round(systemMetrics.memory.total / 1024 / 1024 / 1024 * 100) / 100}GB`,
            free: `${Math.round(systemMetrics.memory.free / 1024 / 1024 / 1024 * 100) / 100}GB`
          },
          cpu: {
            usage: `${Math.round(systemMetrics.cpu.usage)}%`,
            loadAverage: systemMetrics.cpu.loadAverage.map(avg => Math.round(avg * 100) / 100)
          },
          uptime: `${Math.round(systemMetrics.uptime / 3600 * 100) / 100} hours`
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to collect status information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== END PRODUCTION HEALTH MONITORING ENDPOINTS =====

  // ===== API CACHE MONITORING ENDPOINTS =====
  
  // REF: Cache statistics endpoint for monitoring dashboard
  app.get('/api/cache/statistics', requireAuth, (req: any, res) => {
    try {
      const stats = apiCacheManager.getStats();
      
      res.json({
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching cache statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cache statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // REF: Clear cache endpoint for manual cache management
  app.post('/api/cache/clear', requireAuth, (req: any, res) => {
    try {
      // Clear all cache entries
      apiCacheManager.clear();
      
      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== END API CACHE MONITORING ENDPOINTS =====

  // REF: Return the server instance as expected by index.ts
  return server;
}

/**
 * FILE: routes.ts - n8n API Integration for Real-Time Tracking
 * PURPOSE: Add n8n API integration to track prospect research workflow executions
 * LAST_UPDATED: June 8, 2025
 * 
 * REF: This integrates with n8n Cloud API to provide real-time execution tracking
 * REF: Helps debug webhook issues and monitor research progress
 */

// REF: n8n API configuration for tracking workflow executions
const N8N_API_BASE_URL = process.env.N8N_API_BASE_URL || 'https://salesleopard.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || ''; // REF: Set this in Railway environment variables

/**
 * REF: n8n API client for tracking workflow executions
 * PURPOSE: Provides real-time monitoring of prospect research workflows
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - API response data
 */
async function callN8nApi(endpoint: string, options: any = {}) {
  try {
    const url = `${N8N_API_BASE_URL}/api/v1${endpoint}`;
    console.log(`[N8N API] Calling: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.error(`[N8N API] Error ${response.status}: ${response.statusText}`);
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[N8N API] Success:`, data);
    return data;
  } catch (error) {
    console.error('[N8N API] Request failed:', error);
    throw error;
  }
}

/**
 * REF: Get all workflow executions with filtering and pagination
 * PURPOSE: Track execution history and current status of prospect research
 * @param {Object} filters - Execution filters (status, workflowId, etc.)
 * @returns {Promise<Array>} - Array of execution objects
 */
async function getN8nExecutions(filters: any = {}) {
  const queryParams = new URLSearchParams();
  
  // REF: Common filters for prospect research tracking
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.workflowId) queryParams.append('workflowId', filters.workflowId);
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.offset) queryParams.append('offset', filters.offset.toString());
  
  const endpoint = `/executions?${queryParams.toString()}`;
  return await callN8nApi(endpoint);
}

/**
 * REF: Get specific execution details including input/output data
 * PURPOSE: Detailed debugging information for failed or completed research
 * @param {string} executionId - n8n execution ID
 * @returns {Promise<Object>} - Detailed execution data
 */
async function getN8nExecutionDetails(executionId: string) {
  return await callN8nApi(`/executions/${executionId}`);
}

/**
 * REF: Get currently running executions
 * PURPOSE: Real-time monitoring of active prospect research workflows
 * @returns {Promise<Array>} - Array of currently running executions
 */
async function getCurrentN8nExecutions() {
  return await callN8nApi('/executions-current');
}

/**
 * REF: Get all workflows to identify our prospect research workflow
 * PURPOSE: Find the correct workflow ID for prospect research
 * @returns {Promise<Array>} - Array of workflow objects
 */
async function getN8nWorkflows() {
  return await callN8nApi('/workflows');
}

// REF: Removed duplicate route definitions - using requireAuth versions below

// REF: n8n monitoring routes removed to fix deployment - they were outside the registerRoutes function scope

// REF: Update the existing CSV upload to use enhanced tracking
// This modifies the existing processCsvProspects function to include n8n tracking
app.post('/api/upload-csv', requireAuth, upload.single('csvFile'), async (req, res) => {
  // ... existing validation code ...

  try {
    // ... existing CSV processing code ...

    // REF: Enhanced prospect creation with n8n tracking
    for (const prospectData of prospects) {
      try {
        // REF: Create prospect in database
        const prospect = await storage.prospects.create({
          userId: user.id,
          clientId: req.body.clientId ? parseInt(req.body.clientId) : null,
          ...prospectData
        });

        // REF: Prepare n8n webhook payload
        const webhookPayload = [
          `First Name: ${prospectData.firstName}`,
          `Last Name: ${prospectData.lastName}`,
          `LinkedIn: ${prospectData.linkedinUrl || ''}`,
          `Title: ${prospectData.title || ''}`,
          `Company: ${prospectData.company || ''}`,
          `EMail: ${prospectData.email || ''}`
        ];

        // REF: Track prospect execution with n8n API monitoring
        await trackProspectExecution(prospect.id, user.id, webhookPayload);

        console.log(`[PROSPECT UPLOAD] ✅ Created and tracked prospect ${prospect.id}: ${prospectData.firstName} ${prospectData.lastName}`);
        
      } catch (prospectError) {
        console.error('[PROSPECT UPLOAD] Error creating prospect:', prospectError);
        continue; // Continue with other prospects
      }
    }

    // ... existing response code ...
    
  } catch (error) {
    // ... existing error handling ...
  }
});
