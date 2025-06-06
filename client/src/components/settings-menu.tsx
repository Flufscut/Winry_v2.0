import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, Send, Download, Copy, ExternalLink } from "lucide-react";
import { ReplyIoSettings } from "@/components/reply-io-settings";

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

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${description} copied successfully`,
    });
  };

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001';
  const incomingWebhookUrl = `${currentDomain}/api/webhook/n8n-data`;
  const legacyWebhookUrl = `${currentDomain}/webhook/n8n-results`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded animate-pulse"></div>
        <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Application Settings Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Application Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure webhook endpoints and processing settings for your ProspectPro instance.
        </p>
      </div>

      <Separator />

      {/* Webhook Configuration Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Webhook Configuration
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how ProspectPro communicates with external services like n8n workflows.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Outgoing Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="w-4 h-4" />
                Outgoing Webhook
              </CardTitle>
              <CardDescription>
                External service endpoint where ProspectPro sends prospect data for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl" className="text-sm font-medium">
                  Target URL
                </Label>
                <Input
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => handleInputChange("webhookUrl", e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  n8n or other webhook service URL for prospect processing
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="webhookTimeoutSeconds" className="text-sm font-medium">
                    Timeout (sec)
                  </Label>
                  <Input
                    id="webhookTimeoutSeconds"
                    type="number"
                    min="30"
                    max="1800"
                    value={formData.webhookTimeoutSeconds}
                    onChange={(e) => handleInputChange("webhookTimeoutSeconds", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Max wait time</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxRetries" className="text-sm font-medium">
                    Max Retries
                  </Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) => handleInputChange("maxRetries", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Retry attempts</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retryDelaySeconds" className="text-sm font-medium">
                  Retry Delay (sec)
                </Label>
                <Input
                  id="retryDelaySeconds"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.retryDelaySeconds}
                  onChange={(e) => handleInputChange("retryDelaySeconds", parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Delay between retries</p>
              </div>
            </CardContent>
          </Card>

          {/* Incoming Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="w-4 h-4" />
                Incoming Webhook
              </CardTitle>
              <CardDescription>
                Endpoints where external services can send processed results back to ProspectPro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Primary Endpoint</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={incomingWebhookUrl}
                      readOnly
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(incomingWebhookUrl, "Primary webhook URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modern endpoint with full authentication support
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Legacy Endpoint</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={legacyWebhookUrl}
                      readOnly
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(legacyWebhookUrl, "Legacy webhook URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fallback endpoint without authentication requirements
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Configuration Tip:</strong> Use the primary endpoint in your n8n webhook node. 
                  The legacy endpoint is available for backward compatibility.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Processing Configuration */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Processing Configuration</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control how prospects are processed and sent to external services.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="batchSize" className="text-sm font-medium">
                Batch Size
              </Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="50"
                value={formData.batchSize}
                onChange={(e) => handleInputChange("batchSize", parseInt(e.target.value))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Number of prospects processed per batch. Lower values reduce server load but increase processing time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Reply.io Integration Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-500" />
            Reply.io Integration
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Reply.io accounts and automated outreach settings for your prospects.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ReplyIoSettings />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => resetToDefaultsMutation.mutate()}
          disabled={resetToDefaultsMutation.isPending}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        
        <Button 
          type="submit" 
          disabled={updateSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </form>
  );
}