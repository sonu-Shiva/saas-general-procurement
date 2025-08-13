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
  ShoppingCart
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
    
    if (formData.bomLineItems.length === 0) {
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
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and ensure need by date is not in the past",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const mappedItemsCount = formData.bomLineItems.filter(item => item.isMapped).length;
  const unmappedItemsCount = formData.bomLineItems.length - mappedItemsCount;

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
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Department name"
                  data-testid="input-department"
                />
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
                <h3 className="text-lg font-semibold">BOM Line Items</h3>
                <p className="text-sm text-muted-foreground">
                  Upload XLSX file or add items manually
                </p>
              </div>
              <div className="flex gap-2">
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
            </div>

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