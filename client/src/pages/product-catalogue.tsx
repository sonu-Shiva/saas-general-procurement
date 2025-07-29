import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CategoryManager from "@/components/category-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Layers,
  FolderTree
} from "lucide-react";
import { TbCurrencyRupee } from "react-icons/tb";
import type { Product, ProductCategory } from "@shared/schema";

export default function ProductCatalogue() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [activeTab, setActiveTab] = useState("categories");
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
      categoryId: "",
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
      categoryId: "",
      category: "",
      subCategory: "",
      uom: "",
      basePrice: "",
      specifications: {},
      tags: [],
      isActive: true,
    },
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", { isActive: true }],
    retry: false,
  });

  const { data: categoryHierarchy = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories/hierarchy"],
    retry: false,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedCategory) {
        data.categoryId = selectedCategory.id;
        data.category = selectedCategory.name; // Backward compatibility
      }
      return await apiRequest("POST", "/api/products", data);
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
      return await apiRequest("PUT", `/api/products/${selectedProduct?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
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
    // Add the selected category ID to the form data
    const productData = {
      ...data,
      categoryId: selectedCategory?.id || undefined,
      // Keep legacy category fields for backward compatibility
      category: selectedCategory?.name || data.category,
    };
    
    console.log("Creating product with data:", productData);
    console.log("Selected category:", selectedCategory);
    
    createProductMutation.mutate(productData);
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
      categoryId: product.categoryId ?? "",
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
    
    const matchesCategory = selectedCategory 
      ? product.categoryId === selectedCategory.id 
      : categoryFilter === "all" || product.category === categoryFilter;
    
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
                <p className="text-muted-foreground">Manage your centralized product and service catalogue with hierarchical categories</p>
              </div>
            </div>

            {/* Tabs for Category Management and Product Listing */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Category Management
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Listing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Tree */}
                  <CategoryManager 
                    onCategorySelect={setSelectedCategory}
                    selectedCategoryId={selectedCategory?.id}
                  />
                  
                  {/* Selected Category Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedCategory ? (
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold text-lg">{selectedCategory.name}</h3>
                            <Badge variant="secondary" className="mt-1">{selectedCategory.code}</Badge>
                          </div>
                          {selectedCategory.description && (
                            <div>
                              <p className="text-sm text-muted-foreground">Description</p>
                              <p className="text-sm">{selectedCategory.description}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Level</p>
                              <p>{selectedCategory.level}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sort Order</p>
                              <p>{selectedCategory.sortOrder}</p>
                            </div>
                          </div>
                          <div className="pt-4 space-y-2">
                            <Button 
                              onClick={() => setActiveTab("products")}
                              className="w-full"
                              variant="outline"
                            >
                              View Products in this Category
                            </Button>
                            {isVendor && (
                              <Button 
                                onClick={() => {
                                  setActiveTab("products");
                                  setIsCreateDialogOpen(true);
                                }}
                                className="w-full"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Product to "{selectedCategory.name}"
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a category to view details</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="products" className="mt-6">
                <div className="space-y-6">
                  {/* Product Management Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {selectedCategory && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Category:</span>
                          <Badge variant="outline">{selectedCategory.name} ({selectedCategory.code})</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedCategory(null)}
                          >
                            Clear Filter
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      {!selectedCategory && isVendor && (
                        <p className="text-xs text-muted-foreground text-right">
                          Select a category first to add products
                        </p>
                      )}
                      <div className="flex space-x-3">
                        {isVendor && (
                          <>
                            <Button variant="outline">
                              <Tag className="w-4 h-4 mr-2" />
                              Import
                            </Button>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  className="bg-primary hover:bg-primary/90"
                                  disabled={!selectedCategory}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  {selectedCategory ? `Add Product to "${selectedCategory.name}"` : "Select Category First"}
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
                                  
                                  {selectedCategory && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                      <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Will be added to category: <strong>{selectedCategory.name}</strong> ({selectedCategory.code})
                                      </p>
                                    </div>
                                  )}
                                  
                                  <FormField
                                    control={form.control}
                                    name="basePrice"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Base Price (₹)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" {...field} />
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

                  {/* Filters */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search products..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Products Grid */}
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-6">
                            <div className="space-y-3">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No products found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                          {selectedCategory 
                            ? `No products in ${selectedCategory.name} category yet.`
                            : "Get started by creating your first product."
                          }
                        </p>
                        {isVendor && (
                          <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProducts.map((product) => (
                        <Card key={product.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{product.itemName}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {product.internalCode && `Code: ${product.internalCode}`}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {product.isActive ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {product.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex justify-between items-center">
                                <div>
                                  {product.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {product.category}
                                    </Badge>
                                  )}
                                </div>
                                {product.basePrice && (
                                  <div className="flex items-center text-lg font-semibold text-green-600">
                                    <TbCurrencyRupee className="w-4 h-4" />
                                    {formatCurrency(parseFloat(product.basePrice))}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                <div className="text-xs text-muted-foreground">
                                  {product.uom && `UOM: ${product.uom}`}
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleViewProduct(product)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {isVendor && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleEditProduct(product)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* View Product Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedProduct.itemName}</h3>
                  <p className="text-muted-foreground">{selectedProduct.description}</p>
                </div>
                <div className="text-right">
                  {selectedProduct.basePrice && (
                    <div className="flex items-center justify-end text-2xl font-bold text-green-600">
                      <TbCurrencyRupee className="w-6 h-6" />
                      {formatCurrency(parseFloat(selectedProduct.basePrice))}
                    </div>
                  )}
                  {selectedProduct.uom && (
                    <p className="text-sm text-muted-foreground">per {selectedProduct.uom}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Internal Code</p>
                    <p>{selectedProduct.internalCode || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">External Code</p>
                    <p>{selectedProduct.externalCode || "Not specified"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p>{selectedProduct.category || "Uncategorized"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedProduct.isActive ? "secondary" : "outline"}>
                      {selectedProduct.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
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
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
  );
}