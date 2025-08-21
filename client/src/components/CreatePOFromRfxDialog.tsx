import { useState } from "react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building, Plus, Trash2, Package, ShoppingCart } from "lucide-react";

const rfxPOSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  poItems: z.array(z.object({
    itemName: z.string().min(1, "Item name is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be positive"),
    totalPrice: z.number().min(0, "Total price must be positive"),
    specifications: z.string().optional(),
  })).min(1, "At least one item is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  notes: z.string().optional(),
  priority: z.string().min(1, "Priority is required"),
});

type RfxPOForm = z.infer<typeof rfxPOSchema>;

interface CreatePOFromRfxDialogProps {
  rfx: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePOFromRfxDialog({ rfx, onClose, onSuccess }: CreatePOFromRfxDialogProps) {
  const { toast } = useToast();

  // Fetch priority options from dropdown configuration
  const { data: priorityConfig } = useQuery({
    queryKey: ['/api/admin/dropdown-configurations', 'priority_level', 'purchase-orders'],
    queryFn: async () => {
      const configs = await apiRequest('/api/admin/dropdown-configurations');
      return configs.find((config: any) => 
        config.fieldName === 'priority_level' && config.screen === 'purchase-orders'
      );
    }
  });

  const { data: priorityOptions = [] } = useQuery({
    queryKey: ['/api/admin/dropdown-configurations', priorityConfig?.id, 'options'],
    queryFn: async () => {
      if (!priorityConfig?.id) return [];
      return apiRequest(`/api/admin/dropdown-configurations/${priorityConfig.id}/options`);
    },
    enabled: !!priorityConfig?.id
  });

  const priorityChoices = priorityOptions
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((option: any) => ({
      value: option.value,
      label: option.label
    }));

  // Check if RFx has BOM linked
  const hasBom = rfx.bomId;
  
  // Fetch BOM items if RFx has BOM linked
  const { data: bomData, isLoading: isLoadingBomItems } = useQuery({
    queryKey: ["/api/boms", rfx.bomId],
    queryFn: async () => {
      if (!rfx.bomId) return null;
      const response = await fetch(`/api/boms/${rfx.bomId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch BOM');
      return response.json();
    },
    enabled: !!rfx.bomId,
    retry: false,
  });

  const bomItems = bomData?.items || [];
  
  // Form setup
  const form = useForm<RfxPOForm>({
    resolver: zodResolver(rfxPOSchema),
    defaultValues: {
      vendorId: "",
      poItems: [{ itemName: "", quantity: 1, unitPrice: 0, totalPrice: 0, specifications: "" }],
      deliveryDate: "",
      paymentTerms: "Net 30",
      priority: "medium",
      notes: "",
    },
  });

  // Fetch vendors
  const { data: vendorsData = [], isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  // Initialize form once, then update only when BOM items are loaded
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (!isFormInitialized) {
      // Initialize form based on whether RFx has BOM
      if (hasBom) {
        // Wait for BOM items if this RFx has a BOM
        if (bomItems && bomItems.length > 0) {
          const bomFormItems = bomItems.map((item: any) => ({
            itemName: item.itemName || item.productName || "",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
            specifications: item.specifications || "",
          }));
          
          form.reset({
            vendorId: "",
            poItems: bomFormItems,
            deliveryDate: "",
            paymentTerms: "Net 30",
            priority: "medium",
            notes: "",
          });
          setIsFormInitialized(true);
        }
      } else {
        // No BOM, initialize with empty item immediately
        form.reset({
          vendorId: "",
          poItems: [{ itemName: "", quantity: 1, unitPrice: 0, totalPrice: 0, specifications: "" }],
          deliveryDate: "",
          paymentTerms: "Net 30",
          priority: "medium",
          notes: "",
        });
        setIsFormInitialized(true);
      }
    }
  }, [bomItems, hasBom, form, isFormInitialized]);

  // Calculate total amount when items change
  const calculateTotal = () => {
    const items = form.watch("poItems");
    return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  // Update item total when quantity or unit price changes
  const updateItemTotal = (index: number, quantity: number, unitPrice: number) => {
    const totalPrice = quantity * unitPrice;
    form.setValue(`poItems.${index}.totalPrice`, totalPrice);
  };

  // Add new item
  const addItem = () => {
    const currentItems = form.getValues("poItems");
    form.setValue("poItems", [
      ...currentItems,
      { itemName: "", quantity: 1, unitPrice: 0, totalPrice: 0, specifications: "" }
    ]);
  };

  // Remove item
  const removeItem = (index: number) => {
    const currentItems = form.getValues("poItems");
    if (currentItems.length > 1) {
      form.setValue("poItems", currentItems.filter((_, i) => i !== index));
    }
  };

  // Submit form
  const onSubmit = async (data: RfxPOForm) => {
    try {
      const response = await apiRequest("POST", `/api/rfx/${rfx.id}/create-po`, {
        ...data,
        totalAmount: calculateTotal().toString(),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Purchase Order ${result.purchaseOrder.poNumber} created successfully`,
        });
        onSuccess();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to create purchase order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    }
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v: any) => v.id === vendorId);
    return vendor ? vendor.companyName : vendorId;
  };

  if (isLoadingVendors || (hasBom && isLoadingBomItems) || !isFormInitialized) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading {isLoadingVendors ? 'vendors' : hasBom ? 'BOM items' : 'form'}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RFx Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Source RFx</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Title:</span>
            <p className="text-blue-800">{rfx.title}</p>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Type:</span>
            <Badge className="ml-2 bg-blue-100 text-blue-800">{rfx.type?.toUpperCase()}</Badge>
          </div>
          {hasBom && (
            <div className="col-span-2">
              <span className="text-blue-600 font-medium">BOM Linked:</span>
              <Badge className="ml-2 bg-green-100 text-green-800">
                {bomItems?.length || 0} items from BOM
              </Badge>
            </div>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Purchase Order Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-lg font-semibold">Purchase Order Items *</Label>
                {hasBom && (
                  <p className="text-sm text-gray-600 mt-1">
                    Items pre-populated from linked BOM. You can modify quantities and prices.
                  </p>
                )}
                {!hasBom && (
                  <p className="text-sm text-gray-600 mt-1">
                    No BOM linked to this RFx. Add items manually.
                  </p>
                )}
              </div>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {form.watch("poItems").map((item, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <FormField
                      control={form.control}
                      name={`poItems.${index}.itemName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Product/Service name"
                              className="border-2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`poItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => {
                                const quantity = parseInt(e.target.value) || 0;
                                field.onChange(quantity);
                                updateItemTotal(index, quantity, form.getValues(`poItems.${index}.unitPrice`));
                              }}
                              className="border-2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`poItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (₹) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                const unitPrice = parseFloat(e.target.value) || 0;
                                field.onChange(unitPrice);
                                updateItemTotal(index, form.getValues(`poItems.${index}.quantity`), unitPrice);
                              }}
                              className="border-2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`poItems.${index}.totalPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total (₹)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={`₹${field.value?.toLocaleString('en-IN') || '0'}`}
                              readOnly
                              className="border-2 bg-gray-50"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-end">
                      {form.watch("poItems").length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`poItems.${index}.specifications`}
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Specifications / Requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Specific requirements, specifications, or notes for this item"
                            className="border-2"
                            rows={2}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Total Amount Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-800">Total Order Value:</span>
              <span className="text-2xl font-bold text-green-900">
                ₹{calculateTotal().toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Delivery and Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="border-2"
                    />
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
                      <SelectItem value="Net 30">Net 30 days</SelectItem>
                      <SelectItem value="Net 15">Net 15 days</SelectItem>
                      <SelectItem value="Net 60">Net 60 days</SelectItem>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {priorityChoices.map((choice: any) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Additional terms, conditions, or notes for this purchase order"
                    className="border-2"
                    rows={3}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {form.formState.isSubmitting ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}