/**
 * FILE: landing.tsx
 * PURPOSE: World-class AI SaaS landing page following industry best practices
 * DEPENDENCIES: React, framer-motion, shadcn/ui components
 * LAST_UPDATED: June 5, 2025
 * 
 * REF: Designed from the perspective of leading AI SaaS brands (Linear, Notion, Vercel)
 * REF: Modern landing page with hero section, social proof, features, and compelling CTAs
 * REF: Optimized for conversion with professional branding and clear value proposition
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Zap, 
  Users, 
  BarChart3, 
  Shield, 
  ArrowRight, 
  Brain, 
  Sparkles, 
  Target, 
  CheckCircle, 
  TrendingUp,
  Globe,
  Lock,
  Rocket,
  Star,
  MessageSquare,
  Database,
  Clock,
  Award
} from "lucide-react";

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
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
                onClick={() => window.location.href = '/login'}
                className="text-slate-600 hover:text-slate-900"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/signup'}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/3 to-blue-500/3 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-6 py-24 lg:py-32">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-8">
              <Badge className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200 px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Sales Intelligence Platform
              </Badge>
            </motion.div>

            {/* Hero Headline */}
            <motion.h1 
              variants={itemVariants}
              className="text-5xl lg:text-7xl font-bold text-slate-900 mb-8 leading-tight"
            >
              Transform
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Prospects </span>
              into
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Personalized </span>
              Outreach
            </motion.h1>

            {/* Hero Subheadline */}
            <motion.p 
              variants={itemVariants}
              className="text-xl lg:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Generate compelling, personalized cold outreach messages with enterprise-grade AI research. 
              Upload prospects, get comprehensive analysis, and create messages that convert.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            >
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-200"
                onClick={() => window.location.href = '/signup'}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg font-medium"
                onClick={() => window.location.href = '/login'}
              >
                Watch Demo
                <Target className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div variants={itemVariants} className="text-slate-500">
              <p className="text-sm mb-4">Trusted by sales teams worldwide</p>
              <div className="flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full border-2 border-white shadow-sm"></div>
                  ))}
                </div>
                <span className="text-sm ml-3">+500 professionals</span>
                <div className="flex ml-4 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm ml-2">4.9/5 rating</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Everything you need to scale outreach
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our AI-powered platform combines deep prospect research, intelligent personalization, 
              and seamless automation to maximize your sales success.
            </p>
          </motion.div>

          {/* Primary Features Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    AI-Powered Research
                  </h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Deep analysis of prospects, their companies, pain points, and business goals using advanced AI algorithms.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Company analysis & insights
                    </li>
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Pain point identification
                    </li>
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Opportunity scoring
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    Smart Personalization
                  </h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Generate highly personalized cold outreach messages that resonate with each prospect's specific situation.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Context-aware messaging
                    </li>
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Multiple message variants
                    </li>
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      A/B testing ready
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    Scale & Automate
                  </h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Process hundreds of prospects simultaneously with bulk upload capabilities and automated workflows.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Bulk CSV processing
                    </li>
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Email campaign integration
                    </li>
                    <li className="flex items-center text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Performance analytics
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Secondary Features */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Database, title: "Secure Data", desc: "Enterprise-grade security" },
              { icon: Clock, title: "Real-time", desc: "Instant processing" },
              { icon: TrendingUp, title: "Analytics", desc: "Performance insights" },
              { icon: Award, title: "Premium", desc: "Quality guaranteed" }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-slate-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{feature.title}</h4>
                <p className="text-sm text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Simple process, powerful results
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get started in minutes and watch your outreach performance soar with AI-powered personalization.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Upload Prospects",
                description: "Add prospects manually or upload a CSV file with your prospect list. Our system handles the rest.",
                icon: Users
              },
              {
                step: "2",
                title: "AI Analysis",
                description: "Our AI researches each prospect's background, company, and identifies key opportunities and pain points.",
                icon: Brain
              },
              {
                step: "3",
                title: "Get Results",
                description: "Receive personalized cold outreach messages ready to send, with performance tracking and optimization.",
                icon: Target
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 * index }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-purple-200">
                    <span className="text-sm font-bold text-purple-600">{item.step}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to transform your outreach?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Join thousands of sales professionals who are already using AI to close more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg font-medium shadow-xl"
                onClick={() => window.location.href = '/signup'}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-slate-900 px-8 py-6 text-lg font-medium"
                onClick={() => window.location.href = '/login'}
              >
                Schedule Demo
              </Button>
            </div>
            <p className="text-sm text-slate-400 mt-6">
              No credit card required • Free forever plan • Setup in minutes
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-200">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <img 
                  src="/salesleopard-logo.png" 
                  alt="Winry.AI Logo" 
                  className="w-5 h-5 object-contain"
                />
              </div>
              <div>
                <span className="font-semibold text-slate-900">Winry.AI</span>
                <span className="text-slate-500 text-sm ml-2">by Sales Leopard</span>
              </div>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-600">
              <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
              <a href="/contact" className="hover:text-slate-900 transition-colors">Contact</a>
            </div>
          </div>
          <div className="text-center mt-8 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm">
              © 2025 Sales Leopard. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
