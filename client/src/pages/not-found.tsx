/**
 * FILE: not-found.tsx
 * PURPOSE: Professional 404 error page following AI SaaS design standards
 * DEPENDENCIES: React, framer-motion, shadcn/ui components
 * LAST_UPDATED: June 5, 2025
 * 
 * REF: Designed to match the world-class branding of the authentication pages
 * REF: Provides helpful navigation and maintains professional user experience
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  AlertCircle, 
  Home, 
  ArrowLeft, 
  Search, 
  Sparkles,
  Brain,
  Zap
} from "lucide-react";

export default function NotFound() {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button 
                onClick={handleGoHome}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            {/* Error Icon */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-8"
            >
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                  <AlertCircle className="h-12 w-12 text-purple-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Error Code */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                404
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto"></div>
            </motion.div>

            {/* Error Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Page Not Found
              </h2>
              <p className="text-xl text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">
                The page you're looking for doesn't exist or has been moved to a different location.
              </p>
              <p className="text-sm text-slate-500">
                Don't worry, even the most advanced AI can take a wrong turn sometimes!
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            >
              <Button 
                size="lg" 
                onClick={handleGoHome}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-200"
              >
                <Home className="mr-2 h-5 w-5" />
                Go to Homepage
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleGoBack}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg font-medium"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
            </motion.div>

            {/* Helpful Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="border-0 shadow-xl bg-slate-50/50 backdrop-blur-sm max-w-md mx-auto">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center justify-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Need Help?
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm">Check the URL for typos</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-sm">Try refreshing the page</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm">Contact support if the issue persists</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>

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
