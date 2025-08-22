import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Calculator,
  Download,
  Filter,
  MoreVertical,
  Table as TableIcon,
  Grid,
  Upload,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// GST Master form schema
const gstMasterSchema = z.object({
  hsnCode: z.string().min(1, "HSN Code is required").max(20, "HSN Code must be 20 characters or less"),
  hsnDescription: z.string().min(1, "HSN Description is required"),
  gstRate: z.string().min(1, "GST Rate is required"),
  cgstRate: z.string().min(1, "CGST Rate is required"),
  sgstRate: z.string().min(1, "SGST Rate is required"),
  igstRate: z.string().min(1, "IGST Rate is required"),
  cessRate: z.string().optional(),
  uom: z.string().min(1, "UOM is required").max(20, "UOM must be 20 characters or less"),
  effectiveFrom: z.string().min(1, "Effective From date is required"),
  effectiveTo: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Validate that CGST + SGST = GST Rate
  const cgst = parseFloat(data.cgstRate);
  const sgst = parseFloat(data.sgstRate);
  const gst = parseFloat(data.gstRate);
  return Math.abs((cgst + sgst) - gst) < 0.01;
}, {
  message: "CGST + SGST must equal GST Rate",
  path: ["cgstRate"]
}).refine((data) => {
  // Validate that IGST = GST Rate
  const igst = parseFloat(data.igstRate);
  const gst = parseFloat(data.gstRate);
  return Math.abs(igst - gst) < 0.01;
}, {
  message: "IGST Rate must equal GST Rate",
  path: ["igstRate"]
}).refine((data) => {
  // Validate effective dates
  if (data.effectiveTo && data.effectiveFrom) {
    return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
  }
  return true;
}, {
  message: "Effective To date must be after Effective From date",
  path: ["effectiveTo"]
});

// Tax calculation schema
const taxCalculationSchema = z.object({
  hsnCode: z.string().min(1, "HSN Code is required"),
  amount: z.number().min(0, "Amount must be 0 or greater"),
  isInterstate: z.boolean().default(false),
  effectiveDate: z.string().optional(),
});

type GSTMasterFormData = z.infer<typeof gstMasterSchema>;
type TaxCalculationFormData = z.infer<typeof taxCalculationSchema>;

