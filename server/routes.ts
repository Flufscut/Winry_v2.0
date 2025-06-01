import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { users } from "@shared/schema";
import { insertProspectSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse/sync";

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

const WEBHOOK_URL = "https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get prospects with search and filter
  app.get('/api/prospects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search, status } = req.query;
      
      const prospects = await storage.searchProspects(
        userId,
        search as string,
        status === "all" ? undefined : status as string
      );
      
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching prospects:", error);
      res.status(500).json({ message: "Failed to fetch prospects" });
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
      
      if (file.mimetype !== 'text/csv') {
        return res.status(400).json({ message: "File must be a CSV" });
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



  // Test endpoint for connectivity
  app.get('/webhook/test', (req, res) => {
    console.log('=== TEST ENDPOINT HIT ===');
    res.json({ message: 'Webhook endpoint is reachable', timestamp: new Date().toISOString() });
  });

  // Add raw body parser for HTML content
  app.use('/api/webhook/results', express.raw({ type: '*/*', limit: '10mb' }));
  
  // Webhook endpoint for n8n to send results back
  app.post('/api/webhook/results', async (req, res) => {
    console.log('!!! WEBHOOK ENDPOINT HIT !!!');
    console.log('=== WEBHOOK RESULTS ENDPOINT TRIGGERED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    console.log('User-Agent:', req.headers['user-agent']);
    
    // Handle raw body data
    let bodyContent = '';
    if (Buffer.isBuffer(req.body)) {
      bodyContent = req.body.toString('utf8');
      console.log('Raw body (Buffer converted to string):', bodyContent);
    } else {
      console.log('Raw request body type:', typeof req.body);
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      bodyContent = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    console.log('Body length:', bodyContent.length);
    console.log('First 500 chars:', bodyContent.substring(0, 500));
    console.log('!!! END WEBHOOK DATA !!!');
    
    // Always respond with success immediately to prevent timeouts
    res.status(200).json({ message: 'Data received successfully', timestamp: new Date().toISOString() });
    
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
            
            await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
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
            await storage.updateProspectStatus(matchedProspect.id, 'completed', researchData);
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
    console.log(`Sending to webhook URL: ${WEBHOOK_URL}`);

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
        
        response = await fetch(WEBHOOK_URL, {
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

    // Update all prospects in batch to completed
    for (const prospect of prospects) {
      await storage.updateProspectStatus(prospect.id, "completed", results);
    }

    console.log(`Batch ${batchNumber} research completed successfully for ${prospects.length} prospects`);

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
