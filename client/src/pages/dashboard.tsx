import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Plus, Upload, Users, CheckCircle2, Clock, TrendingUp, Search, 
  Loader2, LogOut, Filter, Eye, Trash2, RotateCcw, Target, Brain, Rocket, 
  AlertTriangle, Settings, Send, UserPlus, RefreshCw, Download, 
  MoreHorizontal, Activity, User, CheckCircle, AlertCircle, Building2, Copy
} from "lucide-react";

// REF: Lazy load heavy components to reduce initial bundle size
const ProspectForm = React.lazy(() => import("@/components/prospect-form"));
const CsvUpload = React.lazy(() => import("@/components/csv-upload"));
const ProspectProfileInteractive = React.lazy(() => import("@/components/prospect-profile-interactive"));
const ProspectTableEnhanced = React.lazy(() => import("@/components/prospect-table-enhanced"));
const SettingsMenu = React.lazy(() => import("@/components/settings-menu"));
const CommandCenterDashboard = React.lazy(() => import("@/components/analytics-dashboard").then(module => ({ default: module.CommandCenterDashboard })));
const CacheMonitoringDashboard = React.lazy(() => import("@/components/cache-monitoring-dashboard"));

// REF: Keep lightweight components as regular imports
import { ReplyIoSettings } from "@/components/reply-io-settings";
import ProcessingIndicator from "@/components/processing-indicator";
import { AnalyticsLoading, BrainLoader } from "@/components/enhanced-loading";
import { ReplyIoAnalytics } from "@/components/reply-io-analytics";
import { ReplyIoAdvancedAnalytics } from "@/components/reply-io-advanced-analytics";
import { ClientSelector } from "@/components/ClientSelector";
import { ClientManagement } from "@/components/ClientManagement";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { Label } from "@/components/ui/label";

// REF: Loading component for lazy-loaded components
const LazyLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <Sparkles className="w-4 h-4 text-primary absolute top-2 left-2" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading component...</p>
    </div>
  </div>
);

// Add Reply.io settings interface after the imports
interface ReplyIoSettings {
  replyIoCampaignId?: string;
  hasApiKey?: boolean;
  webhookUrl?: string;
  webhookTimeout?: number;
  batchSize?: number;
}

