import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProspectSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse/sync";

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
        status as string
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
      
      // Process prospect research asynchronously
      processProspectResearch(prospect.id, prospectData);
      
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
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      if (file.mimetype !== 'text/csv') {
        return res.status(400).json({ message: "File must be a CSV" });
      }
      
      // Parse CSV
      const csvContent = file.buffer.toString('utf-8');
      const records = parse(csvContent, { 
        columns: true, 
        skip_empty_lines: true 
      });
      
      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }
      
      // Return column headers for mapping
      const headers = Object.keys(records[0]);
      
      res.json({
        headers,
        rowCount: records.length,
        preview: records.slice(0, 3) // Return first 3 rows as preview
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
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Parse CSV
      const csvContent = file.buffer.toString('utf-8');
      const records = parse(csvContent, { 
        columns: true, 
        skip_empty_lines: true 
      });
      
      // Create CSV upload record
      const csvUpload = await storage.createCsvUpload({
        userId,
        fileName: file.originalname,
        totalRows: records.length,
        processedRows: 0,
        status: "processing",
      });
      
      // Process prospects asynchronously
      processCsvProspects(csvUpload.id, userId, records, mapping);
      
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

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process individual prospect research
async function processProspectResearch(prospectId: number, prospectData: any) {
  try {
    // Prepare webhook payload
    const webhookPayload = {
      firstname: prospectData.firstName,
      lastname: prospectData.lastName,
      company: prospectData.company,
      title: prospectData.title,
      email: prospectData.email,
      linkedin: prospectData.linkedinUrl || "",
    };
    
    // Send to n8n webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
    
    const results = await response.json();
    
    // Update prospect with results
    await storage.updateProspectStatus(prospectId, "completed", results);
    
    console.log(`Prospect ${prospectId} research completed successfully`);
    
  } catch (error) {
    console.error(`Error processing prospect ${prospectId}:`, error);
    
    // Update prospect with error status
    await storage.updateProspectStatus(
      prospectId, 
      "failed", 
      null, 
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}

// Async function to process CSV prospects
async function processCsvProspects(uploadId: number, userId: string, records: any[], mapping: any) {
  let processedCount = 0;
  
  try {
    for (const record of records) {
      try {
        // Map CSV columns to prospect fields
        const prospectData = {
          userId,
          firstName: record[mapping.firstName] || "",
          lastName: record[mapping.lastName] || "",
          company: record[mapping.company] || "",
          title: record[mapping.title] || "",
          email: record[mapping.email] || "",
          linkedinUrl: record[mapping.linkedinUrl] || "",
          status: "processing",
        };
        
        // Validate the mapped data
        const validatedData = insertProspectSchema.parse(prospectData);
        
        // Create prospect
        const prospect = await storage.createProspect(validatedData);
        
        // Process research for this prospect
        processProspectResearch(prospect.id, validatedData);
        
        processedCount++;
        
        // Update CSV upload progress
        await storage.updateCsvUploadProgress(uploadId, processedCount);
        
      } catch (error) {
        console.error(`Error processing CSV row ${processedCount + 1}:`, error);
        // Continue processing other rows
        processedCount++;
      }
    }
    
    // Mark CSV upload as completed
    await storage.updateCsvUploadProgress(uploadId, processedCount, "completed");
    
    console.log(`CSV upload ${uploadId} completed. Processed ${processedCount} prospects.`);
    
  } catch (error) {
    console.error(`Error processing CSV upload ${uploadId}:`, error);
    
    // Mark CSV upload as failed
    await storage.updateCsvUploadProgress(uploadId, processedCount, "failed");
  }
}
