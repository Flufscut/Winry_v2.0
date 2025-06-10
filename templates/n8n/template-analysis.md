# n8n Workflow Template Analysis

## Overview
**Template Name**: Kneecap 4.0 - MirrorMate  
**Total Nodes**: ~50+ nodes (estimated from 3912 lines)  
**Purpose**: AI-powered prospect research with LinkedIn discovery, web scraping, and data enrichment

## 🔑 Critical Components for Multi-Tenant Automation

### 1. **Webhook Entry Point** 
```json
{
  "type": "n8n-nodes-base.webhook",
  "name": "Webhook1", 
  "webhookId": "baa30a41-a24c-4154-84c1-c0e3a2ca572e"
}
```
**🎯 AUTOMATION REQUIRED**:
- **Unique webhookId** per campaign 
- **Dynamic webhook URL** generation
- **URL pattern**: `https://app.n8n.cloud/webhook/{unique-campaign-id}`

### 2. **Supabase Integration Nodes** (9 nodes total)
```json
{
  "type": "n8n-nodes-base.supabase",
  "supabaseApi": {
    "name": "Supabase - MirrorMate"  
  }
}
```
**🎯 AUTOMATION REQUIRED**:
- **New Supabase project** per campaign
- **Project naming**: `{ClientName}_{CampaignName}` 
- **Credential updates**: URL, API key, service key
- **Database schema**: Copy master schema to new project

**Affected Nodes**:
- Main Supabase nodes (6x)
- Vector Store Supabase nodes (3x)
- All using same credential: `"Supabase - MirrorMate"`

### 3. **Result Webhook URL**
```json
{
  "url": "  https://winrybysl-production.up.railway.app/webhook/n8n-results"
}
```
**🎯 AUTOMATION REQUIRED**:
- **Campaign-specific endpoint**: `/webhook/n8n-results/{campaign-id}`
- **Unique routing** for each client's results
- **Response handling** per campaign workspace

### 4. **Workflow Name**
```json
{
  "name": "Kneecap 4.0 - MirrorMate"
}
```
**🎯 AUTOMATION REQUIRED**:
- **Pattern**: `{ClientName} - {CampaignName}`
- **Example**: `"Acme Corp - Q1 Outreach"`

## 🛠️ Automation Configuration Map

### Required Variable Substitutions
| Component | Current Value | New Pattern |
|-----------|---------------|-------------|
| **Workflow Name** | `"Kneecap 4.0 - MirrorMate"` | `"{CLIENT_NAME} - {CAMPAIGN_NAME}"` |
| **Webhook ID** | `"baa30a41-a24c-4154-84c1-c0e3a2ca572e"` | `"{UNIQUE_CAMPAIGN_WEBHOOK_ID}"` |
| **Supabase Credential** | `"Supabase - MirrorMate"` | `"Supabase - {CLIENT_NAME}_{CAMPAIGN_NAME}"` |
| **Result URL** | `"https://winrybysl-production.up.railway.app/webhook/n8n-results"` | `"https://winrybysl-production.up.railway.app/webhook/n8n-results/{CAMPAIGN_ID}"` |

### Node ID Regeneration Strategy
- **All node IDs** must be regenerated to avoid conflicts
- **Connection references** must be updated to match new IDs
- **Credential references** must point to new campaign-specific credentials

## 🔄 Multi-Tenant Deployment Workflow

### Step 1: Template Preparation
1. Load master template JSON
2. Generate unique identifiers for campaign
3. Create variable substitution map

### Step 2: Supabase Project Setup
1. Create new Supabase project: `{ClientName}_{CampaignName}`
2. Copy database schema from master project
3. Generate new API credentials
4. Store credentials in n8n credential store

### Step 3: n8n Workflow Duplication
1. Clone master workflow via n8n API
2. Update workflow name
3. Regenerate all node IDs and connections
4. Update webhook ID for unique entry point
5. Update Supabase credential references
6. Update result webhook URL

### Step 4: Integration Configuration
1. Register new webhook URL in Winry.AI
2. Update campaign routing table
3. Configure result processing for campaign
4. Test end-to-end flow

## 🔧 Technical Implementation Requirements

### n8n API Operations Needed
- **POST** `/workflows` - Create new workflow
- **PUT** `/workflows/{id}` - Update workflow configuration  
- **POST** `/credentials` - Create Supabase credentials
- **GET** `/workflows/{id}/executions` - Monitor executions

### Supabase Management API
- **POST** `/v1/projects` - Create new project
- **GET** `/v1/projects/{id}/settings` - Get credentials
- **POST** `/v1/projects/{id}/database/migrations` - Setup schema

### Google Drive Integration
- **POST** `/v3/files` - Create client folder
- **PATCH** `/v3/files/{id}` - Update folder permissions
- **Pattern**: `Clients/{ClientName}/Documentation`

## 🚦 Rollback Strategy

### Cleanup on Failed Provisioning
1. **Delete n8n workflow** if created
2. **Delete Supabase project** if created  
3. **Remove Google Drive folder** if created
4. **Clean Reply.io organization** if created
5. **Update database** to mark campaign as failed

### Error Handling Points
- **Supabase project creation** failure
- **n8n workflow duplication** failure
- **Credential setup** failure
- **Webhook registration** failure

## 📊 Monitoring & Validation

### Health Checks Required
- **Webhook endpoint** responds correctly
- **Supabase connection** successful
- **Google Drive access** functional
- **Reply.io integration** working
- **End-to-end test** prospect processing

### Success Metrics
- **Webhook URL** returns 200 status
- **Database queries** execute successfully
- **File uploads** to correct Drive folder
- **Campaign creation** in Reply.io
- **Research results** properly routed

---

## 🎯 Next Steps for Implementation

1. **Create n8n API Client** - For workflow management
2. **Build Supabase Manager** - For project lifecycle
3. **Develop Template Engine** - For variable substitution
4. **Implement Validation** - For deployment verification
5. **Design Rollback System** - For failure recovery

This analysis provides the complete roadmap for transforming the single-tenant template into a multi-tenant automation system. 