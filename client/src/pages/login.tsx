/**
 * FILE: login.tsx
 * PURPOSE: World-class AI SaaS sign-in page following industry best practices
 * DEPENDENCIES: React, react-hook-form, zod, shadcn/ui components, framer-motion
 * LAST_UPDATED: June 5, 2025
 * 
 * REF: Designed from the perspective of leading AI SaaS brands (Linear, Notion, Vercel)
 * REF: Implements modern authentication UX with micro-interactions and professional branding
 * REF: Supports email/password authentication with optional OAuth integration
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Sparkles,
  Brain,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// REF: Enhanced validation schema with better error messages
const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // REF: Parse URL parameters for error messages and redirects
  const urlParams = new URLSearchParams(window.location.search);
  const oauthError = urlParams.get('error');
  const redirectTo = urlParams.get('redirect') || '/dashboard';

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // REF: Enhanced form submission with better UX
  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError("");
      
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // REF: Success feedback before redirect
        setLocation(redirectTo);
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Unable to connect. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // REF: Handle Google OAuth login
  const handleGoogleLogin = () => {
    window.location.href = `/auth/google`;
  };

  // REF: Handle development login (temporary)
  const handleDevLogin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/login');
      if (response.ok) {
        setLocation('/dashboard');
      }
    } catch (err) {
      setError('Development login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* REF: Left Panel - Branding and Value Proposition */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden"
      >
        {/* REF: Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 py-24">
          {/* REF: Brand Logo and Identity */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl">
                  <img 
                    src="/salesleopard-logo.png" 
                    alt="Winry.AI Logo" 
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Winry.AI</h1>
                <p className="text-sm text-purple-300">by Sales Leopard</p>
              </div>
            </div>
          </motion.div>

          {/* REF: Value Proposition */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                AI-Powered Sales Intelligence Platform
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Transform prospects into personalized outreach with enterprise-grade AI research and automation.
              </p>
            </div>

            {/* REF: Feature highlights with icons */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <span>Advanced AI research on every prospect</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <span>Automated personalization at scale</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <span>Enterprise-grade analytics & insights</span>
              </div>
            </div>
          </motion.div>

          {/* REF: Social proof placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-12 pt-8 border-t border-slate-700"
          >
            <p className="text-sm text-slate-400 mb-3">Trusted by sales teams worldwide</p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full border-2 border-slate-900"></div>
                ))}
              </div>
              <span className="text-slate-400 text-sm ml-2">+500 professionals</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* REF: Right Panel - Sign In Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 flex items-center justify-center px-4 py-12 bg-white"
      >
        <div className="w-full max-w-md">
          {/* REF: Mobile logo for small screens */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <img 
                src="/salesleopard-logo.png" 
                alt="Winry.AI Logo" 
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  Welcome back
                </h1>
                <p className="text-center text-slate-600">
                  Sign in to your Winry.AI account
                </p>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* REF: Error display with better styling */}
              <AnimatePresence>
                {(oauthError || error) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-800">
                        {oauthError === 'oauth_failed' 
                          ? 'OAuth authentication failed. Please try again.'
                          : error || 'Authentication error. Please try again.'}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* REF: Google OAuth button with enhanced styling */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC04"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </motion.div>

              {/* REF: Elegant divider */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-500 font-medium">
                    Or continue with email
                  </span>
                </div>
              </motion.div>

              {/* REF: Enhanced login form */}
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                onSubmit={form.handleSubmit(onSubmit)} 
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">
                    Email address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                      {...form.register("email")}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.email.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.password.message}
                    </motion.p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link 
                      href="/forgot-password" 
                      className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.form>

              {/* REF: Development login (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="pt-4 border-t border-slate-200"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-10 text-sm"
                    onClick={handleDevLogin}
                    disabled={isLoading}
                  >
                    Development Login
                  </Button>
                </motion.div>
              )}

              {/* REF: Sign up link */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="text-center pt-6 border-t border-slate-200"
              >
                <p className="text-slate-600">
                  Don't have an account?{" "}
                  <Link 
                    href="/signup" 
                    className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
} 