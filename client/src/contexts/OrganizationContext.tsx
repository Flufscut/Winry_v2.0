import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Note: Using placeholder for Clerk until proper auth integration
// import { useUser } from '@clerk/clerk-react';

// ============================================================================
// ORGANIZATION CONTEXT TYPES
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  tier: 'individual' | 'team' | 'agency' | 'admin';
  settings: Record<string, any>;
  billingEmail?: string;
  billingStatus: 'active' | 'suspended' | 'cancelled';
  usageLimits: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  role: string; // User's role in this organization
}

export interface UserRole {
  id: string;
  organizationId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  permissions: Record<string, any>;
  isActive: boolean;
}

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  clientName: string;
  description?: string;
  status: 'pending' | 'provisioning' | 'active' | 'paused' | 'failed';
  provisioningStatus: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationContextType {
  // Current organization state
  currentOrganization: Organization | null;
  userOrganizations: Organization[];
  userRole: UserRole | null;
  
  // Organization management
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  
  // Campaign management
  currentCampaign: Campaign | null;
  organizationCampaigns: Campaign[];
  switchCampaign: (campaignId: string | null) => void;
  refreshCampaigns: () => Promise<void>;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  
  // Loading states
  isLoading: boolean;
  isLoadingOrganizations: boolean;
  isLoadingCampaigns: boolean;
  
  // Error states
  error: string | null;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// ============================================================================
// ORGANIZATION PROVIDER COMPONENT
// ============================================================================

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  // Placeholder for auth integration - replace with actual auth hook
  const user = { id: 'temp-user-id' };
  const isLoaded = true;
  
  // State management
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [organizationCampaigns, setOrganizationCampaigns] = useState<Campaign[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchUserOrganizations = async (): Promise<Organization[]> => {
    if (!user?.id) return [];
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.statusText}`);
      }

      const data = await response.json();
      return data.organizations || [];
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }
  };

  const fetchOrganizationCampaigns = async (organizationId: string): Promise<Campaign[]> => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/campaigns`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }

      const data = await response.json();
      return data.campaigns || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  };

  const fetchUserRole = async (organizationId: string): Promise<UserRole | null> => {
    if (!user?.id) return null;

    try {
      const response = await fetch(`/api/organizations/${organizationId}/role`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user role: ${response.statusText}`);
      }

      const data = await response.json();
      return data.role || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      throw error;
    }
  };

  // ============================================================================
  // ORGANIZATION MANAGEMENT
  // ============================================================================

  const refreshOrganizations = async (): Promise<void> => {
    if (!isLoaded || !user?.id) return;

    setIsLoadingOrganizations(true);
    setError(null);

    try {
      const organizations = await fetchUserOrganizations();
      setUserOrganizations(organizations);

      // If no current organization and we have organizations, set the first as current
      if (!currentOrganization && organizations.length > 0) {
        await switchOrganization(organizations[0].id);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load organizations');
      console.error('Error refreshing organizations:', error);
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  const switchOrganization = async (organizationId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Find the organization in our list
      const organization = userOrganizations.find(org => org.id === organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Fetch user role for this organization
      const role = await fetchUserRole(organizationId);
      
      // Update current organization and role
      setCurrentOrganization(organization);
      setUserRole(role);

      // Clear current campaign when switching organizations
      setCurrentCampaign(null);
      
      // Fetch campaigns for the new organization
      await refreshCampaigns(organizationId);

      // Store preference in localStorage
      localStorage.setItem('winry-current-organization', organizationId);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to switch organization');
      console.error('Error switching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // CAMPAIGN MANAGEMENT
  // ============================================================================

  const refreshCampaigns = async (organizationId?: string): Promise<void> => {
    const orgId = organizationId || currentOrganization?.id;
    if (!orgId) return;

    setIsLoadingCampaigns(true);

    try {
      const campaigns = await fetchOrganizationCampaigns(orgId);
      setOrganizationCampaigns(campaigns);

      // If we have a stored current campaign, try to restore it
      const storedCampaignId = localStorage.getItem('winry-current-campaign');
      if (storedCampaignId && campaigns.find(c => c.id === storedCampaignId)) {
        setCurrentCampaign(campaigns.find(c => c.id === storedCampaignId) || null);
      }
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
      // Don't set error state for campaign failures, as they're not critical
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const switchCampaign = (campaignId: string | null): void => {
    if (campaignId) {
      const campaign = organizationCampaigns.find(c => c.id === campaignId);
      setCurrentCampaign(campaign || null);
      localStorage.setItem('winry-current-campaign', campaignId);
    } else {
      setCurrentCampaign(null);
      localStorage.removeItem('winry-current-campaign');
    }
  };

  // ============================================================================
  // PERMISSION CHECKING
  // ============================================================================

  const hasPermission = (permission: string): boolean => {
    if (!userRole || !currentOrganization) return false;

    // Admin role has all permissions
    if (userRole.role === 'admin') return true;

    // Check specific permission in user's permissions object
    const permissions = userRole.permissions || {};
    
    // Support nested permission checking (e.g., 'prospects.create')
    const permissionParts = permission.split('.');
    let currentPermission = permissions;
    
    for (const part of permissionParts) {
      if (typeof currentPermission === 'object' && currentPermission !== null) {
        currentPermission = currentPermission[part];
      } else {
        return false;
      }
    }

    return Boolean(currentPermission);
  };

  const canAccessFeature = (feature: string): boolean => {
    if (!currentOrganization) return false;

    // Get account tier features
    const accountTiers: Record<string, Record<string, boolean>> = {
      individual: {
        prospects: true,
        research: true,
        campaigns: true,
        analytics: false,
        feedback: false,
        documents: false,
      },
      team: {
        prospects: true,
        research: true,
        campaigns: true,
        analytics: true,
        feedback: false,
        documents: false,
      },
      agency: {
        prospects: true,
        research: true,
        campaigns: true,
        analytics: true,
        feedback: true,
        documents: true,
      },
      admin: {
        prospects: true,
        research: true,
        campaigns: true,
        analytics: true,
        feedback: true,
        documents: true,
        system_config: true,
      },
    };

    const tierFeatures = accountTiers[currentOrganization.tier] || {};
    return tierFeatures[feature] === true;
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize organizations when user loads
  useEffect(() => {
    if (isLoaded && user?.id) {
      refreshOrganizations();
    }
  }, [isLoaded, user?.id]);

  // Restore organization preference on mount
  useEffect(() => {
    if (userOrganizations.length > 0 && !currentOrganization) {
      const storedOrgId = localStorage.getItem('winry-current-organization');
      if (storedOrgId && userOrganizations.find(org => org.id === storedOrgId)) {
        switchOrganization(storedOrgId);
      } else if (userOrganizations.length > 0) {
        switchOrganization(userOrganizations[0].id);
      }
    }
  }, [userOrganizations]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: OrganizationContextType = {
    // Current organization state
    currentOrganization,
    userOrganizations,
    userRole,
    
    // Organization management
    switchOrganization,
    refreshOrganizations,
    
    // Campaign management
    currentCampaign,
    organizationCampaigns,
    switchCampaign,
    refreshCampaigns,
    
    // Permissions
    hasPermission,
    canAccessFeature,
    
    // Loading states
    isLoading,
    isLoadingOrganizations,
    isLoadingCampaigns,
    
    // Error states
    error,
  };

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

// Hook for checking permissions
export const usePermission = (permission: string): boolean => {
  const { hasPermission } = useOrganization();
  return hasPermission(permission);
};

// Hook for checking feature access
export const useFeatureAccess = (feature: string): boolean => {
  const { canAccessFeature } = useOrganization();
  return canAccessFeature(feature);
};

// Hook for getting organization tier info
export const useOrganizationTier = () => {
  const { currentOrganization } = useOrganization();
  
  const tierInfo = {
    individual: {
      name: 'Individual',
      maxUsers: 1,
      maxCampaigns: 1,
      maxProspectsPerMonth: 100,
      features: ['prospects', 'research', 'campaigns'],
    },
    team: {
      name: 'Team',
      maxUsers: 5,
      maxCampaigns: 3,
      maxProspectsPerMonth: 500,
      features: ['prospects', 'research', 'campaigns', 'analytics'],
    },
    agency: {
      name: 'Agency',
      maxUsers: -1, // Unlimited
      maxCampaigns: -1, // Unlimited
      maxProspectsPerMonth: 2000,
      features: ['prospects', 'research', 'campaigns', 'analytics', 'feedback', 'documents'],
    },
    admin: {
      name: 'Admin',
      maxUsers: -1, // Unlimited
      maxCampaigns: -1, // Unlimited
      maxProspectsPerMonth: -1, // Unlimited
      features: ['prospects', 'research', 'campaigns', 'analytics', 'feedback', 'documents', 'system_config'],
    },
  };

  const currentTier = currentOrganization?.tier || 'individual';
  return {
    tier: currentTier,
    info: tierInfo[currentTier],
    isUnlimited: (field: 'users' | 'campaigns' | 'prospects') => {
      const limits = tierInfo[currentTier];
      switch (field) {
        case 'users': return limits.maxUsers === -1;
        case 'campaigns': return limits.maxCampaigns === -1;
        case 'prospects': return limits.maxProspectsPerMonth === -1;
        default: return false;
      }
    }
  };
}; 