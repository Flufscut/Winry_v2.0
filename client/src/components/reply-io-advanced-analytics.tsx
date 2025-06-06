/**
 * FILE: reply-io-advanced-analytics.tsx
 * PURPOSE: Advanced Reply.io analytics dashboard with enhanced features
 * DEPENDENCIES: React, React Query, Charts, UI components
 * LAST_UPDATED: Current date
 * 
 * REF: This component provides advanced Reply.io analytics features including:
 * - Campaign performance analytics with conversion scoring
 * - Automated optimization recommendations
 * - Bulk campaign performance reports
 * - Enhanced error handling and caching
 * 
 * MAIN_FEATURES:
 * - Advanced analytics visualization
 * - Campaign optimization insights
 * - Performance benchmarking
 * - Actionable recommendations
 */

import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Target, Award, AlertTriangle, 
  BarChart3, Activity, Lightbulb, RefreshCw, Clock, Users, 
  Mail, Reply, CheckCircle2, Database
} from "lucide-react";

// REF: Interface for advanced analytics data
interface AdvancedAnalytics {
  campaignPerformance: {
    topPerformingCampaigns: Array<{
      id: number;
      name: string;
      openRate: number;
      replyRate: number;
      conversionScore: number;
    }>;
    underperformingCampaigns: Array<{
      id: number;
      name: string;
      openRate: number;
      replyRate: number;
      improvementSuggestions: string[];
    }>;
  };
  timeBasedAnalytics: {
    bestSendTimes: {
      hourOfDay: number[];
      dayOfWeek: number[];
    };
    responsePatterns: {
      averageResponseTime: number;
      responseTimeDistribution: Record<string, number>;
    };
  };
  audienceInsights: {
    mostEngagedIndustries: string[];
    highValueProspectProfiles: Array<{
      title: string;
      industry: string;
      engagementRate: number;
    }>;
  };
}

// REF: Interface for optimization recommendations
interface OptimizationRecommendations {
  campaignId: number;
  campaignName: string;
  currentPerformance: any;
  industryBenchmarks: any;
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    action: string;
  }>;
  optimizationScore: number;
}

// REF: Interface for performance report
interface PerformanceReport {
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalContacts: number;
    totalDeliveries: number;
    totalOpens: number;
    totalReplies: number;
    overallOpenRate: number;
    overallReplyRate: number;
    overallBounceRate: number;
  };
  topCampaigns: Array<{
    id: number;
    name: string;
    status: string;
    contacts: number;
    deliveries: number;
    opens: number;
    replies: number;
    openRate: number;
    replyRate: number;
  }>;
  allCampaigns: Array<any>;
  generatedAt: string;
}