export default function Dashboard() {
  const { user, isLoading: authLoading, isLoggedOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProspectId, setSelectedProspectId] = useState<number | null>(null);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('analytics');
  const [currentView, setCurrentView] = useState('settings');
  const [redirected, setRedirected] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && (isLoggedOut || !user) && !redirected) {
      setRedirected(true);
      toast({
        title: "Unauthorized",
        description: "Please log in to continue...",
        variant: "destructive",
      });
      setTimeout(() => {
        // REF: Redirect to proper login page (not development endpoint)
        window.location.href = "/login";
      }, 1000); // Increased delay to prevent rapid redirects
      return;
    }
  }, [user, authLoading, isLoggedOut, toast, redirected]);

  // REF: Fetch Reply.io accounts to get selected campaign
  const { data: replyIoAccounts } = useQuery({
    queryKey: ["/api/reply-io/accounts"],
    retry: false,
    enabled: !!user,
  });

  // REF: Get the selected campaign ID from Reply.io statistics response
  const { data: replyIoStats } = useQuery<any>({
    queryKey: ["/api/reply-io/statistics"],
    retry: false,
    enabled: !!user && !!replyIoAccounts,
  });

  // REF: Extract selected campaign ID from Reply.io statistics
  const selectedCampaignId = React.useMemo(() => {
    if (replyIoStats?.success && replyIoStats?.statistics?.selectedCampaign) {
      return replyIoStats.statistics.selectedCampaign.campaignId;
    }
    return null;
  }, [replyIoStats]);

  // Fetch dashboard stats - filtered by campaign if selected
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
    enabled: !!user,
  });

  // Fetch prospects with search and filter - filtered by campaign if selected
  const { data: prospects, isLoading: prospectsLoading, refetch: refetchProspects } = useQuery({
    queryKey: ["/api/prospects", searchQuery, statusFilter],
    retry: false,
    enabled: !!user,
  });

  // Fetch Reply.io settings
  const { data: replyIoSettings } = useQuery({
    queryKey: ["/api/reply-io/settings"],
    retry: false,
    enabled: !!user,
  });

  // Auto-refresh data when there are processing prospects
  useEffect(() => {
    const hasProcessing = (Array.isArray(prospects) && prospects.some((p: any) => p.status === 'processing')) || 
                         (statsData && typeof statsData === 'object' && 'processing' in statsData && (statsData as any).processing > 0);
    
    if (hasProcessing) {
      const interval = setInterval(() => {
        refetchProspects();
        refetchStats();
      }, 30000); // Refresh every 30 seconds (was 3 seconds - much more reasonable)
      
      return () => clearInterval(interval);
    }
  }, [prospects, statsData, refetchProspects, refetchStats]);

  // Delete prospect mutation
  const deleteProspectMutation = useMutation({
    mutationFn: async (prospectId: number) => {
      await apiRequest('DELETE', `/api/prospects/${prospectId}`);
    },
    onSuccess: (_, prospectId) => {
      toast({
        title: "Success",
        description: "Prospect deleted successfully",
      });
      // Remove from selected prospects if it was selected
      setSelectedProspects(prev => prev.filter(id => id !== prospectId));
      // Invalidate and refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to delete prospect",
        variant: "destructive",
      });
    },
  });

  // Retry prospect mutation
  const retryProspectMutation = useMutation({
    mutationFn: async (prospectId: number) => {
      await apiRequest('POST', `/api/prospects/${prospectId}/retry`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prospect research restarted successfully",
      });
      // Invalidate and refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to retry prospect research",
        variant: "destructive",
      });
    },
  });

  // Bulk send to Reply.io mutation
  const bulkSendToReplyMutation = useMutation({
    mutationFn: async ({ prospectIds, campaignId }: { prospectIds: number[], campaignId: string }) => {
      const response = await apiRequest('POST', '/api/reply-io/send-prospects', { prospectIds, campaignId });
      return await response.json();
    },
    onSuccess: (data) => {
      const { successful, failed, totalSent, errors } = data;
      
      if (successful > 0) {
        toast({
          title: "Success",
          description: `${successful} out of ${totalSent} prospects sent to Reply.io successfully`,
        });
      }
      
      if (failed > 0) {
        console.log('Failed sends:', errors);
        
        // Check if all failures are due to prospects already being in Reply.io (409 conflicts)
        const conflictErrors = errors?.filter((error: any) => 
          error.error && error.error.includes('409 Conflict')
        ) || [];
        
        const otherErrors = errors?.filter((error: any) => 
          !error.error || !error.error.includes('409 Conflict')
        ) || [];

        if (conflictErrors.length > 0 && otherErrors.length === 0) {
          // All failures are due to prospects already being in Reply.io
          toast({
            title: "Already in Campaign",
            description: `${failed} prospect${failed > 1 ? 's are' : ' is'} already enrolled in the Reply.io campaign. No duplicates were created.`,
            variant: "default", // Use default variant instead of destructive since this isn't really an error
          });
        } else if (conflictErrors.length > 0 && otherErrors.length > 0) {
          // Mixed failures: some conflicts, some other errors
          toast({
            title: "Partial Success",
            description: `${conflictErrors.length} prospect${conflictErrors.length > 1 ? 's were' : ' was'} already in campaign, ${otherErrors.length} failed for other reasons.`,
            variant: "destructive",
          });
        } else {
          // All failures are due to other errors
          toast({
            title: "Send Failed",
            description: `${failed} prospect${failed > 1 ? 's' : ''} failed to send to Reply.io. Check console for details.`,
            variant: "destructive",
          });
        }
      }
      
      setSelectedProspects([]);
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to send prospects to Reply.io",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (prospectIds: number[]) => {
      await Promise.all(
        prospectIds.map(id => 
          apiRequest('DELETE', `/api/prospects/${id}`)
        )
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedProspects.length} prospects deleted successfully`,
      });
      setSelectedProspects([]);
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to delete prospects",
        variant: "destructive",
      });
    },
  });

  const handleSelectProspect = (prospectId: number, selected: boolean) => {
    setSelectedProspects(prev => 
      selected 
        ? [...prev, prospectId]
        : prev.filter(id => id !== prospectId)
    );
  };

  const handleSelectAll = () => {
    const allProspectIds = (Array.isArray(prospects) ? prospects : []).map((p: any) => p.id);
    setSelectedProspects(allProspectIds);
  };

  const handleDeselectAll = () => {
    setSelectedProspects([]);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedProspects);
  };

  const handleBulkSendToReply = () => {
    // Send selected prospects to Reply.io
    if (selectedProspects.length === 0) {
      toast({
        title: "No Prospects Selected",
        description: "Please select prospects to send to Reply.io",
        variant: "destructive",
      });
      return;
    }

    // Let the backend handle Reply.io configuration validation
    // The backend uses getDefaultReplyioConfiguration() which works with the multi-account system
    bulkSendToReplyMutation.mutate({
      prospectIds: selectedProspects,
      campaignId: '', // Backend will use default campaign from multi-account configuration
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-primary absolute top-3 left-3" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading Winry.AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = (user as any)?.firstName && (user as any)?.lastName 
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`.toUpperCase()
    : (user as any)?.email?.[0]?.toUpperCase() || "U";

  const processingCount = (statsData as any)?.processing || 0;
  const completedCount = (statsData as any)?.completed || 0;
  const totalCount = (statsData as any)?.totalProspects || 0;
  const successRate = (statsData as any)?.successRate || 0;
  const failedCount = (statsData as any)?.failed || 0;

  // Filter prospects based on search and status
  const filteredProspects = (prospects && Array.isArray(prospects)) ? prospects.filter((prospect: any) => {
    const matchesSearch = !searchQuery || 
      `${prospect.firstName} ${prospect.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  // Command Center stats for the dashboard
  const commandCenterStats = {
    totalProspects: totalCount,
    completed: completedCount,
    processing: processingCount,
    failed: failedCount,
    successRate: successRate
  };

  return (
    <div className="page-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="header-background backdrop-blur-sm sticky top-0 z-40"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <img 
                  src="/salesleopard-logo.png" 
                  alt="SalesLeopard Logo" 
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Winry.AI</h1>
                <p className="text-sm text-muted-foreground">True Sales Intelligence by Sales Leopard</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              {/* REF: User profile menu with integrated client workspace selector */}
              <UserProfileMenu 
                user={user as any} 
                onClientChange={(client) => {
                  // Handle client change if needed
                  console.log('Client changed to:', client);
                }}
              />
            </motion.div>
          </div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <nav className="flex space-x-1 card-background-elevated p-1 rounded-xl">
              {[
                { id: 'analytics', label: 'Pipeline Analytics', icon: TrendingUp },
                { id: 'reply-analytics', label: 'Reply.io Analytics', icon: Target },
                { id: 'cache-monitoring', label: 'Cache Monitoring', icon: Activity },
                { id: 'prospects', label: 'Prospect Management', icon: Users },
                { id: 'upload', label: 'Upload Prospects', icon: Upload },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-foreground border border-purple-500/30 shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }
                  `}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<LazyLoadingSpinner />}>
                <CommandCenterDashboard stats={commandCenterStats} />
              </Suspense>
            </motion.div>
          )}

          {activeTab === 'reply-analytics' && (
            <motion.div
              key="reply-analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <ReplyIoAdvancedAnalytics />
              </div>
            </motion.div>
          )}

          {activeTab === 'cache-monitoring' && (
            <motion.div
              key="cache-monitoring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Cache Monitoring</h2>
                  <p className="text-muted-foreground mt-1">Monitor API caching performance and rate limiting</p>
                </div>
                <Suspense fallback={<LazyLoadingSpinner />}>
                  <CacheMonitoringDashboard />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeTab === 'prospects' && (
            <motion.div
              key="prospects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">Prospect Management</h2>
                    <p className="text-muted-foreground mt-1">Manage your prospects and track their progress</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Add Prospect and Upload CSV buttons - always visible */}
                    <Button
                      onClick={() => setShowProspectForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Prospect
                    </Button>
                    
                    <Button
                      onClick={() => setActiveTab('upload')}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CSV
                    </Button>
                  </div>
                </div>

                <Suspense fallback={<LazyLoadingSpinner />}>
                  <ProspectTableEnhanced
                    prospects={Array.isArray(prospects) ? prospects : []}
                    isLoading={prospectsLoading}
                    onSelectProspect={handleSelectProspect}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    selectedProspects={selectedProspects}
                    onViewDetails={setSelectedProspectId}
                    onDelete={(prospectId: number) => deleteProspectMutation.mutate(prospectId)}
                    onRetry={(prospectId: number) => retryProspectMutation.mutate(prospectId)}
                    onBulkDelete={handleBulkDelete}
                    onBulkSendToReply={handleBulkSendToReply}
                  />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Upload Prospects</h2>
                  <p className="text-muted-foreground mt-1">Upload CSV files to add prospects to your pipeline</p>
                </div>
                <Suspense fallback={<LazyLoadingSpinner />}>
                  <CsvUpload 
                    onSuccess={() => {
                      refetchProspects();
                      refetchStats();
                      setActiveTab('prospects'); // Navigate back to prospects tab
                    }}
                    onCancel={() => {}}
                  />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                {/* Compact Header */}
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Settings</h2>
                  <p className="text-muted-foreground">Configure workspace, integrations, and application preferences</p>
                </div>

                {/* Compact Status Bar */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-lg border border-border/50 bg-gradient-to-r from-background/80 to-background/60">
                  <div className="flex items-center gap-2 text-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Workspaces</p>
                      <p className="text-xs text-muted-foreground">2 active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">System</p>
                      <p className="text-xs text-muted-foreground">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Integrations</p>
                      <p className="text-xs text-muted-foreground">Setup needed</p>
                    </div>
                  </div>
                </div>

                {/* Settings Content */}
                <div className="space-y-6">
                  
                  {/* Client Workspace Section */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Building2 className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Client Workspaces</CardTitle>
                          <p className="text-sm text-muted-foreground">Manage isolated client environments</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ClientManagement />
                    </CardContent>
                  </Card>

                  {/* Main Settings Menu Component - Now includes Application Configuration and Reply.io Integration */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <Suspense fallback={<LazyLoadingSpinner />}>
                        <SettingsMenu />
                      </Suspense>
                    </CardContent>
                  </Card>

                </div>

                {/* Compact Footer */}
                <div className="text-center py-4 border-t border-border/30">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-medium text-foreground">System Operational</p>
                  </div>
                  <p className="text-xs text-muted-foreground">All systems running smoothly • Updated now</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Prospect Details Modal */}
      <AnimatePresence>
            {selectedProspectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProspectId(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="card-background rounded-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Suspense fallback={<LazyLoadingSpinner />}>
                <ProspectProfileInteractive 
                  prospectId={selectedProspectId} 
                  onClose={() => setSelectedProspectId(null)}
                />
              </Suspense>
            </motion.div>
          </motion.div>
            )}
      </AnimatePresence>

      {/* Add Prospect Dialog */}
      {showProspectForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowProspectForm(false)}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="card-background rounded-xl w-full max-w-md overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-foreground">Add New Prospect</h2>
                <p className="text-muted-foreground mt-1">Start AI-powered research for a new prospect</p>
              </div>
              <Suspense fallback={<LazyLoadingSpinner />}>
                <ProspectForm 
                  onSuccess={() => {
                    setShowProspectForm(false);
                    refetchProspects();
                    refetchStats();
                  }}
                  onCancel={() => setShowProspectForm(false)}
                />
              </Suspense>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
