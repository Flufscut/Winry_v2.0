/**
 * FILE: ClientManagement.tsx
 * PURPOSE: Comprehensive client workspace management with CRUD operations
 * DEPENDENCIES: React hooks, shadcn/ui components, React Query
 * LAST_UPDATED: Current date
 * 
 * REF: Full management interface for client workspaces in settings
 * REF: Handles create, read, update, delete operations for clients
 * TODO: Add client analytics and usage statistics
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Calendar,
  Settings,
  ArrowLeftRight,
  MoreHorizontal
} from 'lucide-react';

interface Client {
  id: number;
  userId: string;
  name: string;
  description?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  counts?: {
    prospects: number;
    apiKeys: number;
    campaigns: number;
  };
}

export function ClientManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Form states
  const [clientName, setClientName] = useState('');
  const [clientDescription, setClientDescription] = useState('');
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch clients with counts
  const { data: clients = [], isLoading, refetch } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    retry: false,
  });

  // Fetch current client
  const { data: currentClient } = useQuery<Client>({
    queryKey: ['/api/current-client'],
    retry: false,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/clients', data);
      return await response.json();
    },
    onSuccess: (newClient) => {
      toast({
        title: "Success",
        description: `Workspace "${newClient.name}" created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      resetCreateForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workspace",
        variant: "destructive"
      });
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description?: string } }) => {
      const response = await apiRequest('PUT', `/api/clients/${id}`, data);
      return await response.json();
    },
    onSuccess: (updatedClient) => {
      toast({
        title: "Success",
        description: `Workspace "${updatedClient.name}" updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-client'] });
      resetEditForm();
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workspace",
        variant: "destructive"
      });
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/clients/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workspace deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-client'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workspace",
        variant: "destructive"
      });
    },
  });

  // Switch client mutation
  const switchClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest('POST', `/api/switch-client/${clientId}`);
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Switched to "${result.client.name}" workspace`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/current-client'] });
      // Refresh the page to update all client-scoped data
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch workspace",
        variant: "destructive"
      });
    },
  });

  const resetCreateForm = () => {
    setClientName('');
    setClientDescription('');
  };

  const resetEditForm = () => {
    setClientName('');
    setClientDescription('');
    setEditingClient(null);
  };

  const handleCreateClient = async () => {
    if (!clientName.trim()) {
      toast({
        title: "Error",
        description: "Workspace name is required",
        variant: "destructive"
      });
      return;
    }

    createClientMutation.mutate({
      name: clientName.trim(),
      description: clientDescription.trim() || undefined,
    });
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientName(client.name);
    setClientDescription(client.description || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !clientName.trim()) {
      toast({
        title: "Error",
        description: "Workspace name is required",
        variant: "destructive"
      });
      return;
    }

    updateClientMutation.mutate({
      id: editingClient.id,
      data: {
        name: clientName.trim(),
        description: clientDescription.trim() || undefined,
      },
    });
  };

  const handleDeleteClient = (clientId: number) => {
    deleteClientMutation.mutate(clientId);
  };

  const handleSwitchClient = (clientId: number) => {
    switchClientMutation.mutate(clientId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">Workspaces</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">Workspaces ({clients.length})</span>
          {currentClient && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              Current: {currentClient.name}
            </Badge>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetCreateForm} className="text-xs px-3 py-1">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a new client workspace to organize your prospects and data separately.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">Workspace Name</Label>
                <Input
                  id="create-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter workspace name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-description">Description (Optional)</Label>
                <Textarea
                  id="create-description"
                  value={clientDescription}
                  onChange={(e) => setClientDescription(e.target.value)}
                  placeholder="Describe this workspace"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateClient}
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact Workspaces List */}
      <div className="space-y-1">
        {clients.map((client: Client) => (
          <div
            key={client.id}
            className={`flex items-center justify-between p-2 rounded border text-sm ${
              client.id === currentClient?.id 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-background/50 border-border/30'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{client.name}</span>
                {client.id === currentClient?.id && (
                  <Badge variant="default" className="text-xs px-1.5 py-0">Active</Badge>
                )}
              </div>
              {client.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {client.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {formatDate(client.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />
                  {client.counts?.prospects || 0} prospects
                </span>
                <span className="flex items-center gap-1">
                  <Settings className="h-2.5 w-2.5" />
                  {client.counts?.apiKeys || 0} API keys
                </span>
                <span className="flex items-center gap-1">
                  <ArrowLeftRight className="h-2.5 w-2.5" />
                  {client.counts?.campaigns || 0} campaigns
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              {client.id !== currentClient?.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSwitchClient(client.id)}
                  disabled={switchClientMutation.isPending}
                  className="h-6 px-2 text-xs"
                >
                  <ArrowLeftRight className="h-2.5 w-2.5 mr-1" />
                  Switch
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditClient(client)}
                className="h-6 w-6 p-0"
              >
                <Pencil className="h-2.5 w-2.5" />
              </Button>
              {clients.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{client.name}"? This action cannot be undone and will permanently delete all prospects, settings, and data associated with this workspace.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteClient(client.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Workspace
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update the workspace name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Workspace Name</Label>
              <Input
                id="edit-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter workspace name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={clientDescription}
                onChange={(e) => setClientDescription(e.target.value)}
                placeholder="Describe this workspace"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetEditForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleUpdateClient}
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? "Updating..." : "Update Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 