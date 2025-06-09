/**
 * FILE: prospect-table-enhanced.tsx
 * PURPOSE: Enhanced prospect table with sorting, filtering, search, and pagination
 * DEPENDENCIES: shadcn/ui components, lucide icons, date-fns
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Enhanced version of prospect-table-interactive with advanced table features
 * REF: Includes column sorting, advanced filtering, global search, and pagination
 * REF: Maintains all existing functionality while adding performance optimizations
 * 
 * FEATURES:
 * - Column sorting (name, company, status, date)
 * - Advanced filtering (status, date range, location)
 * - Global search across all fields
 * - Pagination for performance
 * - Bulk operations
 * - Expandable rows with research summaries
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { 
  Eye, 
  Trash2, 
  RotateCcw, 
  Users, 
  Building, 
  MapPin, 
  Brain, 
  Target, 
  Sparkles, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Calendar,
  Activity,
  BookOpen,
  FileText,
  Award,
  TrendingUp,
  Send,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ArrowUpDown,
  X,
  Sliders as Sliders3
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
  researchResults?: {
    location?: string;
    industry?: string;
    primaryJobCompany?: string;
    almaMaterResearch?: string;
    linkedInPostSummary?: string;
    companyLinkedInPostSummary?: string;
    companyNews?: string;
    painPoints?: string;
    businessGoals?: string;
    emailSubject?: string;
    emailBody?: string;
    fullOutput?: any;
    [key: string]: any;
  };
}

interface ProspectTableEnhancedProps {
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
  onBulkSendToReply?: () => void;
}

type SortField = 'name' | 'company' | 'status' | 'date' | 'location';
type SortDirection = 'asc' | 'desc';

export default function ProspectTableEnhanced({ 
  prospects, 
  isLoading, 
  onViewDetails, 
  onDelete, 
  onRetry,
  selectedProspects, 
  onSelectProspect, 
  onSelectAll, 
  onDeselectAll, 
  onBulkDelete,
  onBulkSendToReply
}: ProspectTableEnhancedProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  
  // Enhanced filtering and sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // REF: Helper function to get field value from research results
  const getResearchField = (prospect: Prospect, ...fieldNames: string[]) => {
    const results = prospect?.researchResults;
    if (!results) return null;
    
    for (const fieldName of fieldNames) {
      if (results[fieldName]) return results[fieldName];
    }
    
    const fullOutput = results.fullOutput;
    if (fullOutput) {
      for (const fieldName of fieldNames) {
        if (fullOutput[fieldName]) return fullOutput[fieldName];
      }
    }
    
    return null;
  };

  // REF: Get status configuration with proper styling
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          badge: (
            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </Badge>
          ),
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          bgColor: 'hsl(142 76% 96%)',
          borderColor: 'hsl(142 76% 80%)'
        };
      case 'processing':
        return {
          badge: (
            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-800 border-blue-200">
              <Clock className="w-3 h-3 animate-spin" />
              Processing
            </Badge>
          ),
          icon: <Clock className="w-4 h-4 text-blue-600 animate-spin" />,
          bgColor: 'hsl(213 100% 96%)',
          borderColor: 'hsl(213 100% 80%)'
        };
      case 'failed':
        return {
          badge: (
            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-red-100 text-red-800 border-red-200">
              <AlertTriangle className="w-3 h-3" />
              Failed
            </Badge>
          ),
          icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
          bgColor: 'hsl(0 84% 96%)',
          borderColor: 'hsl(0 84% 80%)'
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

  // REF: Advanced filtering and sorting logic
  const filteredAndSortedProspects = useMemo(() => {
    let filtered = prospects.filter((prospect) => {
      // Global search across multiple fields
      const searchMatch = !searchQuery || 
        `${prospect.firstName} ${prospect.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prospect.researchResults?.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prospect.researchResults?.industry || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === "all" || prospect.status === statusFilter;
      
      // Location filter
      const location = prospect.researchResults?.location || 'Unknown';
      const locationMatch = locationFilter === "all" || location === locationFilter;
      
      return searchMatch && statusMatch && locationMatch;
    });

    // Sorting logic
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'company':
          aValue = a.company.toLowerCase();
          bValue = b.company.toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'location':
          aValue = (a.researchResults?.location || 'Unknown').toLowerCase();
          bValue = (b.researchResults?.location || 'Unknown').toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [prospects, searchQuery, statusFilter, locationFilter, sortField, sortDirection]);

  // REF: Pagination logic
  const totalPages = Math.ceil(filteredAndSortedProspects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProspects = filteredAndSortedProspects.slice(startIndex, endIndex);

  // REF: Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = prospects
      .map(p => p.researchResults?.location || 'Unknown')
      .filter((location, index, arr) => arr.indexOf(location) === index)
      .sort();
    return locations;
  }, [prospects]);

  // REF: Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // REF: Handle filter changes
  const handleFilterChange = (type: 'status' | 'location', value: string) => {
    if (type === 'status') {
      setStatusFilter(value);
    } else if (type === 'location') {
      setLocationFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  // REF: Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setLocationFilter("all");
    setCurrentPage(1);
  };

  // REF: Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <SortAsc className="w-4 h-4 text-primary" />
      : <SortDesc className="w-4 h-4 text-primary" />;
  };

  const allSelected = paginatedProspects.length > 0 && 
    paginatedProspects.every(p => selectedProspects.includes(p.id));
  const someSelected = paginatedProspects.some(p => selectedProspects.includes(p.id)) && !allSelected;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search and Filter Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Table Skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border border-border/50 rounded-xl">
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
      {/* Enhanced Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Top Row: Search and Toggle Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search prospects, companies, locations..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Sliders3 className="w-4 h-4" />
                Filters
                {(statusFilter !== "all" || locationFilter !== "all") && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {(statusFilter !== "all" ? 1 : 0) + (locationFilter !== "all" ? 1 : 0)}
                  </Badge>
                )}
              </Button>
              
              {(searchQuery || statusFilter !== "all" || locationFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* Filter Controls - Collapsible */}
            {showFilters && (
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status:</span>
                  <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Location:</span>
                  <Select value={locationFilter} onValueChange={(value) => handleFilterChange('location', value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground ml-auto">
                  {filteredAndSortedProspects.length} of {prospects.length} prospects
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Header */}
      {selectedProspects.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedProspects.length} prospect{selectedProspects.length === 1 ? '' : 's'} selected
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {onBulkSendToReply && (
                  <Button
                    onClick={onBulkSendToReply}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to Reply.io
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedProspects.length} prospect{selectedProspects.length === 1 ? '' : 's'}? 
                        This action cannot be undone and will permanently remove their research data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={onBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete All Selected
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Table - Mobile Responsive */}
      <div className="space-y-2">
        {/* Mobile-Optimized Table Header */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 p-4 border border-border/50 rounded-xl font-medium text-sm text-muted-foreground"
             style={{ background: 'var(--gradient-surface)' }}>
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={allSelected ? onDeselectAll : onSelectAll}
              className="rounded"
              data-state={someSelected ? "indeterminate" : undefined}
            />
          </div>
          
          {/* Sortable Prospect Column */}
          <div className="col-span-3 flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => handleSort('name')}
              className="h-auto p-0 hover:bg-transparent flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Prospect</span>
              {getSortIcon('name')}
            </Button>
          </div>
          
          {/* Sortable Company Column */}
          <div className="col-span-2 flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => handleSort('company')}
              className="h-auto p-0 hover:bg-transparent flex items-center space-x-2"
            >
              <Building className="w-4 h-4" />
              <span>Company</span>
              {getSortIcon('company')}
            </Button>
          </div>
          
          {/* Sortable Location Column */}
          <div className="col-span-2 flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => handleSort('location')}
              className="h-auto p-0 hover:bg-transparent flex items-center space-x-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Location</span>
              {getSortIcon('location')}
            </Button>
          </div>
          
          {/* Sortable Status Column */}
          <div className="col-span-2 flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => handleSort('status')}
              className="h-auto p-0 hover:bg-transparent flex items-center space-x-2"
            >
              <Target className="w-4 h-4" />
              <span>Status</span>
              {getSortIcon('status')}
            </Button>
          </div>
          
          {/* Sortable Date Column */}
          <div className="col-span-1 flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => handleSort('date')}
              className="h-auto p-0 hover:bg-transparent flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Date</span>
              {getSortIcon('date')}
            </Button>
          </div>
          
          <div className="col-span-1">
            <span>Actions</span>
          </div>
        </div>

        {/* Mobile-Only Simplified Header */}
        <div className="sm:hidden flex items-center justify-between p-3 border border-border/50 rounded-xl font-medium text-sm text-muted-foreground"
             style={{ background: 'var(--gradient-surface)' }}>
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={allSelected ? onDeselectAll : onSelectAll}
              className="rounded"
              data-state={someSelected ? "indeterminate" : undefined}
            />
            <span>Prospects ({paginatedProspects.length})</span>
          </div>
          
          {/* Mobile Sort Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => handleSort('name')}
              className="h-auto p-1 hover:bg-transparent"
              title="Sort by name"
            >
              <Users className="w-4 h-4" />
              {getSortIcon('name')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSort('status')}
              className="h-auto p-1 hover:bg-transparent"
              title="Sort by status"
            >
              <Target className="w-4 h-4" />
              {getSortIcon('status')}
            </Button>
          </div>
        </div>

        {/* Table Rows */}
        {paginatedProspects.map((prospect, index) => {
          const statusConfig = getStatusConfig(prospect.status);
          const isSelected = selectedProspects.includes(prospect.id);
          const isHovered = hoveredRow === prospect.id;
          const isExpanded = expandedRow === prospect.id;
          
          const handleRowClick = (e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input[type="checkbox"]') || target.closest('a')) {
              return;
            }
            setExpandedRow(isExpanded ? null : prospect.id);
          };
          
          return (
            <div key={prospect.id} className="space-y-0">
              {/* Desktop Table Row */}
              <div
                className={`
                  hidden sm:grid sm:grid-cols-12 gap-4 p-4 border border-border/50 rounded-xl transition-all duration-300 cursor-pointer group 
                  hover:scale-[1.01] hover:shadow-md hover:bg-muted/20 hover:border-primary/30
                  analytics-card
                  ${isSelected ? 'bg-primary/5 border-primary/20' : ''}
                  ${isExpanded ? 'bg-muted/20' : ''}
                  ${isHovered ? 'bg-muted/10 border-primary/20' : ''}
                `}
                style={{ 
                  background: isSelected ? 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--secondary) / 0.05))' : 
                             isExpanded ? 'hsl(var(--muted) / 0.2)' : 'hsl(var(--card))',
                  borderColor: isSelected ? 'hsl(var(--primary) / 0.3)' : 
                              isExpanded ? 'hsl(var(--border))' : 
                              isHovered ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border) / 0.5)',
                  animation: `chart-entrance 0.3s ease ${index * 0.1}s both`,
                  borderBottomLeftRadius: isExpanded ? '0' : undefined,
                  borderBottomRightRadius: isExpanded ? '0' : undefined
                }}
                onMouseEnter={() => setHoveredRow(prospect.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={handleRowClick}
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
                <div className="col-span-3 flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl border-2 border-border/50 flex items-center justify-center flex-shrink-0 animate-float-enhanced"
                       style={{ background: 'var(--gradient-accent)' }}>
                    <span className="text-sm font-bold text-white">
                      {prospect.firstName.charAt(0)}{prospect.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(prospect.id);
                      }}
                      className="text-left hover:text-primary transition-colors duration-200 btn-enhanced w-full"
                    >
                      <p className="font-semibold text-foreground truncate">
                        {prospect.firstName} {prospect.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate" title={prospect.title}>
                        {prospect.title}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Company */}
                <div className="col-span-2 flex items-center min-w-0">
                  <p className="font-medium text-foreground truncate" title={prospect.company}>
                    {prospect.company}
                  </p>
                </div>

                {/* Location */}
                <div className="col-span-2 flex items-center min-w-0">
                  <p className="text-sm text-muted-foreground truncate" title={prospect.researchResults?.location || "Unknown"}>
                    {prospect.researchResults?.location || "Unknown"}
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
                <div className="col-span-1 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(prospect.id);
                      }}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 transition-all duration-200 btn-enhanced"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {prospect.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetry(prospect.id);
                        }}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-warning/10 transition-all duration-200 btn-enhanced"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 transition-all duration-200 btn-enhanced"
                        >
                          <Trash2 className="w-4 h-4" />
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
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRow(isExpanded ? null : prospect.id);
                    }}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted/20 transition-all duration-200 btn-enhanced"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Mobile Card Layout */}
              <div
                className={`
                  sm:hidden border border-border/50 rounded-xl transition-all duration-300 cursor-pointer group 
                  hover:shadow-md hover:bg-muted/20 hover:border-primary/30
                  analytics-card
                  ${isSelected ? 'bg-primary/5 border-primary/20' : ''}
                  ${isExpanded ? 'bg-muted/20' : ''}
                  ${isHovered ? 'bg-muted/10 border-primary/20' : ''}
                `}
                style={{ 
                  background: isSelected ? 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--secondary) / 0.05))' : 
                             isExpanded ? 'hsl(var(--muted) / 0.2)' : 'hsl(var(--card))',
                  borderColor: isSelected ? 'hsl(var(--primary) / 0.3)' : 
                              isExpanded ? 'hsl(var(--border))' : 
                              isHovered ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border) / 0.5)',
                  animation: `chart-entrance 0.3s ease ${index * 0.1}s both`,
                  borderBottomLeftRadius: isExpanded ? '0' : undefined,
                  borderBottomRightRadius: isExpanded ? '0' : undefined
                }}
                onMouseEnter={() => setHoveredRow(prospect.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={handleRowClick}
              >
                <div className="p-3 space-y-3">
                  {/* Mobile Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectProspect(prospect.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded flex-shrink-0"
                      />
                      <div className="w-8 h-8 rounded-lg border-2 border-border/50 flex items-center justify-center flex-shrink-0 animate-float-enhanced"
                           style={{ background: 'var(--gradient-accent)' }}>
                        <span className="text-xs font-bold text-white">
                          {prospect.firstName.charAt(0)}{prospect.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(prospect.id);
                          }}
                          className="text-left hover:text-primary transition-colors duration-200 btn-enhanced w-full"
                        >
                          <p className="font-semibold text-foreground truncate text-sm">
                            {prospect.firstName} {prospect.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={prospect.company}>
                            {prospect.company}
                          </p>
                        </button>
                      </div>
                    </div>
                    
                    {/* Mobile Status & Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="scale-75">
                        {statusConfig.badge}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(prospect.id);
                        }}
                        className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 transition-all duration-200 btn-enhanced"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRow(isExpanded ? null : prospect.id);
                        }}
                        className="h-7 w-7 p-0 rounded-lg hover:bg-muted/20 transition-all duration-200 btn-enhanced"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Details Row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="truncate" title={prospect.title}>
                        {prospect.title}
                      </span>
                      {prospect.researchResults?.location && (
                        <span className="truncate" title={prospect.researchResults.location}>
                          📍 {prospect.researchResults.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span>{format(new Date(prospect.createdAt), "MMM d")}</span>
                      {prospect.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetry(prospect.id);
                          }}
                          className="h-6 w-6 p-0 rounded hover:bg-warning/10 transition-all duration-200 btn-enhanced"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 w-6 p-0 rounded hover:bg-destructive/10 transition-all duration-200 btn-enhanced"
                          >
                            <Trash2 className="w-3 h-3" />
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
                  </div>
                </div>
              </div>

              {/* Expandable Research Summary */}
              {isExpanded && (
                <div 
                  className="border-l border-r border-b border-border/50 rounded-b-xl p-6 chart-container"
                  style={{ 
                    background: 'var(--gradient-surface)',
                    borderColor: isSelected ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border) / 0.5)'
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prospect Summary */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary animate-pulse-glow-enhanced" />
                        Prospect Summary
                      </h4>
                      
                      <div className="p-4 rounded-lg border border-border/50 glass-enhanced">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {getResearchField(prospect, 'Overall Prospect Summary') || 
                           `${prospect.firstName} ${prospect.lastName} is the ${prospect.title} at ${prospect.company}${prospect.researchResults?.location ? `, based in ${prospect.researchResults.location}` : ''}.`}
                        </p>
                      </div>
                    </div>

                    {/* Company Summary */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <Building className="w-5 h-5 mr-2 text-success animate-pulse-glow-enhanced" />
                        Company Summary
                      </h4>
                      
                      <div className="p-4 rounded-lg border border-border/50 glass-enhanced">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {getResearchField(prospect, 'Overall Company Summary') || 
                           `${prospect.company}${prospect.researchResults?.industry ? ` operates in the ${prospect.researchResults.industry} industry` : ''}.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions in Summary */}
                  {prospect.status === "completed" && getResearchField(prospect, 'Email Subject', 'emailSubject') && (
                    <div className="mt-6 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Sparkles className="w-4 h-4 animate-pulse-glow-enhanced" />
                          <span>Personalized email ready</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(prospect.id);
                          }}
                          className="rounded-xl btn-enhanced"
                          style={{ background: 'var(--gradient-primary)', color: 'white' }}
                        >
                          View Full Profile
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedProspects.length)} of {filteredAndSortedProspects.length} prospects
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {filteredAndSortedProspects.length === 0 && prospects.length > 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl border-2 border-border/50 flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'var(--gradient-surface)' }}>
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No prospects match your filters</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search criteria or clearing the filters.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 