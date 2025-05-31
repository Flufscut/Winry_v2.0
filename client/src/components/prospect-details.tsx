import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Copy, Loader2 } from "lucide-react";

interface ProspectDetailsProps {
  prospectId: number;
  onClose: () => void;
}

export default function ProspectDetails({ prospectId, onClose }: ProspectDetailsProps) {
  const { toast } = useToast();

  const { data: prospect, isLoading } = useQuery({
    queryKey: [`/api/prospects/${prospectId}`],
    retry: false,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load prospect details",
        variant: "destructive",
      });
    },
  });

  const copyEmailToClipboard = () => {
    const results = prospect?.researchResults?.[0]?.output || prospect?.researchResults;
    if (results?.Email) {
      const email = results.Email;
      const emailText = `Subject: ${email.subject}\n\n${email.body}`;
      
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
        return <Badge className="status-completed">Completed</Badge>;
      case "processing":
        return <Badge className="status-processing">Processing</Badge>;
      case "failed":
        return <Badge className="status-failed">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DialogHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </DialogHeader>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Prospect not found</p>
      </div>
    );
  }

  const fullName = `${prospect.firstName} ${prospect.lastName}`;
  // Handle different data structures from the webhook
  const results = prospect.researchResults?.output || prospect.researchResults?.[0]?.output || prospect.researchResults;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle>{fullName}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{prospect.title}</p>
          </div>
          {getStatusBadge(prospect.status)}
        </div>
      </DialogHeader>
      
      {prospect.status === "processing" && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Research in progress... This may take a few minutes.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {prospect.status === "failed" && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <CardContent className="p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {prospect.errorMessage || "Research failed due to an unknown error"}
            </p>
          </CardContent>
        </Card>
      )}

      {results && (
        <div className="space-y-8">
          {/* Contact & Company Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="h-fit">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                    <span className="text-sm text-foreground font-medium">{results.email || prospect.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Location</span>
                    <span className="text-sm text-foreground font-medium">{results.location || "N/A"}</span>
                  </div>
                  {(results.linkedinUrl || prospect.linkedinUrl) && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-muted-foreground">LinkedIn</span>
                      <a 
                        href={results.linkedinUrl || prospect.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 flex items-center font-medium"
                      >
                        View Profile <ExternalLink className="h-3 w-3 ml-2" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="h-fit">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Company Details
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Company</span>
                    <span className="text-sm text-foreground font-medium">{results["Primary Job Company"] || prospect.company}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Title</span>
                    <span className="text-sm text-foreground font-medium">{results["Primary Job Title"] || prospect.title}</span>
                  </div>
                  {results.website && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-muted-foreground">Website</span>
                      <a 
                        href={results.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 flex items-center font-medium"
                      >
                        Visit Site <ExternalLink className="h-3 w-3 ml-2" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Business Insights */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></span>
              Key Business Insights
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pain Points */}
              {results["Pain Points"] && (
                <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-900/20 dark:to-red-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Pain Points
                    </h5>
                    <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">{results["Pain Points"]}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Business Goals */}
              {results["Business Goals"] && (
                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-900/20 dark:to-blue-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Business Goals
                    </h5>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{results["Business Goals"]}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Competitive Advantages */}
              {results["Competitive Advantages"] && (
                <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-green-50/30 dark:from-green-900/20 dark:to-green-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Competitive Advantages
                    </h5>
                    <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">{results["Competitive Advantages"]}</p>
                  </CardContent>
                </Card>
              )}

              {/* Competitors */}
              {results.Competitors && (
                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-purple-50/30 dark:from-purple-900/20 dark:to-purple-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Competitors
                    </h5>
                    <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">{results.Competitors}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Market & Context Analysis */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <span className="w-3 h-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full mr-3"></span>
              Market & Context Analysis
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Industry Analysis */}
              {results.Industry && (
                <Card className="border-l-4 border-l-slate-500 bg-gradient-to-r from-slate-50 to-slate-50/30 dark:from-slate-900/20 dark:to-slate-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-slate-500 rounded-full mr-2"></span>
                      Industry Analysis
                    </h5>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{results.Industry}</p>
                  </CardContent>
                </Card>
              )}

              {/* Location Research */}
              {results["Location Research"] && (
                <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-50/30 dark:from-orange-900/20 dark:to-orange-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Location Insights
                    </h5>
                    <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">{results["Location Research"]}</p>
                  </CardContent>
                </Card>
              )}

              {/* Alma Mater Research */}
              {results["Alma Mater Research"] && (
                <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-50/30 dark:from-indigo-900/20 dark:to-indigo-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                      Educational Background
                    </h5>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">{results["Alma Mater Research"]}</p>
                  </CardContent>
                </Card>
              )}

              {/* Company News */}
              {results["Company News"] && (
                <Card className="border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-50 to-gray-50/30 dark:from-gray-900/20 dark:to-gray-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                      Recent Company News
                    </h5>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{results["Company News"]}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Social Media & Digital Presence */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <span className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full mr-3"></span>
              Digital Presence & Activity
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LinkedIn Activity */}
              {results["LinkedIn Post Summary"] && (
                <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50 to-cyan-50/30 dark:from-cyan-900/20 dark:to-cyan-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
                      Personal LinkedIn Activity
                    </h5>
                    <p className="text-sm text-cyan-800 dark:text-cyan-200 leading-relaxed">{results["LinkedIn Post Summary"]}</p>
                  </CardContent>
                </Card>
              )}

              {/* Company LinkedIn Activity */}
              {results["Company LinkedIn Post Summary"] && (
                <Card className="border-l-4 border-l-teal-500 bg-gradient-to-r from-teal-50 to-teal-50/30 dark:from-teal-900/20 dark:to-teal-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-teal-900 dark:text-teal-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                      Company LinkedIn Activity
                    </h5>
                    <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">{results["Company LinkedIn Post Summary"]}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Executive Summaries */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <span className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full mr-3"></span>
              Executive Summaries
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prospect Summary */}
              {results["Overall Prospect Summary"] && (
                <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-50/30 dark:from-emerald-900/20 dark:to-emerald-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Prospect Overview
                    </h5>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">{results["Overall Prospect Summary"]}</p>
                  </CardContent>
                </Card>
              )}

              {/* Company Summary */}
              {results["Overall Company Summary"] && (
                <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-900/20 dark:to-amber-900/5">
                  <CardContent className="p-6">
                    <h5 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                      Company Overview
                    </h5>
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{results["Overall Company Summary"]}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
            
          {/* Generated Email */}
          {results.Email && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <span className="w-3 h-3 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full mr-3"></span>
                Personalized Outreach
              </h3>
              
              <Card className="border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-violet-50/30 dark:from-violet-900/20 dark:to-violet-900/5">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h5 className="text-lg font-semibold text-foreground flex items-center">
                      <span className="w-2 h-2 bg-violet-500 rounded-full mr-2"></span>
                      Cold Outreach Email
                    </h5>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyEmailToClipboard}
                      className="flex items-center hover:bg-violet-100 dark:hover:bg-violet-900/20"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Email
                    </Button>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-950 border border-border rounded-lg p-4 space-y-4">
                    <div className="border-b border-border pb-3">
                      <span className="text-sm font-semibold text-muted-foreground">Subject:</span>
                      <p className="text-sm font-medium text-foreground mt-1">{results.Email.subject}</p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-muted-foreground">Message:</span>
                      <div className="text-sm text-foreground mt-2 whitespace-pre-line leading-relaxed">
                        {results.Email.body}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
