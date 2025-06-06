/**
 * FILE: reply-io-settings.tsx
 * PURPOSE: Reply.io integration settings configuration component with multi-account support
 * DEPENDENCIES: React hooks, shadcn/ui components, fetch API
 * LAST_UPDATED: Current date
 * 
 * REF: Allows users to configure multiple Reply.io API credentials and manage campaigns
 * REF: Integrates with backend API endpoints for secure credential storage
 * REF: Supports both legacy single API key and new multi-account configurations
 * TODO: Add campaign selection dropdown from Reply.io API
 * 
 * MAIN_FUNCTIONS:
 * - fetchSettings: Load current user settings
 * - saveSettings: Save Reply.io configuration
 * - testConnection: Validate API credentials
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  CheckCircle, 
  Send, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  RefreshCw,
  Building2,
  Target,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * REF: Interface for Reply.io settings data structure (legacy)
 */
interface ReplyIoSettings {
  replyIoApiKey?: string;
  replyIoCampaignId?: string;
  replyIoAutoSend?: boolean;
  hasApiKey: boolean;
  webhookUrl?: string;
  webhookTimeout?: number;
  batchSize?: number;
}

/**
 * REF: Interface for Reply.io accounts (multi-account system)
 */
interface ReplyIoAccount {
  id: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * REF: Interface for Reply.io campaigns
 */
interface ReplyIoCampaign {
  id: number;
  name: string;
  status: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // REF: Explicitly exclude performance metrics from settings UI
  // openRate?: number;
  // clickRate?: number; 
  // replyRate?: number;
}

/**
 * REF: Component state interface
 */
interface SettingsState extends ReplyIoSettings {
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  testResult?: {
    success: boolean;
    message: string;
    campaignsFound?: number;
  };
  // Multi-account state
  accounts: ReplyIoAccount[];
  selectedAccount: ReplyIoAccount | null;
  campaigns: ReplyIoCampaign[];
  isLoadingAccounts: boolean;
  isLoadingCampaigns: boolean;
}

export function ReplyIoSettings() {
  const { toast } = useToast();
  
  // REF: Component state for settings and UI feedback
  const [settings, setSettings] = useState<SettingsState>({
    replyIoApiKey: '',
    replyIoCampaignId: '',
    replyIoAutoSend: true,
    hasApiKey: false,
    webhookUrl: '',
    webhookTimeout: 300,
    batchSize: 10,
    isLoading: true,
    isSaving: false,
    isTesting: false,
    testResult: undefined,
    accounts: [],
    selectedAccount: null,
    campaigns: [],
    isLoadingAccounts: false,
    isLoadingCampaigns: false,
  });

  // REF: Account management state
  const [newAccount, setNewAccount] = useState({ name: '', apiKey: '' });
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(null);

  /**
   * REF: Toggle account expansion to show/hide campaigns
   * PURPOSE: Allow users to click on account rows to expand campaigns
   */
  const toggleAccountExpansion = async (account: ReplyIoAccount) => {
    if (expandedAccountId === account.id) {
      // Collapse if already expanded
      setExpandedAccountId(null);
      setSettings(prev => ({ ...prev, selectedAccount: null, campaigns: [] }));
    } else {
      // Expand and load campaigns
      setExpandedAccountId(account.id);
      setSettings(prev => ({ ...prev, selectedAccount: account }));
      await fetchCampaignsWithAutoSync(account.id);
    }
  };

  /**
   * REF: Load Reply.io accounts for the user
   * PURPOSE: Fetch all configured Reply.io accounts
   */
  const fetchAccounts = async () => {
    try {
      setSettings(prev => ({ ...prev, isLoadingAccounts: true }));
      
      const response = await fetch('/api/reply-io/accounts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ 
          ...prev, 
          accounts: data.accounts || [],
          isLoadingAccounts: false 
        }));
      } else {
        console.error('Failed to fetch accounts');
        setSettings(prev => ({ ...prev, isLoadingAccounts: false }));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setSettings(prev => ({ ...prev, isLoadingAccounts: false }));
    }
  };

  /**
   * REF: Fetch campaigns for selected account (no auto-sync)
   * PURPOSE: Get stored campaigns with default status and live campaigns from Reply.io API
   */
  const fetchCampaigns = async (accountId: number) => {
    setSettings(prev => ({ ...prev, isLoadingCampaigns: true }));
    try {
      const response = await fetch(`/api/reply-io/accounts/${accountId}/campaigns`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        
        // REF: Use stored campaigns first (they have isDefault field), then fall back to live campaigns
        let campaignsToUse = [];
        if (result.campaigns.stored && result.campaigns.stored.length > 0) {
          // REF: Map stored campaigns to include only essential data, exclude performance metrics
          campaignsToUse = result.campaigns.stored.map((storedCampaign: any) => {
            // REF: Create clean campaign object with ONLY essential fields
            const cleanCampaign: ReplyIoCampaign = {
              id: storedCampaign.campaignId, // Use the actual Reply.io campaign ID
              name: storedCampaign.campaignName,
              status: storedCampaign.campaignStatus,
              isDefault: storedCampaign.isDefault,
              createdAt: storedCampaign.createdAt,
              updatedAt: storedCampaign.updatedAt,
              // REF: Explicitly exclude ALL performance metrics
              // No openRate, clickRate, replyRate, bounceRate, etc.
            };
            return cleanCampaign;
          });
        } else if (result.campaigns.live && result.campaigns.live.length > 0) {
          // REF: Map live campaigns to include only essential data, exclude performance metrics
          campaignsToUse = result.campaigns.live.map((liveCampaign: any) => {
            // REF: Create clean campaign object with ONLY essential fields
            const cleanCampaign: ReplyIoCampaign = {
              id: liveCampaign.id,
              name: liveCampaign.name,
              status: liveCampaign.status,
              isDefault: false, // Live campaigns don't have default status
              createdAt: liveCampaign.createdAt,
              updatedAt: liveCampaign.updatedAt,
              // REF: Explicitly exclude ALL performance metrics
              // No openRate, clickRate, replyRate, bounceRate, etc.
            };
            return cleanCampaign;
          });
        }

        setSettings(prev => ({ 
          ...prev, 
          campaigns: campaignsToUse,
          isLoadingCampaigns: false 
        }));
      } else {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setSettings(prev => ({ 
        ...prev, 
        campaigns: [],
        isLoadingCampaigns: false 
      }));
    }
  };

  /**
   * REF: Sync campaigns from Reply.io API to database
   * PURPOSE: Import campaigns from Reply.io so they can be managed locally (set defaults, etc.)
   */
  const syncCampaigns = async (accountId: number) => {
    if (!settings.selectedAccount) {
      throw new Error('No account selected');
    }

    try {
      const response = await fetch(`/api/reply-io/accounts/${accountId}/sync-campaigns`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Campaigns Synced",
          description: result.message || "Successfully synced campaigns",
        });
        // Refresh campaigns to show synced data (without auto-sync to prevent loops)
        await fetchCampaigns(accountId);
      } else {
        const result = await response.json();
        const errorMessage = result.message || "Failed to sync campaigns";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        // Make sure loading state is reset on error
        setSettings(prev => ({ ...prev, isLoadingCampaigns: false }));
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error syncing campaigns:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sync campaigns";
      if (!(error instanceof Error) || !error.message?.includes('Failed to sync campaigns')) {
        // Only show toast if we haven't already shown one above
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      // Make sure loading state is reset on error
      setSettings(prev => ({ ...prev, isLoadingCampaigns: false }));
      throw error; // Re-throw so calling function knows it failed
    }
  };

  /**
   * REF: Enhanced fetch campaigns with auto-sync
   * PURPOSE: Automatically sync campaigns if no stored campaigns exist
   */
  const fetchCampaignsWithAutoSync = async (accountId: number) => {
    setSettings(prev => ({ ...prev, isLoadingCampaigns: true }));
    try {
      const response = await fetch(`/api/reply-io/accounts/${accountId}/campaigns`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        
        // REF: Check if we have any campaigns at all (stored or live)
        const hasStoredCampaigns = result.campaigns.stored && result.campaigns.stored.length > 0;
        const hasLiveCampaigns = result.campaigns.live && result.campaigns.live.length > 0;
        
        // REF: Only auto-sync if no stored campaigns but live campaigns exist
        if (!hasStoredCampaigns && hasLiveCampaigns) {
          console.log('No stored campaigns found, auto-syncing from Reply.io...');
          try {
            await syncCampaigns(accountId);
            // syncCampaigns calls fetchCampaigns which will reset the loading state
            return;
          } catch (syncError) {
            console.error('Auto-sync failed:', syncError);
            // If sync fails, continue with displaying live campaigns
            toast({
              title: "Sync Failed",
              description: "Showing live campaigns. You can manually sync later.",
              variant: "destructive",
            });
          }
        }
        
        // REF: Use stored campaigns first (they have isDefault field), then fall back to live campaigns
        let campaignsToUse = [];
        if (hasStoredCampaigns) {
          // REF: Map stored campaigns to include only essential data, exclude performance metrics
          campaignsToUse = result.campaigns.stored.map((storedCampaign: any) => {
            // REF: Create clean campaign object with ONLY essential fields
            const cleanCampaign: ReplyIoCampaign = {
              id: storedCampaign.campaignId, // Use the actual Reply.io campaign ID
              name: storedCampaign.campaignName,
              status: storedCampaign.campaignStatus,
              isDefault: storedCampaign.isDefault,
              createdAt: storedCampaign.createdAt,
              updatedAt: storedCampaign.updatedAt,
              // REF: Explicitly exclude ALL performance metrics
              // No openRate, clickRate, replyRate, bounceRate, etc.
            };
            return cleanCampaign;
          });
        } else if (hasLiveCampaigns) {
          // REF: Fall back to live campaigns if no stored campaigns, exclude performance metrics
          campaignsToUse = result.campaigns.live.map((liveCampaign: any) => {
            // REF: Create clean campaign object with ONLY essential fields
            const cleanCampaign: ReplyIoCampaign = {
              id: liveCampaign.id,
              name: liveCampaign.name,
              status: liveCampaign.status,
              isDefault: false, // Live campaigns won't have default status
              createdAt: liveCampaign.createdAt,
              updatedAt: liveCampaign.updatedAt,
              // REF: Explicitly exclude ALL performance metrics
              // No openRate, clickRate, replyRate, bounceRate, etc.
            };
            return cleanCampaign;
          });
        }
        
        setSettings(prev => ({ 
          ...prev, 
          campaigns: campaignsToUse,
          isLoadingCampaigns: false,
        }));

        // REF: Show helpful message if no campaigns found at all
        if (!hasStoredCampaigns && !hasLiveCampaigns) {
          toast({
            title: "No Campaigns Found",
            description: "This account doesn't have any campaigns. Check your API key permissions.",
            variant: "destructive",
          });
        }
      } else {
        const result = await response.json();
        toast({
          title: "Error",
          description: result.message || "Failed to fetch campaigns",
          variant: "destructive",
        });
        setSettings(prev => ({ ...prev, isLoadingCampaigns: false }));
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
      setSettings(prev => ({ ...prev, isLoadingCampaigns: false }));
    }
  };

  /**
   * REF: Add new Reply.io account
   * PURPOSE: Create a new Reply.io account with API key validation
   */
  const addAccount = async () => {
    if (!newAccount.name.trim() || !newAccount.apiKey.trim()) {
      toast({
        title: "Error",
        description: "Account name and API key are required",
        variant: "destructive",
      });
      return;
    }

    setIsAddingAccount(true);
    
    try {
      const response = await fetch('/api/reply-io/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newAccount.name,
          apiKey: newAccount.apiKey,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Account Added",
          description: `Successfully added ${newAccount.name}`,
        });
        
        setNewAccount({ name: '', apiKey: '' });
        setShowAddAccountDialog(false);
        await fetchAccounts(); // Refresh accounts list
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: "Error",
        description: "Failed to add account",
        variant: "destructive",
      });
    } finally {
      setIsAddingAccount(false);
    }
  };

  /**
   * REF: Set default Reply.io account
   * PURPOSE: Mark an account as the default for auto-send
   */
  const setDefaultAccount = async (accountId: number) => {
    try {
      const response = await fetch(`/api/reply-io/accounts/${accountId}/set-default`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Default Account Set",
          description: "Successfully updated default account",
        });
        await fetchAccounts(); // Refresh accounts list
      } else {
        const result = await response.json();
        toast({
          title: "Error",
          description: result.message || "Failed to set default account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting default account:', error);
      toast({
        title: "Error",
        description: "Failed to set default account",
        variant: "destructive",
      });
    }
  };

  /**
   * REF: Delete Reply.io account
   * PURPOSE: Remove an account and all its campaigns
   */
  const deleteAccount = async (accountId: number, accountName: string) => {
    if (!confirm(`Are you sure you want to delete the account "${accountName}"? This will also remove all associated campaigns.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/reply-io/accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: `Successfully deleted ${accountName}`,
        });
        await fetchAccounts(); // Refresh accounts list
        
        // Clear selected account if it was deleted
        if (settings.selectedAccount?.id === accountId) {
          setSettings(prev => ({ ...prev, selectedAccount: null, campaigns: [] }));
        }
      } else {
        const result = await response.json();
        toast({
          title: "Error",
          description: result.message || "Failed to delete account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  /**
   * REF: Load current user settings from backend
   * PURPOSE: Initialize component with existing configuration
   * 
   * BUSINESS_LOGIC:
   * - Fetches settings from backend API
   * - Handles missing settings gracefully
   * - Sets loading states appropriately
   */
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/reply-io/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          ...data,
          replyIoApiKey: '', // REF: Never expose API key in frontend
          webhookUrl: data.webhookUrl || '', // REF: Convert null to empty string
          isLoading: false,
        }));
      } else {
        console.error('Failed to fetch settings');
        setSettings(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error",
        description: "Failed to load Reply.io settings",
        variant: "destructive",
      });
    }
  };

  /**
   * REF: Test Reply.io API connection with provided credentials
   * PURPOSE: Validate API key before saving to ensure it works
   * @param {string} apiKey - API key to test
   * 
   * BUSINESS_LOGIC:
   * - Makes test request to Reply.io API via backend
   * - Provides immediate feedback to user
   * - Doesn't save credentials until test passes
   */
  const testConnection = async (apiKey: string) => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key to test",
        variant: "destructive",
      });
      return;
    }

    setSettings(prev => ({ ...prev, isTesting: true, testResult: undefined }));

    try {
      const response = await fetch('/api/reply-io/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ apiKey }),
      });

      const result = await response.json();
      
      setSettings(prev => ({
        ...prev,
        isTesting: false,
        testResult: {
          success: result.success,
          message: result.message,
          campaignsFound: result.campaignsFound,
        },
      }));

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Found ${result.campaignsFound || 0} campaigns`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setSettings(prev => ({
        ...prev,
        isTesting: false,
        testResult: {
          success: false,
          message: 'Network error occurred',
        },
      }));
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      });
    }
  };

  /**
   * REF: Save Reply.io settings to backend
   * PURPOSE: Persist user configuration securely
   * 
   * BUSINESS_LOGIC:
   * - Validates required fields
   * - Encrypts API key on backend
   * - Updates UI state on success
   * - Provides user feedback
   */
  const saveSettings = async () => {
    if (!settings.replyIoApiKey?.trim()) {
      toast({
        title: "Error",
        description: "API key is required",
        variant: "destructive",
      });
      return;
    }

    if (!settings.replyIoCampaignId?.trim()) {
      toast({
        title: "Error",
        description: "Campaign ID is required",
        variant: "destructive",
      });
      return;
    }

    setSettings(prev => ({ ...prev, isSaving: true }));

    try {
      const response = await fetch('/api/reply-io/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyIoApiKey: settings.replyIoApiKey,
          replyIoCampaignId: settings.replyIoCampaignId,
          replyIoAutoSend: settings.replyIoAutoSend,
          webhookUrl: settings.webhookUrl || '', // REF: Convert null/undefined to empty string
          webhookTimeout: settings.webhookTimeout,
          batchSize: settings.batchSize,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          isSaving: false,
          hasApiKey: result.hasApiKey,
          replyIoApiKey: '', // REF: Clear API key field after saving
        }));
        
        toast({
          title: "Settings Saved",
          description: "Reply.io configuration updated successfully",
        });
      } else {
        throw new Error(result.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSettings(prev => ({ ...prev, isSaving: false }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  /**
   * REF: Set default campaign for an account
   * PURPOSE: Mark a campaign as the default for auto-send functionality
   */
  const setDefaultCampaign = async (campaignId: number) => {
    if (!settings.selectedAccount) return;

    try {
      const response = await fetch(`/api/reply-io/campaigns/${campaignId}/set-default`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Default Campaign Set",
          description: "Successfully updated default campaign",
        });
        // Refresh campaigns to show updated default status
        await fetchCampaignsWithAutoSync(settings.selectedAccount.id);
      } else {
        const result = await response.json();
        toast({
          title: "Error",
          description: result.message || "Failed to set default campaign",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting default campaign:', error);
      toast({
        title: "Error",
        description: "Failed to set default campaign",
        variant: "destructive",
      });
    }
  };

  // REF: Load settings on component mount
  useEffect(() => {
    fetchSettings();
    fetchAccounts();
  }, []);

  if (settings.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Reply.io Accounts</h3>
            <p className="text-sm text-muted-foreground">Manage multiple Reply.io accounts and campaigns</p>
          </div>
          <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Reply.io Account</DialogTitle>
                <DialogDescription>
                  Add a new Reply.io account with its API key. The API key will be validated before saving.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="e.g., Main Account, Sales Team"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountApiKey">API Key</Label>
                  <Input
                    id="accountApiKey"
                    type="password"
                    placeholder="Enter Reply.io API key"
                    value={newAccount.apiKey}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddAccountDialog(false)}
                    disabled={isAddingAccount}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={addAccount}
                    disabled={isAddingAccount || !newAccount.name.trim() || !newAccount.apiKey.trim()}
                  >
                    {isAddingAccount ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Add Account
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {settings.isLoadingAccounts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : settings.accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Reply.io accounts configured</p>
            <p className="text-sm">Add your first Reply.io account to get started with multi-account management.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.accounts.map((account) => (
                <React.Fragment key={account.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleAccountExpansion(account)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {account.name}
                        <div className="ml-auto">
                          {expandedAccountId === account.id ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultAccount(account.id);
                        }}
                        className="transition-colors duration-200"
                        title={account.isDefault ? "Remove as default account" : "Set as default account"}
                      >
                        {account.isDefault ? (
                          <Badge variant="default" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      {new Date(account.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAccount(account.id, account.name);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Campaigns Row */}
                  {expandedAccountId === account.id && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <div className="p-4 bg-muted/20 border-t">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-md font-medium">
                                Campaigns for {account.name}
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchCampaignsWithAutoSync(account.id);
                                }}
                                disabled={settings.isLoadingCampaigns}
                              >
                                {settings.isLoadingCampaigns ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                                Refresh
                              </Button>
                            </div>

                            {settings.isLoadingCampaigns ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin" />
                              </div>
                            ) : settings.campaigns.length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No campaigns found for this account</p>
                              </div>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {settings.campaigns.map((campaign) => (
                                  <Card 
                                    key={campaign.id} 
                                    className={`transition-all duration-200 hover:shadow-md ${
                                      campaign.isDefault 
                                        ? 'bg-primary text-primary-foreground ring-2 ring-primary' 
                                        : 'hover:bg-muted/50'
                                    }`}
                                  >
                                    <div className="p-3 space-y-2">
                                      {/* Campaign Name */}
                                      <h5 className={`font-medium text-sm leading-tight ${
                                        campaign.isDefault ? 'text-primary-foreground' : 'text-foreground'
                                      }`}>
                                        {campaign.name}
                                      </h5>
                                      
                                      {/* Status Badge */}
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant={campaign.isDefault ? "secondary" : "outline"} 
                                          className={`text-xs ${
                                            campaign.isDefault 
                                              ? 'bg-primary-foreground text-primary' 
                                              : campaign.status === 'Active' 
                                                ? 'border-green-500 text-green-700' 
                                                : 'border-muted-foreground'
                                          }`}
                                        >
                                          {campaign.status}
                                        </Badge>
                                      </div>
                                      
                                      {/* Campaign ID - now below status badges */}
                                      <p className={`text-xs ${campaign.isDefault ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        Campaign ID: {campaign.id}
                                      </p>
                                      
                                      {/* Action Button */}
                                      {campaign.isDefault ? (
                                        <Button 
                                          variant="secondary" 
                                          size="sm" 
                                          className="w-full mt-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90" 
                                          disabled
                                        >
                                          Selected
                                        </Button>
                                      ) : (
                                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setDefaultCampaign(campaign.id)}>
                                          Set as Default
                                        </Button>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Auto-send Setting */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <Label htmlFor="autoSend" className="text-sm font-medium">
                Auto-send to Reply.io
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically send prospects to the default Reply.io campaign when research is completed
            </p>
          </div>
          <Switch
            id="autoSend"
            checked={settings.replyIoAutoSend || false}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, replyIoAutoSend: checked }))}
          />
        </div>
      </div>
    </div>
  );
} 