import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import BomBuilder from "@/components/bom-builder";
import BomView from "@/components/bom-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  Eye,
  Edit,
  Copy,
  Bot,
  FileText,
  Calendar,
  Package
} from "lucide-react";
import type { Bom } from "@shared/schema";

export default function BomManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<Bom | null>(null);
  const [viewingBom, setViewingBom] = useState<Bom | null>(null);
  const [copyingBom, setCopyingBom] = useState<Bom | null>(null);
  const [copyForm, setCopyForm] = useState({ name: '', version: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is a buyer (can create BOMs)
  const isBuyer = (user as any)?.role === 'buyer_admin' || (user as any)?.role === 'buyer_user' || (user as any)?.role === 'sourcing_manager';
  const isVendor = (user as any)?.role === 'vendor';

  const { data: boms = [], isLoading } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });

  // Debug logging for BOM data
  console.log("BOM Management - Raw boms data:", boms);

  const filteredBoms = (boms as Bom[])?.filter((bom: Bom) => {
    const matchesSearch = bom.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bom.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || bom.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Debug logging for filtered BOMs
  console.log("BOM Management - Filtered boms:", filteredBoms);
  console.log("BOM Management - Active BOMs count:", (boms as Bom[])?.filter((b: Bom) => b.isActive).length);

  const handleEditBom = (bom: Bom) => {
    setEditingBom(bom);
    setIsEditDialogOpen(true);
  };

  const handleViewBom = (bom: Bom) => {
    setViewingBom(bom);
    setIsViewDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingBom(null);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setViewingBom(null);
  };

  const handleCopyBom = (bom: Bom) => {
    setCopyingBom(bom);
    setCopyForm({ 
      name: `${bom.name} (Copy)`, 
      version: "1.0" 
    });
    setIsCopyDialogOpen(true);
  };

  const copyBomMutation = useMutation({
    mutationFn: async ({ bomId, name, version }: { bomId: string; name: string; version: string }) => {
      const response = await apiRequest("POST", `/api/boms/${bomId}/copy`, { name, version });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boms"] });
      setIsCopyDialogOpen(false);
      setCopyingBom(null);
      setCopyForm({ name: '', version: '' });
      toast({
        title: "Success",
        description: "BOM copied successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
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
        description: error.message || "Failed to copy BOM",
        variant: "destructive",
      });
    },
  });

  const handleSubmitCopy = () => {
    if (!copyingBom || !copyForm.name || !copyForm.version) {
      toast({
        title: "Error", 
        description: "Please enter both name and version",
        variant: "destructive",
      });
      return;
    }

    copyBomMutation.mutate({ 
      bomId: copyingBom.id, 
      name: copyForm.name, 
      version: copyForm.version 
    });
  };

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
                <h1 className="text-3xl font-bold text-foreground">BOM Management</h1>
                <p className="text-muted-foreground">Create and manage Bills of Materials for grouped procurement</p>
              </div>
              <div className="flex space-x-3">
                {!isBuyer && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {isVendor 
                        ? "BOM creation is restricted to buyers. Switch to a buyer role to create BOMs."
                        : "Please select a buyer role to access BOM management features."
                      }
                    </p>
                  </div>
                )}
                {isBuyer && (
                  <>
                    <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                          <Bot className="w-4 h-4 mr-2" />
                          AI BOM Builder
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Bot className="w-5 h-5 mr-2 text-primary" />
                        AI-Powered BOM Creation
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">AI Assistant</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                          Describe what you want to build, and I'll suggest components from your catalogue.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            What do you want to build?
                          </label>
                          <Input
                            placeholder="e.g., 'Office workstation setup', 'Industrial pump assembly', 'Electronic device prototype'"
                            className="text-lg py-3"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Quantity Needed
                            </label>
                            <Input type="number" placeholder="100" />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Budget Range
                            </label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select budget" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Under ₹50,000</SelectItem>
                                <SelectItem value="medium">₹50,000 - ₹2,00,000</SelectItem>
                                <SelectItem value="high">₹2,00,000 - ₹10,00,000</SelectItem>
                                <SelectItem value="enterprise">Above ₹10,00,000</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button className="bg-primary hover:bg-primary/90">
                            <Bot className="w-4 h-4 mr-2" />
                            Generate BOM
                          </Button>
                        </div>
                      </div>
                    </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Create BOM
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingBom && !isEditDialogOpen ? 'Copy BOM' : 'Create New BOM'}</DialogTitle>
                        </DialogHeader>
                        <BomBuilder 
                          existingBom={editingBom && !isEditDialogOpen ? editingBom : undefined}
                          onClose={() => {
                            setIsCreateDialogOpen(false);
                            setEditingBom(null);
                          }} 
                        />
                      </DialogContent>
                    </Dialog>

                    {/* Edit BOM Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit BOM: {editingBom?.name}</DialogTitle>
                        </DialogHeader>
                        {editingBom && (
                          <BomBuilder 
                            onClose={handleCloseEditDialog} 
                            existingBom={editingBom}
                          />
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* View BOM Dialog */}
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>BOM Details: {viewingBom?.name}</DialogTitle>
                        </DialogHeader>
                        {viewingBom && <BomView bom={viewingBom} onClose={handleCloseViewDialog} />}
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
                      <p className="text-sm text-muted-foreground mb-1">Total BOMs</p>
                      <p className="text-2xl font-bold">{(boms as Bom[])?.length || 0}</p>
                    </div>
                    <Layers className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active BOMs</p>
                      <p className="text-2xl font-bold text-success">
                        {(boms as Bom[])?.filter((b: Bom) => b.isActive).length || 0}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Categories</p>
                      <p className="text-2xl font-bold">
                        {(boms as Bom[]) ? new Set((boms as Bom[]).map((b: Bom) => b.category)).size : 0}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">This Month</p>
                      <p className="text-2xl font-bold">
                        {(boms as Bom[])?.filter((b: Bom) => {
                          const bomDate = new Date(b.createdAt || '');
                          const now = new Date();
                          return bomDate.getMonth() === now.getMonth() && bomDate.getFullYear() === now.getFullYear();
                        }).length || 0}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-secondary" />
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
                        placeholder="Search BOMs..."
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
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="office">Office Equipment</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BOMs Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-muted rounded w-full"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBoms && filteredBoms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBoms.map((bom: Bom) => (
                  <Card key={bom.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white">
                            <Layers className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{bom.name}</h3>
                            <p className="text-sm text-muted-foreground">v{bom.version}</p>
                          </div>
                        </div>
                        <Badge variant={bom.isActive ? "default" : "secondary"}>
                          {bom.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {bom.description || "No description provided"}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        {bom.category && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Category:</span>
                            <Badge variant="outline">{bom.category}</Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{new Date(bom.createdAt || '').toLocaleDateString()}</span>
                        </div>
                        {bom.validTo && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Valid Until:</span>
                            <span>{new Date(bom.validTo).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {bom.tags && bom.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {bom.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {bom.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{bom.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewBom(bom)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleEditBom(bom)}
                          disabled={!isBuyer}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCopyBom(bom)}
                          title="Copy BOM"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No BOMs found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || categoryFilter !== "all"
                      ? "Try adjusting your search criteria or filters"
                      : "Start by creating your first Bill of Materials"
                    }
                  </p>
                  {!searchQuery && categoryFilter === "all" && (
                    <div className="flex justify-center space-x-3">
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create BOM
                      </Button>
                      <Button variant="outline" onClick={() => setIsAiDialogOpen(true)}>
                        <Bot className="w-4 h-4 mr-2" />
                        Try AI Builder
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Copy BOM Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy BOM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New BOM Name</label>
              <Input
                value={copyForm.name}
                onChange={(e) => setCopyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter BOM name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Version</label>
              <Input
                value={copyForm.version}
                onChange={(e) => setCopyForm(prev => ({ ...prev, version: e.target.value }))}
                placeholder="Enter version"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitCopy}
                disabled={copyBomMutation.isPending}
              >
                {copyBomMutation.isPending ? "Copying..." : "Copy BOM"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
