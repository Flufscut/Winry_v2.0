import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw } from "lucide-react";

interface AppSettings {
  webhookUrl: string;
  webhookTimeoutSeconds: number;
  maxRetries: number;
  retryDelaySeconds: number;
  batchSize: number;
}

export default function SettingsMenu() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    retry: false,
  });

  const [formData, setFormData] = useState<AppSettings>({
    webhookUrl: "",
    webhookTimeoutSeconds: 1800,
    maxRetries: 1,
    retryDelaySeconds: 30,
    batchSize: 10,
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings && typeof settings === 'object' && settings !== null) {
      // Merge with default values to ensure all required fields exist
      setFormData(prev => ({
        ...prev,
        ...(settings as Partial<AppSettings>)
      }));
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: AppSettings) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
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
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/settings/reset");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Settings reset to defaults",
      });
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
        description: "Failed to reset settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof AppSettings, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-slate-700 rounded animate-pulse"></div>
        <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-slate-700 rounded animate-pulse w-1/2"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Webhook Configuration */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Webhook Configuration</h3>
        </div>
        
              <div className="space-y-2">
          <Label htmlFor="webhookUrl" className="text-slate-300">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => handleInputChange("webhookUrl", e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
            className="font-mono text-sm bg-slate-800 border-slate-600 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
            <Label htmlFor="webhookTimeoutSeconds" className="text-slate-300">Timeout (seconds)</Label>
                  <Input
                    id="webhookTimeoutSeconds"
                    type="number"
                    min="30"
                    max="1800"
                    value={formData.webhookTimeoutSeconds}
                    onChange={(e) => handleInputChange("webhookTimeoutSeconds", parseInt(e.target.value))}
              className="bg-slate-800 border-slate-600 text-white"
                  />
            <p className="text-xs text-slate-400">Max wait time for webhook response</p>
                </div>
                
                <div className="space-y-2">
            <Label htmlFor="maxRetries" className="text-slate-300">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) => handleInputChange("maxRetries", parseInt(e.target.value))}
              className="bg-slate-800 border-slate-600 text-white"
                  />
            <p className="text-xs text-slate-400">Number of retry attempts</p>
                </div>
              </div>
              
              <div className="space-y-2">
          <Label htmlFor="retryDelaySeconds" className="text-slate-300">Retry Delay (seconds)</Label>
                <Input
                  id="retryDelaySeconds"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.retryDelaySeconds}
                  onChange={(e) => handleInputChange("retryDelaySeconds", parseInt(e.target.value))}
            className="bg-slate-800 border-slate-600 text-white"
                />
          <p className="text-xs text-slate-400">Delay between retry attempts</p>
        </div>
      </div>

      {/* Processing Configuration */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Processing Configuration</h3>
              </div>

              <div className="space-y-2">
          <Label htmlFor="batchSize" className="text-slate-300">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.batchSize}
                  onChange={(e) => handleInputChange("batchSize", parseInt(e.target.value))}
            className="bg-slate-800 border-slate-600 text-white"
                />
          <p className="text-xs text-slate-400">Number of prospects processed per batch</p>
        </div>
              </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetToDefaultsMutation.mutate()}
              disabled={resetToDefaultsMutation.isPending}
          className="flex items-center border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending}
          className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>
  );
}