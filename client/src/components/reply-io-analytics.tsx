/**
 * FILE: outreach-analytics.tsx
 * PURPOSE: Display outreach campaign statistics and analytics
 * CONTEXT: Multi-tenant SaaS platform component
 * LAST_UPDATED: June 9, 2025
 * 
 * REF: Integrates with outreach platform API to show campaign performance
 * in a white-labeled interface that abstracts service-specific references
 * 
 * MAIN_FUNCTIONS:
 * - OverallStatsDisplay: Overall outreach performance metrics
 * - CampaignsOverview: Campaign-specific statistics and management
 * - Error handling for API rate limiting and connectivity issues
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  Mail, Users, MousePointer, Reply, AlertTriangle, TrendingUp, 
  Eye, RefreshCw, Calendar, Target, Award, Activity
} from "lucide-react";

interface ReplyIoCampaign {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ReplyIoCampaignStats {
  campaignId: number;
  campaignName: string;
  totalContacts: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  emailsBounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  lastActivity?: string;
}

interface OverallStats {
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
  campaigns: ReplyIoCampaignStats[];
}

interface ApiResponse {
  success: boolean;
  statistics?: OverallStats;
  campaigns?: ReplyIoCampaign[];
  message?: string;
  error?: string;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export function ReplyIoAnalytics() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch overall Reply.io statistics - OPTIMIZED FOR RATE LIMITING
  const { data: overallStats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery<ApiResponse>({
    queryKey: ["/api/reply-io/statistics", refreshKey],
    queryFn: async () => {
      console.log('[REPLY.IO ANALYTICS] Fetching overall statistics...');
      const response = await fetch('/api/reply-io/statistics');
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Reply.io API rate limit reached. Please try again later.');
        }
        throw new Error(`Failed to fetch Reply.io statistics: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[REPLY.IO ANALYTICS] Statistics result:', result);
      return result;
    },
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error?.message?.includes('rate limit')) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: true,
    staleTime: 30 * 60 * 1000, // 30 minutes - reduced to prevent rate limiting
    refetchInterval: false, // Disable auto-refresh
  });

  // Fetch all campaigns - OPTIMIZED FOR RATE LIMITING
  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } = useQuery<ApiResponse>({
    queryKey: ["/api/reply-io/campaigns", refreshKey],
    queryFn: async () => {
      console.log('[REPLY.IO ANALYTICS] Fetching campaigns...');
      const response = await fetch('/api/reply-io/campaigns');
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Reply.io API rate limit reached. Please try again later.');
        }
        throw new Error(`Failed to fetch Reply.io campaigns: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[REPLY.IO ANALYTICS] Campaigns result:', result);
      return result;
    },
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error?.message?.includes('rate limit')) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: true,
    staleTime: 60 * 60 * 1000, // 1 hour - campaigns change very rarely
    refetchInterval: false, // Disable auto-refresh
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchStats();
  };

  // Handle rate limit and other errors
  const isRateLimited = statsError?.message?.includes('rate limit') || campaignsError?.message?.includes('rate limit');
  const hasApiError = !!(statsError || campaignsError);

  if (statsLoading || campaignsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">Outreach Campaign Analytics</h3>
          <Button disabled variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="command-card h-32 animate-pulse bg-gray-200/10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Rate limit error handling
  if (isRateLimited) {
    return (
      <Card className="command-card">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Outreach API Rate Limited</h3>
          <p className="text-white/90 text-sm">
            Outreach API is temporarily rate limited. Analytics will be available once the rate limit resets.
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Account configured: Test</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Rate limits typically reset within 15-60 minutes
          </p>
        </CardContent>
      </Card>
    );
  }

  // Other API errors
  if (hasApiError && !isRateLimited) {
    return (
      <Card className="command-card">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">API Error</h3>
          <p className="text-muted-foreground mb-4">
            {statsError?.message || campaignsError?.message || 'Failed to fetch outreach data'}
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!overallStats?.success || !overallStats.statistics) {
    return (
      <Card className="command-card">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Outreach Not Connected</h3>
          <p className="text-white/90 text-sm">
            Configure your outreach API key in settings to view campaign analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = overallStats.statistics;
  const campaigns = campaignsData?.campaigns || [];

  // Prepare chart data
  const campaignPerformanceData = stats.campaigns.map((campaign) => ({
    name: campaign.campaignName.substring(0, 20) + (campaign.campaignName.length > 20 ? '...' : ''),
    opens: campaign.openRate,
    clicks: campaign.clickRate,
    replies: campaign.replyRate,
    bounces: campaign.bounceRate,
  }));

  const pieData = [
    { name: 'Opened', value: stats.emailsOpened, color: COLORS[0] },
    { name: 'Clicked', value: stats.emailsClicked, color: COLORS[1] },
    { name: 'Replied', value: stats.emailsReplied, color: COLORS[2] },
    { name: 'Bounced', value: stats.emailsBounced, color: COLORS[3] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Outreach Campaign Analytics</h3>
          <p className="text-muted-foreground">Track your email campaign performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48 bg-hsl(var(--surface-elevated)) border-hsl(var(--border))">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign: ReplyIoCampaign) => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="command-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="text-3xl font-bold text-white">{stats.totalCampaigns}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="command-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                  <p className="text-3xl font-bold text-white">{stats.emailsSent.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="command-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-3xl font-bold text-green-400">{stats.overallOpenRate}%</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Eye className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="command-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reply Rate</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats.overallReplyRate}%</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/20">
                  <Reply className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Performance Bar Chart */}
        <Card className="command-card">
          <CardHeader>
            <CardTitle className="text-white">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--surface-elevated))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'white'
                  }} 
                />
                <Bar dataKey="opens" fill={COLORS[0]} name="Open Rate %" />
                <Bar dataKey="clicks" fill={COLORS[1]} name="Click Rate %" />
                <Bar dataKey="replies" fill={COLORS[2]} name="Reply Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Email Status Distribution Pie Chart */}
        <Card className="command-card">
          <CardHeader>
            <CardTitle className="text-white">Email Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--surface-elevated))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'white'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details Table */}
      <Card className="command-card">
        <CardHeader>
          <CardTitle className="text-white">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hsl(var(--border))">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Campaign</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contacts</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Sent</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Open Rate</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Click Rate</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Reply Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.campaigns.map((campaign) => (
                  <tr key={campaign.campaignId} className="border-b border-hsl(var(--border))/50 hover:bg-hsl(var(--surface-elevated))/50">
                    <td className="py-3 px-4 text-white font-medium">{campaign.campaignName}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        Active
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{campaign.totalContacts}</td>
                    <td className="py-3 px-4 text-muted-foreground">{campaign.emailsSent}</td>
                    <td className="py-3 px-4 text-white">{campaign.openRate}%</td>
                    <td className="py-3 px-4 text-white">{campaign.clickRate}%</td>
                    <td className="py-3 px-4 text-white">{campaign.replyRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 