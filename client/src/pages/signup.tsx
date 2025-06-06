/**
 * FILE: signup.tsx
 * PURPOSE: World-class AI SaaS sign-up page following industry best practices
 * DEPENDENCIES: React, react-hook-form, zod, shadcn/ui components, framer-motion
 * LAST_UPDATED: June 5, 2025
 * 
 * REF: Designed to match leading AI SaaS brands with modern registration flow
 * REF: Implements enhanced UX with micro-interactions and professional branding
 * REF: Supports email/password registration with optional OAuth integration
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle,
  Sparkles,
  Brain,
  Zap
} from "lucide-react";

// REF: Enhanced signup validation schema with stronger password requirements
const signupSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
  agreeToTerms: z.boolean()
    .refine(val => val === true, "You must agree to the terms and conditions"),
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
      agreeToTerms: false,
    },
  });

  // REF: Enhanced form submission with better UX and validation
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
        // REF: Success feedback before redirect
        setLocation('/dashboard');
      } else {
        setError(result.message || 'Registration failed. Please try again.');
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
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.watch("password") || "");
  const passwordStrengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const passwordStrengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

  return (
    <div className="min-h-screen flex">
      {/* REF: Left Panel - Branding and Value Proposition (same as login) */}
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

          {/* REF: Sign up specific value proposition */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Start Your AI Sales Journey
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Join thousands of sales professionals using AI to transform their outreach and close more deals.
              </p>
            </div>

            {/* REF: Benefits with icons */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Free forever plan with core features</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>AI-powered prospect research</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Automated personalization</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Advanced analytics & insights</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* REF: Right Panel - Sign Up Form */}
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
                  Create your account
                </h1>
                <p className="text-center text-slate-600">
                  Start transforming your sales process today
                </p>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* REF: Error display with better styling */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-800">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* REF: Google OAuth button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  onClick={handleGoogleSignup}
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
                    Or create with email
                  </span>
                </div>
              </motion.div>

              {/* REF: Enhanced signup form */}
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                onSubmit={form.handleSubmit(onSubmit)} 
                className="space-y-5"
              >
                {/* REF: Name fields in a grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-700 font-medium">
                      First Name
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        className="pl-10 h-11 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                        {...form.register("firstName")}
                      />
                    </div>
                    {form.formState.errors.firstName && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {form.formState.errors.firstName.message}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-700 font-medium">
                      Last Name
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        className="pl-10 h-11 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                        {...form.register("lastName")}
                      />
                    </div>
                    {form.formState.errors.lastName && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {form.formState.errors.lastName.message}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* REF: Email field */}
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
                      className="pl-10 h-11 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
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

                {/* REF: Password field with strength indicator */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className="pl-10 pr-10 h-11 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
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
                  
                  {/* REF: Password strength indicator */}
                  {form.watch("password") && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                              i < passwordStrength 
                                ? passwordStrengthColors[Math.min(passwordStrength - 1, 4)]
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-600">
                        Password strength: {passwordStrengthLabels[Math.min(passwordStrength - 1, 4)] || "Too weak"}
                      </p>
                    </div>
                  )}
                  
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

                {/* REF: Confirm Password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10 h-11 border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.confirmPassword.message}
                    </motion.p>
                  )}
                </div>

                {/* REF: Terms and conditions checkbox */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agreeToTerms"
                      checked={form.watch("agreeToTerms")}
                      onCheckedChange={(checked) => form.setValue("agreeToTerms", checked as boolean)}
                      className="mt-1"
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm text-slate-600 leading-relaxed">
                      I agree to the{" "}
                      <Link href="/terms" className="text-purple-600 hover:text-purple-700 font-medium">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-purple-600 hover:text-purple-700 font-medium">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  {form.formState.errors.agreeToTerms && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.agreeToTerms.message}
                    </motion.p>
                  )}
                </div>

                {/* REF: Submit button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
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
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.form>

              {/* REF: Sign in link */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="text-center pt-6 border-t border-slate-200"
              >
                <p className="text-slate-600">
                  Already have an account?{" "}
                  <Link 
                    href="/login" 
                    className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    Sign in
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