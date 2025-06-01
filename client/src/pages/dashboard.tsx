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
import ProspectDetailsModern from "@/components/prospect-details-modern";
import ProspectTable from "@/components/prospect-table";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SalesLeopard</h1>
                <p className="text-xs text-muted-foreground">AI Sales Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Live Processing Indicator */}
              {processingCount > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                  <div className="relative">
                    <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div className="absolute inset-0 w-4 h-4 border-2 border-amber-400 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {processingCount} analyzing
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{(user as any)?.firstName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{(user as any)?.email}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-sm font-semibold text-white">{userInitials}</span>
                </div>
                <SettingsMenu />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                Research Pipeline
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Transform prospects into personalized outreach with AI-powered research and intelligent insights.
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Dialog open={showProspectForm} onOpenChange={setShowProspectForm}>
                <DialogTrigger asChild>
                  <Button size="lg" className="btn-modern gradient-primary text-white border-0 hover:shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Prospect
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
                  <Button variant="outline" size="lg" className="btn-modern border-border hover:bg-muted/50">
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

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-modern hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Prospects</p>
                  <p className="text-3xl font-bold text-foreground">
                    {statsLoading ? (
                      <div className="skeleton h-8 w-16"></div>
                    ) : (
                      totalCount
                    )}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    <span>Active pipeline</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-modern hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-foreground">
                    {statsLoading ? (
                      <div className="skeleton h-8 w-16"></div>
                    ) : (
                      completedCount
                    )}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    <span>Ready for outreach</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-modern hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Processing</p>
                  <p className="text-3xl font-bold text-foreground">
                    {statsLoading ? (
                      <div className="skeleton h-8 w-16"></div>
                    ) : (
                      processingCount
                    )}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Brain className="w-3 h-3 mr-1" />
                    <span>AI analyzing</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-modern hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-3xl font-bold text-foreground">
                    {statsLoading ? (
                      <div className="skeleton h-8 w-16"></div>
                    ) : (
                      `${successRate}%`
                    )}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Rocket className="w-3 h-3 mr-1" />
                    <span>Research quality</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prospects Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Prospects</h3>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search prospects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-auto">
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
            </div>
            
            {/* Processing Indicators */}
            {prospects && prospects.filter(p => p.status === 'processing').length > 0 && (
              <div className="space-y-3 mb-6">
                {prospects.filter(p => p.status === 'processing').map((prospect, index) => {
                  // Calculate estimated progress based on time elapsed since creation
                  const createdAt = new Date(prospect.createdAt);
                  const now = new Date();
                  const elapsed = (now.getTime() - createdAt.getTime()) / 1000; // seconds
                  const estimatedProgress = Math.min(Math.floor((elapsed / 180) * 100), 95); // 180 seconds = 3 minutes
                  
                  return (
                    <ProcessingIndicator
                      key={prospect.id}
                      status="processing"
                      progress={estimatedProgress}
                      message={`Analyzing ${prospect.firstName} ${prospect.lastName} at ${prospect.company}`}
                      estimatedTime={estimatedProgress < 50 ? "2-3 min" : "1-2 min"}
                    />
                  );
                })}
              </div>
            )}
            
            <ProspectTable
              prospects={prospects || []}
              isLoading={prospectsLoading}
              onViewDetails={setSelectedProspectId}
              onDelete={(prospectId) => deleteProspectMutation.mutate(prospectId)}
              onRetry={(prospectId) => retryProspectMutation.mutate(prospectId)}
              selectedProspects={selectedProspects}
              onSelectProspect={handleSelectProspect}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkDelete={handleBulkDelete}
            />
          </CardContent>
        </Card>
      </div>

      {/* Prospect Details Modal */}
      <Dialog open={selectedProspectId !== null} onOpenChange={() => setSelectedProspectId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            {selectedProspectId && (
              <ProspectDetailsModern 
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
