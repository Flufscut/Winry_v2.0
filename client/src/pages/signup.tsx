/**
 * FILE: signup.tsx
 * PURPOSE: World-class AI SaaS sign-up page for new account creation
 * DEPENDENCIES: React, react-hook-form, zod, shadcn/ui components, framer-motion
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Matches design language of login page with account creation functionality
 * REF: Supports email/password registration with form validation
 * REF: Provides path to OAuth registration for alternative signup methods
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
  Zap,
  User,
  CheckCircle
} from "lucide-react";

// REF: Enhanced validation schema for account creation
const signupSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // REF: Form submission with account creation
  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      setError("");
      
      const response = await fetch('/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // REF: Success - redirect to dashboard
        setLocation('/dashboard');
      } else {
        setError(result.message || 'Account creation failed. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // REF: Handle Google OAuth signup
  const handleGoogleSignup = () => {
    window.location.href = `/auth/google`;
  };

  // REF: Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const password = form.watch("password");
  const passwordStrength = getPasswordStrength(password || "");

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

          {/* REF: Value Proposition for Signup */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Join the Future of Sales Intelligence
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Create your account and start transforming prospects into personalized outreach today.
              </p>
            </div>

            {/* REF: Feature highlights for signup */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <span>Start with AI-powered prospect research</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <span>Free trial with full platform access</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <span>Setup in under 2 minutes</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* REF: Right Panel - Signup Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white"
      >
        <div className="w-full max-w-md space-y-8">
          {/* REF: Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <img src="/salesleopard-logo.png" alt="Winry.AI Logo" className="w-6 h-6 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Winry.AI</h1>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
                  <p className="text-sm text-slate-600">Join thousands of sales professionals using Winry.AI</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* REF: Google OAuth Signup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <Button
                    onClick={handleGoogleSignup}
                    variant="outline"
                    className="w-full h-12 border-slate-200 hover:border-slate-300 transition-all duration-200 group"
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium">Continue with Google</span>
                  </Button>
                </motion.div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500 font-medium">Or continue with email</span>
                  </div>
                </div>

                {/* REF: Error Alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 font-medium">
                          {error}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* REF: Signup Form */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* REF: Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                        First name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          className="pl-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                          placeholder="Enter your first name"
                          disabled={isLoading}
                        />
                      </div>
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-red-600 font-medium">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                        Last name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                          id="lastName"
                          {...form.register("lastName")}
                          className="pl-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                          placeholder="Enter your last name"
                          disabled={isLoading}
                        />
                      </div>
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-red-600 font-medium">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* REF: Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        className="pl-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                        placeholder="Enter your email"
                        disabled={isLoading}
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600 font-medium">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* REF: Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...form.register("password")}
                        className="pl-10 pr-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                        placeholder="Create a strong password"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {/* REF: Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2">
                        <div className="flex space-x-1">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i < passwordStrength 
                                  ? passwordStrength === 1 ? 'bg-red-500' 
                                    : passwordStrength === 2 ? 'bg-yellow-500'
                                    : passwordStrength === 3 ? 'bg-blue-500'
                                    : 'bg-green-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-600">
                          Password strength: {
                            passwordStrength === 1 ? 'Weak' :
                            passwordStrength === 2 ? 'Fair' :
                            passwordStrength === 3 ? 'Good' :
                            passwordStrength >= 4 ? 'Strong' : 'Very weak'
                          }
                        </p>
                      </div>
                    )}
                    
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600 font-medium">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* REF: Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...form.register("confirmPassword")}
                        className="pl-10 pr-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                        placeholder="Confirm your password"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600 font-medium">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* REF: Submit Button */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create account
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>

                {/* REF: Login Link */}
                <div className="text-center pt-4">
                  <p className="text-sm text-slate-600">
                    Already have an account?{" "}
                    <Link href="/login">
                      <span className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer transition-colors">
                        Sign in
                      </span>
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
} 