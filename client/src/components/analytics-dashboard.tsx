/**
 * FILE: analytics-dashboard.tsx
 * PURPOSE: Unified analytics dashboard showing complete prospect pipeline
 * DEPENDENCIES: React Query, Recharts, shadcn/ui components, Reply.io integration
 * LAST_UPDATED: Current date
 * 
 * REF: Displays complete pipeline: Upload → Research → Messaging → Outreach
 * REF: Combines Winry.AI processing stats with Reply.io campaign performance
 * TODO: Add pipeline conversion rate calculations and forecasting
 * 
 * MAIN_FUNCTIONS:
 * - CommandCenterDashboard: Main unified analytics component
 * - HeroMetricDisplay: Large metric cards with pipeline stages
 * - PipelineVisualization: Complete funnel visualization
 * - PerformanceInsights: Combined insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, Sankey, Funnel, FunnelChart, LabelList, RadialBarChart, RadialBar, Legend,
  ComposedChart, Scatter
} from 'recharts';
import { 
  Users, TrendingUp, Brain, Zap, Target, Activity, 
  Mail, Eye, MousePointer, Reply, AlertTriangle, RefreshCw,
  ArrowRight, CheckCircle, Clock, Send, Award, X, BarChart3,
  Shield, Gauge, Timer, Globe, Sparkles, Filter, Database,
  FileCheck, AlertCircle, ThumbsUp, MessageCircle, Calendar,
  Laptop, Smartphone, Tablet, Monitor, Link, Hash, TrendingDown,
  Lightbulb
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { EnhancedAnalytics } from "./enhanced-analytics";

interface CommandCenterDashboardProps {
  stats: any;
}

interface ReplyIoStats {
  totalCampaigns: number;
  totalContacts: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  emailsBounced: number;
  overallOpenRate: number;
  overallClickRate: number;
  overallReplyRate: number;
  overallBounceRate: number;
  campaigns: Array<{
    campaignId: number;
    campaignName: string;
    totalContacts: number;
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsReplied: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    isSelected?: boolean;
  }>;
  selectedAccount?: {
    id: number;
    name: string;
    isDefault: boolean;
  };
  selectedCampaign?: {
    id: number;
    campaignId: number;
    name: string;
    isDefault: boolean;
  };
  dataLevel?: 'campaign-specific' | 'aggregated' | 'basic';
  note?: string;
}

interface ApiResponse {
  success: boolean;
  statistics?: ReplyIoStats;
  message?: string;
  error?: string;
}

const PIPELINE_COLORS = {
  prospects: '#8b5cf6',
  research: '#06b6d4', 
  messaging: '#10b981',
  outreach: '#f59e0b',
  responses: '#ef4444'
};

export function CommandCenterDashboard({ stats }: CommandCenterDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string | null>(null);
  const { toast } = useToast();

  // Define pipeline stage keys type
  type PipelineStageKey = 'prospects-uploaded' | 'research-completed' | 'sent-to-outreach' | 'emails-opened' | 'responses-received';

  // REF: Fetch Reply.io accounts to get default campaign
  const { data: replyIoAccounts } = useQuery({
    queryKey: ['replyIoAccounts'],
    queryFn: async () => {
      const response = await fetch('/api/reply-io/accounts');
      if (!response.ok) throw new Error('Failed to fetch Reply.io accounts');
      return response.json();
    },
  });

  // REF: Get the selected campaign ID from default account/campaign
  const getSelectedCampaignId = () => {
    if (!replyIoAccounts?.accounts || replyIoAccounts.accounts.length === 0) {
      return null;
    }
    
    // Find default account
    const defaultAccount = replyIoAccounts.accounts.find((acc: any) => acc.isDefault) || replyIoAccounts.accounts[0];
    
    // For now, we need to fetch campaigns to find the default one
    // In a real implementation, this would be part of the account data
    return null; // Will be updated when we have the campaign data
  };

  // Fetch Reply.io statistics for unified pipeline view - OPTIMIZED FOR RATE LIMITING
  const { data: replyIoData, isLoading: replyLoading, refetch: refetchReply } = useQuery<ApiResponse>({
    queryKey: ["/api/reply-io/statistics", refreshKey],
    retry: false,
    enabled: true,
    staleTime: 30 * 60 * 1000, // 30 minutes - reduced frequency to prevent rate limiting
    refetchInterval: false, // Disable auto-refresh 
  });

  // REF: Fetch Reply.io settings for API key validation
  const { data: replyIoSettings } = useQuery({
    queryKey: ['replyIoSettings'],
    queryFn: async () => {
      const response = await fetch('/api/reply-io/settings');
      if (!response.ok) throw new Error('Failed to fetch Reply.io settings');
      return response.json();
    },
  });

  // REF: Fetch prospects data to calculate accurate pipeline metrics
  const { data: prospects } = useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const response = await fetch('/api/prospects');
      if (!response.ok) throw new Error('Failed to fetch prospects');
      return response.json();
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchReply();
  };

  // Calculate pipeline metrics - ONLY REAL DATA FROM Winry.AI
  const pipelineMetrics = React.useMemo(() => {
    const prospectStats = {
      totalProspects: stats?.totalProspects || 0,
      completed: stats?.completed || 0,
      processing: stats?.processing || 0,
      failed: stats?.failed || 0
    };

    // REF: Count Winry.AI prospects sent to Reply.io (those with campaign IDs)
    const prospectsArray = prospects || [];
    const prospectsSentToReply = prospectsArray.filter((p: any) => p.sentToReplyioCampaignId && p.sentToReplyioCampaignId !== null).length;

    const replyStats = replyIoData?.statistics || {
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      emailsReplied: 0,
      overallOpenRate: 0,
      overallClickRate: 0,
      overallReplyRate: 0
    };

    // REF: Updated logic - Reply.io is configured if we have accounts OR valid API settings
    // Don't rely solely on statistics API success since it can fail due to rate limits
    const hasConfiguredAccounts = replyIoAccounts?.accounts && replyIoAccounts.accounts.length > 0;
    const hasLegacyApiKey = replyIoSettings?.hasApiKey === true;
    const hasRealReplyData = hasConfiguredAccounts || hasLegacyApiKey || (replyIoData?.success === true);
    
    const selectedCampaign = replyIoData?.statistics?.selectedCampaign;
    const selectedAccount = replyIoData?.statistics?.selectedAccount;
    
    // Calculate pipeline conversion rates based on Winry.AI data
    const researchCompletionRate = prospectStats.totalProspects > 0 
      ? Math.round((prospectStats.completed / prospectStats.totalProspects) * 100) 
      : 0;

    const sentToOutreachRate = prospectStats.completed > 0 && prospectsSentToReply > 0
      ? Math.round((prospectsSentToReply / prospectStats.completed) * 100)
      : 0;

    return {
      // Stage 1: Prospect Upload & Research
      totalUploaded: prospectStats.totalProspects,
      researchCompleted: prospectStats.completed,
      researchCompletionRate,
      
      // Stage 2: Messaging & Sending (Winry.AI data only)
      sentToOutreach: prospectsSentToReply,  // REF: Only count Winry.AI prospects sent to Reply.io
      sentToOutreachRate,
      
      // Stage 3: Outreach Performance (Reply.io campaign performance)
      emailsOpened: replyStats.emailsOpened,
      emailsClicked: replyStats.emailsClicked,
      emailsReplied: replyStats.emailsReplied,
      openRate: replyStats.overallOpenRate,
      clickRate: replyStats.overallClickRate,
      replyRate: replyStats.overallReplyRate,
      
      // Overall pipeline health (Winry.AI prospects only)
      overallConversionRate: prospectStats.totalProspects > 0 && replyStats.emailsReplied > 0
        ? Math.round((replyStats.emailsReplied / prospectStats.totalProspects) * 100 * 100) / 100
        : 0,
      
      // Data source indicators
      hasRealReplyData,
      selectedCampaign,
      selectedAccount,
      dataLevel: replyIoData?.statistics?.dataLevel || 'campaign-specific'
    };
  }, [stats, replyIoData, prospects, replyIoAccounts, replyIoSettings]);

  // Pipeline stage details for modal popup - ONLY REAL DATA
  const pipelineStageDetails = {
    'prospects-uploaded': {
      title: 'Prospects Uploaded',
      icon: Users,
      color: 'purple',
      bgGradient: 'from-purple-500/10 to-transparent',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      metrics: {
        total: pipelineMetrics.totalUploaded,
        completed: pipelineMetrics.researchCompleted,
        processing: stats?.processing || 0,
        failed: stats?.failed || 0,
        completionRate: pipelineMetrics.researchCompletionRate
      },
      insights: [
        `${pipelineMetrics.totalUploaded} total prospects uploaded to the system`,
        `${pipelineMetrics.researchCompleted} prospects completed research phase`,
        `${pipelineMetrics.researchCompletionRate}% completion rate from upload to research`,
        `${stats?.processing || 0} prospects currently being processed`,
        `${stats?.failed || 0} prospects failed processing`
      ],
      recommendations: [
        'Monitor upload quality to maintain high completion rates',
        'Review failed prospects for common patterns',
        'Check processing queue if backlog exists'
      ]
    },
    'research-completed': {
      title: 'Research Completed',
      icon: Brain,
      color: 'blue',
      bgGradient: 'from-blue-500/10 to-transparent',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      metrics: {
        completed: pipelineMetrics.researchCompleted,
        total: pipelineMetrics.totalUploaded,
        completionRate: pipelineMetrics.researchCompletionRate,
        processing: stats?.processing || 0,
        failed: stats?.failed || 0
      },
      insights: [
        `${pipelineMetrics.researchCompleted} prospects have completed AI research`,
        `${pipelineMetrics.researchCompletionRate}% of uploaded prospects completed research`,
        `${stats?.processing || 0} prospects currently in research phase`,
        `${stats?.failed || 0} prospects failed research processing`
      ],
      recommendations: [
        'Ensure AI research pipeline is properly configured',
        'Monitor processing times for optimization',
        'Review failed prospects to improve success rate'
      ]
    },
    'sent-to-outreach': {
      title: 'Sent to Outreach',
      icon: Send,
      color: 'green',
      bgGradient: 'from-green-500/10 to-transparent',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      metrics: {
        sent: pipelineMetrics.sentToOutreach,
        fromResearch: pipelineMetrics.researchCompleted,
        sendRate: pipelineMetrics.sentToOutreachRate,
        selectedCampaign: pipelineMetrics.selectedCampaign?.name || 'No campaign selected',
        selectedAccount: pipelineMetrics.selectedAccount?.name || 'No account selected'
      },
      insights: [
        `${pipelineMetrics.sentToOutreach} Winry.AI prospects sent to Reply.io campaigns`,
        `${pipelineMetrics.sentToOutreachRate}% of research-completed prospects sent to outreach`,
        pipelineMetrics.selectedCampaign ? 
          `Campaign: ${pipelineMetrics.selectedCampaign.name}` : 
          'No default campaign selected',
        pipelineMetrics.selectedAccount ? 
          `Account: ${pipelineMetrics.selectedAccount.name}` : 
          'No Reply.io account configured',
        'Count includes only prospects from your Winry.AI list'
      ],
      recommendations: [
        'Ensure Reply.io integration is properly configured',
        pipelineMetrics.selectedCampaign ? 
          'Monitor campaign performance regularly' : 
          'Select a default campaign in Reply.io settings',
        'Send rate is based on Winry.AI prospects only'
      ]
    },
    'emails-opened': {
      title: 'Emails Opened',
      icon: Eye,
      color: 'yellow',
      bgGradient: 'from-yellow-500/10 to-transparent',
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      metrics: {
        opened: pipelineMetrics.emailsOpened,
        clicked: pipelineMetrics.emailsClicked,
        sent: pipelineMetrics.sentToOutreach,
        openRate: pipelineMetrics.openRate,
        clickRate: pipelineMetrics.clickRate,
        clickToOpenRate: pipelineMetrics.emailsOpened > 0 ? Math.round((pipelineMetrics.emailsClicked / pipelineMetrics.emailsOpened) * 100) : 0
      },
      insights: [
        `${pipelineMetrics.emailsOpened} emails opened by prospects`,
        `${pipelineMetrics.openRate}% overall open rate`,
        `${pipelineMetrics.emailsOpened > 0 ? Math.round((pipelineMetrics.emailsClicked / pipelineMetrics.emailsOpened) * 100) : 0}% click-to-open rate`,
        'Tracking engagement for selected campaign'
      ],
      recommendations: [
        'Optimize email content for higher engagement',
        'Test different call-to-action placements',
        'Monitor click patterns for insights'
      ]
    },
    'responses-received': {
      title: 'Responses Received',
      icon: Reply,
      color: 'red',
      bgGradient: 'from-red-500/10 to-transparent',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      metrics: {
        responses: pipelineMetrics.emailsReplied,
        sent: pipelineMetrics.sentToOutreach,
        replyRate: pipelineMetrics.replyRate,
        overallConversion: pipelineMetrics.overallConversionRate
      },
      insights: [
        `${pipelineMetrics.emailsReplied} responses received from prospects`,
        `${pipelineMetrics.replyRate}% overall reply rate`,
        `${pipelineMetrics.overallConversionRate}% end-to-end conversion rate`
      ],
      recommendations: [
        'Follow up on responses promptly',
        'Analyze response content for insights',
        'Use response data to improve future campaigns'
      ]
    }
  };

  // Pipeline funnel data for visualization - REAL DATA ONLY
  const pipelineFunnelData = [
    { 
      stage: 'Prospects Uploaded', 
      value: pipelineMetrics.totalUploaded, 
      color: PIPELINE_COLORS.prospects,
      percentage: 100
    },
    { 
      stage: 'Research Completed', 
      value: pipelineMetrics.researchCompleted, 
      color: PIPELINE_COLORS.research,
      percentage: pipelineMetrics.researchCompletionRate
    },
    { 
      stage: 'Sent to Outreach', 
      value: pipelineMetrics.sentToOutreach, 
      color: PIPELINE_COLORS.messaging,
      percentage: pipelineMetrics.sentToOutreachRate
    },
    { 
      stage: 'Emails Opened', 
      value: pipelineMetrics.emailsOpened, 
      color: PIPELINE_COLORS.outreach,
      percentage: pipelineMetrics.openRate
    },
    { 
      stage: 'Responses Received', 
      value: pipelineMetrics.emailsReplied, 
      color: PIPELINE_COLORS.responses,
      percentage: pipelineMetrics.replyRate
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header with Pipeline Status - Mobile Optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Sales Intelligence Pipeline</h2>
          <p className="text-sm md:text-base text-muted-foreground">Complete prospect journey from upload to response</p>
          {pipelineMetrics.selectedAccount && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  Account: {pipelineMetrics.selectedAccount.name}
                </Badge>
              </div>
              {pipelineMetrics.selectedCampaign && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                    Campaign: {pipelineMetrics.selectedCampaign.name}
                  </Badge>
                </div>
              )}
              {pipelineMetrics.dataLevel === 'campaign-specific' && (
                <span className="text-muted-foreground text-xs">
                  (Showing data for selected campaign only)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs sm:text-sm">
            <Activity className="w-3 h-3 mr-1" />
            {pipelineMetrics.overallConversionRate}% End-to-End
          </Badge>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="text-xs sm:text-sm">
            <RefreshCw className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Hero Pipeline Metrics - Mobile Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        {/* Stage 1: Prospects Uploaded */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="sm:col-span-1"
        >
          <Card 
            className="command-card hero-metric-card relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedPipelineStage('prospects-uploaded')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardContent className="p-4 md:p-6 relative">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-xl bg-purple-500/20">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground min-h-[2rem] md:min-h-[2.5rem] flex items-center">Prospects Uploaded</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pipelineMetrics.totalUploaded}</p>
                <p className="text-xs text-muted-foreground">Starting pipeline</p>
                <p className="text-xs text-transparent hidden md:block">.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stage 2: Research Completed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="sm:col-span-1"
        >
          <Card 
            className="command-card hero-metric-card relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedPipelineStage('research-completed')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardContent className="p-4 md:p-6 relative">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-xl bg-blue-500/20">
                  <Brain className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground min-h-[2rem] md:min-h-[2.5rem] flex items-center">Research Completed</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pipelineMetrics.researchCompleted}</p>
                <p className="text-xs text-blue-400">{pipelineMetrics.researchCompletionRate}% completion rate</p>
                <p className="text-xs text-transparent hidden md:block">.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stage 3: Sent to Outreach */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="sm:col-span-2 lg:col-span-1"
        >
          <Card 
            className="command-card hero-metric-card relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedPipelineStage('sent-to-outreach')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardContent className="p-4 md:p-6 relative">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-xl bg-green-500/20">
                  <Send className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground min-h-[2rem] md:min-h-[2.5rem] flex items-center">Sent to Outreach</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pipelineMetrics.sentToOutreach}</p>
                <p className="text-xs text-green-400">{pipelineMetrics.openRate}% open rate</p>
                <p className="text-xs text-transparent hidden md:block">.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stage 4: Emails Opened */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="sm:col-span-1"
        >
          <Card 
            className="command-card hero-metric-card relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedPipelineStage('emails-opened')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
            <CardContent className="p-4 md:p-6 relative">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-xl bg-yellow-500/20">
                  <Eye className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                </div>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground min-h-[2rem] md:min-h-[2.5rem] flex items-center">Emails Opened</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pipelineMetrics.emailsOpened}</p>
                <p className="text-xs text-yellow-400">{pipelineMetrics.openRate}% open rate</p>
                <p className="text-xs text-transparent hidden md:block">.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stage 5: Responses Received */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="sm:col-span-1"
        >
          <Card 
            className="command-card hero-metric-card relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedPipelineStage('responses-received')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <CardContent className="p-4 md:p-6 relative">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-xl bg-red-500/20">
                  <Reply className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                </div>
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground min-h-[2rem] md:min-h-[2.5rem] flex items-center">Responses Received</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pipelineMetrics.emailsReplied}</p>
                <p className="text-xs text-red-400">{pipelineMetrics.replyRate}% reply rate</p>
                <p className="text-xs text-transparent hidden md:block">.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Pipeline Analytics */}
      <div className="grid grid-cols-1 gap-6">
        <EnhancedAnalytics className="command-card" />
      </div>

      {/* Performance Insights */}
      <Card className="command-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Award className="w-5 h-5" />
            Pipeline Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Research Efficiency */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                <h4 className="font-semibold text-foreground">Research Efficiency</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="text-foreground">{pipelineMetrics.researchCompletionRate}%</span>
                </div>
                <div className="w-full bg-hsl(var(--surface-elevated)) rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pipelineMetrics.researchCompletionRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.processing > 0 ? `${stats.processing} prospects currently processing` : 'All research complete'}
                </p>
              </div>
            </div>

            {/* Outreach Performance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-green-400" />
                <h4 className="font-semibold text-foreground">Outreach Performance</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open Rate</span>
                  <span className="text-foreground">{pipelineMetrics.openRate}%</span>
                </div>
                <div className="w-full bg-hsl(var(--surface-elevated)) rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pipelineMetrics.openRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {pipelineMetrics.clickRate}% click rate, {pipelineMetrics.replyRate}% reply rate
                </p>
              </div>
            </div>

            {/* Overall Conversion */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                <h4 className="font-semibold text-foreground">End-to-End Conversion</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Upload to Response</span>
                  <span className="text-foreground">{pipelineMetrics.overallConversionRate}%</span>
                </div>
                <div className="w-full bg-hsl(var(--surface-elevated)) rounded-full h-2">
                  <div 
                    className="bg-purple-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pipelineMetrics.overallConversionRate * 10, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {pipelineMetrics.emailsReplied} qualified responses from {pipelineMetrics.totalUploaded} prospects
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Pipeline Status */}
      {(stats?.processing > 0 || replyLoading) && (
        <Card className="command-card border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
              <div>
                <h4 className="font-semibold text-foreground">Pipeline Activity</h4>
                <p className="text-sm text-muted-foreground">
                  {stats?.processing > 0 && `${stats.processing} prospects currently being researched`}
                  {replyLoading && ' • Updating outreach statistics'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Status */}
      <Card className="command-card border-blue-500/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground mb-3 text-base md:text-lg">Data Configuration</h4>
              <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-muted-foreground">Winry.AI Database: <span className="text-green-400">Connected</span></span>
                </div>
                <div className="flex items-center gap-2">
                  {pipelineMetrics.hasRealReplyData ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-muted-foreground">Reply.io Integration: <span className="text-green-400">Connected</span></span>
                    </>
                  ) : (
                    <>
                      {/* REF: Check if we have accounts configured but API is failing (rate limits) */}
                      {(replyIoAccounts?.accounts && replyIoAccounts.accounts.length > 0) || replyIoSettings?.hasApiKey ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-muted-foreground">Reply.io Integration: <span className="text-yellow-400">API Rate Limited</span></span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-muted-foreground">Reply.io Integration: <span className="text-yellow-400">Not Configured</span></span>
                        </>
                      )}
                    </>
                  )}
                </div>
                {pipelineMetrics.selectedAccount && (
                  <div className="flex items-center gap-2 ml-6">
                    <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Account: {pipelineMetrics.selectedAccount.name}</span>
                  </div>
                )}
                {pipelineMetrics.selectedCampaign && (
                  <div className="flex items-center gap-2 ml-6">
                    <Send className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">Default Campaign: {pipelineMetrics.selectedCampaign.name}</span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    {pipelineMetrics.dataLevel === 'campaign-specific' 
                      ? `Showing data filtered by campaign: ${pipelineMetrics.selectedCampaign?.name || 'None'}`
                      : 'Showing all prospect data across all campaigns'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-right flex-shrink-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">
                {pipelineMetrics.hasRealReplyData ? '✓' : '⚠️'}
              </div>
              <div className="text-xs text-muted-foreground">
                {pipelineMetrics.hasRealReplyData ? 'Live Data' : 'Setup Required'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stage Details Modal */}
      <Dialog open={selectedPipelineStage !== null} onOpenChange={() => setSelectedPipelineStage(null)}>
        <DialogContent className="max-w-6xl md:max-h-[90vh] max-h-[95vh] overflow-y-auto bg-card mx-4 md:mx-auto">
          {selectedPipelineStage && selectedPipelineStage in pipelineStageDetails && (
            <>
              <DialogHeader className="sticky top-0 bg-card z-10 pb-4 border-b border-border/50">
                <DialogTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl">
                  {React.createElement(pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].icon, {
                    className: `w-6 h-6 md:w-8 md:h-8 ${pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].iconColor}`
                  })}
                  <span className="truncate">
                    {pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].title} - 
                    <span className="hidden sm:inline"> Advanced Analytics</span>
                    <span className="sm:hidden"> Analytics</span>
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 md:space-y-6 pt-4">
                {/* Modal Content Based on Stage - ONLY REAL DATA */}
                {selectedPipelineStage === 'prospects-uploaded' && (
                  <div className="space-y-4 md:space-y-6">
                    {/* Core Metrics - Mobile Responsive Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Uploaded</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.total}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                        <p className="text-lg md:text-2xl font-bold text-green-400">{pipelineStageDetails[selectedPipelineStage].metrics.completed}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Processing</p>
                        <p className="text-lg md:text-2xl font-bold text-blue-400">{pipelineStageDetails[selectedPipelineStage].metrics.processing}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Failed</p>
                        <p className="text-lg md:text-2xl font-bold text-red-400">{pipelineStageDetails[selectedPipelineStage].metrics.failed}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border col-span-2 lg:col-span-1">
                        <p className="text-xs md:text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.completionRate}%</p>
                      </div>
                    </div>

                    {/* Simple Progress Visualization */}
                    <Card>
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="text-base md:text-lg">Processing Status</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 md:space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-xs md:text-sm">Completed</span>
                              <span className="text-xs md:text-sm font-medium">{pipelineStageDetails[selectedPipelineStage].metrics.completed}/{pipelineStageDetails[selectedPipelineStage].metrics.total}</span>
                            </div>
                            <Progress value={pipelineStageDetails[selectedPipelineStage].metrics.completionRate} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedPipelineStage === 'research-completed' && (
                  <div className="space-y-4 md:space-y-6">
                    {/* Core Metrics - Mobile Responsive */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                        <p className="text-lg md:text-2xl font-bold text-green-400">{pipelineStageDetails[selectedPipelineStage].metrics.completed}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Prospects</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.total}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.completionRate}%</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Processing</p>
                        <p className="text-lg md:text-2xl font-bold text-blue-400">{pipelineStageDetails[selectedPipelineStage].metrics.processing}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Failed</p>
                        <p className="text-lg md:text-2xl font-bold text-red-400">{pipelineStageDetails[selectedPipelineStage].metrics.failed}</p>
                      </div>
                    </div>

                    {/* Research Status Breakdown */}
                    <Card>
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="text-base md:text-lg">Research Pipeline Status</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 md:space-y-4">
                          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                              <span className="text-xs md:text-sm">Research Completed</span>
                            </span>
                            <span className="font-bold text-sm md:text-base">{pipelineStageDetails[selectedPipelineStage].metrics.completed}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                              <span className="text-xs md:text-sm">Currently Processing</span>
                            </span>
                            <span className="font-bold text-sm md:text-base">{pipelineStageDetails[selectedPipelineStage].metrics.processing}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                              <span className="text-xs md:text-sm">Failed Processing</span>
                            </span>
                            <span className="font-bold text-sm md:text-base">{pipelineStageDetails[selectedPipelineStage].metrics.failed}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedPipelineStage === 'sent-to-outreach' && (
                  <div className="space-y-4 md:space-y-6">
                    {/* Core Metrics - Mobile Responsive */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Sent to Reply.io</p>
                        <p className="text-lg md:text-2xl font-bold text-green-400">{pipelineStageDetails[selectedPipelineStage].metrics.sent}</p>
                        <p className="text-xs text-muted-foreground">Winry.AI prospects only</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">From Research</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.fromResearch}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Send Rate</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.sendRate}%</p>
                      </div>
                    </div>

                    {/* Campaign Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Reply.io Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-card rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Selected Account</p>
                          <p className="font-medium">{pipelineStageDetails[selectedPipelineStage].metrics.selectedAccount}</p>
                        </div>
                        <div className="p-4 bg-card rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Selected Campaign</p>
                          <p className="font-medium">{pipelineStageDetails[selectedPipelineStage].metrics.selectedCampaign}</p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <p className="text-sm text-blue-400 mb-1">Data Source</p>
                          <p className="text-sm text-muted-foreground">
                            Count shows only prospects from your Winry.AI list that have been sent to Reply.io. 
                            This ensures pipeline accuracy and matches your prospect table.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedPipelineStage === 'emails-opened' && (
                  <div className="space-y-4 md:space-y-6">
                    {/* Core Metrics - Mobile Responsive */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Opened</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.opened}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Sent</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.sent}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Open Rate</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.openRate}%</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Click Rate</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.clickRate}%</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border col-span-2 lg:col-span-1">
                        <p className="text-xs md:text-sm text-muted-foreground">Click-to-Open</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.clickToOpenRate}%</p>
                      </div>
                    </div>

                    {/* Engagement Funnel */}
                    <Card>
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="text-base md:text-lg">Email Engagement Funnel</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 md:space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-xs md:text-sm">Emails Sent</span>
                              <span className="text-xs md:text-sm font-medium">{pipelineStageDetails[selectedPipelineStage].metrics.sent}</span>
                            </div>
                            <Progress value={100} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-xs md:text-sm">Emails Opened</span>
                              <span className="text-xs md:text-sm font-medium">{pipelineStageDetails[selectedPipelineStage].metrics.opened}</span>
                            </div>
                            <Progress value={pipelineStageDetails[selectedPipelineStage].metrics.sent > 0 ? (pipelineStageDetails[selectedPipelineStage].metrics.opened / pipelineStageDetails[selectedPipelineStage].metrics.sent) * 100 : 0} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-xs md:text-sm">Links Clicked</span>
                              <span className="text-xs md:text-sm font-medium">{pipelineStageDetails[selectedPipelineStage].metrics.clicked}</span>
                            </div>
                            <Progress value={pipelineStageDetails[selectedPipelineStage].metrics.sent > 0 ? (pipelineStageDetails[selectedPipelineStage].metrics.clicked / pipelineStageDetails[selectedPipelineStage].metrics.sent) * 100 : 0} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedPipelineStage === 'responses-received' && (
                  <div className="space-y-4 md:space-y-6">
                    {/* Core Metrics - Mobile Responsive */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Responses</p>
                        <p className="text-lg md:text-2xl font-bold text-red-400">{pipelineStageDetails[selectedPipelineStage].metrics.responses}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Emails Sent</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.sent}</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border">
                        <p className="text-xs md:text-sm text-muted-foreground">Reply Rate</p>
                        <p className="text-lg md:text-2xl font-bold">{pipelineStageDetails[selectedPipelineStage].metrics.replyRate}%</p>
                      </div>
                      <div className="bg-card p-3 md:p-4 rounded-lg border col-span-2 lg:col-span-1">
                        <p className="text-xs md:text-sm text-muted-foreground">Overall Conversion</p>
                        <p className="text-lg md:text-2xl font-bold text-green-400">{pipelineStageDetails[selectedPipelineStage].metrics.overallConversion}%</p>
                      </div>
                    </div>

                    {/* Conversion Summary */}
                    <Card>
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="text-base md:text-lg">End-to-End Conversion</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 md:space-y-4">
                          <div className="text-center p-4 md:p-6 bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-lg">
                            <p className="text-2xl md:text-3xl font-bold mb-2">{pipelineStageDetails[selectedPipelineStage].metrics.overallConversion}%</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {pipelineStageDetails[selectedPipelineStage].metrics.responses} responses from {pipelineMetrics.totalUploaded} prospects
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Insights and Recommendations - Mobile Responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
                  <Card>
                    <CardHeader className="pb-3 md:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2 md:space-y-3">
                        {pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-xs md:text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3 md:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2 md:space-y-3">
                        {pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-xs md:text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Badge variant="outline" className={pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].iconBg}>
                      {pipelineStageDetails[selectedPipelineStage as keyof typeof pipelineStageDetails].title}
                    </Badge>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Last updated: {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedPipelineStage(null)} className="flex-1 sm:flex-none text-xs sm:text-sm">
                      Close
                    </Button>
                    <Button onClick={handleRefresh} className="flex-1 sm:flex-none text-xs sm:text-sm">
                      <RefreshCw className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Refresh Data</span>
                      <span className="sm:hidden">Refresh</span>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 