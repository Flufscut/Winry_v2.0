import React, { ReactNode } from 'react';
import { useOrganization, usePermission, useFeatureAccess } from '../../contexts/OrganizationContext';
import { Badge } from './badge';
import { Lock, Crown, Zap } from 'lucide-react';

// ============================================================================
// PERMISSION GATE COMPONENT
// ============================================================================

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  feature?: string;
  role?: 'admin' | 'member' | 'viewer';
  tier?: 'individual' | 'team' | 'agency' | 'admin';
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  feature,
  role,
  tier,
  fallback,
  showUpgradePrompt = false,
  className = '',
}) => {
  const { currentOrganization, userRole } = useOrganization();
  const hasPermission = usePermission(permission || '');
  const hasFeatureAccess = useFeatureAccess(feature || '');

  // Check permission if specified
  if (permission && !hasPermission) {
    return showUpgradePrompt ? (
      <PermissionUpgradePrompt type="permission" requirement={permission} />
    ) : (
      <>{fallback || null}</>
    );
  }

  // Check feature access if specified
  if (feature && !hasFeatureAccess) {
    return showUpgradePrompt ? (
      <PermissionUpgradePrompt type="feature" requirement={feature} />
    ) : (
      <>{fallback || null}</>
    );
  }

  // Check role if specified
  if (role && userRole?.role !== role) {
    // For role-based access, check if user has sufficient privileges
    const roleHierarchy: Record<string, number> = {
      'viewer': 1,
      'member': 2,
      'admin': 3,
    };

    const userRoleLevel = roleHierarchy[userRole?.role || 'viewer'] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return showUpgradePrompt ? (
        <PermissionUpgradePrompt type="role" requirement={role} />
      ) : (
        <>{fallback || null}</>
      );
    }
  }

  // Check tier if specified
  if (tier && currentOrganization?.tier !== tier) {
    // For tier-based access, check if organization has sufficient tier
    const tierHierarchy: Record<string, number> = {
      'individual': 1,
      'team': 2,
      'agency': 3,
      'admin': 4,
    };

    const currentTierLevel = tierHierarchy[currentOrganization?.tier || 'individual'] || 0;
    const requiredTierLevel = tierHierarchy[tier] || 0;

    if (currentTierLevel < requiredTierLevel) {
      return showUpgradePrompt ? (
        <PermissionUpgradePrompt type="tier" requirement={tier} />
      ) : (
        <>{fallback || null}</>
      );
    }
  }

  // All checks passed, render children
  return <div className={className}>{children}</div>;
};

// ============================================================================
// PERMISSION UPGRADE PROMPT COMPONENT
// ============================================================================

interface PermissionUpgradePromptProps {
  type: 'permission' | 'feature' | 'role' | 'tier';
  requirement: string;
  className?: string;
}

