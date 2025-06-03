import React, { useState, useEffect } from 'react';
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
  MoreHorizontal, Activity, User
} from "lucide-react";
import ProspectForm from "@/components/prospect-form";
import CsvUpload from "@/components/csv-upload";
import ProspectProfileInteractive from "@/components/prospect-profile-interactive";
import ProspectTableInteractive from "@/components/prospect-table-interactive";
import SettingsMenu from "@/components/settings-menu";
import ProcessingIndicator from "@/components/processing-indicator";
import { ReplyIoSettings } from "@/components/reply-io-settings";
import { CommandCenterDashboard } from "@/components/analytics-dashboard";
import { AnalyticsLoading, BrainLoader } from "@/components/enhanced-loading";
import { ReplyIoAnalytics } from "@/components/reply-io-analytics";

// Add Reply.io settings interface after the imports
interface ReplyIoSettings {
  replyIoCampaignId?: string;
  hasApiKey?: boolean;
  webhookUrl?: string;
  webhookTimeout?: number;
  batchSize?: number;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProspectId, setSelectedProspectId] = useState<number | null>(null);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showReplyIoSettings, setShowReplyIoSettings] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('analytics');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

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
      }, 3000); // Refresh every 3 seconds
      
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
        toast({
          title: "Partial Success", 
          description: `${failed} prospects failed to send. Check console for details.`,
          variant: "destructive",
        });
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
    const visibleProspectIds = filteredProspects.map((p: any) => p.id);
    setSelectedProspects(visibleProspectIds);
  };

  const handleDeselectAll = () => {
    setSelectedProspects([]);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedProspects);
  };

  const handleBulkSendToReply = () => {
    // Check if Reply.io is configured before allowing bulk send
    const settings = replyIoSettings as ReplyIoSettings;
    const isNotConfigured = !settings?.hasApiKey || !settings?.replyIoCampaignId || settings?.replyIoCampaignId?.trim() === '';
    
    if (isNotConfigured) {
      setShowReplyIoSettings(true);
      return;
    }

    // Send selected prospects to Reply.io
    if (selectedProspects.length === 0) {
      toast({
        title: "No Prospects Selected",
        description: "Please select prospects to send to Reply.io",
        variant: "destructive",
      });
      return;
    }

    bulkSendToReplyMutation.mutate({
      prospectIds: selectedProspects,
      campaignId: settings?.replyIoCampaignId || '',
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
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40"
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
                <h1 className="text-2xl font-bold text-white">Winry.AI</h1>
                <p className="text-sm text-slate-400">True Sales Intelligence by Sales Leopard</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="text-right">
                <p className="text-sm text-white font-medium">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </p>
                <p className="text-xs text-slate-400">{(user as any)?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
              </div>
            </motion.div>
          </div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <nav className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
              {[
                { id: 'analytics', label: 'Pipeline Analytics', icon: TrendingUp },
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
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30 shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
              <CommandCenterDashboard stats={commandCenterStats} />
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
                    <h2 className="text-3xl font-bold text-white">Prospect Management</h2>
                    <p className="text-slate-400 mt-1">Manage your prospects and track their progress</p>
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
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CSV
                    </Button>
                  </div>
                </div>

                <ProspectTableInteractive
                  prospects={filteredProspects || []}
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
                  <h2 className="text-3xl font-bold text-white">Upload Prospects</h2>
                  <p className="text-slate-400 mt-1">Upload CSV files to add prospects to your pipeline</p>
                </div>
                <CsvUpload 
                  onSuccess={() => {
                    refetchProspects();
                    refetchStats();
                    setActiveTab('prospects'); // Navigate back to prospects tab
                  }}
                  onCancel={() => {}}
                />
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
                <div>
                  <h2 className="text-3xl font-bold text-white">Settings</h2>
                  <p className="text-slate-400 mt-1">Configure your application settings and integrations</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Application Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SettingsMenu />
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Reply.io Integration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReplyIoSettings />
                    </CardContent>
                  </Card>
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
              className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <ProspectProfileInteractive 
                prospectId={selectedProspectId} 
                onClose={() => setSelectedProspectId(null)}
              />
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
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Add New Prospect</h2>
                <p className="text-slate-400 mt-1">Start AI-powered research for a new prospect</p>
              </div>
              <ProspectForm 
                onSuccess={() => {
                  setShowProspectForm(false);
                  refetchProspects();
                  refetchStats();
                }}
                onCancel={() => setShowProspectForm(false)}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
