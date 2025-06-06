/**
 * FILE: ClientSelector.tsx
 * PURPOSE: Multi-tenant client workspace selector with management capabilities
 * DEPENDENCIES: React hooks, shadcn/ui components
 * LAST_UPDATED: Current date
 * 
 * REF: Enables users to switch between client workspaces and manage clients
 * REF: Supports both compact header display and full settings card display
 * TODO: Add client workspace analytics and usage metrics
 */

import { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: number;
  userId: string;
  name: string;
  description?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface ClientSelectorProps {
  onClientChange?: (client: Client) => void;
  compact?: boolean;
}

export function ClientSelector({ onClientChange, compact = false }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDescription, setNewClientDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const loadClients = async () => {
    try {
      setError(null);
      const response = await fetch('/api/clients');
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData);
      } else {
        setError('Failed to load clients');
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    }
  };

  const loadCurrentClient = async () => {
    try {
      setError(null);
      const response = await fetch('/api/current-client');
      if (response.ok) {
        const client = await response.json();
        setCurrentClient(client);
      } else {
        setError('Failed to load current workspace');
      }
    } catch (error) {
      console.error('Error loading current client:', error);
      setError('Failed to load current workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadCurrentClient();
  }, []);

  const switchClient = async (clientId: string) => {
    try {
      const response = await fetch(`/api/switch-client/${clientId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        setCurrentClient(result.client);
        onClientChange?.(result.client);
        
        // Refresh the page to update all client-scoped data
        window.location.reload();
      } else {
        console.error('Failed to switch client');
      }
    } catch (error) {
      console.error('Error switching client:', error);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({
        title: "Error",
        description: "Workspace name is required",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClientName.trim(),
          description: newClientDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        const newClient = await response.json();
        
        // Refresh clients list
        await loadClients();
        
        // Switch to the new client
        await switchClient(newClient.id.toString());
        
        // Reset form and close dialog
        setNewClientName('');
        setNewClientDescription('');
        setIsAddDialogOpen(false);
        
        toast({
          title: "Success",
          description: `Workspace "${newClient.name}" created successfully`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to create workspace",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return compact ? (
      <div className="text-sm text-muted-foreground">Loading...</div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Client Workspaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading workspaces...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return compact ? (
      <div className="text-sm text-destructive">{error}</div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Client Workspaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={currentClient?.id.toString()} onValueChange={switchClient}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select workspace">
              {currentClient ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{currentClient.name}</span>
                  <Badge variant="secondary" className="text-xs">Current</Badge>
                </div>
              ) : (
                "Select workspace"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{client.name}</span>
                  {client.id === currentClient?.id && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
            <div className="border-t mt-1 pt-1">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>Add Workspace</span>
                  </div>
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
                      <Label htmlFor="name">Workspace Name</Label>
                      <Input
                        id="name"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Enter workspace name"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={newClientDescription}
                        onChange={(e) => setNewClientDescription(e.target.value)}
                        placeholder="Describe this workspace"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleCreateClient}
                      disabled={isCreating}
                    >
                      {isCreating ? "Creating..." : "Create Workspace"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Full card display for settings page
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Client Workspaces
        </CardTitle>
        <CardDescription>
          Manage your client workspaces and switch between different projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                client.id === currentClient?.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{client.name}</h4>
                  {client.id === currentClient?.id && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </div>
                {client.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {client.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Users className="h-4 w-4" />
                  0 prospects
                </Button>
                {client.id !== currentClient?.id && (
                  <Button
                    size="sm"
                    onClick={() => switchClient(client.id.toString())}
                  >
                    Switch
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add New Workspace
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
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter workspace name"
                    className="col-span-3"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newClientDescription}
                    onChange={(e) => setNewClientDescription(e.target.value)}
                    placeholder="Describe this workspace"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCreateClient}
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Create Workspace"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
} 