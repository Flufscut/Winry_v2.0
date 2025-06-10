import { z } from "zod";

// ============================================================================
// API CONFIGURATION TYPES AND SCHEMAS
// ============================================================================

// Base API configuration interface
export interface APIConfig {
  apiKey?: string;
  apiUrl?: string;
  organizationId?: string;
  campaignId?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// N8N API Configuration
export interface N8NConfig extends APIConfig {
  apiKey: string;
  apiUrl: string;
  webhookUrl?: string;
  workflowId?: string;
  executionId?: string;
}

// Supabase API Configuration
export interface SupabaseConfig extends APIConfig {
  projectId: string;
  projectUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  databaseUrl?: string;
}

// Google Drive API Configuration
export interface GoogleDriveConfig extends APIConfig {
  folderId: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

// Reply.io API Configuration
export interface ReplyIOConfig extends APIConfig {
  apiKey: string;
  replyIOOrganizationId: string; // Reply.io organization ID (different from our org ID)
  replyIOCampaignId?: number;
  accountName?: string;
}

// ============================================================================
// MULTI-TENANT API CONFIGURATION MANAGER
// ============================================================================

export class APIConfigManager {
  private static configs: Map<string, Map<string, APIConfig>> = new Map();

  // Generate configuration key
  private static getConfigKey(organizationId: string, campaignId?: string, service?: string): string {
    const parts = [organizationId];
    if (campaignId) parts.push(campaignId);
    if (service) parts.push(service);
    return parts.join(':');
  }

  // Set configuration for organization/campaign
  static setConfig(
    service: 'n8n' | 'supabase' | 'googledrive' | 'replyio',
    organizationId: string,
    config: APIConfig,
    campaignId?: string
  ): void {
    const configKey = this.getConfigKey(organizationId, campaignId, service);
    
    if (!this.configs.has(service)) {
      this.configs.set(service, new Map());
    }
    
    this.configs.get(service)!.set(configKey, {
      ...config,
      organizationId,
      campaignId,
    });
  }

  // Get configuration for organization/campaign
  static getConfig<T extends APIConfig>(
    service: 'n8n' | 'supabase' | 'googledrive' | 'replyio',
    organizationId: string,
    campaignId?: string
  ): T | null {
    const serviceConfigs = this.configs.get(service);
    if (!serviceConfigs) return null;

    // Try campaign-specific config first
    if (campaignId) {
      const campaignConfigKey = this.getConfigKey(organizationId, campaignId, service);
      const campaignConfig = serviceConfigs.get(campaignConfigKey);
      if (campaignConfig && campaignConfig.isActive) {
        return campaignConfig as T;
      }
    }

    // Fall back to organization-level config
    const orgConfigKey = this.getConfigKey(organizationId, undefined, service);
    const orgConfig = serviceConfigs.get(orgConfigKey);
    if (orgConfig && orgConfig.isActive) {
      return orgConfig as T;
    }

    return null;
  }

  // Remove configuration
  static removeConfig(
    service: 'n8n' | 'supabase' | 'googledrive' | 'replyio',
    organizationId: string,
    campaignId?: string
  ): boolean {
    const serviceConfigs = this.configs.get(service);
    if (!serviceConfigs) return false;

    const configKey = this.getConfigKey(organizationId, campaignId, service);
    return serviceConfigs.delete(configKey);
  }

  // List all configurations for an organization
  static listConfigs(
    organizationId: string,
    service?: 'n8n' | 'supabase' | 'googledrive' | 'replyio'
  ): Array<{ service: string; config: APIConfig }> {
    const results: Array<{ service: string; config: APIConfig }> = [];
    
    const servicesToCheck = service ? [service] : ['n8n', 'supabase', 'googledrive', 'replyio'];
    
    for (const serviceName of servicesToCheck) {
      const serviceConfigs = this.configs.get(serviceName);
      if (!serviceConfigs) continue;

      for (const [configKey, config] of serviceConfigs.entries()) {
        if (configKey.startsWith(organizationId) && config.isActive) {
          results.push({ service: serviceName, config });
        }
      }
    }
    
    return results;
  }
}

// ============================================================================
// SERVICE-SPECIFIC CONFIGURATION HELPERS
// ============================================================================

export class N8NConfigHelper {
  static async createWorkflowConfig(
    organizationId: string,
    campaignId: string,
    workflowData: any
  ): Promise<N8NConfig> {
    const baseConfig = APIConfigManager.getConfig<N8NConfig>('n8n', organizationId);
    if (!baseConfig) {
      throw new Error('No N8N base configuration found for organization');
    }

    return {
      ...baseConfig,
      workflowId: workflowData.id,
      webhookUrl: workflowData.webhookUrl,
      campaignId,
      metadata: {
        workflowName: workflowData.name,
        createdAt: new Date().toISOString(),
      }
    };
  }

