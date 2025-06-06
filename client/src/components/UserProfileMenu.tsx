/**
 * FILE: UserProfileMenu.tsx
 * PURPOSE: User profile menu with integrated client workspace selector
 * DEPENDENCIES: React hooks, shadcn/ui components, ClientSelector logic
 * LAST_UPDATED: Current date
 * 
 * REF: Combines user profile display with client workspace management
 * REF: Provides clean dropdown menu for client switching and workspace creation
 * TODO: Add profile management features and notifications
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Plus, 
  Check, 
  Settings, 
  LogOut,
  User,
  ChevronDown,
  Briefcase,
  Palette
} from 'lucide-react';

interface Client {
  id: number;
  userId: string;
  name: string;
  description?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

interface UserProfileMenuProps {
  user: User;
  onClientChange?: (client: Client) => void;
}

export function UserProfileMenu({ user, onClientChange }: UserProfileMenuProps) {
  const [, setLocation] = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDescription, setNewClientDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCurrentClient = async () => {
    try {
      const response = await fetch('/api/current-client');
      if (response.ok) {
        const client = await response.json();
        setCurrentClient(client);
      }
    } catch (error) {
      console.error('Error loading current client:', error);
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

  const handleSignOut = () => {
    // REF: Clear all client-side session data
    localStorage.clear();
    sessionStorage.clear();
    
    // REF: Show logout feedback to user
    toast({
      title: "Signing Out",
      description: "You are being logged out...",
    });
    
    // REF: Redirect to logout endpoint which will set logout cookie and destroy session
    window.location.href = '/api/logout';
  };

  const handleProfileSettings = () => {
    setLocation('/profile-settings');
  };

  const handlePreferences = () => {
    setLocation('/preferences');
  };

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-3 px-3 py-2 h-auto hover:bg-muted/50 transition-all duration-200 rounded-lg"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.profileImageUrl} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-foreground truncate max-w-32">
                {displayName}
              </span>
              {currentClient && (
                <span className="text-xs text-muted-foreground truncate max-w-32">
                  {currentClient.name}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          {/* User Profile Header */}
          <DropdownMenuLabel className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.profileImageUrl} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {currentClient && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {currentClient.name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          
          {/* Workspace Management */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Briefcase className="w-4 h-4 mr-2" />
              <span>Workspaces</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-52">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Switch Workspace
                </DropdownMenuLabel>
                
                {!isLoading && clients.map((client) => (
                  <DropdownMenuItem 
                    key={client.id} 
                    onClick={() => client.id !== currentClient?.id && switchClient(client.id.toString())}
                    className={`cursor-pointer ${client.id === currentClient?.id ? 'bg-muted/50' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{client.name}</span>
                      </div>
                      {client.id === currentClient?.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer text-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Create Workspace</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                </Dialog>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          {/* Profile Actions */}
          <DropdownMenuItem 
            onClick={handleProfileSettings}
            className="cursor-pointer"
          >
            <User className="w-4 h-4 mr-2" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handlePreferences}
            className="cursor-pointer"
          >
            <Palette className="w-4 h-4 mr-2" />
            <span>Preferences</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newClientDescription}
                onChange={(e) => setNewClientDescription(e.target.value)}
                placeholder="Describe this workspace"
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
    </>
  );
} 