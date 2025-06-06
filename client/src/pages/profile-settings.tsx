/**
 * FILE: profile-settings.tsx
 * PURPOSE: User profile settings page following world-class AI SaaS design standards
 * DEPENDENCIES: React hooks, shadcn/ui components, useAuth hook, framer-motion
 * LAST_UPDATED: June 5, 2025
 * 
 * REF: Provides interface for users to edit their profile information with modern design
 * REF: Consistent with the new purple/blue branding and light theme design system
 * TODO: Add profile image upload functionality and password change
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Camera, 
  Save, 
  ArrowLeft,
  Shield,
  Bell,
  Globe,
  Palette,
  Sparkles,
  CheckCircle,
  Lock,
  Key,
  Settings,
  Calendar,
  MapPin
} from "lucide-react";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  bio?: string;
}

export default function ProfileSettings() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    profileImageUrl: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        email: (user as any).email || '',
        profileImageUrl: (user as any).profileImageUrl || '',
        bio: (user as any).bio || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setLocation('/');
  };

  const userInitials = `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-purple-600 absolute top-3 left-3" />
          </div>
          <p className="text-slate-600 animate-pulse">Loading profile...</p>
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
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Manage Your 
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Profile</span>
            </h1>
            <p className="text-xl text-slate-600">
              Update your personal information and account preferences
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="pb-6">
                <CardTitle className="text-slate-900 flex items-center gap-3 text-2xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  Profile Information
                </CardTitle>
                <p className="text-slate-600">Update your personal details and public profile</p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Profile Picture Section */}
                <div className="flex items-center gap-8">
                  <div className="relative">
                    <Avatar className="w-32 h-32 shadow-xl">
                      <AvatarImage src={formData.profileImageUrl} alt="Profile Picture" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-semibold text-3xl">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Profile image upload functionality coming soon!",
                        });
                      }}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                      {formData.firstName} {formData.lastName}
                    </h3>
                    <p className="text-slate-600 mb-4">{formData.email}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className="text-green-700 bg-green-100">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active Account
                      </Badge>
                      <Badge variant="outline" className="text-purple-700 border-purple-200">
                        <Calendar className="w-3 h-3 mr-1" />
                        Member since 2025
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      Click the camera icon to update your profile picture
                    </p>
                  </div>
                </div>

                <Separator className="bg-slate-200" />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter your first name"
                      className="h-12 border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter your last name"
                      className="h-12 border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      className="h-12 pl-10 border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileImageUrl" className="text-slate-700 font-medium">Profile Image URL</Label>
                  <Input
                    id="profileImageUrl"
                    value={formData.profileImageUrl}
                    onChange={(e) => handleInputChange('profileImageUrl', e.target.value)}
                    placeholder="Enter image URL or upload coming soon"
                    className="h-12 border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-700 font-medium">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="border-slate-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                  />
                  <p className="text-sm text-slate-500">Brief description for your profile. Max 500 characters.</p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveProfile}
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
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-3 text-2xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  Security & Privacy
                </CardTitle>
                <p className="text-slate-600">Manage your account security and privacy settings</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Password</h4>
                          <p className="text-sm text-slate-600">Last changed 3 months ago</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        <Lock className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-slate-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">Notifications</h4>
                          <p className="text-sm text-slate-600">Manage preferences</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Coming Soon</h4>
                      <p className="text-sm text-blue-700">
                        Advanced security features including two-factor authentication, login history, and privacy controls are coming soon.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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