/**
 * FILE: enhanced-analytics.tsx
 * PURPOSE: Real-data analytics dashboard showing actual prospect performance metrics
 * DEPENDENCIES: React Query, Recharts, shadcn/ui components
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Focused on real data metrics only - no placeholder or theoretical data
 * REF: Shows actual prospect pipeline performance and research quality
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Send,
} from 'lucide-react';

interface EnhancedAnalyticsProps {
  className?: string;
}

export function EnhancedAnalytics({ className }: EnhancedAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  // REF: Fetch basic stats - real prospect counts and success rates
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  // REF: Fetch prospect data for analysis - real prospect records
  const { data: prospectsData, isLoading: prospectsLoading, refetch: refetchProspects } = useQuery({
    queryKey: ['prospects-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/prospects');
      if (!response.ok) throw new Error('Failed to fetch prospects');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  const isLoading = statsLoading || prospectsLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchProspects();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2 min-h-[400px]">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-lg">Loading analytics data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // REF: Process real prospect data for analytics
  const prospects = prospectsData?.prospects || [];
  const totalProspects = prospects.length;
  
  // REF: Calculate real metrics from actual prospect data
  const completedProspects = prospects.filter((p: any) => p.status === 'completed').length;
  const processingProspects = prospects.filter((p: any) => p.status === 'processing').length;
  const failedProspects = prospects.filter((p: any) => p.status === 'failed').length;
  const sentToReplyProspects = prospects.filter((p: any) => p.sent_to_replyio_campaign_id).length;
  
  const completionRate = totalProspects > 0 ? Math.round((completedProspects / totalProspects) * 100) : 0;
  const failureRate = totalProspects > 0 ? Math.round((failedProspects / totalProspects) * 100) : 0;
  const replyRate = completedProspects > 0 ? Math.round((sentToReplyProspects / completedProspects) * 100) : 0;

  // REF: Process status distribution for pie chart
  const statusData = [
    { name: 'Completed', value: completedProspects, color: '#10B981' },
    { name: 'Processing', value: processingProspects, color: '#F59E0B' },
    { name: 'Failed', value: failedProspects, color: '#EF4444' },
  ].filter(item => item.value > 0);

  // REF: Process companies for top companies chart (real data)
  const companyData = prospects.reduce((acc: any, prospect: any) => {
    const company = prospect.company || 'Unknown';
    acc[company] = (acc[company] || 0) + 1;
    return acc;
  }, {});

  const topCompanies = Object.entries(companyData)
    .map(([company, count]) => ({ company, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  // REF: Process recent activity (last 7 days)
  const recentActivity = prospects.filter((p: any) => {
    const createdAt = new Date(p.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdAt >= weekAgo;
  }).length;

  // REF: Process research quality metrics from actual research results
  const prospectsWithResearch = prospects.filter((p: any) => p.research_results);
  const avgResearchQuality = prospectsWithResearch.length > 0 
    ? Math.round(prospectsWithResearch.reduce((sum: number, p: any) => {
        const research = p.research_results;
        let quality = 0;
        if (research?.painPoints && research.painPoints.length > 100) quality += 25;
        if (research?.businessGoals && research.businessGoals.length > 100) quality += 25;
        if (research?.industry && research.industry.length > 50) quality += 25;
        if (research?.emailBody && research.emailBody.length > 200) quality += 25;
        return sum + quality;
      }, 0) / prospectsWithResearch.length)
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Prospect Analytics</CardTitle>
            <p className="text-muted-foreground mt-1">Real prospect performance metrics</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Prospects</p>
                      <p className="text-2xl font-bold">{totalProspects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-2xl font-bold">{completionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Send className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Sent to Reply.io</p>
                      <p className="text-2xl font-bold">{replyRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Recent Activity</p>
                      <p className="text-2xl font-bold">{recentActivity}</p>
                      <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution and Research Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      No prospect data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Research Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Research Quality</span>
                      <Badge variant="outline">{avgResearchQuality}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Prospects with Research</span>
                      <Badge variant="outline">{prospectsWithResearch.length}/{totalProspects}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Failure Rate</span>
                      <Badge variant={failureRate > 10 ? "destructive" : "outline"}>{failureRate}%</Badge>
                    </div>
                  </div>
                  
                  {totalProspects === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>No prospects to analyze yet</p>
                      <p className="text-sm">Upload prospects to see analytics</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{processingProspects}</p>
                  <p className="text-sm text-muted-foreground">Currently Processing</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{completedProspects}</p>
                  <p className="text-sm text-muted-foreground">Completed Research</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Send className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{sentToReplyProspects}</p>
                  <p className="text-sm text-muted-foreground">Sent to Reply.io</p>
                </CardContent>
              </Card>
            </div>

            {failedProspects > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Failed Prospects ({failedProspects})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {failedProspects} prospects failed during processing. 
                    Check individual prospect details for error messages and retry if needed.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Companies ({topCompanies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {topCompanies.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCompanies}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="company" 
                        stroke="#9CA3AF" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No company data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 