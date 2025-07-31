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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus,
  ShoppingCart,
  FileText,
  Calendar,
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

export default function DirectProcurementSimple() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    bomId: "",
    vendorId: "",
    bomItems: [] as any[],
    deliveryDate: "",
    paymentTerms: "Net 30",
    priority: "medium",
    notes: "",
  });

  // Fetch data
  const { data: ordersData = [], isLoading } = useQuery({
    queryKey: ["/api/direct-procurement"],
    retry: false,
  });
  const orders = Array.isArray(ordersData) ? ordersData : [];

  const { data: vendorsData = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  const { data: bomsData = [] } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });
  const boms = Array.isArray(bomsData) ? bomsData : [];

  // Fetch BOM items when BOM is selected
  const { data: bomItemsData = [] } = useQuery({
    queryKey: ["/api/bom-items", formData.bomId],
    queryFn: () => formData.bomId ? fetch(`/api/bom-items/${formData.bomId}`).then(res => res.json()) : [],
    enabled: !!formData.bomId,
    retry: false,
  });
  const bomItems = Array.isArray(bomItemsData) ? bomItemsData : [];

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("=== SUBMITTING ORDER ===");
      console.log("Data:", JSON.stringify(data, null, 2));
      return apiRequest("/api/direct-procurement", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Direct procurement order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/direct-procurement"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Create order error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create direct procurement order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      bomId: "",
      vendorId: "",
      bomItems: [],
      deliveryDate: "",
      paymentTerms: "Net 30",
      priority: "medium",
      notes: "",
    });
  };

  const addBomItem = (bomItem: any) => {
    const unitPrice = Number(bomItem.unitPrice || 0);
    const quantity = Number(bomItem.quantity || 1);
    const newBomItem = {
      bomItemId: bomItem.id,
      productName: bomItem.itemName,
      requestedQuantity: quantity,
      unitPrice: unitPrice,
      totalPrice: unitPrice * quantity,
      specifications: bomItem.description || "",
    };
    setFormData(prev => ({
      ...prev,
      bomItems: [...prev.bomItems, newBomItem]
    }));
  };

  const removeBomItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bomItems: prev.bomItems.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    console.log("=== FORM SUBMISSION START ===");
    console.log("Form data:", JSON.stringify(formData, null, 2));
    console.log("BOM Items count:", formData.bomItems.length);
    console.log("Authentication user:", user);
    
    // Basic validation
    if (!formData.bomId) {
      console.log("❌ Validation failed: No BOM selected");
      toast({
        title: "Validation Error",
        description: "Please select a BOM",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.vendorId) {
      console.log("❌ Validation failed: No vendor selected");
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.bomItems.length === 0) {
      console.log("❌ Validation failed: No BOM items added");
      toast({
        title: "Validation Error",
        description: "Please add at least one BOM item",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.deliveryDate) {
      console.log("❌ Validation failed: No delivery date");
      toast({
        title: "Validation Error",
        description: "Please select a delivery date",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ All validations passed, submitting order...");
    createOrderMutation.mutate(formData);
  };

  const totalValue = formData.bomItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  if (!user || user.role === 'vendor') {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <Card className="max-w-md mx-auto mt-20">
              <CardContent className="pt-6 text-center">
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                <p className="text-gray-600">
                  Direct Procurement is only available for buyer roles.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Direct Procurement</h1>
                <p className="text-gray-600 mt-1">Create purchase orders directly from BOMs</p>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="border-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-2">
                  <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-xl">Create Direct Procurement Order</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* BOM and Vendor Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bom-select">Select BOM *</Label>
                        <Select 
                          value={formData.bomId} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, bomId: value, bomItems: [] }))}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Choose a BOM" />
                          </SelectTrigger>
                          <SelectContent>
                            {boms.map((bom: any) => (
                              <SelectItem key={bom.id} value={bom.id}>
                                {bom.name} v{bom.version}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="vendor-select">Select Vendor *</Label>
                        <Select 
                          value={formData.vendorId} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Choose a vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Available BOM Items */}
                    {formData.bomId && bomItems.length > 0 && (
                      <div>
                        <Label>Available BOM Items</Label>
                        <div className="grid gap-3 mt-2">
                          {bomItems.map((item: any) => (
                            <Card key={item.id} className="border-2">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{item.itemName}</h4>
                                    <p className="text-sm text-gray-600">
                                      Qty: {item.quantity} {item.uom} | ₹{Number(item.unitPrice).toFixed(2)} each
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => addBomItem(item)}
                                    disabled={formData.bomItems.some(bi => bi.bomItemId === item.id)}
                                  >
                                    {formData.bomItems.some(bi => bi.bomItemId === item.id) ? "Added" : "Add"}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Items */}
                    {formData.bomItems.length > 0 && (
                      <div>
                        <Label>Selected Items ({formData.bomItems.length})</Label>
                        <div className="space-y-3 mt-2">
                          {formData.bomItems.map((item: any, index: number) => (
                            <Card key={index} className="border-2">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{item.productName}</h4>
                                    <p className="text-sm text-gray-600">
                                      Qty: {item.requestedQuantity} | ₹{item.unitPrice} each | Total: ₹{item.totalPrice}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeBomItem(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="delivery-date">Delivery Date *</Label>
                        <Input
                          id="delivery-date"
                          type="date"
                          value={formData.deliveryDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                          className="border-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="payment-terms">Payment Terms *</Label>
                        <Select 
                          value={formData.paymentTerms} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 45">Net 45</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                            <SelectItem value="COD">Cash on Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="priority">Priority *</Label>
                        <Select 
                          value={formData.priority} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes or requirements"
                        className="border-2"
                        rows={3}
                      />
                    </div>

                    {/* Total Summary */}
                    {formData.bomItems.length > 0 && (
                      <Card className="border-2 bg-blue-50">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Order Value:</span>
                            <span className="text-2xl font-bold text-blue-600">
                              ₹{totalValue.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={createOrderMutation.isPending} 
                        className="border-2"
                      >
                        {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Total Orders</h3>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orders.length}</div>
                  <p className="text-xs text-muted-foreground">Direct procurement orders</p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Total Value</h3>
                  <span className="text-lg">₹</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Procurement value</p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Active Orders</h3>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.filter((order: any) => ['draft', 'submitted', 'approved'].includes(order.status)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-sm font-medium">Completed Orders</h3>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.filter((order: any) => order.status === 'delivered').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Successfully delivered</p>
                </CardContent>
              </Card>
            </div>

            {/* Orders List */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Recent Direct Procurement Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                    <p>Create your first direct procurement order to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 10).map((order: any) => (
                      <Card key={order.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold">{order.referenceNo}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                  order.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Vendor:</span> {order.vendorName}
                                </div>
                                <div>
                                  <span className="font-medium">BOM:</span> {order.bomName}
                                </div>
                                <div>
                                  <span className="font-medium">Items:</span> {order.itemCount}
                                </div>
                                <div>
                                  <span className="font-medium">Value:</span> ₹{Number(order.totalAmount).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}