  static generateWebhookUrl(organizationId: string, campaignId: string): string {
    const baseConfig = APIConfigManager.getConfig<N8NConfig>('n8n', organizationId);
    if (!baseConfig) {
      throw new Error('No N8N base configuration found');
    }

    // Generate unique webhook URL for campaign
    const webhookId = `webhook_${organizationId}_${campaignId}_${Date.now()}`;
    return `${baseConfig.apiUrl}/webhook/${webhookId}`;
  }
}

export class SupabaseConfigHelper {
  static generateProjectName(organizationId: string, campaignId: string, clientName: string): string {
    // Supabase project names must be lowercase and contain only letters, numbers, and hyphens
    const sanitizedClientName = clientName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    
    const orgPrefix = organizationId.slice(0, 8);
    const campaignPrefix = campaignId.slice(0, 8);
    
    return `winry-${orgPrefix}-${campaignPrefix}-${sanitizedClientName}`.slice(0, 63);
  }

  static async createProjectConfig(
    organizationId: string,
    campaignId: string,
    projectData: any
  ): Promise<SupabaseConfig> {
    return {
      projectId: projectData.id,
      projectUrl: projectData.url,
      anonKey: projectData.anon_key,
      serviceRoleKey: projectData.service_role_key,
      databaseUrl: projectData.database_url,
      organizationId,
      campaignId,
      isActive: true,
      metadata: {
        projectName: projectData.name,
        region: projectData.region,
        createdAt: new Date().toISOString(),
      }
    };
  }
}

export class GoogleDriveConfigHelper {
  static generateFolderName(organizationId: string, campaignId: string, clientName: string): string {
    const orgName = organizationId.slice(0, 8);
    const campaignName = campaignId.slice(0, 8);
    return `Winry_${clientName}_${orgName}_${campaignName}_${new Date().getFullYear()}`;
  }

  static async createFolderConfig(
    organizationId: string,
    campaignId: string,
    folderData: any
  ): Promise<GoogleDriveConfig> {
    const baseConfig = APIConfigManager.getConfig<GoogleDriveConfig>('googledrive', organizationId);
    if (!baseConfig) {
      throw new Error('No Google Drive base configuration found');
    }

    return {
      ...baseConfig,
      folderId: folderData.id,
      campaignId,
      metadata: {
        folderName: folderData.name,
        parentFolderId: folderData.parents?.[0],
        createdAt: new Date().toISOString(),
      }
    };
  }
}

export class ReplyIOConfigHelper {
  static async createCampaignConfig(
    organizationId: string,
    campaignId: string,
    replyIOCampaignData: any
  ): Promise<ReplyIOConfig> {
    const baseConfig = APIConfigManager.getConfig<ReplyIOConfig>('replyio', organizationId);
    if (!baseConfig) {
      throw new Error('No Reply.io base configuration found');
    }

    return {
      ...baseConfig,
      replyIOCampaignId: replyIOCampaignData.id,
      accountName: replyIOCampaignData.name,
      campaignId, // Our campaign ID
      metadata: {
        replyIOCampaignName: replyIOCampaignData.name,
        replyIOCampaignId: replyIOCampaignData.id,
        createdAt: new Date().toISOString(),
      }
    };
  }

  static generateOrganizationName(organizationId: string, clientName: string): string {
    const orgPrefix = organizationId.slice(0, 8);
    return `${clientName}_${orgPrefix}`;
  }
} 