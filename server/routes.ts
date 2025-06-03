import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth-local";
import { replyIoService } from "./replyio-service";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse/sync";

// REF: Environment-aware schema imports for routes
let users: any, insertProspectSchema: any, db: any;

// REF: Initialize database connection and schema based on environment
async function initializeRouteDatabase() {
  if (process.env.NODE_ENV === 'development') {
    // REF: Use local SQLite schema for development
    const localDb = await import('./db-local');
    users = localDb.users;
    insertProspectSchema = localDb.insertProspectSchema;
    db = localDb.db;
  } else {
    // REF: Use shared PostgreSQL schema for production
    const sharedSchema = await import('@shared/schema');
    const prodDb = await import('./db');
    users = sharedSchema.users;
    insertProspectSchema = sharedSchema.insertProspectSchema;
    db = prodDb.db;
  }
}

// REF: Initialize on module load
const routeDbInitPromise = initializeRouteDatabase();

// Default application settings
const DEFAULT_SETTINGS = {
  webhookUrl: "https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e",
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
  // REF: Ensure database schemas are initialized before registering routes
  await routeDbInitPromise;

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Settings endpoints
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { campaignId, filterByCampaign } = req.query;
      
      let stats;
      
      // REF: Only filter by campaign if explicitly requested with filterByCampaign=true
      // This allows showing all prospects in the main view while supporting campaign-specific filtering
      if (campaignId && campaignId !== 'all' && filterByCampaign === 'true') {
        stats = await storage.getUserStatsByCampaign(userId, parseInt(campaignId));
      } else {
        // REF: Default behavior - show all prospects for the user
        stats = await storage.getUserStats(userId);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get stats for a specific campaign
  app.get('/api/stats/campaign/:campaignId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/prospects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search, status, campaignId, filterByCampaign } = req.query;
      
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
      } else {
        // REF: Default behavior - use existing search method for all prospects
        prospects = await storage.searchProspects(
        userId,
        search as string,
        status === "all" ? undefined : status as string
      );
      }
      
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching prospects:", error);
      res.status(500).json({ message: "Failed to fetch prospects" });
    }
  });

  // Get prospects for a specific campaign
  app.get('/api/prospects/campaign/:campaignId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/prospects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const prospect = await storage.getProspect(prospectId);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Verify ownership
      if (prospect.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(prospect);
    } catch (error) {
      console.error("Error fetching prospect:", error);
      res.status(500).json({ message: "Failed to fetch prospect" });
    }
  });

  // Delete prospect
  app.delete('/api/prospects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
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
  app.post('/api/prospects/:id/retry', isAuthenticated, async (req: any, res) => {
    try {
      const prospectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
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
      processBatchResearch([{ id: prospect.id, data: prospectData }], 1);
      
      res.json({ message: "Prospect research restarted successfully" });
    } catch (error) {
      console.error("Error retrying prospect:", error);
      res.status(500).json({ message: "Failed to retry prospect research" });
    }
  });

  // Create new prospect
  app.post('/api/prospects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const prospectData = insertProspectSchema.parse({
        ...req.body,
        userId,
      });
      
      // Create prospect in database
      const prospect = await storage.createProspect(prospectData);
      
      // Process prospect research asynchronously as a single-item batch
      processBatchResearch([{ id: prospect.id, data: prospectData }], 1);
      
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
  app.post('/api/prospects/csv', isAuthenticated, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/prospects/csv/process', isAuthenticated, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const mapping = JSON.parse(req.body.mapping);
      const hasHeaders = req.body.hasHeaders === 'true';
      const batchSize = parseInt(req.body.batchSize) || 10;
      const startRow = parseInt(req.body.startRow) || 1;
      const maxRows = req.body.maxRows ? parseInt(req.body.maxRows) : null;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
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
      
      // Create CSV upload record
      const csvUpload = await storage.createCsvUpload({
        userId,
        fileName: file.originalname,
        totalRows: records.length,
        processedRows: 0,
        status: "processing",
      });
      
      // Process prospects asynchronously
      processCsvProspects(csvUpload.id, userId, records, mapping, hasHeaders, batchSize);
      
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
  app.get('/api/reply-io/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/reply-io/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
  app.post('/api/reply-io/test-connection', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/reply-io/test-access-level', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/reply-io/send-prospects', isAuthenticated, async (req: any, res) => {
    try {
      console.log('=== REPLY.IO SEND PROSPECTS DEBUG ===');
      console.log('Endpoint hit at:', new Date().toISOString());
      console.log('Request body:', req.body);
      
      const userId = req.user.claims.sub;
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
      const defaultConfig = await storage.getDefaultReplyioConfiguration(userId);
      
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
  app.get('/api/reply-io/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
  app.get('/api/reply-io/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getReplyioAccounts(userId);
      
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
  app.post('/api/reply-io/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, apiKey } = req.body;

      if (!name || !apiKey) {
        return res.status(400).json({ message: "Name and API key are required" });
      }

      // REF: Test the API key first
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

      // REF: Create the account
      const newAccount = await storage.createReplyioAccount({
        userId,
        name,
        apiKey: encryptedApiKey,
        isDefault: false, // REF: User can set default separately
      });

      res.json({
        success: true,
        account: {
          id: newAccount.id,
          name: newAccount.name,
          isDefault: newAccount.isDefault,
          createdAt: newAccount.createdAt,
          updatedAt: newAccount.updatedAt,
        }
      });
    } catch (error) {
      console.error('Error creating Reply.io account:', error);
      res.status(500).json({ 
        message: "Failed to create account",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update Reply.io account
  app.put('/api/reply-io/accounts/:accountId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.delete('/api/reply-io/accounts/:accountId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/reply-io/accounts/:accountId/set-default', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/reply-io/accounts/:accountId/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/reply-io/accounts/:accountId/sync-campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/reply-io/campaigns/:campaignId/set-default', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/reply-io/campaigns/:campaignId/statistics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/reply-io/campaigns/:campaignId/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Get overall Reply.io statistics across all campaigns
  app.get('/api/reply-io/statistics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { filterByCampaign } = req.query;
      
      // REF: Get user's Reply.io accounts (new multi-account approach)
      const userAccounts = await storage.getReplyioAccounts(userId);
      if (!userAccounts || userAccounts.length === 0) {
        return res.status(400).json({ message: "No Reply.io accounts configured" });
      }

      // REF: Use the default account (or first account if no default)
      const defaultAccount = userAccounts.find(acc => acc.isDefault) || userAccounts[0];
      
      // REF: Decrypt API key for the selected account
      const apiKey = replyIoService.decryptApiKey(defaultAccount.apiKey);

      // REF: Get campaigns with full statistics data - this includes performance metrics!
      const campaigns = await replyIoService.getCampaignsWithStatistics(apiKey);
      
      // REF: Get stored campaigns to see if we have any defaults
      const accountCampaigns = await storage.getReplyioCampaigns(defaultAccount.id);
      const defaultCampaign = accountCampaigns.find(c => c.isDefault);
      
      let campaignStatistics;
      let dataLevel;
      
      // REF: If filterByCampaign is true and there's a default campaign, show stats only for that campaign
      if (filterByCampaign === 'true' && defaultCampaign) {
        // REF: Filter to show only the selected campaign
        const selectedCampaignData = campaigns.find(c => c.id === defaultCampaign.campaignId);
        
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
        // REF: Default behavior - aggregate data across ALL campaigns
        campaignStatistics = campaigns.reduce((acc, campaign) => {
          const campaignData = campaign as any;
          return {
            totalContacts: acc.totalContacts + (campaignData.peopleCount || 0),
            emailsSent: acc.emailsSent + (campaignData.deliveriesCount || 0),
            emailsOpened: acc.emailsOpened + (campaignData.opensCount || 0),
            emailsClicked: acc.emailsClicked, // Not available in basic campaign data
            emailsReplied: acc.emailsReplied + (campaignData.repliesCount || 0),
            emailsBounced: acc.emailsBounced + (campaignData.bouncesCount || 0),
          };
        }, {
          totalContacts: 0,
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          emailsReplied: 0,
          emailsBounced: 0,
        });
        dataLevel = 'aggregated';
      }

      // REF: Calculate rates from aggregated/filtered data
      const emailsSent = campaignStatistics.emailsSent;
      const calculatedRates = {
        overallOpenRate: emailsSent > 0 ? Math.round((campaignStatistics.emailsOpened / emailsSent) * 100 * 100) / 100 : 0,
        overallClickRate: 0, // Not available in basic campaign data
        overallReplyRate: emailsSent > 0 ? Math.round((campaignStatistics.emailsReplied / emailsSent) * 100 * 100) / 100 : 0,
        overallBounceRate: emailsSent > 0 ? Math.round((campaignStatistics.emailsBounced / emailsSent) * 100 * 100) / 100 : 0,
      };
      
      // REF: Create statistics response
      const baseStatistics = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => String(c.status) === 'active' || String(c.status) === '2').length,
        pausedCampaigns: campaigns.filter(c => String(c.status) === 'paused' || String(c.status) === '1' || String(c.status) === '4').length,
        inactiveCampaigns: campaigns.filter(c => String(c.status) === 'inactive' || String(c.status) === '0').length,
        
        // REF: Use aggregated or filtered statistics
        ...campaignStatistics,
        ...calculatedRates,
        
        // REF: Show all campaigns for reference
        campaigns: campaigns.map(campaign => {
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
        
        selectedAccount: {
          id: defaultAccount.id,
          name: defaultAccount.name,
          isDefault: defaultAccount.isDefault
        },
        
        selectedCampaign: defaultCampaign ? {
          id: defaultCampaign.id,
          campaignId: defaultCampaign.campaignId,
          name: defaultCampaign.campaignName,
          isDefault: defaultCampaign.isDefault
        } : null,
        
        // REF: Add metadata to indicate filtering level
        dataLevel: dataLevel,
        note: dataLevel === 'campaign-specific' ? 
          `Statistics for selected campaign: ${defaultCampaign?.campaignName}` : 
          'Aggregated statistics across all campaigns'
      };

      res.json({
        success: true,
        statistics: baseStatistics
      });
    } catch (error) {
      console.error('Error fetching Reply.io statistics:', error);
      res.status(500).json({ 
        message: "Failed to fetch Reply.io statistics",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint for connectivity
  app.get('/webhook/test', (req, res) => {
    console.log('=== TEST ENDPOINT HIT ===');
    res.json({ message: 'Webhook endpoint is reachable', timestamp: new Date().toISOString() });
  });

  // Test Reply.io API keys for all accounts
  app.get('/api/reply-io/test-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
    console.log('!!! FRESH WEBHOOK ENDPOINT HIT !!!');
    console.log('Method:', req.method);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body content:', JSON.stringify(req.body, null, 2));
    console.log('Query params:', req.query);
    console.log('URL:', req.url);
    
    // Respond immediately to prevent timeouts
    res.status(200).json({ 
      success: true, 
      method: req.method,
      message: 'Data received successfully',
      timestamp: new Date().toISOString(),
      receivedData: req.body
    });
    
    // Process the research data from n8n
    try {
      if (req.method === 'POST' && req.body && Array.isArray(req.body)) {
        for (const item of req.body) {
          if (item.output) {
            const output = item.output;
            console.log('Processing research for:', output.firstname, output.lastname);
            
            // Find matching prospect by email or name
            const allUsers = await db.select().from(users);
            let matchedProspect = null;
            
            for (const user of allUsers) {
              const userProspects = await storage.getProspectsByUser(user.id);
              
              // Try to match by email first, then by name
              matchedProspect = userProspects.find(p => 
                (output.email && p.email === output.email) ||
                (output.firstname && output.lastname && 
                 p.firstName?.toLowerCase() === output.firstname.toLowerCase() && 
                 p.lastName?.toLowerCase() === output.lastname.toLowerCase())
              );
              
              if (matchedProspect) {
                console.log(`Found matching prospect: ${matchedProspect.firstName} ${matchedProspect.lastName} (ID: ${matchedProspect.id})`);
                
                // Extract and organize all research data
                const researchData = {
                  firstname: output.firstname,
                  lastname: output.lastname,
                  location: output.location,
                  linkedinUrl: output.linkedinUrl,
                  email: output.email,
                  website: output.website,
                  primaryJobCompany: output['Primary Job Company'],
                  primaryJobTitle: output['Primary Job Title'],
                  primaryJobCompanyLinkedInUrl: output['Primary Job Company LinkedIn URL'],
                  industry: output.Industry,
                  painPoints: output['Pain Points'],
                  businessGoals: output['Business Goals'],
                  competitors: output.Competitors,
                  competitiveAdvantages: output['Competitive Advantages'],
                  locationResearch: output['Location Research'],
                  almaMaterResearch: output['Alma Mater Research'],
                  linkedInPostSummary: output['LinkedIn Post Summary'],
                  companyLinkedInPostSummary: output['Company LinkedIn Post Summary'],
                  companyNews: output['Company News'],
                  overallProspectSummary: output['Overall Prospect Summary'],
                  overallCompanySummary: output['Overall Company Summary'],
                  emailSubject: output.Email?.subject,
                  emailBody: output.Email?.body,
                  fullOutput: output
                };
                
                // Only mark as completed if we have essential research data
                const hasEssentialData = researchData.emailSubject && researchData.emailBody;
                
                if (hasEssentialData) {
                  await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
                  console.log(`✅ Successfully updated prospect ${matchedProspect.id} with complete research data and marked as completed`);
                  
                  // REF: Attempt auto-send to Reply.io if enabled
                  const updatedProspect = { ...matchedProspect, status: 'completed', researchResults: researchData };
                  await autoSendToReplyIo(updatedProspect);
                } else {
                  await storage.updateProspectStatus(matchedProspect.id, 'processing', researchData);
                  console.log(`📝 Updated prospect ${matchedProspect.id} with partial research data, keeping as processing`);
                }
                break;
              }
            }
            
            if (!matchedProspect) {
              console.log(`No matching prospect found for ${output.firstname} ${output.lastname} (${output.email})`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook data:', error);
    }
    
    // Handle different possible data structures from n8n
    let dataToProcess = req.body;
    
    // If it's wrapped in an array, extract the first item
    if (Array.isArray(req.body) && req.body.length > 0) {
      dataToProcess = req.body[0];
    }
    
    // If it has a response.body structure (from HTTP Request node), extract that
    if (dataToProcess.response && dataToProcess.response.body) {
      dataToProcess = dataToProcess.response.body;
    }
    
    console.log('Processed data structure:', JSON.stringify(dataToProcess, null, 2));
    
    try {
      console.log('Received webhook results:', JSON.stringify(req.body, null, 2));
      
      const results = req.body;
      
      // Handle both single prospect and batch results
      const prospects = Array.isArray(results) ? results : [results];
      
      for (const result of prospects) {
        // Try to extract identification from various possible locations
        const firstName = result.firstName || result.output?.firstname || result['First Name'];
        const lastName = result.lastName || result.output?.lastname || result['Last Name'];
        const email = result.email || result.output?.email || result.EMail;
        
        console.log(`Looking for prospect: ${firstName} ${lastName} (${email})`);
        console.log('Available fields in result:', Object.keys(result));
        if (result.output) {
          console.log('Available fields in output:', Object.keys(result.output));
        }
        
        // If no firstName/lastName, try to find by email
        if (email && !firstName && !lastName) {
          console.log(`Trying to find prospect by email: ${email}`);
          const allUsers = await db.select().from(users);
          let matchedProspect = null;
          
          for (const user of allUsers) {
            const userProspects = await storage.getProspectsByUser(user.id);
            const prospect = userProspects.find(p => 
              p.email.toLowerCase() === email.toLowerCase() &&
              p.status === 'processing'
            );
            if (prospect) {
              matchedProspect = prospect;
              break;
            }
          }
          
          if (matchedProspect) {
            console.log(`Found prospect by email: ${matchedProspect.id}`);
            console.log(`Updating prospect ${matchedProspect.id} with research results`);
            
            // Extract and organize all research data from the output
            const researchData = {
              // Basic prospect info
              firstname: result.output?.firstname,
              lastname: result.output?.lastname,
              location: result.output?.location,
              linkedinUrl: result.output?.linkedinUrl,
              email: result.output?.email,
              website: result.output?.website,
              
              // Company info
              primaryJobCompany: result.output?.['Primary Job Company'],
              primaryJobTitle: result.output?.['Primary Job Title'],
              primaryJobCompanyLinkedInUrl: result.output?.['Primary Job Company LinkedIn URL'],
              industry: result.output?.Industry,
              
              // Research insights
              painPoints: result.output?.['Pain Points'],
              businessGoals: result.output?.['Business Goals'],
              competitors: result.output?.Competitors,
              competitiveAdvantages: result.output?.['Competitive Advantages'],
              locationResearch: result.output?.['Location Research'],
              almaMaterResearch: result.output?.['Alma Mater Research'],
              linkedInPostSummary: result.output?.['LinkedIn Post Summary'],
              companyLinkedInPostSummary: result.output?.['Company LinkedIn Post Summary'],
              companyNews: result.output?.['Company News'],
              overallProspectSummary: result.output?.['Overall Prospect Summary'],
              overallCompanySummary: result.output?.['Overall Company Summary'],
              
              // Email content
              emailSubject: result.output?.Email?.subject,
              emailBody: result.output?.Email?.body,
              
              // Store the full raw data as well
              fullOutput: result.output
            };
            
            // Only mark as completed if we have essential research data
            const hasEssentialData = researchData.emailSubject && researchData.emailBody;
            
            if (hasEssentialData) {
              await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
              console.log(`✅ Successfully updated prospect ${matchedProspect.id} with complete research data and marked as completed`);
              
              // REF: Attempt auto-send to Reply.io if enabled
              const updatedProspect = { ...matchedProspect, status: 'completed', researchResults: researchData };
              await autoSendToReplyIo(updatedProspect);
            } else {
              await storage.updateProspectStatus(matchedProspect.id, 'processing', researchData);
              console.log(`📝 Updated prospect ${matchedProspect.id} with partial research data, keeping as processing`);
            }
          } else {
            console.log(`No processing prospect found for email: ${email}`);
          }
        } else if (firstName && lastName) {
          // Get all prospects and find match by name
          const allUsers = await db.select().from(users);
          let matchedProspect = null;
          
          for (const user of allUsers) {
            const userProspects = await storage.getProspectsByUser(user.id);
            const prospect = userProspects.find(p => 
              p.firstName.toLowerCase().includes(firstName.toLowerCase()) && 
              p.lastName.toLowerCase().includes(lastName.toLowerCase()) &&
              p.status === 'processing'
            );
            if (prospect) {
              matchedProspect = prospect;
              break;
            }
          }
          
          if (matchedProspect) {
            console.log(`Updating prospect ${matchedProspect.id} with research results`);
            // Use same organized data structure as above
            const researchData = {
              firstname: result.output?.firstname,
              lastname: result.output?.lastname,
              location: result.output?.location,
              linkedinUrl: result.output?.linkedinUrl,
              email: result.output?.email,
              website: result.output?.website,
              primaryJobCompany: result.output?.['Primary Job Company'],
              primaryJobTitle: result.output?.['Primary Job Title'],
              primaryJobCompanyLinkedInUrl: result.output?.['Primary Job Company LinkedIn URL'],
              industry: result.output?.Industry,
              painPoints: result.output?.['Pain Points'],
              businessGoals: result.output?.['Business Goals'],
              competitors: result.output?.Competitors,
              competitiveAdvantages: result.output?.['Competitive Advantages'],
              locationResearch: result.output?.['Location Research'],
              almaMaterResearch: result.output?.['Alma Mater Research'],
              linkedInPostSummary: result.output?.['LinkedIn Post Summary'],
              companyLinkedInPostSummary: result.output?.['Company LinkedIn Post Summary'],
              companyNews: result.output?.['Company News'],
              overallProspectSummary: result.output?.['Overall Prospect Summary'],
              overallCompanySummary: result.output?.['Overall Company Summary'],
              emailSubject: result.output?.Email?.subject,
              emailBody: result.output?.Email?.body,
              fullOutput: result.output
            };
            
            // Only mark as completed if we have essential research data
            const hasEssentialData = researchData.emailSubject && researchData.emailBody;
            
            if (hasEssentialData) {
              await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
              console.log(`✅ Successfully updated prospect ${matchedProspect.id} with complete research data and marked as completed`);
              
              // REF: Attempt auto-send to Reply.io if enabled
              const updatedProspect = { ...matchedProspect, status: 'completed', researchResults: researchData };
              await autoSendToReplyIo(updatedProspect);
            } else {
              await storage.updateProspectStatus(matchedProspect.id, 'processing', researchData);
              console.log(`📝 Updated prospect ${matchedProspect.id} with partial research data, keeping as processing`);
            }
          } else {
            console.log(`No processing prospect found for ${firstName} ${lastName}`);
            // Log all processing prospects for debugging
            const allUsers2 = await db.select().from(users);
            for (const user of allUsers2) {
              const userProspects = await storage.getProspectsByUser(user.id);
              const processingProspects = userProspects.filter(p => p.status === 'processing');
              if (processingProspects.length > 0) {
                console.log(`Processing prospects for user ${user.id}:`, processingProspects.map(p => `${p.firstName} ${p.lastName}`));
              }
            }
          }
        }
      }
      
      res.json({ message: 'Results processed successfully' });
    } catch (error) {
      console.error('Error processing webhook results:', error);
      res.status(500).json({ message: 'Failed to process results' });
    }
  });

  // REF: Enhanced Reply.io reporting routes
  app.post('/api/reply-io/reports/generate', isAuthenticated, async (req, res) => {
    try {
      const { reportType, dateFrom, dateTo, campaignIds, groupBy } = req.body;
      
      if (!reportType || !dateFrom || !dateTo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Report type, date range is required' 
        });
      }

      const userId = req.user.claims.sub;
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

  app.get('/api/reply-io/reports/:reportId/status', isAuthenticated, async (req, res) => {
    try {
      const { reportId } = req.params;
      
      const userId = req.user.claims.sub;
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

  app.get('/api/reply-io/reports/:reportId/download', isAuthenticated, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { reportType } = req.query;
      
      const userId = req.user.claims.sub;
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

  app.post('/api/reply-io/reports/comprehensive', isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo, campaignIds } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Date range is required' 
        });
      }

      const userId = req.user.claims.sub;
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

  app.get('/api/reply-io/reports/export', isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo, campaignIds, format = 'json' } = req.query;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Date range is required' 
        });
      }

      const userId = req.user.claims.sub;
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
      console.log(`🤖 Checking auto-send to Reply.io for prospect ${prospect.id}: ${prospect.firstName} ${prospect.lastName}`);
      
      // REF: Get user's Reply.io settings
      const userSettings = await storage.getUserSettings(prospect.userId);
      
      if (!userSettings) {
        console.log(`❌ No user settings found for user ${prospect.userId}`);
        return;
      }
      
      // REF: Check if auto-send is enabled (default to true if not set)
      const autoSendEnabled = userSettings.replyIoAutoSend !== undefined ? userSettings.replyIoAutoSend : true;
      
      if (!autoSendEnabled) {
        console.log(`🚫 Auto-send disabled for user ${prospect.userId}`);
        return;
      }

      // REF: Try to get default Reply.io configuration from new multi-account system
      let apiKey: string | null = null;
      let campaignId: number | null = null;
      
      try {
        const defaultConfig = await storage.getDefaultReplyioConfiguration(prospect.userId);
        if (defaultConfig && defaultConfig.account && defaultConfig.campaign) {
          apiKey = replyIoService.decryptApiKey(defaultConfig.account.apiKey);
          campaignId = defaultConfig.campaign.campaignId;
          console.log(`📋 Using multi-account configuration: Account "${defaultConfig.account.name}", Campaign "${defaultConfig.campaign.campaignName}" (ID: ${campaignId})`);
        }
      } catch (error) {
        console.log(`⚠️ Could not get multi-account configuration:`, error);
      }

      // REF: Fall back to legacy single API key system for backward compatibility
      if (!apiKey || !campaignId) {
        console.log(`📋 Falling back to legacy single API key configuration`);
        
        if (!userSettings.replyIoApiKey || !userSettings.replyIoCampaignId) {
          console.log(`⚠️ Reply.io not fully configured for user ${prospect.userId} (Legacy API key: ${!!userSettings.replyIoApiKey}, Campaign ID: ${!!userSettings.replyIoCampaignId})`);
          return;
        }
        
        apiKey = replyIoService.decryptApiKey(userSettings.replyIoApiKey);
        campaignId = parseInt(userSettings.replyIoCampaignId);
        console.log(`📋 Using legacy configuration: Campaign ID ${campaignId}`);
      }

      console.log(`🚀 Auto-sending prospect ${prospect.id} to Reply.io campaign ${campaignId}`);
      
      const response = await replyIoService.sendProspectToReply(apiKey, prospect, campaignId);
      
      if (response.success) {
        console.log(`✅ Auto-send successful for prospect ${prospect.id}: ${prospect.firstName} ${prospect.lastName}`);
      } else {
        console.log(`❌ Auto-send failed for prospect ${prospect.id}:`, response.message);
      }
      
    } catch (error) {
      console.error(`💥 Error in auto-send for prospect ${prospect.id}:`, error);
      // REF: Don't throw error - auto-send failures should not block research completion
    }
  }

  // REF: Temporary route to fix campaign statuses (remove performance metrics from status field)
  app.post('/api/reply-io/fix-campaign-statuses', isAuthenticated, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process batch of prospects research
async function processBatchResearch(prospects: Array<{ id: number; data: any }>, batchNumber: number) {
  try {
    // Prepare webhook payload in the expected format
    const webhookPayload = prospects.map(prospect => ({
      "First Name": prospect.data.firstName,
      "Last Name": prospect.data.lastName,
      "LinkedIn": prospect.data.linkedinUrl || "",
      "Title": prospect.data.title,
      "Company": prospect.data.company,
      "EMail": prospect.data.email,
    }));

    console.log(`Processing research for batch ${batchNumber} with ${prospects.length} prospects`);
    console.log(`Webhook payload:`, JSON.stringify(webhookPayload, null, 2));
    console.log(`Sending to webhook URL: ${appSettings.webhookUrl}`);

    // Get current settings for webhook configuration
    const settings = await getAppSettings();
    
    // Send to n8n webhook with configurable timeout and retry logic
    let response;
    let retryCount = 0;
    const maxRetries = settings.maxRetries || 0;
    const timeoutMs = (settings.webhookTimeoutSeconds || 300) * 1000;
    const retryDelayMs = (settings.retryDelaySeconds || 10) * 1000;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempting webhook request (attempt ${retryCount + 1}/${maxRetries + 1}) with ${timeoutMs/1000}s timeout...`);
        
        response = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Batch-Number': batchNumber.toString(),
            'X-Retry-Attempt': (retryCount + 1).toString(),
            'X-Request-Timeout': timeoutMs.toString()
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (response.ok) {
          console.log(`Webhook request successful on attempt ${retryCount + 1}`);
          break; // Success, exit retry loop
        } else if ((response.status === 524 || response.status >= 500) && retryCount < maxRetries) {
          // Server timeout or error, retry after delay
          console.log(`Batch ${batchNumber} server error (${response.status}), retrying in ${retryDelayMs/1000} seconds... (attempt ${retryCount + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          retryCount++;
          continue;
        } else {
          const responseText = await response.text();
          console.error(`Webhook failed with status ${response.status}: ${response.statusText}`);
          console.error(`Response body: ${responseText}`);
          console.error(`Response headers:`, Object.fromEntries(response.headers.entries()));
          throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError' && retryCount < maxRetries) {
          console.log(`Batch ${batchNumber} request timeout after ${timeoutMs/1000}s, retrying in ${retryDelayMs/1000} seconds... (attempt ${retryCount + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          retryCount++;
          continue;
        } else if (error instanceof Error && error.name === 'AbortError' && retryCount < maxRetries) {
          console.log(`Batch ${batchNumber} request aborted, retrying in ${retryDelayMs/1000} seconds... (attempt ${retryCount + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          retryCount++;
          continue;
        }
        throw error;
      }
    }

    if (!response || !response.ok) {
      const responseText = response ? await response.text() : 'No response';
      console.error(`Webhook failed with status ${response?.status}: ${responseText}`);
      throw new Error(`Webhook request failed after ${maxRetries + 1} attempts`);
    }

    console.log(`Webhook response status: ${response.status}`);
    console.log(`Webhook response headers:`, Object.fromEntries(response.headers.entries()));
    
    const rawResults = await response.json();
    console.log(`Raw webhook response:`, JSON.stringify(rawResults, null, 2));

    // Extract the actual data from the n8n response format
    let results;
    if (Array.isArray(rawResults) && rawResults[0]?.response?.body?.output) {
      // Handle n8n format: [{"response": {"body": {"output": {...}}}}]
      results = rawResults[0].response.body.output;
    } else if (Array.isArray(rawResults) && rawResults[0]?.output) {
      // Handle direct format: [{"output": {...}}]
      results = rawResults[0].output;
    } else {
      // Handle other formats
      results = rawResults;
    }

    console.log(`Processed webhook data:`, JSON.stringify(results, null, 2));

    // Note: Do not mark prospects as completed here
    // Prospects will be marked as completed individually when the webhook 
    // receives and processes their specific research data
    console.log(`Batch ${batchNumber} research request sent successfully for ${prospects.length} prospects`);

  } catch (error) {
    console.error(`Error processing batch ${batchNumber}:`, error);

    // Update all prospects in batch to failed
    for (const prospect of prospects) {
      await storage.updateProspectStatus(
        prospect.id, 
        "failed", 
        null, 
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
}

// Async function to process CSV prospects in batches
async function processCsvProspects(uploadId: number, userId: string, records: any[], mapping: any, hasHeaders: boolean, batchSize: number = 10) {
  let processedCount = 0;
  
  try {
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchProspects: any[] = [];
      
      // Create all prospects in this batch first
      for (const record of batch) {
        try {
          let prospectData: any;
          
          if (hasHeaders) {
            // Map CSV columns to prospect fields using column names
            prospectData = {
              userId,
              firstName: record[mapping.firstName] || "",
              lastName: record[mapping.lastName] || "",
              company: record[mapping.company] || "",
              title: record[mapping.title] || "",
              email: record[mapping.email] || "",
              linkedinUrl: mapping.linkedinUrl === "none" ? "" : record[mapping.linkedinUrl] || "",
              status: "processing",
            };
          } else {
            // Map CSV columns to prospect fields using column indices
            const recordArray = record as string[];
            const getColumnIndex = (columnName: string) => {
              const match = columnName.match(/Column (\d+)/);
              return match ? parseInt(match[1]) - 1 : -1;
            };
            
            prospectData = {
              userId,
              firstName: recordArray[getColumnIndex(mapping.firstName)] || "",
              lastName: recordArray[getColumnIndex(mapping.lastName)] || "",
              company: recordArray[getColumnIndex(mapping.company)] || "",
              title: recordArray[getColumnIndex(mapping.title)] || "",
              email: recordArray[getColumnIndex(mapping.email)] || "",
              linkedinUrl: mapping.linkedinUrl === "none" ? "" : recordArray[getColumnIndex(mapping.linkedinUrl)] || "",
              status: "processing",
            };
          }
          
          // Validate the mapped data
          const validatedData = insertProspectSchema.parse(prospectData);
          
          // Create prospect
          const prospect = await storage.createProspect(validatedData);
          batchProspects.push({ id: prospect.id, data: validatedData });
          
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing CSV row ${processedCount + 1}:`, error);
          processedCount++;
        }
      }
      
      // Update progress after creating the batch
      await storage.updateCsvUploadProgress(uploadId, processedCount);
      
      // Process research for all prospects in this batch
      if (batchProspects.length > 0) {
        await processBatchResearch(batchProspects, Math.floor(i / batchSize) + 1);
      }
      
      // Add delay between batches to prevent overwhelming the webhook
      if (i + batchSize < records.length) {
        console.log(`Processed batch of ${batch.length} prospects. Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }
    
    // Mark CSV upload as completed
    await storage.updateCsvUploadProgress(uploadId, processedCount, "completed");
    
    console.log(`CSV upload ${uploadId} completed. Processed ${processedCount} prospects in batches of ${batchSize}.`);
    
  } catch (error) {
    console.error(`Error processing CSV upload ${uploadId}:`, error);
    
    // Mark CSV upload as failed
    await storage.updateCsvUploadProgress(uploadId, processedCount, "failed");
  }
}

// Get Winry.AI analytics
const prospectAnalytics = {
  totalProspects: stats.totalProspects,
  completedProspects: stats.completed,
  processingProspects: stats.processing,
  failedProspects: stats.failed,
  completionRate: stats.totalProspects > 0 
    ? Math.round((stats.completed / stats.totalProspects) * 100) 
    : 0
};

// Get Reply.io statistics
const replyioService = new ReplyIoService();
const replyioStats = await replyioService.getCombinedStatistics();

const response = {
  winryAnalytics: prospectAnalytics,
  replyioAnalytics: replyioStats,
  lastUpdated: new Date().toISOString()
};

res.json(response);