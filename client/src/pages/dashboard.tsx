import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Upload, Users, CheckCircle, Clock, TrendingUp, Search, Loader2 } from "lucide-react";
import ProspectForm from "@/components/prospect-form";
import CsvUpload from "@/components/csv-upload";
import ProspectDetails from "@/components/prospect-details";
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
  const { data: stats, isLoading: statsLoading } = useQuery({
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const userInitials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  const processingCount = stats?.processing || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">SalesLeopard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Processing Indicator */}
              {processingCount > 0 && (
                <div className="flex items-center space-x-2 text-sm text-primary pulse-blue">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{processingCount}</span>
                  <span>prospects processing...</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {userInitials}
                  </span>
                </div>
                <SettingsMenu />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Prospect Research</h2>
            <p className="text-muted-foreground mt-1">
              Generate personalized cold outreach messages with AI-powered research
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Dialog open={showProspectForm} onOpenChange={setShowProspectForm}>
              <DialogTrigger asChild>
                <Button className="inline-flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prospect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
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
                <Button variant="outline" className="inline-flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Prospects</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : stats?.totalProspects || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : stats?.completed || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : stats?.processing || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : `${stats?.successRate || 0}%`}
                  </p>
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
            
            <ProspectTable
              prospects={prospects || []}
              isLoading={prospectsLoading}
              onViewDetails={setSelectedProspectId}
              onDelete={(prospectId) => deleteProspectMutation.mutate(prospectId)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProspectId && (
            <ProspectDetails 
              prospectId={selectedProspectId} 
              onClose={() => setSelectedProspectId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
