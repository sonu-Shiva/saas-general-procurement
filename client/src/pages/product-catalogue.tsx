import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Edit,
  Eye,
  CheckCircle,
  Clock,
  Tag,
  Layers
} from "lucide-react";
import { TbCurrencyRupee } from "react-icons/tb";
import type { Product } from "@shared/schema";

export default function ProductCatalogue() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is a vendor (can create products)
  const isVendor = (user as any)?.role === 'vendor';
  // Check if user is a buyer (can view products and create BOMs)
  const isBuyer = (user as any)?.role === 'buyer_admin' || (user as any)?.role === 'buyer_user' || (user as any)?.role === 'sourcing_manager';

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      itemName: "",
      internalCode: "",
      externalCode: "",
      description: "",
      category: "",
      subCategory: "",
      uom: "",
      basePrice: "",
      specifications: {},
      tags: [],
      isActive: true,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      itemName: "",
      internalCode: "",
      externalCode: "",
      description: "",
      category: "",
      subCategory: "",
      uom: "",
      basePrice: "",
      specifications: {},
      tags: [],
      isActive: true,
    },
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", searchQuery, categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter === 'active') params.append('isActive', 'true');
      if (statusFilter === 'inactive') params.append('isActive', 'false');
      
      const url = `/api/products${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
    retry: false,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/products", {
        ...data,
        basePrice: data.basePrice ? parseFloat(data.basePrice) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedProduct) throw new Error("No product selected");
      await apiRequest("PUT", `/api/products/${selectedProduct.id}`, {
        ...data,
        basePrice: data.basePrice ? parseFloat(data.basePrice) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      editForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createProductMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    updateProductMutation.mutate(data);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    const formData = {
      itemName: product.itemName,
      internalCode: product.internalCode ?? "",
      externalCode: product.externalCode ?? "",
      description: product.description ?? "",
      category: product.category ?? "",
      subCategory: product.subCategory ?? "",
      uom: product.uom ?? "",
      basePrice: product.basePrice?.toString() ?? "",
      specifications: product.specifications ?? {},
      tags: [],
      isActive: product.isActive ?? true,
    };
    editForm.reset(formData);
    setIsEditDialogOpen(true);
  };

  const filteredProducts = products?.filter((product: Product) => {
    const matchesSearch = product.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.internalCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && product.isActive) ||
                         (statusFilter === "inactive" && !product.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Product Catalogue</h1>
                <p className="text-muted-foreground">Manage your centralized product and service catalogue</p>
              </div>
              <div className="flex space-x-3">
                {isVendor && (
                  <>
                    <Button variant="outline">
                      <Tag className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="itemName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Item Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="internalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Internal Code</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="externalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>External Code</FormLabel>
                                <FormControl>
                                  <Input {...field} />
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
                                <FormLabel>Unit of Measure</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select UOM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pieces">Pieces</SelectItem>
                                      <SelectItem value="kg">Kilograms</SelectItem>
                                      <SelectItem value="meters">Meters</SelectItem>
                                      <SelectItem value="liters">Liters</SelectItem>
                                      <SelectItem value="boxes">Boxes</SelectItem>
                                      <SelectItem value="units">Units</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="electronics">Electronics</SelectItem>
                                      <SelectItem value="raw-materials">Raw Materials</SelectItem>
                                      <SelectItem value="office-supplies">Office Supplies</SelectItem>
                                      <SelectItem value="industrial">Industrial Equipment</SelectItem>
                                      <SelectItem value="automotive">Automotive</SelectItem>
                                      <SelectItem value="textiles">Textiles</SelectItem>
                                      <SelectItem value="chemicals">Chemicals</SelectItem>
                                      <SelectItem value="food">Food & Beverages</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="subCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sub Category</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="basePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base Price (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="Enter amount in rupees" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-3">
                          <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createProductMutation.isPending}>
                            {createProductMutation.isPending ? "Creating..." : "Create Product"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Products</p>
                      <p className="text-2xl font-bold">{products?.length || 0}</p>
                    </div>
                    <Package className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active Products</p>
                      <p className="text-2xl font-bold text-success">
                        {products?.filter((p: Product) => p.isActive).length || 0}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Categories</p>
                      <p className="text-2xl font-bold">
                        {products ? new Set(products.map((p: Product) => p.category)).size : 0}
                      </p>
                    </div>
                    <Layers className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Avg. Price</p>
                      <p className="text-2xl font-bold">
                        {products && products.length > 0 
                          ? formatCurrency(products.reduce((sum: number, p: Product) => sum + (parseFloat(p.basePrice || "0")), 0) / products.length)
                          : formatCurrency(0)
                        }
                      </p>
                    </div>
                    <div className="w-8 h-8 text-secondary flex items-center justify-center font-bold text-xl">₹</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="raw-materials">Raw Materials</SelectItem>
                        <SelectItem value="office-supplies">Office Supplies</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="textiles">Textiles</SelectItem>
                        <SelectItem value="chemicals">Chemicals</SelectItem>
                        <SelectItem value="food">Food & Beverages</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : filteredProducts && filteredProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Product</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Category</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Code</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">UOM</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Base Price</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredProducts.map((product: Product) => (
                          <tr key={product.id} className="hover:bg-muted/50">
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white font-semibold">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-medium">{product.itemName}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {product.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                <Badge variant="secondary">{product.category}</Badge>
                                {product.subCategory && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {product.subCategory}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm">
                                <p className="font-medium">{product.internalCode}</p>
                                {product.externalCode && (
                                  <p className="text-muted-foreground">{product.externalCode}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <Badge variant="outline">{product.uom}</Badge>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-medium">
                                {product.basePrice ? formatCurrency(product.basePrice) : "N/A"}
                              </p>
                            </td>
                            <td className="py-4 px-6">
                              <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewProduct(product)}>
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                {(isVendor || (user as any)?.id === product.createdBy) && (
                                  <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No products found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your search criteria or filters"
                        : isVendor 
                          ? "Start by adding your first product to the catalogue"
                          : isBuyer
                            ? "Browse the product catalogue to create BOMs and purchase orders"
                            : "Contact your administrator to set up your role"
                      }
                    </p>
                    {!searchQuery && categoryFilter === "all" && statusFilter === "all" && isVendor && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Product Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Product Details</DialogTitle>
                </DialogHeader>
                {selectedProduct && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Item Name</label>
                        <p className="font-medium">{selectedProduct.itemName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Internal Code</label>
                        <p className="font-medium">{selectedProduct.internalCode || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">External Code</label>
                        <p className="font-medium">{selectedProduct.externalCode || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                        <Badge variant="outline">{selectedProduct.uom}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Category</label>
                        <Badge variant="secondary">{selectedProduct.category}</Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sub Category</label>
                        <p className="font-medium">{selectedProduct.subCategory || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Base Price</label>
                      <p className="font-medium text-lg">
                        {selectedProduct.basePrice ? formatCurrency(selectedProduct.basePrice) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm">{selectedProduct.description || "No description available"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge variant={selectedProduct.isActive ? "default" : "secondary"}>
                        {selectedProduct.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="itemName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="internalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internal Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="externalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>External Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="uom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit of Measure</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select UOM" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pieces">Pieces</SelectItem>
                                  <SelectItem value="kg">Kilograms</SelectItem>
                                  <SelectItem value="meters">Meters</SelectItem>
                                  <SelectItem value="liters">Liters</SelectItem>
                                  <SelectItem value="boxes">Boxes</SelectItem>
                                  <SelectItem value="units">Units</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="electronics">Electronics</SelectItem>
                                  <SelectItem value="raw-materials">Raw Materials</SelectItem>
                                  <SelectItem value="office-supplies">Office Supplies</SelectItem>
                                  <SelectItem value="industrial">Industrial Equipment</SelectItem>
                                  <SelectItem value="automotive">Automotive</SelectItem>
                                  <SelectItem value="textiles">Textiles</SelectItem>
                                  <SelectItem value="chemicals">Chemicals</SelectItem>
                                  <SelectItem value="food">Food & Beverages</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="subCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sub Category</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Enter amount in rupees" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input 
                              type="checkbox" 
                              checked={field.value} 
                              onChange={field.onChange}
                              className="w-4 h-4"
                            />
                          </FormControl>
                          <FormLabel>Active Product</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateProductMutation.isPending}>
                        {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