export default function GSTManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isTaxCalculatorOpen, setIsTaxCalculatorOpen] = useState(false);
  const [selectedGSTMaster, setSelectedGSTMaster] = useState<any>(null);
  const [taxResult, setTaxResult] = useState<any>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch GST masters
  const { data: gstMasters = [], isLoading } = useQuery({
    queryKey: ["/api/gst-masters", { search: searchTerm, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('hsnCode', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/gst-masters?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch GST masters');
      return response.json();
    },
  });

  // Create GST master mutation
  const createGSTMasterMutation = useMutation({
    mutationFn: async (data: GSTMasterFormData) => {
      const response = await fetch("/api/gst-masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create GST master');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-masters"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "GST master created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create GST master", 
        variant: "destructive" 
      });
    },
  });

  // Update GST master mutation
  const updateGSTMasterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: GSTMasterFormData }) => {
      const response = await fetch(`/api/gst-masters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update GST master');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-masters"] });
      setIsEditDialogOpen(false);
      setSelectedGSTMaster(null);
      toast({ title: "Success", description: "GST master updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update GST master", 
        variant: "destructive" 
      });
    },
  });

  // Delete GST master mutation
  const deleteGSTMasterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/gst-masters/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete GST master');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-masters"] });
      toast({ title: "Success", description: "GST master deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete GST master", 
        variant: "destructive" 
      });
    },
  });

  // Tax calculation mutation
  const calculateTaxMutation = useMutation({
    mutationFn: async (data: TaxCalculationFormData) => {
      const response = await fetch("/api/gst-calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate tax');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setTaxResult(data);
      toast({ title: "Success", description: "Tax calculated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to calculate tax", 
        variant: "destructive" 
      });
    },
  });

  // Import HSN codes mutation
  const importHsnMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/gst-masters/import-hsn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import HSN codes');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-masters"] });
      toast({
        title: "HSN Import Successful",
        description: `Imported ${data.stats?.imported || 0} HSN codes from official government sources. ${data.stats?.skipped || 0} codes were skipped (already exist).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import HSN codes from government sources",
        variant: "destructive",
      });
    },
  });

  // Form for creating/editing GST master
  const gstForm = useForm<GSTMasterFormData>({
    resolver: zodResolver(gstMasterSchema),
    defaultValues: {
      hsnCode: "",
      hsnDescription: "",
      gstRate: "",
      cgstRate: "",
      sgstRate: "",
      igstRate: "",
      cessRate: "0",
      uom: "",
      effectiveFrom: "",
      effectiveTo: "",
      status: "active",
      notes: "",
    },
  });

  // Form for tax calculation
  const taxForm = useForm<TaxCalculationFormData>({
    resolver: zodResolver(taxCalculationSchema),
    defaultValues: {
      hsnCode: "",
      amount: 0,
      isInterstate: false,
    },
  });

  // Filter GST masters based on search
  const filteredGSTMasters = gstMasters.filter((gst: any) =>
    gst.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gst.hsnDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGSTMaster = (data: GSTMasterFormData) => {
    createGSTMasterMutation.mutate(data);
  };

  const handleEditGSTMaster = (gst: any) => {
    setSelectedGSTMaster(gst);
    gstForm.reset({
      hsnCode: gst.hsnCode,
      hsnDescription: gst.hsnDescription,
      gstRate: gst.gstRate,
      cgstRate: gst.cgstRate,
      sgstRate: gst.sgstRate,
      igstRate: gst.igstRate,
      cessRate: gst.cessRate,
      uom: gst.uom,
      effectiveFrom: format(parseISO(gst.effectiveFrom), 'yyyy-MM-dd'),
      effectiveTo: gst.effectiveTo ? format(parseISO(gst.effectiveTo), 'yyyy-MM-dd') : "",
      status: gst.status,
      notes: gst.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateGSTMaster = (data: GSTMasterFormData) => {
    if (selectedGSTMaster) {
      updateGSTMasterMutation.mutate({ id: selectedGSTMaster.id, data });
    }
  };

  const handleDeleteGSTMaster = (id: number) => {
    if (confirm("Are you sure you want to delete this GST master?")) {
      deleteGSTMasterMutation.mutate(id);
    }
  };

  const handleViewGSTMaster = (gst: any) => {
    setSelectedGSTMaster(gst);
    setIsViewDialogOpen(true);
  };

  const handleCalculateTax = (data: TaxCalculationFormData) => {
    calculateTaxMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-700 border-red-200';
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only Admin users can access GST Management
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">GST Management</h1>
          <p className="text-muted-foreground">Manage GST rates and HSN codes for tax calculations</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Table/Cards Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              data-testid="button-table-view"
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              data-testid="button-cards-view"
            >
              <Grid className="w-4 h-4 mr-2" />
              Cards
            </Button>
          </div>
          <div className="h-4 w-px bg-border"></div>
          {/* Tax Calculator */}
          <Dialog open={isTaxCalculatorOpen} onOpenChange={setIsTaxCalculatorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-tax-calculator">
                <Calculator className="w-4 h-4 mr-2" />
                Tax Calculator
              </Button>
            </DialogTrigger>
            <TaxCalculatorDialog 
              form={taxForm}
              onSubmit={handleCalculateTax}
              isLoading={calculateTaxMutation.isPending}
              result={taxResult}
            />
          </Dialog>
          {/* Import HSN Codes */}
          <Button 
            variant="outline" 
            onClick={() => importHsnMutation.mutate()}
            disabled={importHsnMutation.isPending}
            data-testid="button-import-hsn"
          >
            {importHsnMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Import Official HSN Codes
          </Button>
          {/* Create GST Master */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-gst">
                <Plus className="w-4 h-4 mr-2" />
                Create GST Master
              </Button>
            </DialogTrigger>
            <GSTMasterDialog
              form={gstForm}
              onSubmit={handleCreateGSTMaster}
              isLoading={createGSTMasterMutation.isPending}
              title="Create GST Master"
            />
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search HSN Code / Description</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GST Masters List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            GST Masters
            <Badge variant="outline">
              {filteredGSTMasters.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : filteredGSTMasters.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No GST Masters Found</h3>
              <p className="text-muted-foreground mb-4">
                {gstMasters.length === 0 
                  ? "No GST masters have been created yet."
                  : "No GST masters match your current filters."
                }
              </p>
              {gstMasters.length === 0 && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First GST Master
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "table" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>GST Rate (%)</TableHead>
                      <TableHead>CGST (%)</TableHead>
                      <TableHead>SGST (%)</TableHead>
                      <TableHead>IGST (%)</TableHead>
                      <TableHead>Cess (%)</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGSTMasters.map((gst: any) => (
                      <TableRow key={gst.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium" data-testid={`hsn-code-${gst.id}`}>
                          {gst.hsnCode}
                        </TableCell>
                        <TableCell data-testid={`description-${gst.id}`}>
                          <div className="max-w-[200px] truncate">
                            {gst.hsnDescription}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`gst-rate-${gst.id}`}>
                          {gst.gstRate}%
                        </TableCell>
                        <TableCell data-testid={`cgst-rate-${gst.id}`}>
                          {gst.cgstRate}%
                        </TableCell>
                        <TableCell data-testid={`sgst-rate-${gst.id}`}>
                          {gst.sgstRate}%
                        </TableCell>
                        <TableCell data-testid={`igst-rate-${gst.id}`}>
                          {gst.igstRate}%
                        </TableCell>
                        <TableCell data-testid={`cess-rate-${gst.id}`}>
                          {gst.cessRate}%
                        </TableCell>
                        <TableCell data-testid={`uom-${gst.id}`}>
                          {gst.uom}
                        </TableCell>
                        <TableCell data-testid={`status-${gst.id}`}>
                          <Badge className={getStatusColor(gst.status)}>
                            {gst.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`effective-from-${gst.id}`}>
                          {format(parseISO(gst.effectiveFrom), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewGSTMaster(gst)}
                              data-testid={`button-view-${gst.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGSTMaster(gst)}
                              data-testid={`button-edit-${gst.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGSTMaster(gst.id)}
                              data-testid={`button-delete-${gst.id}`}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {filteredGSTMasters.map((gst: any) => (
                    <GSTMasterCard
                      key={gst.id}
                      gst={gst}
                      onView={handleViewGSTMaster}
                      onEdit={handleEditGSTMaster}
                      onDelete={handleDeleteGSTMaster}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <GSTMasterDialog
          form={gstForm}
          onSubmit={handleUpdateGSTMaster}
          isLoading={updateGSTMasterMutation.isPending}
          title="Edit GST Master"
        />
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>GST Master Details</DialogTitle>
          </DialogHeader>
          {selectedGSTMaster && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">HSN Code</Label>
                  <p className="text-sm">{selectedGSTMaster.hsnCode}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedGSTMaster.status)}>
                    {selectedGSTMaster.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm">{selectedGSTMaster.hsnDescription}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">GST Rate</Label>
                  <p className="text-sm">{selectedGSTMaster.gstRate}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">CGST Rate</Label>
                  <p className="text-sm">{selectedGSTMaster.cgstRate}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">SGST Rate</Label>
                  <p className="text-sm">{selectedGSTMaster.sgstRate}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">IGST Rate</Label>
                  <p className="text-sm">{selectedGSTMaster.igstRate}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cess Rate</Label>
                  <p className="text-sm">{selectedGSTMaster.cessRate}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">UOM</Label>
                  <p className="text-sm">{selectedGSTMaster.uom}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Effective From</Label>
                  <p className="text-sm">{format(parseISO(selectedGSTMaster.effectiveFrom), 'PPP')}</p>
                </div>
                {selectedGSTMaster.effectiveTo && (
                  <div>
                    <Label className="text-sm font-medium">Effective To</Label>
                    <p className="text-sm">{format(parseISO(selectedGSTMaster.effectiveTo), 'PPP')}</p>
                  </div>
                )}
              </div>
              {selectedGSTMaster.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm">{selectedGSTMaster.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <Label className="text-xs font-medium">Created By</Label>
                  <p>{selectedGSTMaster.createdBy}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Updated By</Label>
                  <p>{selectedGSTMaster.updatedBy}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// GST Master Card Component
function GSTMasterCard({ gst, onView, onEdit, onDelete, getStatusColor }: any) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{gst.hsnCode}</CardTitle>
            <CardDescription className="text-sm line-clamp-2">
              {gst.hsnDescription}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(gst.status)}>
            {gst.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">GST Rate</Label>
            <p className="font-medium">{gst.gstRate}%</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">UOM</Label>
            <p className="font-medium">{gst.uom}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CGST</Label>
            <p className="font-medium">{gst.cgstRate}%</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">SGST</Label>
            <p className="font-medium">{gst.sgstRate}%</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Effective from: {format(parseISO(gst.effectiveFrom), 'MMM d, yyyy')}
        </div>
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(gst)}
            data-testid={`button-view-card-${gst.id}`}
            className="flex items-center gap-2 flex-1"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(gst)}
            data-testid={`button-edit-card-${gst.id}`}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(gst.id)}
            data-testid={`button-delete-card-${gst.id}`}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// GST Master Dialog Component
function GSTMasterDialog({ form, onSubmit, isLoading, title }: any) {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Fill in the GST master details. CGST + SGST must equal GST Rate, and IGST must equal GST Rate.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hsnCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HSN Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter HSN Code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="uom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UOM *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., KG, PCS, MTR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="hsnDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HSN Description *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter HSN Description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="gstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Rate (%) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="18.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cgstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CGST Rate (%) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="9.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sgstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SGST Rate (%) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="9.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="igstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IGST Rate (%) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="18.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="cessRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cess Rate (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective From *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effectiveTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective To</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter additional notes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between items-center pt-4 border-t">
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogTrigger>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save GST Master"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// Tax Calculator Dialog Component
function TaxCalculatorDialog({ form, onSubmit, isLoading, result }: any) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>GST Tax Calculator</DialogTitle>
        <DialogDescription>
          Calculate GST tax breakdown for a given amount and HSN code
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hsnCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter HSN Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="1000.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isInterstate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Interstate Transaction</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check if this is an interstate transaction (uses IGST instead of CGST + SGST)
                    </p>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Calculating..." : "Calculate Tax"}
            </Button>
          </form>
        </Form>

        {result && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">Tax Calculation Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">HSN Code</Label>
                <p className="font-medium">{result.hsnCode}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                <p className="font-medium">{result.transactionType}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Base Amount</Label>
                <p className="font-medium">₹{result.baseAmount.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total Tax</Label>
                <p className="font-medium">₹{result.totalTax.toFixed(2)}</p>
              </div>
              {result.transactionType === 'domestic' ? (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">CGST ({result.cgstRate}%)</Label>
                    <p className="font-medium">₹{result.cgstAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SGST ({result.sgstRate}%)</Label>
                    <p className="font-medium">₹{result.sgstAmount.toFixed(2)}</p>
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-xs text-muted-foreground">IGST ({result.igstRate}%)</Label>
                  <p className="font-medium">₹{result.igstAmount.toFixed(2)}</p>
                </div>
              )}
              {result.cessAmount > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Cess ({result.cessRate}%)</Label>
                  <p className="font-medium">₹{result.cessAmount.toFixed(2)}</p>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Total Amount (Base + Tax)</Label>
                <p className="font-bold text-lg">₹{result.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
}