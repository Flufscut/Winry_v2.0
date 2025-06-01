import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { 
  Eye, 
  Trash2, 
  RotateCcw, 
  Users, 
  Building, 
  Mail, 
  Brain, 
  Target, 
  Sparkles, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Activity
} from "lucide-react";
import { format } from "date-fns";

interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  email: string;
  status: string;
  createdAt: string;
}

interface ProspectTableProps {
  prospects: Prospect[];
  isLoading: boolean;
  onViewDetails: (id: number) => void;
  onDelete: (id: number) => void;
  onRetry: (id: number) => void;
  selectedProspects: number[];
  onSelectProspect: (id: number, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
}

export default function ProspectTableInteractive({ 
  prospects, 
  isLoading, 
  onViewDetails, 
  onDelete, 
  onRetry,
  selectedProspects, 
  onSelectProspect, 
  onSelectAll, 
  onDeselectAll, 
  onBulkDelete 
}: ProspectTableProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          badge: (
            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium animate-pulse-glow"
                   style={{ background: 'var(--gradient-accent)', color: 'white', border: 'none' }}>
              <Sparkles className="w-3 h-3" />
              Ready
            </Badge>
          ),
          icon: <CheckCircle2 className="w-4 h-4 text-success" />,
          bgColor: 'hsl(var(--success) / 0.05)',
          borderColor: 'hsl(var(--success) / 0.2)'
        };
      case "processing":
        return {
          badge: (
            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium animate-gradient-shift"
                   style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none' }}>
              <Brain className="w-3 h-3 animate-pulse" />
              Analyzing
            </Badge>
          ),
          icon: <Clock className="w-4 h-4 text-warning" />,
          bgColor: 'hsl(var(--warning) / 0.05)',
          borderColor: 'hsl(var(--warning) / 0.2)'
        };
      case "failed":
        return {
          badge: (
            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium"
                   style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.2)' }}>
              <AlertTriangle className="w-3 h-3" />
              Failed
            </Badge>
          ),
          icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
          bgColor: 'hsl(var(--destructive) / 0.05)',
          borderColor: 'hsl(var(--destructive) / 0.2)'
        };
      default:
        return {
          badge: (
            <Badge variant="outline" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium">
              <Activity className="w-3 h-3" />
              {status}
            </Badge>
          ),
          icon: <Activity className="w-4 h-4 text-muted-foreground" />,
          bgColor: 'hsl(var(--muted) / 0.3)',
          borderColor: 'hsl(var(--border))'
        };
    }
  };

  const allSelected = prospects.length > 0 && selectedProspects.length === prospects.length;
  const someSelected = selectedProspects.length > 0 && selectedProspects.length < prospects.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl"
             style={{ background: 'var(--gradient-surface)' }}>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        
        {/* Table Skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border border-border/50 rounded-xl"
                 style={{ background: 'var(--gradient-surface)' }}>
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl border-2 border-border/50 flex items-center justify-center mx-auto"
             style={{ background: 'var(--gradient-surface)' }}>
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No Prospects Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Start building your pipeline by adding prospects manually or importing a CSV file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      {selectedProspects.length > 0 && (
        <div className="flex items-center justify-between p-4 border border-primary/20 rounded-xl animate-slideUp"
             style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--secondary) / 0.05))' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'var(--gradient-primary)' }}>
              <span className="text-sm font-bold text-white">{selectedProspects.length}</span>
            </div>
            <span className="font-medium text-foreground">
              {selectedProspects.length} prospect{selectedProspects.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              className="rounded-xl"
            >
              Clear Selection
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete {selectedProspects.length} prospect{selectedProspects.length !== 1 ? 's' : ''} and all associated research data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Interactive Table */}
      <div className="space-y-2">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border border-border/50 rounded-xl font-medium text-sm text-muted-foreground"
             style={{ background: 'var(--gradient-surface)' }}>
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={allSelected ? onDeselectAll : onSelectAll}
              className="rounded"
              data-state={someSelected ? "indeterminate" : undefined}
            />
          </div>
          <div className="col-span-3 flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Prospect</span>
          </div>
          <div className="col-span-2 flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>Company</span>
          </div>
          <div className="col-span-2 flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </div>
          <div className="col-span-2 flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Status</span>
          </div>
          <div className="col-span-1 flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Date</span>
          </div>
          <div className="col-span-1">
            <span>Actions</span>
          </div>
        </div>

        {/* Table Rows */}
        {prospects.map((prospect, index) => {
          const statusConfig = getStatusConfig(prospect.status);
          const isSelected = selectedProspects.includes(prospect.id);
          const isHovered = hoveredRow === prospect.id;
          
          return (
            <div
              key={prospect.id}
              className="grid grid-cols-12 gap-4 p-4 border border-border/50 rounded-xl transition-all duration-300 cursor-pointer group hover:scale-[1.01] hover:shadow-md"
              style={{ 
                background: isSelected ? 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--secondary) / 0.05))' : 
                           isHovered ? 'var(--gradient-surface)' : 'hsl(var(--card))',
                borderColor: isSelected ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border) / 0.5)',
                animation: `fadeIn 0.3s ease ${index * 0.1}s both`
              }}
              onMouseEnter={() => setHoveredRow(prospect.id)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => onViewDetails(prospect.id)}
            >
              {/* Selection */}
              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectProspect(prospect.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded"
                />
              </div>

              {/* Prospect Info */}
              <div className="col-span-3 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl border-2 border-border/50 flex items-center justify-center flex-shrink-0"
                     style={{ background: 'var(--gradient-accent)' }}>
                  <span className="text-sm font-bold text-white">
                    {prospect.firstName.charAt(0)}{prospect.lastName.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">
                    {prospect.firstName} {prospect.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {prospect.title}
                  </p>
                </div>
              </div>

              {/* Company */}
              <div className="col-span-2 flex items-center">
                <p className="font-medium text-foreground truncate">
                  {prospect.company}
                </p>
              </div>

              {/* Email */}
              <div className="col-span-2 flex items-center">
                <p className="text-sm text-muted-foreground truncate">
                  {prospect.email}
                </p>
              </div>

              {/* Status */}
              <div className="col-span-2 flex items-center">
                {statusConfig.badge}
              </div>

              {/* Date */}
              <div className="col-span-1 flex items-center">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(prospect.createdAt), "MMM d")}
                </p>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(prospect.id);
                  }}
                  className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10"
                >
                  <Eye className="w-4 h-4 text-primary" />
                </Button>
                
                {prospect.status === "failed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(prospect.id);
                    }}
                    className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-warning/10"
                  >
                    <RotateCcw className="w-4 h-4 text-warning" />
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {prospect.firstName} {prospect.lastName} and all research data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(prospect.id)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Hover Indicator */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}