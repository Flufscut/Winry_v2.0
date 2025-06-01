import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, RotateCcw } from "lucide-react";

interface AppSettings {
  webhookUrl: string;
  webhookTimeoutSeconds: number;
  maxRetries: number;
  retryDelaySeconds: number;
  batchSize: number;
  useProductionWebhook: boolean;
}

export default function SettingsMenu() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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
    useProductionWebhook: true,
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
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
      setOpen(false);
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
      await apiRequest("/api/settings/reset", {
        method: "POST",
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => handleInputChange("webhookUrl", e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookTimeoutSeconds">Timeout (seconds)</Label>
                  <Input
                    id="webhookTimeoutSeconds"
                    type="number"
                    min="30"
                    max="1800"
                    value={formData.webhookTimeoutSeconds}
                    onChange={(e) => handleInputChange("webhookTimeoutSeconds", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Max wait time for webhook response</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) => handleInputChange("maxRetries", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Number of retry attempts</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retryDelaySeconds">Retry Delay (seconds)</Label>
                <Input
                  id="retryDelaySeconds"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.retryDelaySeconds}
                  onChange={(e) => handleInputChange("retryDelaySeconds", parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Delay between retry attempts</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.batchSize}
                  onChange={(e) => handleInputChange("batchSize", parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Number of prospects processed per batch</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="useProductionWebhook"
                    checked={formData.useProductionWebhook}
                    onCheckedChange={(checked) => handleInputChange("useProductionWebhook", checked)}
                  />
                  <Label htmlFor="useProductionWebhook">Use Production Webhook</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Toggle between production webhook (/webhook/) and test webhook (/webhook-test/)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetToDefaultsMutation.mutate()}
              disabled={resetToDefaultsMutation.isPending}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending}
              className="flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}