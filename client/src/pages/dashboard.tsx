import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Plus, Upload, Users, CheckCircle2, Clock, TrendingUp, Search, 
  Loader2, LogOut, Filter, Eye, Trash2, RotateCcw, Target, Brain, Rocket, AlertTriangle
} from "lucide-react";
import ProspectForm from "@/components/prospect-form";
import CsvUpload from "@/components/csv-upload";
import ProspectProfileInteractive from "@/components/prospect-profile-interactive";
import ProspectTableInteractive from "@/components/prospect-table-interactive";
import SettingsMenu from "@/components/settings-menu";
import ProcessingIndicator from "@/components/processing-indicator";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProspectId, setSelectedProspectId] = useState<number | null>(null);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<number[]>([]);

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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
    enabled: !!user,
  });

  // Fetch prospects with search and filter
  const { data: prospects, isLoading: prospectsLoading, refetch: refetchProspects } = useQuery({
    queryKey: ["/api/prospects", searchQuery, statusFilter],
    retry: false,
    enabled: !!user,
  });

  // Auto-refresh data when there are processing prospects
  useEffect(() => {
    const hasProcessing = (Array.isArray(prospects) && prospects.some((p: any) => p.status === 'processing')) || 
                         (stats && typeof stats === 'object' && 'processing' in stats && (stats as any).processing > 0);
    
    if (hasProcessing) {
      const interval = setInterval(() => {
        refetchProspects();
        refetchStats();
      }, 3000); // Refresh every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [prospects, stats, refetchProspects, refetchStats]);

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

  // Bulk selection handlers
  const handleSelectProspect = (prospectId: number, selected: boolean) => {
    setSelectedProspects(prev => {
      if (selected) {
        return [...prev, prospectId];
      } else {
        return prev.filter(id => id !== prospectId);
      }
    });
  };

  const handleSelectAll = () => {
    if (prospects && Array.isArray(prospects)) {
      setSelectedProspects(prospects.map(p => p.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedProspects([]);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedProspects);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-primary absolute top-3 left-3" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading SalesLeopard...</p>
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

  const processingCount = (stats as any)?.processing || 0;
  const completedCount = (stats as any)?.completed || 0;
  const totalCount = (stats as any)?.totalProspects || 0;
  const successRate = (stats as any)?.successRate || 0;

  // Filter prospects based on search and status
  const filteredProspects = prospects?.filter((prospect: any) => {
    const matchesSearch = !searchQuery || 
      `${prospect.firstName} ${prospect.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-mesh), hsl(var(--background))' }}>
      {/* Distinctive Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl" style={{ background: 'hsla(var(--background), 0.85)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            <div className="flex items-center space-x-5">
              <div className="relative group">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:animate-float"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse-glow" style={{ background: 'var(--gradient-accent)' }}></div>
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground tracking-tight">SalesLeopard</h1>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                  <p className="text-xs text-muted-foreground font-medium">Intelligence Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Distinctive Processing Display */}
              {processingCount > 0 && (
                <div className="relative px-4 py-2 rounded-2xl border border-warning/20 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--warning) / 0.05), hsl(var(--info) / 0.05))' }}>
                  <div className="flex items-center space-x-3 relative z-10">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-xl border-2 border-warning/30 flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                        <Brain className="w-4 h-4 text-white animate-pulse" />
                      </div>
                      <div className="absolute inset-0 w-8 h-8 rounded-xl border-2 border-warning animate-spin"></div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{processingCount} Processing</p>
                      <div className="flex items-center space-x-1">
                        <div className="w-1 h-1 rounded-full bg-warning animate-pulse"></div>
                        <div className="w-1 h-1 rounded-full bg-warning animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1 h-1 rounded-full bg-warning animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <span className="text-xs text-muted-foreground ml-1">AI analyzing</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 opacity-20 animate-gradient-shift" style={{ background: 'linear-gradient(-45deg, transparent, hsl(var(--warning) / 0.3), transparent)', backgroundSize: '200% 200%' }}></div>
                </div>
              )}
              
              {/* Contemporary User Profile */}
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{(user as any)?.firstName || 'User'}</p>
                  <p className="text-xs text-muted-foreground font-medium">{(user as any)?.email}</p>
                </div>
                <div className="relative group">
                  <div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:shadow-lg border border-border/50"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    <span className="text-sm font-bold text-white">{userInitials}</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'var(--shadow-glow)' }}></div>
                </div>
                <SettingsMenu />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Contemporary Hero */}
        <div className="mb-10">
          <div className="relative rounded-3xl p-8 overflow-hidden" style={{ background: 'var(--gradient-surface)' }}>
            <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-mesh)' }}></div>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-primary/20" style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-sm font-medium text-primary">Live Intelligence</span>
                </div>
                <h2 className="text-4xl font-bold text-foreground tracking-tight leading-tight">
                  Research Pipeline
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Transform prospects into personalized outreach with AI-powered research and intelligent insights that drive meaningful conversations.
                </p>
              </div>
              
              {/* Action Center */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Dialog open={showProspectForm} onOpenChange={setShowProspectForm}>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg" 
                      className="relative px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl border-0"
                      style={{ background: 'var(--gradient-primary)', color: 'white' }}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Prospect
                      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-20 transition-opacity duration-300" style={{ background: 'linear-gradient(45deg, white, transparent)' }}></div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Prospect</DialogTitle>
                    </DialogHeader>
                    <ProspectForm 
                      onSuccess={() => {
                        setShowProspectForm(false);
                        refetchProspects();
                      }}
                      onCancel={() => setShowProspectForm(false)}
                    />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={showCsvUpload} onOpenChange={setShowCsvUpload}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="relative px-6 py-3 rounded-2xl font-semibold border-2 border-border hover:border-primary/50 transition-all duration-300 hover:scale-105"
                      style={{ background: 'var(--gradient-surface)' }}
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Bulk Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import CSV File</DialogTitle>
                    </DialogHeader>
                    <CsvUpload 
                      onSuccess={() => {
                        setShowCsvUpload(false);
                        refetchProspects();
                      }}
                      onCancel={() => setShowCsvUpload(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Data Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Prospects - Network Node Style */}
          <div className="stat-card p-6 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pipeline</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {statsLoading ? "..." : totalCount}
                  </span>
                  <span className="text-sm text-muted-foreground">prospects</span>
                </div>
              </div>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl border-2 border-primary/20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--secondary) / 0.1))' }}>
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background" style={{ background: 'var(--gradient-accent)' }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Active Research</span>
              <div className="flex space-x-1">
                <div className="w-2 h-1 rounded-full bg-primary"></div>
                <div className="w-4 h-1 rounded-full bg-primary/60"></div>
                <div className="w-3 h-1 rounded-full bg-primary/30"></div>
              </div>
            </div>
          </div>

          {/* Completed - Progress Arc Style */}
          <div className="stat-card p-6 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Complete</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {statsLoading ? "..." : completedCount}
                  </span>
                  <span className="text-sm text-muted-foreground">ready</span>
                </div>
              </div>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl border-2 border-success/20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--success) / 0.1), hsl(var(--info) / 0.1))' }}>
                  <Target className="w-7 h-7 text-success" />
                </div>
                <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="26" fill="none" stroke="hsl(var(--success) / 0.2)" strokeWidth="2"/>
                  <circle 
                    cx="28" cy="28" r="26" fill="none" stroke="hsl(var(--success))" strokeWidth="2"
                    strokeDasharray={`${(completedCount / Math.max(totalCount, 1)) * 163} 163`}
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Outreach Ready</span>
              <div className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))' }}>
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Processing - Pulse Animation Style */}
          <div className="stat-card p-6 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {statsLoading ? "..." : processingCount}
                  </span>
                  <span className="text-sm text-muted-foreground">analyzing</span>
                </div>
              </div>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl border-2 border-warning/20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--warning) / 0.1), hsl(var(--accent) / 0.1))' }}>
                  <Brain className="w-7 h-7 text-warning" />
                </div>
                {processingCount > 0 && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-warning animate-ping opacity-30"></div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">AI Processing</span>
              {processingCount > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          </div>

          {/* Success Rate - Gradient Progress Style */}
          <div className="stat-card p-6 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quality</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {statsLoading ? "..." : successRate}
                  </span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl border-2 border-accent/20 flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                  <Rocket className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Research Success</span>
                <span className="text-xs font-semibold text-accent">{successRate >= 90 ? 'Excellent' : successRate >= 70 ? 'Good' : 'Improving'}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted">
                <div 
                  className="h-1.5 rounded-full transition-all duration-1000" 
                  style={{ 
                    width: `${successRate}%`,
                    background: 'var(--gradient-accent)'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Prospect Management */}
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 rounded-2xl border border-border/50"
               style={{ background: 'var(--gradient-surface)' }}>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Prospect Pipeline</h3>
              <p className="text-sm text-muted-foreground">Manage and track your research progress</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search prospects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-2 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm w-full sm:w-72"
                />
                <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-2.5" />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Processing Status Overview */}
          {filteredProspects && filteredProspects.filter((p: any) => p.status === 'processing').length > 0 && (
            <div className="p-6 rounded-2xl border border-warning/20 overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, hsl(var(--warning) / 0.05), hsl(var(--info) / 0.05))' }}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl border-2 border-warning/30 flex items-center justify-center"
                     style={{ background: 'var(--gradient-accent)' }}>
                  <Brain className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Active Research</h4>
                  <p className="text-sm text-muted-foreground">
                    {filteredProspects.filter((p: any) => p.status === 'processing').length} prospects being analyzed
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {filteredProspects.filter((p: any) => p.status === 'processing').slice(0, 3).map((prospect: any, index: number) => {
                  const createdAt = new Date(prospect.createdAt);
                  const now = new Date();
                  const elapsed = (now.getTime() - createdAt.getTime()) / 1000;
                  const estimatedProgress = Math.min(Math.floor((elapsed / 180) * 100), 95);
                  
                  return (
                    <ProcessingIndicator
                      key={prospect.id}
                      status="processing"
                      progress={estimatedProgress}
                      message={`${prospect.firstName} ${prospect.lastName} at ${prospect.company}`}
                      estimatedTime={estimatedProgress < 50 ? "2-3 min" : "1-2 min"}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Interactive Table */}
          <ProspectTableInteractive
            prospects={filteredProspects || []}
            isLoading={prospectsLoading}
            onViewDetails={setSelectedProspectId}
            onDelete={(prospectId: number) => deleteProspectMutation.mutate(prospectId)}
            onRetry={(prospectId: number) => retryProspectMutation.mutate(prospectId)}
            selectedProspects={selectedProspects}
            onSelectProspect={handleSelectProspect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      </div>

      {/* Interactive Prospect Profile */}
      <Dialog open={selectedProspectId !== null} onOpenChange={() => setSelectedProspectId(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0 border-0" style={{ background: 'var(--gradient-surface)' }}>
          <div className="p-8">
            {selectedProspectId && (
              <ProspectProfileInteractive 
                prospectId={selectedProspectId} 
                onClose={() => setSelectedProspectId(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
