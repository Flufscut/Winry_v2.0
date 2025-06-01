import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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
  Plus,
  Brain,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Briefcase,
  Lightbulb,
  Shield,
  Zap,
  Activity
} from "lucide-react";

interface ProspectProfileProps {
  prospectId: number;
  onClose: () => void;
}

export default function ProspectProfileInteractive({ prospectId, onClose }: ProspectProfileProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    company: true,
    intelligence: true,
    outreach: true
  });
  const [animationPhase, setAnimationPhase] = useState(0);

  // Helper function to get field value from research results
  const getResearchField = (prospect: any, ...fieldNames: string[]) => {
    const results = prospect?.researchResults;
    if (!results) return null;
    
    // Check direct fields first
    for (const fieldName of fieldNames) {
      if (results[fieldName]) return results[fieldName];
    }
    
    // Check fullOutput object
    const fullOutput = results.fullOutput;
    if (fullOutput) {
      for (const fieldName of fieldNames) {
        if (fullOutput[fieldName]) return fullOutput[fieldName];
      }
    }
    
    return null;
  };

  const { data: prospect, isLoading, error } = useQuery({
    queryKey: [`/api/prospects/${prospectId}`],
    retry: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setAnimationPhase(1), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl border-4 border-primary/20 flex items-center justify-center animate-pulse"
               style={{ background: 'var(--gradient-primary)' }}>
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-primary animate-spin"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-foreground">Loading Profile</p>
          <p className="text-sm text-muted-foreground">Gathering intelligence insights...</p>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl border-2 border-destructive/20 flex items-center justify-center mx-auto"
             style={{ background: 'hsl(var(--destructive) / 0.1)' }}>
          <User className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-destructive">Profile Unavailable</p>
          <p className="text-sm text-muted-foreground">Unable to load prospect details</p>
        </div>
        <Button onClick={onClose} variant="outline" className="mt-4">
          Close Profile
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
          title: "Email Copied",
          description: "Personalized email ready for outreach",
        });
      }).catch(() => {
        toast({
          title: "Copy Failed",
          description: "Unable to copy email content",
          variant: "destructive",
        });
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          badge: <Badge className="animate-pulse-glow" style={{ background: 'var(--gradient-accent)', color: 'white' }}>Research Complete</Badge>,
          icon: <Sparkles className="w-5 h-5 text-success" />,
          color: 'var(--success)'
        };
      case "processing":
        return {
          badge: <Badge className="animate-gradient-shift" style={{ background: 'var(--gradient-primary)', color: 'white' }}>Analyzing</Badge>,
          icon: <Brain className="w-5 h-5 text-warning animate-pulse" />,
          color: 'var(--warning)'
        };
      case "failed":
        return {
          badge: <Badge variant="destructive">Research Failed</Badge>,
          icon: <Target className="w-5 h-5 text-destructive" />,
          color: 'var(--destructive)'
        };
      default:
        return {
          badge: <Badge variant="outline">{status}</Badge>,
          icon: <User className="w-5 h-5 text-muted-foreground" />,
          color: 'var(--muted-foreground)'
        };
    }
  };

  const fullName = `${prospect.firstName} ${prospect.lastName}`;
  const results = prospect.researchResults;
  const statusConfig = getStatusConfig(prospect.status);

  return (
    <div className="max-w-6xl mx-auto" style={{ opacity: animationPhase ? 1 : 0, transform: `translateY(${animationPhase ? 0 : 20}px)`, transition: 'all 0.5s ease' }}>
      {/* Hero Header */}
      <div className="relative mb-8 p-8 rounded-3xl overflow-hidden" style={{ background: 'var(--gradient-surface)' }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'var(--gradient-mesh)' }}></div>
        <div className="relative z-10">
          <DialogHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-2xl border-2 border-border/50 flex items-center justify-center"
                       style={{ background: 'var(--gradient-accent)' }}>
                    <span className="text-lg font-bold text-white">
                      {prospect.firstName.charAt(0)}{prospect.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-3xl font-bold text-foreground tracking-tight">{fullName}</DialogTitle>
                    {prospect.title && (
                      <p className="text-lg text-muted-foreground font-medium">{prospect.title}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  {(results?.primaryJobCompany || prospect.company) && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border/50"
                         style={{ background: 'hsl(var(--primary) / 0.05)' }}>
                      <Building className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{results?.primaryJobCompany || prospect.company}</span>
                    </div>
                  )}
                  {results?.location && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border/50"
                         style={{ background: 'hsl(var(--secondary) / 0.05)' }}>
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span className="font-medium text-foreground">{results.location}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {statusConfig.badge}
                {statusConfig.icon}
              </div>
            </div>
          </DialogHeader>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <a 
              href={`mailto:${prospect.email}`} 
              className="inline-flex items-center px-4 py-2 rounded-xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
              style={{ background: 'var(--gradient-surface)' }}
            >
              <Mail className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium text-foreground">{prospect.email}</span>
            </a>
            
            {(getResearchField(prospect, 'linkedinUrl') || prospect.linkedinUrl) && (
              <a 
                href={getResearchField(prospect, 'linkedinUrl') || prospect.linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-xl border border-border/50 hover:border-secondary/50 transition-all duration-300 hover:scale-105"
                style={{ background: 'var(--gradient-surface)' }}
              >
                <ExternalLink className="w-4 h-4 mr-2 text-secondary" />
                <span className="font-medium text-foreground">LinkedIn</span>
              </a>
            )}
            
            {getResearchField(prospect, 'website') && (
              <a 
                href={getResearchField(prospect, 'website')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-xl border border-border/50 hover:border-accent/50 transition-all duration-300 hover:scale-105"
                style={{ background: 'var(--gradient-surface)' }}
              >
                <Globe className="w-4 h-4 mr-2 text-accent" />
                <span className="font-medium text-foreground">Website</span>
              </a>
            )}
            
            {(getResearchField(prospect, 'Email Subject', 'emailSubject') && getResearchField(prospect, 'Email Body', 'emailBody')) && (
              <Button 
                onClick={copyEmailToClipboard}
                className="px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ background: 'var(--gradient-primary)', color: 'white' }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Email
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Processing State */}
      {prospect.status === "processing" && (
        <div className="mb-8 p-6 rounded-2xl border border-warning/20 overflow-hidden"
             style={{ background: 'linear-gradient(135deg, hsl(var(--warning) / 0.05), hsl(var(--info) / 0.05))' }}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl border-2 border-warning/30 flex items-center justify-center"
                 style={{ background: 'var(--gradient-accent)' }}>
              <Brain className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">AI Research in Progress</p>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-warning animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">Analyzing prospect data and generating insights</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {prospect.status === "failed" && (
        <div className="mb-8 p-6 rounded-2xl border border-destructive/20"
             style={{ background: 'hsl(var(--destructive) / 0.05)' }}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl border-2 border-destructive/30 flex items-center justify-center"
                 style={{ background: 'hsl(var(--destructive) / 0.1)' }}>
              <Target className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-destructive">Research Failed</p>
              <p className="text-sm text-muted-foreground">
                {prospect.errorMessage || "Unable to complete research analysis"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Content Sections */}
      {results && (
        <div className="space-y-6">
          {/* Side-by-Side Intelligence Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Intelligence */}
            <div className="card-modern">
              <button
                onClick={() => toggleSection('personal')}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-primary/20 flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--secondary) / 0.1))' }}>
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Personal Intelligence</h3>
                    <p className="text-sm text-muted-foreground">Professional background and insights</p>
                  </div>
                </div>
                {expandedSections.personal ? 
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" /> :
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                }
              </button>
              
              {expandedSections.personal && (
                <div className="px-6 pb-6 space-y-4 animate-slideUp">
                  {/* Contact Information */}
                  <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-primary" />
                      Contact Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium text-foreground">{prospect.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium text-foreground">{getResearchField(prospect, 'location') || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Position</span>
                        <span className="font-medium text-foreground">{prospect.title}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Research */}
                  {getResearchField(prospect, 'Location Research', 'location') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                        Location Insights
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Location Research', 'location')}</p>
                    </div>
                  )}

                  {/* Educational Background */}
                  {getResearchField(prospect, 'Alma Mater Research', 'almaMaterResearch') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-secondary" />
                        Educational Background
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Alma Mater Research', 'almaMaterResearch')}</p>
                    </div>
                  )}

                  {/* Personal Social Activity */}
                  {getResearchField(prospect, 'LinkedIn Post Summary', 'linkedInPostSummary') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-accent" />
                        LinkedIn Activity
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'LinkedIn Post Summary', 'linkedInPostSummary')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Company Intelligence */}
            <div className="card-modern">
              <button
                onClick={() => toggleSection('company')}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-success/20 flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, hsl(var(--success) / 0.1), hsl(var(--info) / 0.1))' }}>
                    <Building className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Company Intelligence</h3>
                    <p className="text-sm text-muted-foreground">Business context and insights</p>
                  </div>
                </div>
                {expandedSections.company ? 
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" /> :
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                }
              </button>
              
              {expandedSections.company && (
                <div className="px-6 pb-6 space-y-4 animate-slideUp">
                  {/* Company Details */}
                  <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center">
                      <Building className="w-4 h-4 mr-2 text-success" />
                      Company Profile
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primary Employer</span>
                        <span className="font-medium text-foreground">{getResearchField(prospect, 'Primary Job Company', 'primaryJobCompany') || prospect.company}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title</span>
                        <span className="font-medium text-foreground">{getResearchField(prospect, 'Primary Job Title') || prospect.title}</span>
                      </div>
                      {getResearchField(prospect, 'Primary Job Company LinkedIn URL') && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Company LinkedIn</span>
                          <a href={getResearchField(prospect, 'Primary Job Company LinkedIn URL')} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline text-sm">View Company</a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Industry Section */}
                  {getResearchField(prospect, 'Industry', 'industry') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2 text-secondary" />
                        Industry Analysis
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Industry', 'industry')}</p>
                    </div>
                  )}

                  {/* Competitors */}
                  {getResearchField(prospect, 'Competitors') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-warning" />
                        Competitors
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Competitors')}</p>
                    </div>
                  )}

                  {/* Competitive Advantages */}
                  {getResearchField(prospect, 'Competitive Advantages') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Award className="w-4 h-4 mr-2 text-success" />
                        Competitive Advantages
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Competitive Advantages')}</p>
                    </div>
                  )}

                  {/* Company News */}
                  {getResearchField(prospect, 'Company News', 'companyNews') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-warning" />
                        Recent Company News
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Company News', 'companyNews')}</p>
                    </div>
                  )}

                  {/* Company Social Activity */}
                  {getResearchField(prospect, 'Company LinkedIn Post Summary', 'companyLinkedInPostSummary') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-info" />
                        Company Social Activity
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Company LinkedIn Post Summary', 'companyLinkedInPostSummary')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Business Intelligence */}
          <div className="card-modern">
            <button
              onClick={() => toggleSection('intelligence')}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/30 transition-colors duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl border-2 border-accent/20 flex items-center justify-center"
                     style={{ background: 'var(--gradient-accent)' }}>
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Strategic Intelligence</h3>
                  <p className="text-sm text-muted-foreground">Pain points, goals, and competitive landscape</p>
                </div>
              </div>
              {expandedSections.intelligence ? 
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" /> :
                <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
              }
            </button>
            
            {expandedSections.intelligence && (
              <div className="px-6 pb-6 space-y-4 animate-slideUp">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Pain Points */}
                  {getResearchField(prospect, 'Pain Points', 'painPoints') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2 text-destructive" />
                        Pain Points
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Pain Points', 'painPoints')}</p>
                    </div>
                  )}

                  {/* Business Goals */}
                  {getResearchField(prospect, 'Business Goals', 'businessGoals') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                        Business Goals
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Business Goals', 'businessGoals')}</p>
                    </div>
                  )}
                </div>

                {/* Overall Summaries */}
                <div className="space-y-4">
                  {/* Overall Prospect Summary */}
                  {getResearchField(prospect, 'Overall Prospect Summary') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2 text-primary" />
                        Prospect Summary
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Overall Prospect Summary')}</p>
                    </div>
                  )}

                  {/* Overall Company Summary */}
                  {getResearchField(prospect, 'Overall Company Summary') && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Building className="w-4 h-4 mr-2 text-success" />
                        Company Summary
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{getResearchField(prospect, 'Overall Company Summary')}</p>
                    </div>
                  )}

                  {/* Competitors */}
                  {results?.competitors && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-secondary" />
                        Competition
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{results.competitors}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Outreach Intelligence */}
          {(results?.emailSubject || results?.emailBody) && (
            <div className="card-modern">
              <button
                onClick={() => toggleSection('outreach')}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-warning/20 flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, hsl(var(--warning) / 0.1), hsl(var(--accent) / 0.1))' }}>
                    <MessageSquare className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Personalized Outreach</h3>
                    <p className="text-sm text-muted-foreground">AI-generated email content ready for engagement</p>
                  </div>
                </div>
                {expandedSections.outreach ? 
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" /> :
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                }
              </button>
              
              {expandedSections.outreach && (
                <div className="px-6 pb-6 space-y-4 animate-slideUp">
                  {results?.emailSubject && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-primary" />
                        Email Subject
                      </h4>
                      <p className="text-sm text-foreground font-medium bg-muted/30 p-3 rounded-lg">
                        {results.emailSubject}
                      </p>
                    </div>
                  )}

                  {results?.emailBody && (
                    <div className="p-4 rounded-xl border border-border/50" style={{ background: 'var(--gradient-surface)' }}>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-secondary" />
                        Email Content
                      </h4>
                      <div className="text-sm text-foreground bg-muted/30 p-4 rounded-lg leading-relaxed whitespace-pre-wrap">
                        {results.emailBody}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={copyEmailToClipboard}
                      size="lg"
                      className="px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
                      style={{ background: 'var(--gradient-primary)', color: 'white' }}
                    >
                      <Copy className="w-5 h-5 mr-2" />
                      Copy Complete Email
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}