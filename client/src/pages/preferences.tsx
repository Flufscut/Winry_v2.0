/**
 * FILE: preferences.tsx
 * PURPOSE: User preferences page following world-class AI SaaS design standards
 * DEPENDENCIES: React hooks, shadcn/ui components, useAuth hook, framer-motion
 * LAST_UPDATED: June 5, 2025
 * 
 * REF: Provides interface for users to configure application preferences with modern design
 * REF: Consistent with the new purple/blue branding and light theme design system
 * TODO: Add integration with backend API for preferences persistence
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Bell,
  Monitor,
  Globe,
  Shield,
  Database,
  Zap,
  Moon,
  Sun,
  Volume2,
  Mail,
  Settings,
  Clock,
  Download,
  Save,
  Eye,
  Sparkles,
  Palette,
  Smartphone,
  RefreshCw,
  RotateCcw,
  CheckCircle
} from "lucide-react";

export default function Preferences() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    preferences, 
    updatePreference, 
    savePreferences, 
    defaultPreferences 
  } = usePreferences();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    updatePreference(key, value);
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      // Validate preferences before saving
      if (preferences.fontSize < 10 || preferences.fontSize > 24) {
        toast({
          title: "Invalid Font Size",
          description: "Font size must be between 10 and 24 pixels.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (preferences.dataRetention < 1 || preferences.dataRetention > 365) {
        toast({
          title: "Invalid Data Retention",
          description: "Data retention must be between 1 and 365 days.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (preferences.batchSize < 1 || preferences.batchSize > 100) {
        toast({
          title: "Invalid Batch Size",
          description: "Batch size must be between 1 and 100.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = await savePreferences(preferences);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Preferences saved successfully!",
        });
      } else {
        throw new Error(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setLocation('/');
  };

  const handleExportData = () => {
    try {
      // Create a JSON file with all user preferences
      const dataToExport = {
        preferences: preferences,
        exportedAt: new Date().toISOString(),
        version: "1.0"
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preferences-export-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Preferences exported successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export preferences.",
        variant: "destructive",
      });
    }
  };
  
  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset all preferences to their default values? This action cannot be undone.")) {
      // Update each preference to default values
      Object.entries(defaultPreferences).forEach(([key, value]) => {
        updatePreference(key as keyof typeof preferences, value);
      });
      
      toast({
        title: "Reset Complete",
        description: "All preferences have been reset to their default values. Don't forget to save!",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-purple-600 absolute top-3 left-3" />
          </div>
          <p className="text-slate-600 animate-pulse">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <img 
                    src="/salesleopard-logo.png" 
                    alt="Winry.AI Logo" 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Winry.AI</h1>
                <p className="text-xs text-purple-600">by Sales Leopard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Header Section */}
      <section className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/30 py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl mx-auto"
          >
            <Badge className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200 px-4 py-2 text-sm font-medium mb-6">
              <Settings className="w-4 h-4 mr-2" />
              Application Preferences
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Customize Your 
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Experience</span>
            </h1>
            <p className="text-xl text-slate-600">
              Configure application settings to match your workflow and preferences
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Appearance & Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-3 text-2xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  Appearance & Display
                </CardTitle>
                <p className="text-slate-600">Customize the visual appearance of your workspace</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          {preferences.theme === 'dark' ? <Moon className="h-5 w-5 text-purple-600" /> : <Sun className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Theme</h4>
                          <p className="text-sm text-slate-600">Choose your preferred theme</p>
                        </div>
                      </div>
                      <Select
                        value={preferences.theme}
                        onValueChange={(value) => handlePreferenceChange('theme', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                          <Eye className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Font Size</h4>
                          <p className="text-sm text-slate-600">{preferences.fontSize}px</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <Slider
                          value={[preferences.fontSize]}
                          onValueChange={(value) => handlePreferenceChange('fontSize', value[0])}
                          min={10}
                          max={24}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                          <Monitor className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Reduced Motion</h4>
                          <p className="text-sm text-slate-600">Minimize animations</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.reducedMotion}
                        onCheckedChange={(checked) => handlePreferenceChange('reducedMotion', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Compact Mode</h4>
                          <p className="text-sm text-slate-600">Optimize for smaller screens</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.compactMode}
                        onCheckedChange={(checked) => handlePreferenceChange('compactMode', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications & Communication */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-3 text-2xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  Notifications & Communication
                </CardTitle>
                <p className="text-slate-600">Control how and when you receive notifications</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Push Notifications</h4>
                          <p className="text-sm text-slate-600">Browser notifications</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.notifications}
                        onCheckedChange={(checked) => handlePreferenceChange('notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Email Notifications</h4>
                          <p className="text-sm text-slate-600">Important updates via email</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Volume2 className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Sound Effects</h4>
                          <p className="text-sm text-slate-600">Audio feedback for actions</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.soundEnabled}
                        onCheckedChange={(checked) => handlePreferenceChange('soundEnabled', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Language</h4>
                          <p className="text-sm text-slate-600">Interface language</p>
                        </div>
                      </div>
                      <Select
                        value={preferences.language}
                        onValueChange={(value) => handlePreferenceChange('language', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data & Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-3 text-2xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  Data & Privacy
                </CardTitle>
                <p className="text-slate-600">Manage your data preferences and privacy settings</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Data Retention</h4>
                          <p className="text-sm text-slate-600">{preferences.dataRetention} days</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <Slider
                          value={[preferences.dataRetention]}
                          onValueChange={(value) => handlePreferenceChange('dataRetention', value[0])}
                          min={1}
                          max={365}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Analytics</h4>
                          <p className="text-sm text-slate-600">Help improve the product</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.analytics}
                        onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Batch Size</h4>
                          <p className="text-sm text-slate-600">{preferences.batchSize} items</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <Slider
                          value={[preferences.batchSize]}
                          onValueChange={(value) => handlePreferenceChange('batchSize', value[0])}
                          min={1}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Auto Refresh</h4>
                          <p className="text-sm text-slate-600">Refresh data automatically</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.autoRefresh}
                        onCheckedChange={(checked) => handlePreferenceChange('autoRefresh', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-8"
          >
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>

            <Button
              onClick={handleSavePreferences}
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-green-900 mb-1">Preferences Auto-Saved</h4>
                <p className="text-sm text-green-700">
                  Your preferences are automatically saved locally and will be synced when you save them to the server.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-200">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <img 
                  src="/salesleopard-logo.png" 
                  alt="Winry.AI Logo" 
                  className="w-4 h-4 object-contain"
                />
              </div>
              <span className="font-semibold text-slate-900">Winry.AI</span>
              <span className="text-slate-500 text-sm">by Sales Leopard</span>
            </div>
            <div className="text-slate-500 text-sm">
              © 2025 Sales Leopard. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 