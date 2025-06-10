# 📁 Templates Directory

This directory contains all template files and configurations needed for automated multi-tenant client onboarding and campaign setup.

## 🏗️ Directory Structure

```
templates/
├── README.md                    # This file
├── n8n/                        # n8n workflow templates and configuration
│   ├── master-workflow.json    # Complete n8n workflow template
│   ├── template-analysis.md    # Detailed analysis of template components
│   ├── variable-mapping.json   # Variable substitution configuration
│   └── deployment-config.json  # API endpoints and deployment steps
├── sql/                        # Database schema templates
│   ├── master_schema.sql       # Supabase database schema template
│   └── migrations/             # Database migration scripts
└── reply-io/                   # Reply.io campaign templates
    ├── master_campaign.json    # Reply.io campaign template
    └── email_sequences/        # Email sequence templates
```

## 🚀 n8n Workflow Template

### Overview
The `master-workflow.json` contains a complete AI-powered prospect research workflow with:
- **LinkedIn discovery** via SERP API
- **Web scraping** for company information  
- **AI research** using OpenAI/Claude
- **Vector database** storage in Supabase
- **Result delivery** via webhooks

### Key Components

#### 1. **Entry Point Webhook**
- **Node Type**: `n8n-nodes-base.webhook`
- **Webhook ID**: `baa30a41-a24c-4154-84c1-c0e3a2ca572e`
- **🎯 Automation**: Generate unique webhook ID per campaign

#### 2. **Supabase Integration** (9 nodes)
- **Database Operations**: Prospect storage, research results, vector embeddings
- **Credential Reference**: `"Supabase - MirrorMate"`
- **🎯 Automation**: Create new Supabase project and credentials per campaign

#### 3. **Result Webhook**
- **URL**: `https://winrybysl-production.up.railway.app/webhook/n8n-results`
- **🎯 Automation**: Route results to campaign-specific endpoint

## 🔄 Multi-Tenant Automation Process

### Phase 1: Template Preparation
1. **Load master template** from `master-workflow.json`
2. **Generate unique identifiers** for new campaign
3. **Create variable substitution map** using `variable-mapping.json`

### Phase 2: Infrastructure Setup
1. **Supabase Project**:
   - Create new project: `{ClientName}_{CampaignName}`
   - Deploy schema from `sql/master_schema.sql`
   - Generate API credentials

2. **Google Drive Folder**:
   - Create folder: `Clients/{ClientName}/Documentation`
   - Set up subfolders for organization
   - Configure permissions

3. **Reply.io Organization**:
   - Create client organization
   - Duplicate master campaign template
   - Configure campaign variables

### Phase 3: n8n Workflow Deployment
1. **Credential Creation**:
   - Create Supabase credentials in n8n
   - Reference: `"Supabase - {ClientName}_{CampaignName}"`

2. **Workflow Duplication**:
   - Clone master workflow via n8n API
   - Update workflow name: `"{ClientName} - {CampaignName}"`
   - Regenerate all node IDs to avoid conflicts

3. **Variable Substitution**:
   - Update webhook ID for unique entry point
   - Update Supabase credential references
   - Update result webhook URL with campaign ID

4. **Activation**:
   - Activate workflow in n8n
   - Register webhook endpoints in Winry.AI
   - Run end-to-end validation tests

## 🛠️ Configuration Files

### `variable-mapping.json`
Defines all variables that need substitution during deployment:
- **Template Variables**: Client name, campaign name, unique IDs
- **Node Updates**: Webhook IDs, credential references, URLs
- **Validation Rules**: Input validation and format requirements
- **Deployment Order**: Step-by-step deployment sequence

### `deployment-config.json`
Contains API endpoints and deployment configuration:
- **API Endpoints**: n8n, Supabase, Google Drive, Reply.io
- **Deployment Steps**: 10-step automated deployment process
- **Rollback Plan**: Comprehensive cleanup for failed deployments
- **Monitoring**: Health checks and alerting configuration

### `template-analysis.md`
Detailed technical analysis including:
- **Critical Components**: Webhook, Supabase nodes, result URLs
- **Automation Requirements**: Variable substitutions needed
- **Implementation Strategy**: Multi-tenant deployment workflow
- **Technical Requirements**: API operations and integrations

## 🚦 Usage Instructions

### For Developers
1. **Review template analysis** in `template-analysis.md`
2. **Understand variable mapping** in `variable-mapping.json`
3. **Study deployment config** in `deployment-config.json`
4. **Implement automation** using provided specifications

### For Operations
1. **Use deployment config** for client onboarding
2. **Monitor health checks** defined in configuration
3. **Execute rollback plans** if deployment fails
4. **Validate end-to-end flow** before client handoff

## 🔍 Template Validation

### Pre-Deployment Checks
- [ ] All required variables have valid values
- [ ] Supabase project name is unique
- [ ] Webhook IDs are generated and unique
- [ ] Google Drive folder structure is correct
- [ ] Reply.io organization doesn't conflict

### Post-Deployment Validation
- [ ] Webhook endpoint responds with 200 status
- [ ] Supabase database connections work
- [ ] Google Drive folder is accessible
- [ ] Reply.io campaign is properly configured
- [ ] End-to-end prospect flow completes successfully

## 🎯 Future Enhancements

### Planned Improvements
- **Template Versioning**: Support for multiple workflow versions
- **Custom Variables**: Client-specific variable injection
- **Advanced Monitoring**: Real-time deployment progress tracking
- **Template Marketplace**: Pre-configured industry templates
- **A/B Testing**: Multiple template variants for optimization

---

## 🔗 Related Documentation

- **[Launch Steps](../launchsteps.md)**: Complete transformation roadmap
- **[Status](../STATUS.md)**: Current implementation progress  
- **[Master Prompt](../MASTER_PROMPT.md)**: Development guidelines
- **[Project Structure](../PROJECT_STRUCTURE_ANALYSIS.md)**: Technical architecture

---

*This templates directory is the foundation for transforming Winry.AI from a single-tenant MVP into a launch-ready multi-tenant SaaS platform.* 