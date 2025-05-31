import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Trash2 } from "lucide-react";
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
  selectedProspects: number[];
  onSelectProspect: (id: number, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
}

export default function ProspectTable({ 
  prospects, 
  isLoading, 
  onViewDetails, 
  onDelete, 
  selectedProspects, 
  onSelectProspect, 
  onSelectAll, 
  onDeselectAll, 
  onBulkDelete 
}: ProspectTableProps) {
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  const allSelected = prospects.length > 0 && selectedProspects.length === prospects.length;
  const someSelected = selectedProspects.length > 0 && selectedProspects.length < prospects.length;

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No prospects found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start by adding a prospect or uploading a CSV file
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      {prospects.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => allSelected ? onDeselectAll() : onSelectAll()}
                aria-label={allSelected ? "Deselect all prospects" : "Select all prospects"}
              />
              <span className="text-sm font-medium">
                {allSelected ? "Deselect All" : "Select All"}
              </span>
            </div>
            {selectedProspects.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedProspects.length} selected
              </span>
            )}
          </div>
          
          {selectedProspects.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedProspects.length})
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
          )}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Prospect</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((prospect) => (
              <TableRow key={prospect.id} className="prospect-row">
                <TableCell>
                  <Checkbox
                    checked={selectedProspects.includes(prospect.id)}
                    onCheckedChange={(checked) => onSelectProspect(prospect.id, checked === true)}
                    aria-label={`Select ${prospect.firstName} ${prospect.lastName}`}
                  />
                </TableCell>
                <TableCell>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {getInitials(prospect.firstName, prospect.lastName)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-foreground">
                      {prospect.firstName} {prospect.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {prospect.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {prospect.company}
              </TableCell>
              <TableCell className="text-sm text-foreground max-w-48 truncate">
                {prospect.title}
              </TableCell>
              <TableCell>
                {getStatusBadge(prospect.status)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(prospect.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {prospect.status === "completed" ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewDetails(prospect.id)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  ) : prospect.status === "processing" ? (
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewDetails(prospect.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Error
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {prospect.firstName} {prospect.lastName}? 
                          This action cannot be undone and will permanently remove their research data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(prospect.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
