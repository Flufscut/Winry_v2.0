import React, { useState } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Button } from './button';
import { Badge } from './badge';
import { ChevronDown, Building2, Users, Crown, Settings, Check, Loader2 } from 'lucide-react';

// ============================================================================
// ORGANIZATION SWITCHER COMPONENT
// ============================================================================

interface OrganizationSwitcherProps {
  showCampaignSelector?: boolean;
  className?: string;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  showCampaignSelector = false,
  className = '',
}) => {
  const {
    currentOrganization,
    userOrganizations,
    userRole,
    currentCampaign,
    organizationCampaigns,
    switchOrganization,
    switchCampaign,
    isLoading,
    isLoadingOrganizations,
    isLoadingCampaigns,
    error,
  } = useOrganization();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'individual':
        return <Users className="h-4 w-4" />;
      case 'team':
        return <Building2 className="h-4 w-4" />;
      case 'agency':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Settings className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'individual':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'team':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'agency':
        return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500';
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      case 'viewer':
        return 'Viewer';
      default:
        return 'User';
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500';
      case 'provisioning':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'pending':
        return 'bg-slate-500/20 text-slate-400 border-slate-500';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500';
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleOrganizationSwitch = async (organizationId: string) => {
    setIsOrgDropdownOpen(false);
    if (organizationId !== currentOrganization?.id) {
      await switchOrganization(organizationId);
    }
  };

  const handleCampaignSwitch = (campaignId: string | null) => {
    setIsCampaignDropdownOpen(false);
    switchCampaign(campaignId);
  };

  // ============================================================================
  // LOADING AND ERROR STATES
  // ============================================================================

  if (isLoading || isLoadingOrganizations) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="text-sm text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="text-sm text-muted-foreground">No organization selected</div>
      </div>
    );
  }

  // ============================================================================
  // RENDER ORGANIZATION SWITCHER
  // ============================================================================

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Organization Dropdown */}
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
          className="flex items-center space-x-2 min-w-[200px] justify-between"
        >
          <div className="flex items-center space-x-2">
            {getTierIcon(currentOrganization.tier)}
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{currentOrganization.name}</span>
              <div className="flex items-center space-x-1">
                <Badge variant="outline" className={`text-xs ${getTierColor(currentOrganization.tier)}`}>
                  {currentOrganization.tier}
                </Badge>
                {userRole && (
                  <span className="text-xs text-muted-foreground">
                    · {getRoleDisplay(userRole.role)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {/* Organization Dropdown Menu */}
        {isOrgDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-background border rounded-md shadow-lg z-50">
            <div className="py-1">
              {userOrganizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrganizationSwitch(org.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    {getTierIcon(org.tier)}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{org.name}</span>
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className={`text-xs ${getTierColor(org.tier)}`}>
                          {org.tier}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          · {getRoleDisplay(org.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {org.id === currentOrganization?.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Campaign Selector (if enabled) */}
      {showCampaignSelector && (
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsCampaignDropdownOpen(!isCampaignDropdownOpen)}
            className="flex items-center space-x-2 min-w-[180px] justify-between"
            disabled={isLoadingCampaigns}
          >
            <div className="flex items-center space-x-2">
              {isLoadingCampaigns ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {currentCampaign ? currentCampaign.name : 'All Campaigns'}
                </span>
                {currentCampaign && (
                  <Badge variant="outline" className={`text-xs ${getCampaignStatusColor(currentCampaign.status)}`}>
                    {currentCampaign.status}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isCampaignDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* Campaign Dropdown Menu */}
          {isCampaignDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-background border rounded-md shadow-lg z-50">
              <div className="py-1">
                {/* All Campaigns Option */}
                <button
                  onClick={() => handleCampaignSwitch(null)}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-medium">All Campaigns</span>
                  </div>
                  {!currentCampaign && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>

                {/* Divider */}
                {organizationCampaigns.length > 0 && (
                  <hr className="my-1 border-border" />
                )}

                {/* Individual Campaigns */}
                {organizationCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => handleCampaignSwitch(campaign.id)}
                    className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{campaign.name}</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className={`text-xs ${getCampaignStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            · {campaign.clientName}
                          </span>
                        </div>
                      </div>
                    </div>
                    {campaign.id === currentCampaign?.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}

                {/* Empty State */}
                {organizationCampaigns.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No campaigns available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(isOrgDropdownOpen || isCampaignDropdownOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOrgDropdownOpen(false);
            setIsCampaignDropdownOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// COMPACT ORGANIZATION DISPLAY
// ============================================================================

interface CompactOrganizationDisplayProps {
  className?: string;
}

export const CompactOrganizationDisplay: React.FC<CompactOrganizationDisplayProps> = ({
  className = '',
}) => {
  const { currentOrganization, userRole } = useOrganization();

  if (!currentOrganization) return null;

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'individual': return <Users className="h-3 w-3" />;
      case 'team': return <Building2 className="h-3 w-3" />;
      case 'agency': return <Crown className="h-3 w-3" />;
      case 'admin': return <Settings className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'individual': return 'text-blue-400';
      case 'team': return 'text-green-400';
      case 'agency': return 'text-purple-400';
      case 'admin': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={getTierColor(currentOrganization.tier)}>
        {getTierIcon(currentOrganization.tier)}
      </div>
      <span className="text-sm font-medium">{currentOrganization.name}</span>
      {userRole && (
        <Badge variant="outline" className="text-xs">
          {userRole.role}
        </Badge>
      )}
    </div>
  );
}; 