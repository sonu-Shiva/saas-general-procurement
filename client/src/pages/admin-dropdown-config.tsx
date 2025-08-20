import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  List,
  Tag,
  Monitor,
  ChevronDown,
  ChevronUp,
  Copy
} from "lucide-react";

// Define types for dropdown configuration
type DropdownConfiguration = {
  id: string;
  screen: string;
  category: string;
  fieldName: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type DropdownOption = {
  id: string;
  configurationId: string;
  value: string;
  label: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// Form schemas
const configurationFormSchema = z.object({
  screen: z.string().min(1, "Screen name is required"),
  category: z.string().min(1, "Category is required"),
  fieldName: z.string().min(1, "Field name is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).default(0),
});

const optionFormSchema = z.object({
  value: z.string().min(1, "Value is required"),
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).default(0),
});

type ConfigurationFormData = z.infer<typeof configurationFormSchema>;
type OptionFormData = z.infer<typeof optionFormSchema>;

export default function AdminDropdownConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScreen, setSelectedScreen] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DropdownConfiguration | null>(null);
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());

  // Check if user has admin access - only Admin role
  const userRole = (user as any)?.role;
  const hasAdminAccess = userRole === 'admin';

  if (!hasAdminAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Restricted</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access dropdown configuration management.
        </p>
      </div>
    );
  }

  // Fetch configurations
  const { data: configurations, isLoading: configsLoading } = useQuery<DropdownConfiguration[]>({
    queryKey: ['/api/admin/dropdown-configurations', { screen: selectedScreen !== 'all' ? selectedScreen : undefined, category: selectedCategory !== 'all' ? selectedCategory : undefined }],
  });

  // Forms
  const configForm = useForm<ConfigurationFormData>({
    resolver: zodResolver(configurationFormSchema),
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  const optionForm = useForm<OptionFormData>({
    resolver: zodResolver(optionFormSchema),
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  // Configuration mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: ConfigurationFormData) => 
      apiRequest('/api/admin/dropdown-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dropdown-configurations'] });
      setIsConfigDialogOpen(false);
      configForm.reset();
      toast({ title: "Configuration created successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) return;
      toast({ title: "Error creating configuration", description: error.message, variant: "destructive" });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConfigurationFormData> }) =>
      apiRequest(`/api/admin/dropdown-configurations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dropdown-configurations'] });
      setIsConfigDialogOpen(false);
      setEditingConfig(null);
      configForm.reset();
      toast({ title: "Configuration updated successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) return;
      toast({ title: "Error updating configuration", description: error.message, variant: "destructive" });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/dropdown-configurations/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dropdown-configurations'] });
      toast({ title: "Configuration deleted successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) return;
      toast({ title: "Error deleting configuration", description: error.message, variant: "destructive" });
    },
  });

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: (data: OptionFormData & { configurationId: string }) =>
      apiRequest('/api/admin/dropdown-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dropdown-configurations'] });
      setIsOptionDialogOpen(false);
      optionForm.reset();
      toast({ title: "Option created successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) return;
      toast({ title: "Error creating option", description: error.message, variant: "destructive" });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OptionFormData> }) =>
      apiRequest(`/api/admin/dropdown-options/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dropdown-configurations'] });
      setIsOptionDialogOpen(false);
      setEditingOption(null);
      optionForm.reset();
      toast({ title: "Option updated successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) return;
      toast({ title: "Error updating option", description: error.message, variant: "destructive" });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/dropdown-options/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dropdown-configurations'] });
      toast({ title: "Option deleted successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) return;
      toast({ title: "Error deleting option", description: error.message, variant: "destructive" });
    },
  });

  // Fetch options for a specific configuration
  const { data: configOptions } = useQuery<DropdownOption[]>({
    queryKey: ['/api/admin/dropdown-configurations', selectedConfigId, 'options'],
    queryFn: () => selectedConfigId ? apiRequest(`/api/admin/dropdown-configurations/${selectedConfigId}/options`) : Promise.resolve([]),
    enabled: !!selectedConfigId,
  });

  // Handle form submissions
  const onConfigSubmit = (data: ConfigurationFormData) => {
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data });
    } else {
      createConfigMutation.mutate(data);
    }
  };

  const onOptionSubmit = (data: OptionFormData) => {
    if (editingOption) {
      updateOptionMutation.mutate({ id: editingOption.id, data });
    } else if (selectedConfigId) {
      createOptionMutation.mutate({ ...data, configurationId: selectedConfigId });
    }
  };

  // Helper functions
  const openConfigDialog = (config?: DropdownConfiguration) => {
    setEditingConfig(config || null);
    if (config) {
      configForm.reset({
        screen: config.screen,
        category: config.category,
        fieldName: config.fieldName,
        displayName: config.displayName,
        description: config.description || "",
        isActive: config.isActive,
        sortOrder: config.sortOrder,
      });
    } else {
      configForm.reset({
        isActive: true,
        sortOrder: 0,
      });
    }
    setIsConfigDialogOpen(true);
  };

  const openOptionDialog = (configId: string, option?: DropdownOption) => {
    setSelectedConfigId(configId);
    setEditingOption(option || null);
    if (option) {
      optionForm.reset({
        value: option.value,
        label: option.label,
        description: option.description || "",
        isActive: option.isActive,
        sortOrder: option.sortOrder,
      });
    } else {
      optionForm.reset({
        isActive: true,
        sortOrder: 0,
      });
    }
    setIsOptionDialogOpen(true);
  };

  const toggleConfigExpansion = (configId: string) => {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(configId)) {
      newExpanded.delete(configId);
    } else {
      newExpanded.add(configId);
      setSelectedConfigId(configId);
    }
    setExpandedConfigs(newExpanded);
  };

  // Filter configurations
  const filteredConfigurations = configurations?.filter(config => {
    const matchesSearch = 
      config.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.screen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.fieldName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesScreen = selectedScreen === 'all' || config.screen === selectedScreen;
    const matchesCategory = selectedCategory === 'all' || config.category === selectedCategory;
    
    return matchesSearch && matchesScreen && matchesCategory;
  }) || [];

  // Get unique screens and categories for filters
  const uniqueScreens = Array.from(new Set(configurations?.map(c => c.screen) || []));
  const uniqueCategories = Array.from(new Set(configurations?.map(c => c.category) || []));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dropdown Configuration Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage dropdown values for all application screens and forms.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            data-testid="search-input"
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedScreen} onValueChange={setSelectedScreen}>
          <SelectTrigger data-testid="screen-filter" className="w-48">
            <SelectValue placeholder="Filter by screen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Screens</SelectItem>
            {uniqueScreens.map(screen => (
              <SelectItem key={screen} value={screen}>{screen}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger data-testid="category-filter" className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          data-testid="add-configuration-button"
          onClick={() => openConfigDialog()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {configsLoading ? (
          <div className="text-center py-8">
            <div className="text-lg">Loading configurations...</div>
          </div>
        ) : filteredConfigurations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Configurations Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get started by creating your first dropdown configuration.
              </p>
              <Button onClick={() => openConfigDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredConfigurations.map((config) => (
            <Card key={config.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      data-testid={`expand-config-${config.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleConfigExpansion(config.id)}
                    >
                      {expandedConfigs.has(config.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{config.displayName}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{config.screen}</Badge>
                        <Badge variant="outline">{config.category}</Badge>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      data-testid={`add-option-${config.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => openOptionDialog(config.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                    <Button
                      data-testid={`edit-config-${config.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => openConfigDialog(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      data-testid={`delete-config-${config.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this configuration?')) {
                          deleteConfigMutation.mutate(config.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {config.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {config.description}
                  </p>
                )}
              </CardHeader>

              {/* Options List - Show when expanded */}
              {expandedConfigs.has(config.id) && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Options ({configOptions?.length || 0})
                    </h4>
                    
                    {configOptions && configOptions.length > 0 ? (
                      <div className="grid gap-2">
                        {configOptions.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{option.label}</span>
                                <Badge variant={option.isActive ? "default" : "secondary"} className="text-xs">
                                  {option.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Value: {option.value}
                                {option.description && ` • ${option.description}`}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                data-testid={`edit-option-${option.id}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => openOptionDialog(config.id, option)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                data-testid={`delete-option-${option.id}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this option?')) {
                                    deleteOptionMutation.mutate(option.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No options configured yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit Configuration" : "Create Configuration"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(onConfigSubmit)} className="space-y-4">
              <FormField
                control={configForm.control}
                name="screen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Screen</FormLabel>
                    <FormControl>
                      <Input data-testid="config-screen-input" placeholder="e.g., vendor-management" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={configForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input data-testid="config-category-input" placeholder="e.g., general" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={configForm.control}
                name="fieldName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Name</FormLabel>
                    <FormControl>
                      <Input data-testid="config-field-name-input" placeholder="e.g., status" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={configForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input data-testid="config-display-name-input" placeholder="e.g., Vendor Status" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={configForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        data-testid="config-description-input"
                        placeholder="Brief description of this dropdown configuration" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center justify-between">
                <FormField
                  control={configForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch 
                          data-testid="config-active-switch"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={configForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="config-sort-order-input"
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  data-testid="cancel-config-button"
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsConfigDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  data-testid="save-config-button"
                  type="submit" 
                  disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
                >
                  {createConfigMutation.isPending || updateConfigMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Option Dialog */}
      <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? "Edit Option" : "Add Option"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...optionForm}>
            <form onSubmit={optionForm.handleSubmit(onOptionSubmit)} className="space-y-4">
              <FormField
                control={optionForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input data-testid="option-value-input" placeholder="e.g., active" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={optionForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input data-testid="option-label-input" placeholder="e.g., Active" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={optionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        data-testid="option-description-input"
                        placeholder="Brief description of this option" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center justify-between">
                <FormField
                  control={optionForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch 
                          data-testid="option-active-switch"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={optionForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="option-sort-order-input"
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  data-testid="cancel-option-button"
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOptionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  data-testid="save-option-button"
                  type="submit" 
                  disabled={createOptionMutation.isPending || updateOptionMutation.isPending}
                >
                  {createOptionMutation.isPending || updateOptionMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}