export function ReplyIoAdvancedAnalytics() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [forceDemoMode, setForceDemoMode] = useState(false);

  // REF: Fetch Reply.io accounts to check if any are configured
  const { data: replyIoAccounts } = useQuery({
    queryKey: ['replyIoAccounts'],
    queryFn: async () => {
      const response = await fetch('/api/reply-io/accounts');
      if (!response.ok) throw new Error('Failed to fetch Reply.io accounts');
      return response.json();
    },
  });

  // REF: Fetch Reply.io settings for legacy API key check
  const { data: replyIoSettings } = useQuery({
    queryKey: ['replyIoSettings'],
    queryFn: async () => {
      const response = await fetch('/api/reply-io/settings');
      if (!response.ok) throw new Error('Failed to fetch Reply.io settings');
      return response.json();
    },
  });

  // REF: Fetch advanced analytics data
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<{
    success: boolean;
    analytics: AdvancedAnalytics;
    accountName: string;
    lastUpdated: string;
  }>({
    queryKey: ["/api/reply-io/analytics/advanced"],
    retry: false,
  });

  // REF: Fetch performance report
  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useQuery<{
    success: boolean;
    report: PerformanceReport;
    accountName: string;
  }>({
    queryKey: ["/api/reply-io/analytics/performance-report"],
    retry: false,
  });

  // REF: Fetch optimization recommendations for selected campaign
  const { data: optimizationData, isLoading: optimizationLoading } = useQuery<{
    success: boolean;
    recommendations: OptimizationRecommendations;
    accountName: string;
    lastUpdated: string;
  }>({
    queryKey: ["/api/reply-io/campaigns", selectedCampaignId, "optimization"],
    retry: false,
    enabled: !!selectedCampaignId,
  });

  // REF: Handle refresh all data
  const handleRefreshAll = () => {
    refetchAnalytics();
    refetchReport();
  };

  // REF: Get priority color for recommendations
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  // REF: Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // REF: Format day of week
  const formatDayOfWeek = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || `Day ${day}`;
  };

  // REF: Format hour
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // REF: Check if Reply.io is configured before showing "not configured"
  const hasConfiguredAccounts = replyIoAccounts?.accounts && replyIoAccounts.accounts.length > 0;
  const hasLegacyApiKey = replyIoSettings?.hasApiKey === true;
  const isReplyIoConfigured = hasConfiguredAccounts || hasLegacyApiKey;

  // REF: Development mode - show mock data when API is rate limited OR when forced by user
  const isDevelopmentMode = import.meta.env.DEV;
  const shouldShowMockData = isDevelopmentMode && ((forceDemoMode) || ((!analyticsData?.success && !reportData?.success) && isReplyIoConfigured));

  // REF: Mock data for development when API is rate limited
  const mockAnalyticsData = shouldShowMockData ? {
    success: true,
    analytics: {
      campaignPerformance: {
        topPerformingCampaigns: [
          { id: 1, name: "Kneecap AI Sequence", openRate: 45.2, replyRate: 12.8, conversionScore: 8.7 },
          { id: 2, name: "Default Sequence Test", openRate: 38.1, replyRate: 9.4, conversionScore: 7.2 },
          { id: 3, name: "Example Sequence", openRate: 31.5, replyRate: 7.8, conversionScore: 6.1 }
        ],
        underperformingCampaigns: [
          { 
            id: 4, 
            name: "Old Campaign", 
            openRate: 18.3, 
            replyRate: 2.1, 
            improvementSuggestions: ["Update subject lines", "Improve personalization", "Better timing"]
          }
        ]
      },
      timeBasedAnalytics: {
        bestSendTimes: {
          hourOfDay: [9, 10, 14, 15],
          dayOfWeek: [1, 2, 3, 4]
        },
        responsePatterns: {
          averageResponseTime: 4.2,
          responseTimeDistribution: {
            "< 1 hour": 15,
            "1-4 hours": 35,
            "4-24 hours": 30,
            "1-3 days": 15,
            "> 3 days": 5
          }
        }
      },
      audienceInsights: {
        mostEngagedIndustries: ["Technology", "Healthcare", "Finance"],
        highValueProspectProfiles: [
          { title: "CEO", industry: "Technology", engagementRate: 23.4 },
          { title: "VP Sales", industry: "Healthcare", engagementRate: 19.8 },
          { title: "Director", industry: "Finance", engagementRate: 16.2 }
        ]
      }
    },
    accountName: "Sales Leopard - David (DEMO MODE)",
    lastUpdated: new Date().toISOString()
  } : analyticsData;

  const mockReportData = shouldShowMockData ? {
    success: true,
    report: {
      summary: {
        totalCampaigns: 4,
        activeCampaigns: 3,
        totalContacts: 2847,
        totalDeliveries: 2691,
        totalOpens: 1129,
        totalReplies: 287,
        overallOpenRate: 41.9,
        overallReplyRate: 10.7,
        overallBounceRate: 5.5
      },
      topCampaigns: [
        {
          id: 1420669,
          name: "Kneecap AI Sequence",
          status: "active",
          contacts: 1245,
          deliveries: 1189,
          opens: 537,
          replies: 152,
          openRate: 45.2,
          replyRate: 12.8
        },
        {
          id: 1420670,
          name: "Default Sequence Test",
          status: "active", 
          contacts: 892,
          deliveries: 847,
          opens: 323,
          replies: 80,
          openRate: 38.1,
          replyRate: 9.4
        },
        {
          id: 1420671,
          name: "Example Sequence",
          status: "paused",
          contacts: 710,
          deliveries: 655,
          opens: 206,
          replies: 51,
          openRate: 31.5,
          replyRate: 7.8
        }
      ],
      allCampaigns: [],
      generatedAt: new Date().toISOString()
    },
    accountName: "Sales Leopard - David (DEMO MODE)"
  } : reportData;

  // REF: Use mock data when appropriate
  const displayAnalyticsData = mockAnalyticsData;
  const displayReportData = mockReportData;

  // REF: Show loading state while initial data is loading
  if (analyticsLoading || reportLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <BarChart3 className="w-6 h-6 text-primary absolute top-3 left-3" />
            </div>
            <p className="text-muted-foreground animate-pulse">Loading advanced analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // REF: Show appropriate error message based on configuration status
  if (!displayAnalyticsData?.success && !displayReportData?.success) {
    return (
      <div className="p-6">
        <Card className={`border-amber-500/20 bg-amber-500/5 ${!isReplyIoConfigured ? 'border-red-500/20 bg-red-500/5' : ''}`}>
          <CardContent className="p-6 text-center">
            <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${!isReplyIoConfigured ? 'text-red-500' : 'text-amber-500'}`} />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isReplyIoConfigured ? "Reply.io API Rate Limited" : "No Reply.io Account"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isReplyIoConfigured 
                ? "Reply.io API is temporarily rate limited. Analytics will be available once the rate limit resets."
                : "Configure a Reply.io account to access advanced analytics features."
              }
            </p>
            <div className="space-y-2">
              <Button variant="outline" onClick={handleRefreshAll}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              {isReplyIoConfigured && (
                <div className="text-xs text-muted-foreground">
                  {hasConfiguredAccounts && (
                    <p>✅ Account configured: {replyIoAccounts.accounts[0]?.name}</p>
                  )}
                  <p>Rate limits typically reset within 15-60 minutes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Advanced Reply.io Analytics</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Campaign optimization insights and performance analytics
          </p>
          {displayAnalyticsData?.accountName && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                Account: {displayAnalyticsData.accountName}
              </Badge>
              {shouldShowMockData && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  🚧 Demo Mode - API Rate Limited
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {isDevelopmentMode && isReplyIoConfigured && (
            <Button 
              variant={forceDemoMode ? "default" : "outline"} 
              onClick={() => setForceDemoMode(!forceDemoMode)}
              className={forceDemoMode ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              <Database className="w-4 h-4 mr-2" />
              {forceDemoMode ? "Demo Mode" : "Use Demo"}
            </Button>
          )}
          <Button variant="outline" onClick={handleRefreshAll} disabled={analyticsLoading || reportLoading || forceDemoMode}>
            <RefreshCw className={`w-4 h-4 mr-2 ${(analyticsLoading || reportLoading) ? 'animate-spin' : ''}`} />
            {forceDemoMode ? "Demo Active" : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* Main Analytics Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights & Tips
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {displayReportData?.success && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-600/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Active Campaigns</p>
                          <p className="text-2xl font-bold text-foreground">
                            {displayReportData.report.summary.activeCampaigns}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            of {displayReportData.report.summary.totalCampaigns} total
                          </p>
                        </div>
                        <Activity className="w-8 h-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-600/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Contacts</p>
                          <p className="text-2xl font-bold text-foreground">
                            {displayReportData.report.summary.totalContacts.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {displayReportData.report.summary.totalDeliveries.toLocaleString()} delivered
                          </p>
                        </div>
                        <Users className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-600/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Overall Open Rate</p>
                          <p className="text-2xl font-bold text-foreground">
                            {displayReportData.report.summary.overallOpenRate}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {displayReportData.report.summary.totalOpens.toLocaleString()} opens
                          </p>
                        </div>
                        <Mail className="w-8 h-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-600/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Overall Reply Rate</p>
                          <p className="text-2xl font-bold text-foreground">
                            {displayReportData.report.summary.overallReplyRate}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {displayReportData.report.summary.totalReplies.toLocaleString()} replies
                          </p>
                        </div>
                        <Reply className="w-8 h-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Top Performing Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Top Performing Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {displayReportData.report.topCampaigns.slice(0, 5).map((campaign, index) => (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50 hover:bg-background/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedCampaignId(campaign.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                            index === 1 ? 'bg-gray-500/20 text-gray-600' :
                            index === 2 ? 'bg-orange-500/20 text-orange-600' :
                            'bg-blue-500/20 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.contacts} contacts • {campaign.deliveries} delivered
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-sm font-medium text-foreground">{campaign.openRate}% opens</p>
                            <p className="text-xs text-muted-foreground">{campaign.opens} total</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{campaign.replyRate}% replies</p>
                            <p className="text-xs text-muted-foreground">{campaign.replies} total</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Target className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {displayAnalyticsData?.success && (
            <>
              {/* Audience Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Audience Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Most Engaged Industries</h4>
                      <div className="space-y-2">
                        {displayAnalyticsData.analytics.audienceInsights.mostEngagedIndustries.map((industry, index) => (
                          <div key={industry} className="flex items-center gap-3 p-2 bg-green-500/5 rounded border border-green-500/20">
                            <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">{industry}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-3">High-Value Prospect Profiles</h4>
                      <div className="space-y-3">
                        {displayAnalyticsData.analytics.audienceInsights.highValueProspectProfiles.map((profile, index) => (
                          <div key={index} className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground">{profile.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {profile.engagementRate}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{profile.industry}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Response Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Response Time</p>
                      <p className="text-2xl font-bold text-foreground">
                        {displayAnalyticsData.analytics.timeBasedAnalytics.responsePatterns.averageResponseTime} hours
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Response Time Distribution</p>
                      <div className="space-y-2">
                        {Object.entries(displayAnalyticsData.analytics.timeBasedAnalytics.responsePatterns.responseTimeDistribution).map(([timeframe, percentage]) => (
                          <div key={timeframe} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                            <span className="text-sm capitalize">{timeframe.replace('_', ' ')}</span>
                            <Badge variant="secondary">{percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 