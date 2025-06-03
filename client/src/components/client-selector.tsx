/**
 * FILE: client-selector.tsx
 * PURPOSE: Simplified client selector for independent client organizations
 * DEPENDENCIES: React Query, client context
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Replaces ClientHierarchyWidget with simplified client-centric approach
 * TODO: Add API key and campaign selection
 * 
 * MAIN_FUNCTIONS:
 * - ClientSelector: Main client selection interface
 * - ApiKeySelector: API key selection within client
 * - CampaignSelector: Campaign selection within API key
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Key, Send, ChevronDown } from "lucide-react";

interface Client {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  role: string;
}

interface ApiKey {
  id: number;
  name: string;
  email: string;
  accountName: string;
  isActive: boolean;
}

interface Campaign {
  id: number;
  campaignId: string;
  campaignName: string;
  status: string;
}

interface ClientContext {
  currentClient: Client | null;
  currentApiKey: ApiKey | null;
  currentCampaign: Campaign | null;
  allClients: Client[];
  setCurrentClient: (client: Client) => void;
  setCurrentApiKey: (apiKey: ApiKey) => void;
  setCurrentCampaign: (campaign: Campaign) => void;
}

const ClientContext = createContext<ClientContext | null>(null);

export function useClientContext() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [currentClient, setCurrentClientState] = useState<Client | null>(null);
  const [currentApiKey, setCurrentApiKeyState] = useState<ApiKey | null>(null);
  const [currentCampaign, setCurrentCampaignState] = useState<Campaign | null>(null);
  const queryClient = useQueryClient();

  // Fetch all clients user has access to
  const { data: allClients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Fetch user context (current selections)
  const { data: userContext } = useQuery({
    queryKey: ["/api/user/context"],
    queryFn: async () => {
      const response = await fetch('/api/user/context');
      if (!response.ok) throw new Error('Failed to fetch user context');
      return response.json();
    },
  });

  // Update context mutation
  const updateContextMutation = useMutation({
    mutationFn: async (context: { activeClientId?: number; activeApiKeyId?: number; activeCampaignId?: number }) => {
      const response = await fetch('/api/user/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      if (!response.ok) throw new Error('Failed to update context');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/context"] });
    },
  });

  // Set current client from context when data loads
  useEffect(() => {
    if (allClients.length > 0 && userContext?.activeClientId) {
      const client = allClients.find(c => c.id === userContext.activeClientId);
      if (client) setCurrentClientState(client);
    } else if (allClients.length > 0 && !currentClient) {
      // Default to first client if no context
      setCurrentClientState(allClients[0]);
    }
  }, [allClients, userContext]);

  const setCurrentClient = (client: Client) => {
    setCurrentClientState(client);
    setCurrentApiKeyState(null);
    setCurrentCampaignState(null);
    updateContextMutation.mutate({ 
      activeClientId: client.id,
      activeApiKeyId: undefined,
      activeCampaignId: undefined
    });
  };

  const setCurrentApiKey = (apiKey: ApiKey) => {
    setCurrentApiKeyState(apiKey);
    setCurrentCampaignState(null);
    updateContextMutation.mutate({ 
      activeClientId: currentClient?.id,
      activeApiKeyId: apiKey.id,
      activeCampaignId: undefined
    });
  };

  const setCurrentCampaign = (campaign: Campaign) => {
    setCurrentCampaignState(campaign);
    updateContextMutation.mutate({ 
      activeClientId: currentClient?.id,
      activeApiKeyId: currentApiKey?.id,
      activeCampaignId: campaign.id
    });
  };

  const contextValue = {
    currentClient,
    currentApiKey,
    currentCampaign,
    allClients,
    setCurrentClient,
    setCurrentApiKey,
    setCurrentCampaign,
  };

  return (
    <ClientContext.Provider value={contextValue}>
      {children}
    </ClientContext.Provider>
  );
}

export function ClientSelector() {
  const { currentClient, allClients, setCurrentClient } = useClientContext();

  if (!currentClient) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-slate-800 rounded-lg">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400">Loading clients...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-blue-400" />
        <Select
          value={currentClient.id.toString()}
          onValueChange={(value) => {
            const client = allClients.find(c => c.id === parseInt(value));
            if (client) setCurrentClient(client);
          }}
        >
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white min-w-[200px]">
            <div className="flex items-center space-x-2">
              <span>{currentClient.name}</span>
              <Badge variant="outline" className="text-xs">
                {currentClient.role}
              </Badge>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {allClients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                <div className="flex items-center space-x-2">
                  <span>{client.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {client.role}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <ApiKeySelector />
      <CampaignSelector />
    </div>
  );
}

function ApiKeySelector() {
  const { currentClient, currentApiKey, setCurrentApiKey } = useClientContext();

  const { data: apiKeys = [] } = useQuery({
    queryKey: ["/api/clients", currentClient?.id, "api-keys"],
    queryFn: async () => {
      if (!currentClient) return [];
      const response = await fetch(`/api/clients/${currentClient.id}/api-keys`);
      if (!response.ok) throw new Error('Failed to fetch API keys');
      return response.json();
    },
    enabled: !!currentClient,
  });

  if (!currentClient || apiKeys.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-slate-400">
        <Key className="w-4 h-4" />
        <span className="text-sm">No API keys</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Key className="w-4 h-4 text-green-400" />
      <Select
        value={currentApiKey?.id.toString() || ""}
        onValueChange={(value) => {
          const apiKey = apiKeys.find(k => k.id === parseInt(value));
          if (apiKey) setCurrentApiKey(apiKey);
        }}
      >
        <SelectTrigger className="bg-slate-800 border-slate-600 text-white min-w-[180px]">
          {currentApiKey ? (
            <div className="flex items-center space-x-2">
              <span>{currentApiKey.name}</span>
            </div>
          ) : (
            <span className="text-slate-400">Select API Key</span>
          )}
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          {apiKeys.map((apiKey) => (
            <SelectItem key={apiKey.id} value={apiKey.id.toString()}>
              <div>
                <div className="font-medium">{apiKey.name}</div>
                <div className="text-xs text-slate-400">{apiKey.email}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CampaignSelector() {
  const { currentClient, currentApiKey, currentCampaign, setCurrentCampaign } = useClientContext();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/clients", currentClient?.id, "api-keys", currentApiKey?.id, "campaigns"],
    queryFn: async () => {
      if (!currentClient || !currentApiKey) return [];
      const response = await fetch(`/api/clients/${currentClient.id}/api-keys/${currentApiKey.id}/campaigns`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
    enabled: !!currentClient && !!currentApiKey,
  });

  if (!currentApiKey || campaigns.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-slate-400">
        <Send className="w-4 h-4" />
        <span className="text-sm">No campaigns</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Send className="w-4 h-4 text-purple-400" />
      <Select
        value={currentCampaign?.id.toString() || ""}
        onValueChange={(value) => {
          const campaign = campaigns.find(c => c.id === parseInt(value));
          if (campaign) setCurrentCampaign(campaign);
        }}
      >
        <SelectTrigger className="bg-slate-800 border-slate-600 text-white min-w-[200px]">
          {currentCampaign ? (
            <div className="flex items-center space-x-2">
              <span>{currentCampaign.campaignName}</span>
              <Badge variant={currentCampaign.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {currentCampaign.status}
              </Badge>
            </div>
          ) : (
            <span className="text-slate-400">Select Campaign</span>
          )}
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id.toString()}>
              <div className="flex items-center space-x-2">
                <span>{campaign.campaignName}</span>
                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {campaign.status}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default ClientSelector; 