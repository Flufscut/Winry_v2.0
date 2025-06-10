-- ============================================================================
-- MULTI-TENANT TRANSFORMATION MIGRATION
-- Description: Transform single-tenant MVP to multi-tenant SaaS platform
-- Date: December 2024
-- Phase: 2A - Multi-Tenant Foundation
-- ============================================================================

-- Step 1: Create new multi-tenant core tables
-- ============================================================================

-- Organizations table - Core multi-tenant entity
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'individual', -- individual, team, agency, admin
  settings JSONB DEFAULT '{}',
  billing_email VARCHAR(255),
  billing_status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
  usage_limits JSONB DEFAULT '{}', -- Monthly limits based on tier
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for organizations
CREATE INDEX IF NOT EXISTS organizations_name_idx ON organizations(name);
CREATE INDEX IF NOT EXISTS organizations_tier_idx ON organizations(tier);

-- Account tiers configuration
CREATE TABLE IF NOT EXISTS account_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- individual, team, agency, admin
  display_name VARCHAR(100) NOT NULL,
  features JSONB NOT NULL, -- Feature flags and capabilities
  limits JSONB NOT NULL, -- Usage limits (prospects/month, users, etc.)
  price_monthly INTEGER DEFAULT 0, -- Price in cents
  price_yearly INTEGER DEFAULT 0, -- Price in cents
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default account tiers
INSERT INTO account_tiers (name, display_name, features, limits, price_monthly, price_yearly) VALUES
('individual', 'Individual', 
 '{"prospects": true, "research": true, "campaigns": true, "analytics": false, "feedback": false, "documents": false}',
 '{"prospects_per_month": 100, "users": 1, "campaigns": 1, "storage_gb": 1}',
 0, 0),
('team', 'Team', 
 '{"prospects": true, "research": true, "campaigns": true, "analytics": true, "feedback": false, "documents": false}',
 '{"prospects_per_month": 500, "users": 5, "campaigns": 3, "storage_gb": 5}',
 4900, 4900),
('agency', 'Agency', 
 '{"prospects": true, "research": true, "campaigns": true, "analytics": true, "feedback": true, "documents": true}',
 '{"prospects_per_month": 2000, "users": -1, "campaigns": -1, "storage_gb": 20}',
 19900, 19900),
('admin', 'Admin', 
 '{"prospects": true, "research": true, "campaigns": true, "analytics": true, "feedback": true, "documents": true, "system_config": true}',
 '{"prospects_per_month": -1, "users": -1, "campaigns": -1, "storage_gb": -1}',
 0, 0)
ON CONFLICT (name) DO NOTHING;

-- User roles and permissions for organizations
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- admin, member, viewer
  permissions JSONB DEFAULT '{}', -- Granular permissions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create indexes for user_roles
CREATE INDEX IF NOT EXISTS user_roles_org_idx ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);

-- Campaigns table - For multi-client campaign management
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- External service integration IDs
  n8n_workflow_id VARCHAR(255),
  n8n_webhook_id VARCHAR(255),
  supabase_project_id VARCHAR(255),
  supabase_project_url VARCHAR(500),
  googledrive_folder_id VARCHAR(255),
  replyio_organization_id VARCHAR(255),
  
  -- Campaign configuration
  settings JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending', -- pending, provisioning, active, paused, failed
  provisioning_status JSONB DEFAULT '{}', -- Track multi-step provisioning
  
  -- Metadata
  created_by VARCHAR NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for campaigns
CREATE INDEX IF NOT EXISTS campaigns_org_idx ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_client_idx ON campaigns(client_name);
CREATE INDEX IF NOT EXISTS campaigns_created_by_idx ON campaigns(created_by);

-- Step 2: Create default organization for existing data
-- ============================================================================

