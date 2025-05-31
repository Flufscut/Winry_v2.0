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
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm text-foreground">{results.email || prospect.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="text-sm text-foreground">{results.location || "N/A"}</span>
                  </div>
                  {(results.linkedinUrl || prospect.linkedinUrl) && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">LinkedIn:</span>
                      <a 
                        href={results.linkedinUrl || prospect.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 flex items-center"
                      >
                        View Profile <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Company Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Company:</span>
                    <span className="text-sm text-foreground">{results["Primary Job Company"] || prospect.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Title:</span>
                    <span className="text-sm text-foreground">{results["Primary Job Title"] || prospect.title}</span>
                  </div>
                  {results.website && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Website:</span>
                      <a 
                        href={results.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 flex items-center"
                      >
                        Visit <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Research Results */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Research Results</h4>
            
            {/* Pain Points */}
            {results["Pain Points"] && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Pain Points</h5>
                  <p className="text-sm text-red-700 dark:text-red-200">{results["Pain Points"]}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Business Goals */}
            {results["Business Goals"] && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Business Goals</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-200">{results["Business Goals"]}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Competitive Advantages */}
            {results["Competitive Advantages"] && (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Competitive Advantages</h5>
                  <p className="text-sm text-green-700 dark:text-green-200">{results["Competitive Advantages"]}</p>
                </CardContent>
              </Card>
            )}

            {/* Competitors */}
            {results.Competitors && (
              <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Competitors</h5>
                  <p className="text-sm text-purple-700 dark:text-purple-200">{results.Competitors}</p>
                </CardContent>
              </Card>
            )}

            {/* Industry Context */}
            {results.Industry && (
              <Card>
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-foreground mb-2">Industry Analysis</h5>
                  <p className="text-sm text-muted-foreground">{results.Industry}</p>
                </CardContent>
              </Card>
            )}

            {/* Location Research */}
            {results["Location Research"] && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">Location Research</h5>
                  <p className="text-sm text-orange-700 dark:text-orange-200">{results["Location Research"]}</p>
                </CardContent>
              </Card>
            )}

            {/* Alma Mater Research */}
            {results["Alma Mater Research"] && (
              <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Alma Mater Research</h5>
                  <p className="text-sm text-indigo-700 dark:text-indigo-200">{results["Alma Mater Research"]}</p>
                </CardContent>
              </Card>
            )}

            {/* LinkedIn Post Summary */}
            {results["LinkedIn Post Summary"] && (
              <Card className="border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-2">LinkedIn Activity</h5>
                  <p className="text-sm text-cyan-700 dark:text-cyan-200">{results["LinkedIn Post Summary"]}</p>
                </CardContent>
              </Card>
            )}

            {/* Company LinkedIn Post Summary */}
            {results["Company LinkedIn Post Summary"] && (
              <Card className="border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-2">Company LinkedIn Activity</h5>
                  <p className="text-sm text-teal-700 dark:text-teal-200">{results["Company LinkedIn Post Summary"]}</p>
                </CardContent>
              </Card>
            )}

            {/* Company News */}
            {results["Company News"] && (
              <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Company News</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{results["Company News"]}</p>
                </CardContent>
              </Card>
            )}

            {/* Overall Prospect Summary */}
            {results["Overall Prospect Summary"] && (
              <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Prospect Summary</h5>
                  <p className="text-sm text-emerald-700 dark:text-emerald-200">{results["Overall Prospect Summary"]}</p>
                </CardContent>
              </Card>
            )}

            {/* Overall Company Summary */}
            {results["Overall Company Summary"] && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">Company Summary</h5>
                  <p className="text-sm text-amber-700 dark:text-amber-200">{results["Overall Company Summary"]}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Generated Email */}
            {results.Email && (
              <Card>
                <CardContent className="p-4">
                  <h5 className="text-sm font-semibold text-foreground mb-2">Generated Cold Outreach Email</h5>
                  <div className="bg-card border border-border rounded p-3 space-y-3">
                    <div className="text-sm">
                      <strong>Subject:</strong> {results.Email.subject}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {results.Email.body}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyEmailToClipboard}
                      className="flex items-center"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
