import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import {
  Plus,
  ShoppingCart,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Layers
} from "lucide-react";

// BOM-based Direct Procurement Order Schema
const directProcurementSchema = z.object({
  bomId: z.string().min(1, "BOM is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  bomItems: z.array(z.object({
    bomItemId: z.string().min(1, "BOM item is required"),
    productName: z.string().min(1, "Product name is required"),
    requestedQuantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be positive"),
    totalPrice: z.number().min(0, "Total price must be positive"),
    specifications: z.string().optional(),
  })).min(1, "At least one BOM item is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  notes: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type DirectProcurementForm = z.infer<typeof directProcurementSchema>;

export default function DirectProcurement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch direct procurement orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/direct-procurement"],
    retry: false,
  });

  // Fetch vendors for dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Fetch BOMs for dropdown
  const { data: boms = [] } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });

  const form = useForm<DirectProcurementForm>({
    resolver: zodResolver(directProcurementSchema),
    defaultValues: {
      bomId: "",
      vendorId: "",
      bomItems: [],
      deliveryDate: "",
      paymentTerms: "Net 30",
      priority: "medium",
      notes: "",
    },
  });

  // Fetch BOM items when BOM is selected
  const selectedBomId = form.watch("bomId");
  const { data: bomItems = [] } = useQuery({
    queryKey: ["/api/boms", selectedBomId, "items"],
    enabled: !!selectedBomId,
    retry: false,
  });

  // Create direct procurement order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: DirectProcurementForm) => {
      return apiRequest("/api/direct-procurement", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Direct procurement order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/direct-procurement"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create direct procurement order",
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest(`/api/direct-procurement/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/direct-procurement"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: DirectProcurementForm) => {
    createOrderMutation.mutate(data);
  };

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  // Load BOM items when BOM is selected
  const handleBomSelection = (bomId: string) => {
    form.setValue("bomId", bomId);
    form.setValue("bomItems", []); // Reset BOM items when changing BOM
  };

  // Add BOM item to procurement list
  const addBomItem = (bomItem: any) => {
    const currentBomItems = form.getValues("bomItems");
    const newBomItem = {
      bomItemId: bomItem.id,
      productName: bomItem.productName || bomItem.name,
      requestedQuantity: bomItem.requiredQuantity || 1,
      unitPrice: 0,
      totalPrice: 0,
      specifications: bomItem.specifications || "",
    };
    form.setValue("bomItems", [...currentBomItems, newBomItem]);
  };

  const removeBomItem = (index: number) => {
    const currentBomItems = form.getValues("bomItems");
    form.setValue("bomItems", currentBomItems.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", icon: FileText },
      submitted: { color: "bg-blue-100 text-blue-800", icon: Clock },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
      delivered: { color: "bg-purple-100 text-purple-800", icon: Package },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Direct Procurement</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Create and manage direct purchase orders with approved vendors
                </p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="border-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Direct Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Create Direct Procurement Order
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      {/* BOM Selection */}
                      <FormField
                        control={form.control}
                        name="bomId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bill of Materials (BOM) *</FormLabel>
                            <Select onValueChange={handleBomSelection} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-2">
                                  <SelectValue placeholder="Select BOM to procure against" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {boms.map((bom: any) => (
                                  <SelectItem key={bom.id} value={bom.id}>
                                    <div className="flex items-center space-x-2">
                                      <Layers className="w-4 h-4" />
                                      <span>{bom.name} (v{bom.version})</span>
                                      <Badge variant="outline">{bom.category}</Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Vendor Selection */}
                      <FormField
                        control={form.control}
                        name="vendorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-2">
                                  <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendors.map((vendor: any) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    <div className="flex items-center space-x-2">
                                      <Building className="w-4 h-4" />
                                      <span>{vendor.companyName}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Available BOM Items Section */}
                      {selectedBomId && bomItems.length > 0 && (
                        <div className="space-y-4">
                          <Label className="text-lg font-semibold">Available BOM Items</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bomItems.map((bomItem: any) => (
                              <Card key={bomItem.id} className="border-2 p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-medium">{bomItem.productName || bomItem.name}</h4>
                                    <p className="text-sm text-gray-600">Required: {bomItem.requiredQuantity}</p>
                                    {bomItem.specifications && (
                                      <p className="text-xs text-gray-500 mt-1">{bomItem.specifications}</p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => addBomItem(bomItem)}
                                    className="ml-2"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected BOM Items for Procurement */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg font-semibold">Items for Procurement *</Label>
                          {form.watch("bomItems").length === 0 && selectedBomId && (
                            <p className="text-sm text-gray-500">Select items from the BOM above</p>
                          )}
                        </div>
                        
                        {form.watch("bomItems").map((item, index) => (
                          <Card key={index} className="border-2">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`bomItems.${index}.productName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Product Name *</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Product name" className="border-2" disabled />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`bomItems.${index}.requestedQuantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Quantity *</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          min="1"
                                          className="border-2"
                                          onChange={(e) => {
                                            const quantity = parseInt(e.target.value) || 0;
                                            field.onChange(quantity);
                                            const unitPrice = form.getValues(`bomItems.${index}.unitPrice`);
                                            form.setValue(`bomItems.${index}.totalPrice`, calculateItemTotal(quantity, unitPrice));
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`bomItems.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Unit Price (₹) *</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0.00"
                                          className="border-2"
                                          onChange={(e) => {
                                            const unitPrice = parseFloat(e.target.value) || 0;
                                            field.onChange(unitPrice);
                                            const quantity = form.getValues(`bomItems.${index}.requestedQuantity`);
                                            form.setValue(`bomItems.${index}.totalPrice`, calculateItemTotal(quantity, unitPrice));
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="flex items-end space-x-2">
                                  <div className="flex-1">
                                    <Label>Total Price (₹)</Label>
                                    <Input
                                      value={`₹${form.watch(`bomItems.${index}.totalPrice`).toFixed(2)}`}
                                      disabled
                                      className="border-2 bg-gray-50"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeBomItem(index)}
                                    className="border-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="mt-4">
                                <FormField
                                  control={form.control}
                                  name={`bomItems.${index}.specifications`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Specifications</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          {...field} 
                                          placeholder="Technical specifications or requirements" 
                                          className="border-2" 
                                          rows={2}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="deliveryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Date *</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" className="border-2" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="paymentTerms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Terms *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="border-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Net 15">Net 15</SelectItem>
                                  <SelectItem value="Net 30">Net 30</SelectItem>
                                  <SelectItem value="Net 45">Net 45</SelectItem>
                                  <SelectItem value="Net 60">Net 60</SelectItem>
                                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                                  <SelectItem value="COD">Cash on Delivery</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="border-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
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
                              <Textarea
                                {...field}
                                placeholder="Additional notes or requirements"
                                className="border-2"
                                rows={3}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Total Summary */}
                      <Card className="border-2 bg-blue-50">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Order Value:</span>
                            <span className="text-2xl font-bold text-blue-600">
                              ₹{form.watch("bomItems").reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-2">
                            {form.watch("bomItems").length} BOM items selected for procurement
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createOrderMutation.isPending} className="border-2">
                          {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.map((order: any) => (
                <Card key={order.id} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{order.vendorName}</p>
                      </div>
                      <div className="flex space-x-2">
                        {getStatusBadge(order.status)}
                        {getPriorityBadge(order.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium">{order.itemCount} items</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-bold text-lg">₹{order.totalValue}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Date:</span>
                        <span className="font-medium">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsViewDialogOpen(true);
                        }}
                        className="flex-1 border-2"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {order.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'submitted' })}
                          className="flex-1 border-2"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {orders.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Direct Procurement Orders</h3>
                <p className="text-gray-500 mb-6">Create your first direct procurement order to get started.</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="border-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Order Details - #{selectedOrder?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority:</span>
                      {getPriorityBadge(selectedOrder.priority)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-bold text-lg">₹{selectedOrder.totalValue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Terms:</span>
                      <span>{selectedOrder.paymentTerms}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Vendor Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company:</span>
                      <span className="font-medium">{selectedOrder.vendorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Date:</span>
                      <span>{new Date(selectedOrder.deliveryDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items List */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Item Name</Label>
                            <p className="text-sm">{item.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Quantity</Label>
                            <p className="text-sm">{item.quantity}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Unit Price</Label>
                            <p className="text-sm">₹{item.unitPrice}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Total</Label>
                            <p className="text-sm font-bold">₹{item.totalPrice}</p>
                          </div>
                        </div>
                        {item.description && (
                          <div className="mt-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedOrder.notes && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}