-- Insert default organization for migration
INSERT INTO organizations (id, name, tier, billing_status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add organization columns to existing tables
-- ============================================================================

-- Add organization_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS users_primary_org_idx ON users(primary_organization_id);

-- Add organization_id to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS clients_org_idx ON clients(organization_id);
CREATE INDEX IF NOT EXISTS clients_org_user_idx ON clients(organization_id, user_id);

-- Add organization_id and campaign_id to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS prospects_org_idx ON prospects(organization_id);
CREATE INDEX IF NOT EXISTS prospects_campaign_idx ON prospects(campaign_id);
CREATE INDEX IF NOT EXISTS prospects_org_campaign_idx ON prospects(organization_id, campaign_id);

-- Add organization_id and campaign_id to csv_uploads table
ALTER TABLE csv_uploads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE csv_uploads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS csv_uploads_org_idx ON csv_uploads(organization_id);
CREATE INDEX IF NOT EXISTS csv_uploads_campaign_idx ON csv_uploads(campaign_id);

-- Add organization_id to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS user_settings_org_idx ON user_settings(organization_id);
-- Update unique constraint to include organization_id
DROP INDEX IF EXISTS user_settings_user_client_unique;
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_org_user_client_unique ON user_settings(organization_id, user_id, client_id);

-- Add organization_id to replyio_accounts table
ALTER TABLE replyio_accounts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS replyio_accounts_org_idx ON replyio_accounts(organization_id);
-- Update unique constraint to include organization_id
DROP INDEX IF EXISTS replyio_accounts_user_client_default_unique;
CREATE UNIQUE INDEX IF NOT EXISTS replyio_accounts_org_user_client_default_unique ON replyio_accounts(organization_id, user_id, client_id, is_default) WHERE is_default = true;

-- Step 4: Update existing records with default organization
-- ============================================================================

-- Update users with default organization
UPDATE users 
SET primary_organization_id = '00000000-0000-0000-0000-000000000001'
WHERE primary_organization_id IS NULL;

-- Update clients with default organization
UPDATE clients 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Update prospects with default organization
UPDATE prospects 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Update csv_uploads with default organization
UPDATE csv_uploads 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Update user_settings with default organization
UPDATE user_settings 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Update replyio_accounts with default organization
UPDATE replyio_accounts 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 5: Create user roles for existing users in default organization
-- ============================================================================

-- Add admin role for all existing users in default organization
INSERT INTO user_roles (organization_id, user_id, role, permissions)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  'admin',
  '{"prospects": {"create": true, "read": true, "update": true, "delete": true}, 
    "campaigns": {"manage": true}, 
    "analytics": {"view": true}, 
    "settings": {"admin": true}, 
    "organization": {"manage": true}, 
    "users": {"invite": true}}'
FROM users
WHERE id NOT IN (
  SELECT user_id FROM user_roles 
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
);

-- Step 6: Create new advanced features tables
-- ============================================================================

-- Document management for AI enhancement
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  uploaded_by VARCHAR NOT NULL REFERENCES users(id),
  
  -- File information
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  
  -- Content and processing
  content_text TEXT,
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  embedding_vector JSONB, -- Store vector embeddings
  
  -- Metadata
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS documents_org_idx ON documents(organization_id);
CREATE INDEX IF NOT EXISTS documents_campaign_idx ON documents(campaign_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(processing_status);
CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx ON documents(uploaded_by);

-- Feedback collection for AI training
CREATE TABLE IF NOT EXISTS prospect_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  
  -- Feedback data
  feedback_type VARCHAR(50) NOT NULL, -- email_content, research_quality, personalization
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 scale
  comments TEXT,
  tags JSONB DEFAULT '[]',
  
  -- Context
  original_content JSONB, -- The content being rated
  suggested_improvements TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for prospect_feedback
CREATE INDEX IF NOT EXISTS prospect_feedback_org_idx ON prospect_feedback(organization_id);
CREATE INDEX IF NOT EXISTS prospect_feedback_prospect_idx ON prospect_feedback(prospect_id);
CREATE INDEX IF NOT EXISTS prospect_feedback_type_idx ON prospect_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS prospect_feedback_rating_idx ON prospect_feedback(rating);

-- Step 7: Make organization_id NOT NULL (after data migration)
-- ============================================================================

-- Note: In production, we would make these NOT NULL after verifying all data is migrated
-- For now, we'll leave them nullable to support gradual migration

-- ALTER TABLE clients ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE prospects ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE csv_uploads ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE user_settings ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE replyio_accounts ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================================
-- MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify migration success:

-- SELECT 'Organizations created' as step, count(*) as count FROM organizations;
-- SELECT 'Account tiers created' as step, count(*) as count FROM account_tiers;
-- SELECT 'Campaigns table created' as step, count(*) as count FROM campaigns;
-- SELECT 'Documents table created' as step, count(*) as count FROM documents;
-- SELECT 'Feedback table created' as step, count(*) as count FROM prospect_feedback;
-- SELECT 'User roles created' as step, count(*) as count FROM user_roles;

-- SELECT 'Users with organization' as step, count(*) as count FROM users WHERE primary_organization_id IS NOT NULL;
-- SELECT 'Clients with organization' as step, count(*) as count FROM clients WHERE organization_id IS NOT NULL;
-- SELECT 'Prospects with organization' as step, count(*) as count FROM prospects WHERE organization_id IS NOT NULL;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- To rollback this migration:
-- 1. DROP TABLE prospect_feedback;
-- 2. DROP TABLE documents;
-- 3. DROP TABLE campaigns;
-- 4. DROP TABLE user_roles;
-- 5. DROP TABLE account_tiers;
-- 6. ALTER TABLE users DROP COLUMN primary_organization_id;
-- 7. ALTER TABLE clients DROP COLUMN organization_id;
-- 8. ALTER TABLE prospects DROP COLUMN organization_id, DROP COLUMN campaign_id;
-- 9. ALTER TABLE csv_uploads DROP COLUMN organization_id, DROP COLUMN campaign_id;
-- 10. ALTER TABLE user_settings DROP COLUMN organization_id;
-- 11. ALTER TABLE replyio_accounts DROP COLUMN organization_id;
-- 12. DROP TABLE organizations; 