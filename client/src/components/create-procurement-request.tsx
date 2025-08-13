import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Upload, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  File,
  Download,
  ShoppingCart,
  List,
  Copy
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
// XLSX will be handled via file reader for now

interface BOMLineItem {
  itemCode?: string;
  itemName: string;
  description?: string;
  uom: string;
  quantity: number;
  specifications?: string;
  isMapped: boolean;
  productId?: string;
  estimatedPrice?: number;
  catalogReference?: string; // New field for catalog reference
}

interface Product {
  id: string;
  itemName: string;
  internalCode?: string;
  externalCode?: string;
  description?: string;
  uom?: string;
  basePrice?: number;
  specifications?: any;
}

interface CreateProcurementRequestFormData {
  title: string;
  department: string;
  needByDate: string;
  urgency: "NORMAL" | "HIGH" | "CRITICAL";
  budgetCode?: string;
  notes?: string;
  bomLineItems: BOMLineItem[];
  attachments: File[];
  selectedBomId?: string; // New field for selected BOM
}

interface CreateProcurementRequestDialogProps {
  trigger: React.ReactNode;
}

export function CreateProcurementRequestDialog({ trigger }: CreateProcurementRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState<CreateProcurementRequestFormData>({
    title: "",
    department: "",
    needByDate: "",
    urgency: "NORMAL",
    budgetCode: "",
    notes: "",
    bomLineItems: [],
    attachments: [],
    selectedBomId: undefined,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get available products for catalog mapping
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Get available departments for dropdown
  const { data: departments = [] } = useQuery<Array<{id: string; name: string; code: string}>>({
    queryKey: ['/api/departments'],
  });

  // Get existing BOMs for selection
  const { data: existingBoms = [] } = useQuery<Array<{id: string; name: string; version: string; description?: string}>>({
    queryKey: ['/api/boms'],
  });

  // Validate BOM items against catalog
  const validateBOMMutation = useMutation({
    mutationFn: async (lineItems: BOMLineItem[]) => {
      return apiRequest('/api/bom/validate', {
        method: 'POST',
        body: JSON.stringify({ lineItems }),
      });
    },
    onSuccess: (validationResult) => {
      // Update line items with mapping status
      const updatedItems = formData.bomLineItems.map((item, index) => ({
        ...item,
        isMapped: validationResult.mappedItems?.includes(index) || false,
        productId: validationResult.mappedProducts?.[index]?.id,
      }));
      setFormData(prev => ({ ...prev, bomLineItems: updatedItems }));
      
      toast({
        title: "Validation Complete",
        description: `${validationResult.mappedCount || 0} items mapped to catalog`,
      });
    },
  });

  // Create procurement request
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.attachments && data.attachments.length > 0) {
        // Use FormData when attachments are present
        const formDataPayload = new FormData();
        
        // Add form data
        formDataPayload.append('data', JSON.stringify({
          title: data.title,
          department: data.department,
          needByDate: data.needByDate,
          urgency: data.urgency,
          budgetCode: data.budgetCode,
          notes: data.notes,
          bomLineItems: data.bomLineItems,
          selectedBomId: data.selectedBomId,
          requestedBy: user?.id,
        }));

        // Add attachments
        data.attachments.forEach((file: File, index: number) => {
          formDataPayload.append(`attachment_${index}`, file);
        });

        return apiRequest('/api/pr', {
          method: 'POST',
          body: formDataPayload,
        });
      } else {
        // Use JSON when no attachments
        return apiRequest('/api/pr', {
          method: 'POST',
          body: JSON.stringify({
            title: data.title,
            department: data.department,
            needByDate: data.needByDate,
            urgency: data.urgency,
            budgetCode: data.budgetCode,
            notes: data.notes,
            bomLineItems: data.bomLineItems,
            selectedBomId: data.selectedBomId,
            requestedBy: user?.id,
          }),
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement-requests'] });
      toast({
        title: "Success",
        description: `Procurement request ${result.prId} created successfully`,
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create procurement request",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      department: user?.department || "",
      needByDate: "",
      urgency: "NORMAL",
      budgetCode: "",
      notes: "",
      bomLineItems: [],
      attachments: [],
      selectedBomId: undefined,
    });
    setActiveTab("details");
  };

  // Handle CSV file upload and parsing (simpler approach)
  const handleXLSXUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error("File must have header and at least one data row");
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const bomItems: BOMLineItem[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length === 0 || !values[0]) continue;

          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          bomItems.push({
            itemCode: row.item_code || row.itemcode || "",
            itemName: row.item_desc || row.itemname || row.description || "",
            description: row.description || row.desc || "",
            uom: row.uom || "PCS",
            quantity: parseFloat(row.qty || row.quantity || "1"),
            specifications: row.specs || row.specifications || "",
            isMapped: false,
          });
        }

        setFormData(prev => ({ ...prev, bomLineItems: bomItems }));
        setActiveTab("bom");
        
        toast({
          title: "File Uploaded",
          description: `Imported ${bomItems.length} line items from CSV`,
        });

        // Auto-validate against catalog
        validateBOMMutation.mutate(bomItems);
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please use CSV format with headers: item_code,item_desc,uom,qty,specs",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Add manual line item
  const addLineItem = () => {
    const newItem: BOMLineItem = {
      itemName: "",
      uom: "PCS",
      quantity: 1,
      isMapped: false,
    };
    setFormData(prev => ({ 
      ...prev, 
      bomLineItems: [...prev.bomLineItems, newItem] 
    }));
  };

  // Update line item
  const updateLineItem = (index: number, updates: Partial<BOMLineItem>) => {
    const updatedItems = [...formData.bomLineItems];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    setFormData(prev => ({ ...prev, bomLineItems: updatedItems }));
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bomLineItems: prev.bomLineItems.filter((_, i) => i !== index)
    }));
  };

  // Handle file attachments
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Form validation
  const isValidForm = () => {
    if (!formData.title || !formData.department || !formData.needByDate) {
      return false;
    }
    
    // Must have either a selected BOM or manual line items
    if (!formData.selectedBomId && formData.bomLineItems.length === 0) {
      return false;
    }

    // Check if need by date is not in the past
    const needByDate = new Date(formData.needByDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return needByDate >= today;
  };

  const handleSubmit = () => {
    if (!isValidForm()) {
      let errorMsg = "Please fill all required fields";
      if (!formData.selectedBomId && formData.bomLineItems.length === 0) {
        errorMsg = "Please either select an existing BOM or add line items manually";
      } else if (formData.needByDate && new Date(formData.needByDate) < new Date()) {
        errorMsg = "Need by date cannot be in the past";
      }
      
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const mappedItemsCount = formData.bomLineItems.filter(item => item.isMapped).length;
  const unmappedItemsCount = formData.bomLineItems.length - mappedItemsCount;

  // Handle BOM template download
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/bom/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bom_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Template Downloaded",
        description: "BOM template downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download BOM template",
        variant: "destructive",
      });
    }
  };

  // Select BOM from existing list and load its items
  const selectExistingBOM = async (bomId: string) => {
    const selectedBom = existingBoms.find(bom => bom.id === bomId);
    
    try {
      // Load BOM items for editing
      const response = await apiRequest(`/api/boms/${bomId}/items`);
      const bomItems = response.map((item: any) => ({
        itemCode: item.itemCode || '',
        itemName: item.itemName,
        description: item.description || '',
        uom: item.uom || 'PCS',
        quantity: parseFloat(item.quantity) || 1,
        specifications: item.specifications || '',
        catalogReference: item.productId ? `CATALOG-${item.productId}` : '',
        isMapped: !!item.productId,
        productId: item.productId,
        estimatedPrice: parseFloat(item.unitPrice) || 0,
      }));

      setFormData(prev => ({ 
        ...prev, 
        selectedBomId: bomId,
        bomLineItems: bomItems // Load BOM items for display and editing
      }));
      setActiveTab("bom");
      
      toast({
        title: "BOM Selected",
        description: `Selected "${selectedBom?.name}" with ${bomItems.length} items for editing`,
      });
    } catch (error) {
      toast({
        title: "Error Loading BOM",
        description: "Failed to load BOM items",
        variant: "destructive",
      });
    }
  };

  // Clear BOM selection and allow manual entry
  const clearBOMSelection = () => {
    setFormData(prev => ({ 
      ...prev, 
      selectedBomId: undefined
    }));
    
    toast({
      title: "BOM Selection Cleared",
      description: "You can now add items manually or upload a file",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Procurement Request</DialogTitle>
          <DialogDescription>
            Create a new procurement request for department approval
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" data-testid="tab-details">Request Details</TabsTrigger>
            <TabsTrigger value="bom" data-testid="tab-bom">
              BOM Items
              {formData.bomLineItems.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {formData.bomLineItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">Review & Submit</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Procurement request title"
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.code}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="needByDate">Need By Date *</Label>
                <Input
                  id="needByDate"
                  type="date"
                  value={formData.needByDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, needByDate: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  data-testid="input-need-by-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency</Label>
                <Select value={formData.urgency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}>
                  <SelectTrigger data-testid="select-urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetCode">Budget Code (Optional)</Label>
              <Input
                id="budgetCode"
                value={formData.budgetCode}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetCode: e.target.value }))}
                placeholder="Budget code or cost center"
                data-testid="input-budget-code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or requirements"
                rows={3}
                data-testid="textarea-notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-add-attachment"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        data-testid={`button-remove-attachment-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bom" className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">BOM Selection & Line Items</h3>
                <p className="text-sm text-muted-foreground">
                  Select an existing BOM, upload a file, or add items manually
                </p>
              </div>
              {!formData.selectedBomId && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    data-testid="button-download-template"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => xlsxInputRef.current?.click()}
                    data-testid="button-upload-xlsx"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CSV/XLSX
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLineItem}
                    data-testid="button-add-line-item"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                  <input
                    ref={xlsxInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleXLSXUpload}
                  />
                </div>
              )}
            </div>

            {/* BOM Selection */}
            {existingBoms.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Select Existing BOM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.selectedBomId ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-green-900 dark:text-green-100">
                              {existingBoms.find(b => b.id === formData.selectedBomId)?.name}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">
                              BOM selected for this procurement request
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={clearBOMSelection}
                          data-testid="button-clear-bom-selection"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        BOM items are loaded below and can be edited. Clear selection to add items manually instead.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {existingBoms.map((bom) => (
                        <div key={bom.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{bom.name}</div>
                            <div className="text-xs text-muted-foreground">v{bom.version}</div>
                            {bom.description && (
                              <div className="text-xs text-muted-foreground truncate">{bom.description}</div>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => selectExistingBOM(bom.id)}
                            data-testid={`button-select-bom-${bom.id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {formData.bomLineItems.length > 0 && (
              <>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Mapped: {mappedItemsCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Unmapped: {unmappedItemsCount}</span>
                  </div>
                  {unmappedItemsCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => validateBOMMutation.mutate(formData.bomLineItems)}
                      disabled={validateBOMMutation.isPending}
                    >
                      Re-validate Catalog
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name *</TableHead>
                        <TableHead>UOM *</TableHead>
                        <TableHead>Quantity *</TableHead>
                        <TableHead>Specifications</TableHead>
                        <TableHead>Catalog Ref</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.bomLineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.isMapped ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.itemCode || ""}
                              onChange={(e) => updateLineItem(index, { itemCode: e.target.value })}
                              placeholder="Item code"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.itemName}
                              onChange={(e) => updateLineItem(index, { itemName: e.target.value })}
                              placeholder="Item name"
                              className="w-48"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.uom}
                              onChange={(e) => updateLineItem(index, { uom: e.target.value })}
                              placeholder="UOM"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, { quantity: parseFloat(e.target.value) || 1 })}
                              className="w-24"
                              min="0.001"
                              step="0.001"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.specifications || ""}
                              onChange={(e) => updateLineItem(index, { specifications: e.target.value })}
                              placeholder="Specifications"
                              className="w-48"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.catalogReference || "none"} 
                              onValueChange={(value) => updateLineItem(index, { 
                                catalogReference: value === "none" ? "" : value, 
                                productId: value.startsWith('CATALOG-') ? value.replace('CATALOG-', '') : undefined,
                                isMapped: value !== "none" && !!value 
                              })}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {products.map((product) => (
                                  <SelectItem 
                                    key={product.id} 
                                    value={`CATALOG-${product.id}`}
                                  >
                                    {product.itemName} ({product.internalCode || 'No Code'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              data-testid={`button-remove-line-item-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {formData.bomLineItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No BOM items added yet</p>
                <p className="text-sm">Upload an XLSX file or add items manually</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Request Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Title:</span> {formData.title}
                  </div>
                  <div>
                    <span className="font-medium">Department:</span> {formData.department}
                  </div>
                  <div>
                    <span className="font-medium">Need By Date:</span> {formData.needByDate}
                  </div>
                  <div>
                    <span className="font-medium">Urgency:</span> 
                    <Badge className={`ml-2 ${
                      formData.urgency === "CRITICAL" ? "bg-red-100 text-red-800" :
                      formData.urgency === "HIGH" ? "bg-orange-100 text-orange-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {formData.urgency}
                    </Badge>
                  </div>
                  {formData.budgetCode && (
                    <div>
                      <span className="font-medium">Budget Code:</span> {formData.budgetCode}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">BOM Items ({formData.bomLineItems.length})</h3>
                <div className="flex gap-4 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Mapped to catalog: {mappedItemsCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Require catalog mapping: {unmappedItemsCount}</span>
                  </div>
                </div>
                
                {unmappedItemsCount > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Catalog Mapping Required</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      {unmappedItemsCount} items need catalog mapping. The procurement team will review these items.
                    </p>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.bomLineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.isMapped ? (
                              <Badge className="bg-green-100 text-green-800">Mapped</Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">Unmapped</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.itemName}</div>
                              {item.itemCode && (
                                <div className="text-xs text-muted-foreground">Code: {item.itemCode}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {formData.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Attachments ({formData.attachments.length})</h3>
                    <div className="space-y-2">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <File className="w-4 h-4" />
                          <span>{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(file.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== "details" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === "bom") setActiveTab("details");
                  if (activeTab === "review") setActiveTab("bom");
                }}
                data-testid="button-previous"
              >
                Previous
              </Button>
            )}
            {activeTab !== "review" ? (
              <Button
                type="button"
                onClick={() => {
                  if (activeTab === "details") setActiveTab("bom");
                  if (activeTab === "bom") setActiveTab("review");
                }}
                disabled={activeTab === "details" && (!formData.title || !formData.department || !formData.needByDate)}
                data-testid="button-next"
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidForm() || createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending ? "Creating..." : "Submit Request"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}