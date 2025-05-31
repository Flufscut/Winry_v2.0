import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Info, Loader2 } from "lucide-react";

interface CsvUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface CsvPreview {
  headers: string[];
  rowCount: number;
  preview: Record<string, any>[];
}

interface ColumnMapping {
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  email: string;
  linkedinUrl: string;
}

export default function CsvUpload({ onSuccess, onCancel }: CsvUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [batchSize, setBatchSize] = useState(10);
  const [startRow, setStartRow] = useState(1);
  const [maxRows, setMaxRows] = useState<number | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    firstName: "",
    lastName: "",
    company: "",
    title: "",
    email: "",
    linkedinUrl: "none",
  });

  // Upload and preview CSV
  const uploadCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('hasHeaders', hasHeaders.toString());
      
      const response = await fetch('/api/prospects/csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return await response.json();
    },
    onSuccess: (data: CsvPreview) => {
      setCsvPreview(data);
      
      // Auto-map common column names
      const autoMapping: Partial<ColumnMapping> = {};
      data.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
          autoMapping.firstName = header;
        } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
          autoMapping.lastName = header;
        } else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
          autoMapping.company = header;
        } else if (lowerHeader.includes('title') || lowerHeader.includes('position')) {
          autoMapping.title = header;
        } else if (lowerHeader.includes('email')) {
          autoMapping.email = header;
        } else if (lowerHeader.includes('linkedin')) {
          autoMapping.linkedinUrl = header;
        }
      });
      
      setMapping(prev => ({ ...prev, ...autoMapping }));
    },
    onError: (error) => {
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
        description: error.message || "Failed to upload CSV",
        variant: "destructive",
      });
    },
  });

  // Process CSV with mapping
  const processCsvMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('hasHeaders', hasHeaders.toString());
      formData.append('batchSize', batchSize.toString());
      formData.append('startRow', startRow.toString());
      formData.append('maxRows', maxRows ? maxRows.toString() : '');
      
      const response = await fetch('/api/prospects/csv/process', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `CSV processing started for ${data.totalRows} prospects!`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      onSuccess();
    },
    onError: (error) => {
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
        description: error.message || "Failed to process CSV",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Error",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      uploadCsvMutation.mutate(selectedFile);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const canProcess = csvPreview && 
    mapping.firstName && 
    mapping.lastName && 
    mapping.company && 
    mapping.title && 
    mapping.email;

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Upload CSV File</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6 mt-6">
        {/* CSV Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hasHeaders"
              checked={hasHeaders}
              onCheckedChange={(checked) => setHasHeaders(checked === true)}
            />
            <Label htmlFor="hasHeaders" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              First row contains headers
            </Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-4">
              <Label htmlFor="batchSize" className="text-sm font-medium whitespace-nowrap">
                Batch size:
              </Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="100"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">prospects</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Label htmlFor="startRow" className="text-sm font-medium whitespace-nowrap">
                Start at row:
              </Label>
              <Input
                id="startRow"
                type="number"
                min="1"
                value={startRow}
                onChange={(e) => setStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Label htmlFor="maxRows" className="text-sm font-medium whitespace-nowrap">
                Max rows:
              </Label>
              <Input
                id="maxRows"
                type="number"
                min="1"
                value={maxRows || ""}
                placeholder="All"
                onChange={(e) => setMaxRows(e.target.value ? parseInt(e.target.value) || null : null)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">leave empty for all</span>
            </div>
          </div>
        </div>
        
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors duration-200">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <div className="mt-4">
            <Label htmlFor="csvFile" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-foreground">
                Drop your CSV file here, or <span className="text-primary">browse</span>
              </span>
              <input
                id="csvFile"
                name="csvFile"
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileChange}
                disabled={uploadCsvMutation.isPending}
              />
            </Label>
            <p className="mt-2 text-xs text-muted-foreground">CSV files only (max 10MB)</p>
          </div>
          
          {uploadCsvMutation.isPending && (
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Processing file...</span>
            </div>
          )}
        </div>
        
        {/* Column Mapping */}
        {csvPreview && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Found {csvPreview.rowCount} rows with {csvPreview.headers.length} columns. 
                {(() => {
                  const totalRows = csvPreview.rowCount;
                  const effectiveStartRow = Math.min(startRow, totalRows);
                  const remainingRows = Math.max(0, totalRows - effectiveStartRow + 1);
                  const rowsToProcess = maxRows ? Math.min(maxRows, remainingRows) : remainingRows;
                  
                  return ` Will process ${rowsToProcess} rows (starting from row ${effectiveStartRow}${maxRows ? `, max ${maxRows}` : ''}).`;
                })()}
              </AlertDescription>
            </Alert>
            
            <h4 className="text-md font-semibold text-foreground">Map CSV Columns</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Select value={mapping.firstName} onValueChange={(value) => handleMappingChange('firstName', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Last Name *</Label>
                <Select value={mapping.lastName} onValueChange={(value) => handleMappingChange('lastName', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Company *</Label>
                <Select value={mapping.company} onValueChange={(value) => handleMappingChange('company', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Job Title *</Label>
                <Select value={mapping.title} onValueChange={(value) => handleMappingChange('title', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Email *</Label>
                <Select value={mapping.email} onValueChange={(value) => handleMappingChange('email', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>LinkedIn URL</Label>
                <Select value={mapping.linkedinUrl} onValueChange={(value) => handleMappingChange('linkedinUrl', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {csvPreview.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Preview:</strong> We found {csvPreview.rowCount} prospects in your CSV file. 
                Make sure all required fields are mapped before proceeding.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {canProcess && (
            <Button 
              onClick={() => processCsvMutation.mutate()}
              disabled={processCsvMutation.isPending}
            >
              {processCsvMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Process {csvPreview.rowCount} Prospects
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
