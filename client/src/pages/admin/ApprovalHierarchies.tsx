import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface ApprovalHierarchy {
  id: string;
  entityType: 'procurement_request' | 'purchase_order';
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  conditions?: any;
  levels: ApprovalLevel[];
  createdAt: string;
  updatedAt: string;
}

interface ApprovalLevel {
  id: string;
  hierarchyId: string;
  levelNumber: number;
  name: string;
  description?: string;
  requiredRole: 'dept_approver' | 'sourcing_manager' | 'sourcing_exec' | 'admin';
  requiredCount: number;
  isParallel: boolean;
  timeoutHours?: number;
  conditions?: any;
  sortOrder: number;
}

const hierarchySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  entityType: z.enum(["procurement_request", "purchase_order"]),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const levelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  requiredRole: z.enum(["dept_approver", "sourcing_manager", "sourcing_exec", "admin"]),
  requiredCount: z.number().min(1, "At least 1 approver required"),
  isParallel: z.boolean().default(false),
  timeoutHours: z.number().optional(),
});

type HierarchyFormData = z.infer<typeof hierarchySchema>;
type LevelFormData = z.infer<typeof levelSchema>;

export default function ApprovalHierarchies() {
  const [selectedEntityType, setSelectedEntityType] = useState<'all' | 'procurement_request' | 'purchase_order'>('all');
  const [editingHierarchy, setEditingHierarchy] = useState<ApprovalHierarchy | null>(null);
  const [editingLevel, setEditingLevel] = useState<ApprovalLevel | null>(null);
  const [selectedHierarchy, setSelectedHierarchy] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approval hierarchies
  const { data: hierarchies, isLoading } = useQuery({
    queryKey: ['/api/admin/approval-hierarchies', selectedEntityType === 'all' ? undefined : selectedEntityType],
    queryFn: async () => {
      const params = selectedEntityType !== 'all' ? `?entityType=${selectedEntityType}` : '';
      const response = await fetch(`/api/admin/approval-hierarchies${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch approval hierarchies');
      }
      return response.json();
    },
  });

  // Hierarchy form
  const hierarchyForm = useForm<HierarchyFormData>({
    resolver: zodResolver(hierarchySchema),
    defaultValues: {
      name: "",
      description: "",
      entityType: "procurement_request",
      isActive: true,
      isDefault: false,
    },
  });

  // Level form
  const levelForm = useForm<LevelFormData>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      name: "",
      description: "",
      requiredRole: "dept_approver",
      requiredCount: 1,
      isParallel: false,
    },
  });

  // Create hierarchy mutation
  const createHierarchyMutation = useMutation({
    mutationFn: (data: HierarchyFormData) =>
      apiRequest('/api/admin/approval-hierarchies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approval-hierarchies'] });
      toast({ title: "Success", description: "Approval hierarchy created successfully" });
      hierarchyForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create approval hierarchy",
        variant: "destructive",
      });
    },
  });

  // Update hierarchy mutation
  const updateHierarchyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HierarchyFormData> }) =>
      apiRequest(`/api/admin/approval-hierarchies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approval-hierarchies'] });
      toast({ title: "Success", description: "Approval hierarchy updated successfully" });
      setEditingHierarchy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update approval hierarchy",
        variant: "destructive",
      });
    },
  });

  // Delete hierarchy mutation
  const deleteHierarchyMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/approval-hierarchies/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approval-hierarchies'] });
      toast({ title: "Success", description: "Approval hierarchy deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete approval hierarchy",
        variant: "destructive",
      });
    },
  });

  // Create level mutation
  const createLevelMutation = useMutation({
    mutationFn: ({ hierarchyId, data }: { hierarchyId: string; data: LevelFormData & { levelNumber: number; sortOrder: number } }) =>
      apiRequest(`/api/admin/approval-hierarchies/${hierarchyId}/levels`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approval-hierarchies'] });
      toast({ title: "Success", description: "Approval level created successfully" });
      levelForm.reset();
      setSelectedHierarchy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create approval level",
        variant: "destructive",
      });
    },
  });

  // Update level mutation
  const updateLevelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LevelFormData> }) =>
      apiRequest(`/api/admin/approval-levels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approval-hierarchies'] });
      toast({ title: "Success", description: "Approval level updated successfully" });
      setEditingLevel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update approval level",
        variant: "destructive",
      });
    },
  });

  // Delete level mutation
  const deleteLevelMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/approval-levels/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approval-hierarchies'] });
      toast({ title: "Success", description: "Approval level deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete approval level",
        variant: "destructive",
      });
    },
  });

  const handleCreateHierarchy = (data: HierarchyFormData) => {
    createHierarchyMutation.mutate(data);
  };

  const handleUpdateHierarchy = (data: HierarchyFormData) => {
    if (editingHierarchy) {
      updateHierarchyMutation.mutate({ id: editingHierarchy.id, data });
    }
  };

  const handleCreateLevel = (data: LevelFormData) => {
    if (!selectedHierarchy) return;
    
    const hierarchy = hierarchies?.find((h: ApprovalHierarchy) => h.id === selectedHierarchy);
    if (!hierarchy) return;

    const nextLevelNumber = Math.max(0, ...hierarchy.levels.map((l: ApprovalLevel) => l.levelNumber)) + 1;
    const nextSortOrder = Math.max(0, ...hierarchy.levels.map((l: ApprovalLevel) => l.sortOrder)) + 1;

    createLevelMutation.mutate({
      hierarchyId: selectedHierarchy,
      data: { ...data, levelNumber: nextLevelNumber, sortOrder: nextSortOrder },
    });
  };

  const handleUpdateLevel = (data: LevelFormData) => {
    if (editingLevel) {
      updateLevelMutation.mutate({ id: editingLevel.id, data });
    }
  };

  const getEntityTypeIcon = (entityType: string) => {
    return entityType === 'procurement_request' ? <FileText className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dept_approver':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'sourcing_manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'sourcing_exec':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'dept_approver':
        return 'Department Approver';
      case 'sourcing_manager':
        return 'Sourcing Manager';
      case 'sourcing_exec':
        return 'Sourcing Executive';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="approval-hierarchies-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Approval Hierarchy Configuration
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Configure multi-level approval workflows for Procurement Requests and Purchase Orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedEntityType}
            onValueChange={(value: 'all' | 'procurement_request' | 'purchase_order') => setSelectedEntityType(value)}
          >
            <SelectTrigger className="w-48" data-testid="select-entity-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="procurement_request">Procurement Requests</SelectItem>
              <SelectItem value="purchase_order">Purchase Orders</SelectItem>
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="button-create-hierarchy">
                <Plus className="w-4 h-4 mr-2" />
                Create Hierarchy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Approval Hierarchy</DialogTitle>
                <DialogDescription>
                  Create a new approval hierarchy for managing procurement workflows.
                </DialogDescription>
              </DialogHeader>

              <Form {...hierarchyForm}>
                <form onSubmit={hierarchyForm.handleSubmit(handleCreateHierarchy)} className="space-y-4">
                  <FormField
                    control={hierarchyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Standard PR Approval" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hierarchyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe when this hierarchy should be used..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hierarchyForm.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select entity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="procurement_request">Procurement Request</SelectItem>
                            <SelectItem value="purchase_order">Purchase Order</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-4">
                    <FormField
                      control={hierarchyForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Whether this hierarchy is active and can be used.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={hierarchyForm.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Default</FormLabel>
                            <FormDescription>
                              Use this as the default hierarchy for this entity type.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createHierarchyMutation.isPending}
                      data-testid="button-submit-hierarchy"
                    >
                      {createHierarchyMutation.isPending ? "Creating..." : "Create Hierarchy"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Hierarchies List */}
      <div className="grid gap-6">
        {hierarchies && hierarchies.length > 0 ? (
          hierarchies.map((hierarchy: ApprovalHierarchy) => (
            <Card key={hierarchy.id} data-testid={`hierarchy-card-${hierarchy.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getEntityTypeIcon(hierarchy.entityType)}
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {hierarchy.name}
                        {hierarchy.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {!hierarchy.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {hierarchy.entityType === 'procurement_request' ? 'Procurement Request' : 'Purchase Order'} •{' '}
                        {hierarchy.levels.length} level{hierarchy.levels.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedHierarchy(hierarchy.id)}
                          data-testid={`button-add-level-${hierarchy.id}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Level
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Approval Level</DialogTitle>
                          <DialogDescription>
                            Add a new approval level to "{hierarchy.name}".
                          </DialogDescription>
                        </DialogHeader>

                        <Form {...levelForm}>
                          <form onSubmit={levelForm.handleSubmit(handleCreateLevel)} className="space-y-4">
                            <FormField
                              control={levelForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Level Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Department Manager Approval" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={levelForm.control}
                              name="requiredRole"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Required Role</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="dept_approver">Department Approver</SelectItem>
                                      <SelectItem value="sourcing_manager">Sourcing Manager</SelectItem>
                                      <SelectItem value="sourcing_exec">Sourcing Executive</SelectItem>
                                      <SelectItem value="admin">Administrator</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={levelForm.control}
                              name="requiredCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Required Approvers</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    How many approvers of this role are needed?
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={levelForm.control}
                              name="isParallel"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Parallel Approval</FormLabel>
                                    <FormDescription>
                                      Allow multiple approvers at this level to approve simultaneously.
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button
                                type="submit"
                                disabled={createLevelMutation.isPending}
                                data-testid="button-submit-level"
                              >
                                {createLevelMutation.isPending ? "Adding..." : "Add Level"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingHierarchy(hierarchy);
                        hierarchyForm.reset({
                          name: hierarchy.name,
                          description: hierarchy.description || "",
                          entityType: hierarchy.entityType,
                          isActive: hierarchy.isActive,
                          isDefault: hierarchy.isDefault,
                        });
                      }}
                      data-testid={`button-edit-hierarchy-${hierarchy.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteHierarchyMutation.mutate(hierarchy.id)}
                      disabled={deleteHierarchyMutation.isPending}
                      data-testid={`button-delete-hierarchy-${hierarchy.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {hierarchy.description && (
                  <p className="text-sm text-muted-foreground">
                    {hierarchy.description}
                  </p>
                )}
              </CardHeader>

              <CardContent>
                {hierarchy.levels.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Approval Levels ({hierarchy.levels.length})
                    </h4>
                    <div className="space-y-2">
                      {hierarchy.levels
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((level, index) => (
                          <div
                            key={level.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`level-item-${level.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{level.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getRoleColor(level.requiredRole)}>
                                    {getRoleDisplayName(level.requiredRole)}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Users className="w-3 h-3" />
                                    {level.requiredCount} required
                                  </div>
                                  {level.isParallel && (
                                    <Badge variant="outline" className="text-xs">
                                      Parallel
                                    </Badge>
                                  )}
                                  {level.timeoutHours && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      {level.timeoutHours}h timeout
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLevel(level);
                                  levelForm.reset({
                                    name: level.name,
                                    description: level.description || "",
                                    requiredRole: level.requiredRole,
                                    requiredCount: level.requiredCount,
                                    isParallel: level.isParallel,
                                    timeoutHours: level.timeoutHours,
                                  });
                                }}
                                data-testid={`button-edit-level-${level.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteLevelMutation.mutate(level.id)}
                                disabled={deleteLevelMutation.isPending}
                                data-testid={`button-delete-level-${level.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                    <p>No approval levels configured</p>
                    <p className="text-sm">Add approval levels to define the workflow</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Approval Hierarchies</h3>
              <p className="text-muted-foreground mb-4">
                Create your first approval hierarchy to start configuring multi-level approval workflows.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Hierarchy Dialog */}
      <Dialog open={!!editingHierarchy} onOpenChange={() => setEditingHierarchy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Approval Hierarchy</DialogTitle>
            <DialogDescription>
              Update the approval hierarchy configuration.
            </DialogDescription>
          </DialogHeader>

          <Form {...hierarchyForm}>
            <form onSubmit={hierarchyForm.handleSubmit(handleUpdateHierarchy)} className="space-y-4">
              <FormField
                control={hierarchyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Standard PR Approval" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hierarchyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe when this hierarchy should be used..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-4">
                <FormField
                  control={hierarchyForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Whether this hierarchy is active and can be used.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={hierarchyForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Default</FormLabel>
                        <FormDescription>
                          Use this as the default hierarchy for this entity type.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateHierarchyMutation.isPending}
                  data-testid="button-update-hierarchy"
                >
                  {updateHierarchyMutation.isPending ? "Updating..." : "Update Hierarchy"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Level Dialog */}
      <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Approval Level</DialogTitle>
            <DialogDescription>
              Update the approval level configuration.
            </DialogDescription>
          </DialogHeader>

          <Form {...levelForm}>
            <form onSubmit={levelForm.handleSubmit(handleUpdateLevel)} className="space-y-4">
              <FormField
                control={levelForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Department Manager Approval" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={levelForm.control}
                name="requiredRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dept_approver">Department Approver</SelectItem>
                        <SelectItem value="sourcing_manager">Sourcing Manager</SelectItem>
                        <SelectItem value="sourcing_exec">Sourcing Executive</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={levelForm.control}
                name="requiredCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Approvers</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      How many approvers of this role are needed?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={levelForm.control}
                name="isParallel"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Parallel Approval</FormLabel>
                      <FormDescription>
                        Allow multiple approvers at this level to approve simultaneously.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateLevelMutation.isPending}
                  data-testid="button-update-level"
                >
                  {updateLevelMutation.isPending ? "Updating..." : "Update Level"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}