import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductCategorySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FolderTree, 
  FolderOpen, 
  Folder,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import type { ProductCategory } from "@shared/schema";

interface CategoryNode extends ProductCategory {
  children: CategoryNode[];
}

interface CategoryManagerProps {
  onCategorySelect?: (category: ProductCategory) => void;
  selectedCategoryId?: string;
  showHeader?: boolean;
}

interface CategoryTreeItemProps {
  category: CategoryNode;
  level: number;
  onEdit: (category: ProductCategory) => void;
  onDelete: (category: ProductCategory) => void;
  onAddChild: (parentCategory: ProductCategory) => void;
  onSelect?: (category: ProductCategory) => void;
  selectedCategoryId?: string;
  isVendor?: boolean;
}

function CategoryTreeItem({ 
  category, 
  level, 
  onEdit, 
  onDelete, 
  onAddChild, 
  onSelect,
  selectedCategoryId,
  isVendor = false
}: CategoryTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first two levels
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect?.(category)}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 mr-2"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        ) : (
          <div className="w-6 mr-2" />
        )}
        
        {hasChildren ? (
          isExpanded ? <FolderOpen className="h-4 w-4 mr-2 text-blue-600" /> : <Folder className="h-4 w-4 mr-2 text-blue-600" />
        ) : (
          <div className="h-4 w-4 mr-2 bg-gray-300 dark:bg-gray-600 rounded-sm" />
        )}
        
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{category.name}</span>
          </div>
          
          {isVendor && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(category);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onSelect={onSelect}
              selectedCategoryId={selectedCategoryId}
              isVendor={isVendor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryManager({ 
  onCategorySelect, 
  selectedCategoryId,
  showHeader = true 
}: CategoryManagerProps) {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [parentCategory, setParentCategory] = useState<ProductCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can create/manage categories (both vendors and buyers can create categories)
  const canManageCategories = (user as any)?.role === 'vendor' || 
                              (user as any)?.role === 'sourcing_exec' || 
                              (user as any)?.role === 'admin' || 
                              (user as any)?.role === 'sourcing_manager';
  


  const { data: categoryHierarchy = [], isLoading } = useQuery<CategoryNode[]>({
    queryKey: ["/api/product-categories/hierarchy"],
    retry: false,
    staleTime: 0, // Force fresh data every time
    cacheTime: 0, // Don't cache results
  });

  const form = useForm({
    resolver: zodResolver(insertProductCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: undefined,
      sortOrder: 0,
    },
    mode: "onChange",
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating category with data:", data);
      
      // Remove code from data - let server generate hierarchical code automatically
      const { code, ...dataWithoutCode } = data;
      
      return await apiRequest("/api/product-categories", {
        method: "POST",
        body: JSON.stringify(dataWithoutCode)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories/hierarchy"] });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      setIsCreateDialogOpen(false);
      setParentCategory(null);
      form.reset();
    },
    onError: (error) => {
      console.error("Category creation error:", error);
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
      // Enhanced error handling to show specific error message
      const errorMessage = (error as any)?.message || 'Unknown error';
      
      // Check for duplicate code error
      if (errorMessage.includes('duplicate key') && errorMessage.includes('code')) {
        toast({
          title: "Error",
          description: "Category code conflict detected. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to create category: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/product-categories/${editingCategory?.id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories/hierarchy"] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
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
      
      // Enhanced error handling to show specific error message
      const errorMessage = (error as any)?.message || 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to update category: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await apiRequest(`/api/product-categories/${categoryId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories/hierarchy"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
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
      
      // Enhanced error handling to show specific error message
      const errorMessage = (error as any)?.message || 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to delete category: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateCategory = (parentCat?: ProductCategory) => {
    console.log("=== HANDLE CREATE CATEGORY ===");
    console.log("Parent category:", parentCat);
    
    setParentCategory(parentCat || null);
    
    // Reset form with proper default values
    const defaultValues = {
      name: "",
      description: "",
      parentId: parentCat?.id || undefined,
      sortOrder: 0,
    };
    
    console.log("Form default values:", defaultValues);
    form.reset(defaultValues);
    setIsCreateDialogOpen(true);
  };

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
    form.reset({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || undefined,
      sortOrder: category.sortOrder || 0,
    });
  };

  const handleDeleteCategory = (category: ProductCategory) => {
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const onSubmit = (data: any) => {
    console.log("=== FORM ONSUBMIT CALLED ===");
    console.log("Form submitted with data:", data);
    
    // Validate required fields
    if (!data.name || data.name.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data with parent ID from the selected parent category
    const categoryData = {
      name: data.name.trim(),
      description: data.description?.trim() || "",
      parentId: parentCategory?.id || data.parentId || undefined,
      sortOrder: data.sortOrder || 0,
    };
    
    console.log("Prepared category data:", categoryData);
    
    if (editingCategory) {
      console.log("Path: Updating category...");
      updateCategoryMutation.mutate(categoryData);
    } else {
      console.log("Path: Creating new category...");
      
      // Let server generate hierarchical code automatically
      const formDataWithCode = {
        ...categoryData,
        level: parentCategory ? parentCategory.level + 1 : 1,
      };
      
      createCategoryMutation.mutate(formDataWithCode);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              <CardTitle>Product Categories</CardTitle>
            </div>
            {canManageCategories && (
              <Button 
                onClick={() => handleCreateCategory()}
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-1">
            {categoryHierarchy.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No categories created yet.</p>
                {canManageCategories && (
                  <Button 
                    variant="outline" 
                    className="mt-4"

                    onClick={() => handleCreateCategory()}

                    type="button"
                  >
                    Create your first category
                  </Button>
                )}
              </div>
            ) : (
              categoryHierarchy.map((category) => (
                <div key={category.id} className="group">
                  <CategoryTreeItem
                    category={category}
                    level={0}
                    onEdit={handleEditCategory}
                    onDelete={handleDeleteCategory}
                    onAddChild={handleCreateCategory}
                    onSelect={onCategorySelect}
                    selectedCategoryId={selectedCategoryId}
                    isVendor={canManageCategories}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Create Category Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onOpenChange={(open) => {
          console.log("Dialog onOpenChange called with:", open);
          setIsCreateDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentCategory ? `Add Subcategory to "${parentCategory.name}"` : "Create New Category"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form 
              onSubmit={(e) => {
                console.log("=== CREATE DIALOG FORM SUBMIT ===");
                console.log("Native form event:", e);
                e.preventDefault();
                console.log("About to call form.handleSubmit with onSubmit...");
                form.handleSubmit(onSubmit)(e);
              }} 
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office Furniture" {...field} />
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
                      <Textarea 
                        placeholder="Optional description of this category..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                

                
                <Button 
                  type="submit" 
                  disabled={createCategoryMutation.isPending}
                  onClick={(e) => {
                    console.log("=== CREATE CATEGORY SUBMIT BUTTON CLICKED ===");
                    console.log("Event:", e);
                    console.log("Form state:", form.formState);
                    console.log("Form values:", form.getValues());
                    console.log("Form errors:", form.formState.errors);
                    console.log("Is form valid:", form.formState.isValid);
                    console.log("Mutation pending:", createCategoryMutation.isPending);
                  }}
                >
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office Furniture" {...field} />
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
                      <Textarea 
                        placeholder="Optional description of this category..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCategoryMutation.isPending}
                >
                  {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}