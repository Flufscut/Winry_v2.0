import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  ExternalLink, 
  Mail, 
  MapPin, 
  Building, 
  User, 
  TrendingUp,
  Target,
  Users,
  Award,
  MessageSquare,
  FileText,
  Globe,
  Plus
} from "lucide-react";

interface ProspectDetailsProps {
  prospectId: number;
  onClose: () => void;
}

export default function ProspectDetailsModern({ prospectId, onClose }: ProspectDetailsProps) {
  const { toast } = useToast();

  const { data: prospect, isLoading, error } = useQuery({
    queryKey: [`/api/prospects/${prospectId}`],
    queryFn: async () => {
      const response = await fetch(`/api/prospects/${prospectId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch prospect: ${response.status}`);
      }
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load prospect details</p>
        <Button onClick={onClose} variant="outline" className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  const copyEmailToClipboard = () => {
    const results = prospect?.researchResults;
    if (results?.emailSubject && results?.emailBody) {
      const emailText = `Subject: ${results.emailSubject}\n\n${results.emailBody}`;
      
      navigator.clipboard.writeText(emailText).then(() => {
        toast({
          title: "Success",
          description: "Email copied to clipboard!",
        });
      }).catch(() => {
        toast({
          title: "Error",
          description: "Failed to copy email to clipboard",
          variant: "destructive",
        });
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const fullName = `${prospect.firstName} ${prospect.lastName}`;
  const results = prospect.researchResults;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <DialogHeader className="pb-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <DialogTitle className="text-3xl font-bold text-foreground">{fullName}</DialogTitle>
            {prospect.title && (
              <p className="text-lg text-muted-foreground font-medium">{prospect.title}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {results?.primaryJobCompany && (
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>{results.primaryJobCompany}</span>
                </div>
              )}
              {results?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{results.location}</span>
                </div>
              )}
            </div>
          </div>
          {getStatusBadge(prospect.status)}
        </div>
      </DialogHeader>

      {/* Processing State */}
      {prospect.status === "processing" && (
        <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Research in progress... This may take a few minutes.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {prospect.status === "failed" && (
        <Card className="mt-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <CardContent className="p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {prospect.errorMessage || "Research failed due to an unknown error"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {results && (
        <div className="mt-8 space-y-8">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center space-x-6 flex-1 min-w-0">
              <a 
                href={`mailto:${prospect.email}`} 
                className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Mail className="h-4 w-4" />
                <span className="truncate">{prospect.email}</span>
              </a>
              {(results.linkedinUrl || prospect.linkedinUrl) && (
                <a 
                  href={results.linkedinUrl || prospect.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
              )}
              {results.website && (
                <a 
                  href={results.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <Globe className="h-4 w-4" />
                  <span>Company Site</span>
                </a>
              )}
            </div>
            {(results?.emailSubject && results?.emailBody) && (
              <Button 
                variant="default" 
                size="sm"
                onClick={copyEmailToClipboard}
                className="flex items-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Email
              </Button>
            )}
          </div>



          {/* Personal Information Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <User className="h-5 w-5 mr-3 text-blue-500" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Details */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                    <span className="text-sm text-foreground font-medium">{prospect.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Location</span>
                    <span className="text-sm text-foreground font-medium">{results.location || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-muted-foreground">Position</span>
                    <span className="text-sm text-foreground font-medium">{prospect.title}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Educational Background */}
              {results?.almaMaterResearch && (
                <Card className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Educational Background</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.almaMaterResearch}</p>
                  </CardContent>
                </Card>
              )}

              {/* Personal LinkedIn Activity */}
              {results?.linkedInPostSummary && (
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Personal LinkedIn Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.linkedInPostSummary}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Company Information Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <Building className="h-5 w-5 mr-3 text-green-500" />
              Company Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Details */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Company</span>
                    <span className="text-sm text-foreground font-medium">{prospect.company}</span>
                  </div>
                  {results?.primaryJobCompany && results?.primaryJobCompany !== prospect.company && (
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm font-medium text-muted-foreground">Primary Employer</span>
                      <span className="text-sm text-foreground font-medium">{results.primaryJobCompany}</span>
                    </div>
                  )}
                  {results?.industry && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-muted-foreground">Industry</span>
                      <span className="text-sm text-foreground font-medium">{results.industry}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Company LinkedIn Activity */}
              {results?.companyLinkedInPostSummary && (
                <Card className="border-l-4 border-l-teal-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Company LinkedIn Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.companyLinkedInPostSummary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Company News */}
              {results?.companyNews && (
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Recent Company News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.companyNews}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Business Intelligence Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <TrendingUp className="h-5 w-5 mr-3 text-purple-500" />
              Business Intelligence
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pain Points */}
              {results?.painPoints && (
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Target className="h-5 w-5 mr-3 text-red-500" />
                      Pain Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.painPoints}</p>
                  </CardContent>
                </Card>
              )}

              {/* Business Goals */}
              {results?.businessGoals && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <TrendingUp className="h-5 w-5 mr-3 text-blue-500" />
                      Business Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.businessGoals}</p>
                  </CardContent>
                </Card>
              )}

              {/* Competitive Advantages */}
              {results?.competitiveAdvantages && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Award className="h-5 w-5 mr-3 text-green-500" />
                      Competitive Advantages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.competitiveAdvantages}</p>
                  </CardContent>
                </Card>
              )}

              {/* Competitors */}
              {results?.competitors && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Users className="h-5 w-5 mr-3 text-purple-500" />
                      Competitors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.competitors}</p>
                  </CardContent>
                </Card>
              )}

              {/* Location Research */}
              {results?.locationResearch && (
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <MapPin className="h-5 w-5 mr-3 text-amber-500" />
                      Location Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{results.locationResearch}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Executive Summaries */}
          {(results?.overallProspectSummary || results?.overallCompanySummary) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results?.overallProspectSummary && (
                  <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <User className="h-5 w-5 mr-3 text-emerald-500" />
                        Prospect Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{results.overallProspectSummary}</p>
                    </CardContent>
                  </Card>
                )}

                {results?.overallCompanySummary && (
                  <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Building className="h-5 w-5 mr-3 text-amber-500" />
                        Company Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{results.overallCompanySummary}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Outreach Campaigns Section */}
          {(results?.emailSubject && results?.emailBody) && (
            <>
              <Separator />
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-foreground flex items-center">
                  <MessageSquare className="h-5 w-5 mr-3 text-violet-500" />
                  Outreach Campaigns
                </h3>
                
                {/* Personalized Email Campaign */}
                <Card className="border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50/30 to-background dark:from-violet-900/10">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 mr-3 text-violet-500" />
                        Personalized Email Outreach
                      </div>
                      <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                        Step 1
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white dark:bg-gray-950 border border-border rounded-lg p-4 space-y-4">
                      <div className="border-b border-border pb-3">
                        <span className="text-sm font-semibold text-muted-foreground">Subject:</span>
                        <p className="text-sm font-medium text-foreground mt-1">{results.emailSubject}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-muted-foreground">Message:</span>
                        <div className="text-sm text-foreground mt-2 whitespace-pre-line leading-relaxed">
                          {results.emailBody}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Placeholder for future campaign steps */}
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">More campaign steps coming soon</p>
                      <p className="text-xs text-muted-foreground">Follow-up emails, LinkedIn outreach, and more</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}