const PermissionUpgradePrompt: React.FC<PermissionUpgradePromptProps> = ({
  type,
  requirement,
  className = '',
}) => {
  const { currentOrganization } = useOrganization();

  const getPromptContent = () => {
    switch (type) {
      case 'permission':
        return {
          icon: <Lock className="h-5 w-5" />,
          title: 'Permission Required',
          description: `You need the "${requirement}" permission to access this feature.`,
          action: 'Contact your organization admin for access.',
        };

      case 'feature':
        return {
          icon: <Zap className="h-5 w-5" />,
          title: 'Feature Not Available',
          description: `The "${requirement}" feature is not available in your current plan.`,
          action: 'Upgrade your organization to access this feature.',
        };

      case 'role':
        return {
          icon: <Crown className="h-5 w-5" />,
          title: 'Higher Role Required',
          description: `You need "${requirement}" role or higher to access this feature.`,
          action: 'Contact your organization admin for role upgrade.',
        };

      case 'tier':
        const tierNames: Record<string, string> = {
          'individual': 'Individual',
          'team': 'Team',
          'agency': 'Agency',
          'admin': 'Admin',
        };

        return {
          icon: <Crown className="h-5 w-5" />,
          title: 'Plan Upgrade Required',
          description: `This feature requires ${tierNames[requirement]} plan or higher.`,
          action: `Upgrade from ${tierNames[currentOrganization?.tier || 'individual']} to ${tierNames[requirement]} plan.`,
        };

      default:
        return {
          icon: <Lock className="h-5 w-5" />,
          title: 'Access Restricted',
          description: 'You do not have access to this feature.',
          action: 'Contact support for assistance.',
        };
    }
  };

  const content = getPromptContent();

  return (
    <div className={`rounded-lg border border-dashed border-border p-6 text-center ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {content.icon}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium text-foreground">{content.title}</h3>
          <p className="text-sm text-muted-foreground">{content.description}</p>
        </div>

        <Badge variant="outline" className="text-xs">
          {content.action}
        </Badge>
      </div>
    </div>
  );
};

// ============================================================================
// FEATURE ACCESS INDICATOR COMPONENT
// ============================================================================

interface FeatureAccessIndicatorProps {
  feature: string;
  children: ReactNode;
  showBadge?: boolean;
  badgePosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  className?: string;
}

export const FeatureAccessIndicator: React.FC<FeatureAccessIndicatorProps> = ({
  feature,
  children,
  showBadge = true,
  badgePosition = 'top-right',
  className = '',
}) => {
  const hasAccess = useFeatureAccess(feature);
  const { currentOrganization } = useOrganization();

  const getBadgePositionClasses = () => {
    switch (badgePosition) {
      case 'top-right':
        return 'top-2 right-2';
      case 'bottom-right':
        return 'bottom-2 right-2';
      case 'top-left':
        return 'top-2 left-2';
      case 'bottom-left':
        return 'bottom-2 left-2';
      default:
        return 'top-2 right-2';
    }
  };

  const getTierBadgeColor = (tier: string) => {
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

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {showBadge && (
        <div className={`absolute ${getBadgePositionClasses()} z-10`}>
          {hasAccess ? (
            <Badge variant="outline" className={`text-xs ${getTierBadgeColor(currentOrganization?.tier || 'individual')}`}>
              Available
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-slate-500/20 text-slate-400 border-slate-500">
              Upgrade Required
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ROLE-BASED WRAPPER COMPONENT
// ============================================================================

interface RoleBasedWrapperProps {
  children: ReactNode;
  adminContent?: ReactNode;
  memberContent?: ReactNode;
  viewerContent?: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export const RoleBasedWrapper: React.FC<RoleBasedWrapperProps> = ({
  children,
  adminContent,
  memberContent,
  viewerContent,
  fallback,
  className = '',
}) => {
  const { userRole } = useOrganization();

  const getRoleContent = () => {
    switch (userRole?.role) {
      case 'admin':
        return adminContent || children;
      case 'member':
        return memberContent || children;
      case 'viewer':
        return viewerContent || children;
      default:
        return fallback || null;
    }
  };

  return <div className={className}>{getRoleContent()}</div>;
};

// ============================================================================
// TIER-BASED WRAPPER COMPONENT
// ============================================================================

interface TierBasedWrapperProps {
  children: ReactNode;
  individualContent?: ReactNode;
  teamContent?: ReactNode;
  agencyContent?: ReactNode;
  adminContent?: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export const TierBasedWrapper: React.FC<TierBasedWrapperProps> = ({
  children,
  individualContent,
  teamContent,
  agencyContent,
  adminContent,
  fallback,
  className = '',
}) => {
  const { currentOrganization } = useOrganization();

  const getTierContent = () => {
    switch (currentOrganization?.tier) {
      case 'individual':
        return individualContent || children;
      case 'team':
        return teamContent || children;
      case 'agency':
        return agencyContent || children;
      case 'admin':
        return adminContent || children;
      default:
        return fallback || null;
    }
  };

  return <div className={className}>{getTierContent()}</div>;
};

// ============================================================================
// PERMISSION HOOKS FOR CONVENIENCE
// ============================================================================

/**
 * Hook to check if user can perform common actions
 */
export const useCommonPermissions = () => {
  return {
    canCreateProspects: usePermission('prospects.create'),
    canEditProspects: usePermission('prospects.edit'),
    canDeleteProspects: usePermission('prospects.delete'),
    canViewAnalytics: useFeatureAccess('analytics'),
    canManageCampaigns: usePermission('campaigns.manage'),
    canInviteUsers: usePermission('users.invite'),
    canManageSettings: usePermission('settings.manage'),
    canAccessDocuments: useFeatureAccess('documents'),
    canProvideFeedback: useFeatureAccess('feedback'),
  };
};

/**
 * Hook to get user's role display information
 */
export const useRoleDisplay = () => {
  const { userRole, currentOrganization } = useOrganization();

  const getRoleInfo = () => {
    const role = userRole?.role || 'viewer';
    const tier = currentOrganization?.tier || 'individual';

    return {
      role,
      tier,
      roleDisplay: role.charAt(0).toUpperCase() + role.slice(1),
      tierDisplay: tier.charAt(0).toUpperCase() + tier.slice(1),
      canManageUsers: role === 'admin',
      canManageSettings: role === 'admin',
      canInviteUsers: ['admin', 'member'].includes(role),
      hasFullAccess: role === 'admin' && tier === 'admin',
    };
  };

  return getRoleInfo();
}; 