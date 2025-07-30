import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import SinglePageRfxForm from "@/components/single-page-rfx-form";
import TestRfxForm from "@/components/test-rfx-form";
import SimpleRfxForm from "@/components/simple-rfx-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Eye,
  Edit,
  Send,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  Bot,
  MessageSquare,
  Target,
  TrendingUp,
  X
} from "lucide-react";

export default function RfxManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rfxEvents = [], isLoading } = useQuery({
    queryKey: ["/api/rfx"],
    retry: false,
  });

  console.log("RfxManagement render - rfxEvents:", rfxEvents, "isLoading:", isLoading);
  
  // Ensure rfxEvents is always an array and define filteredRfxEvents
  const rfxEventsArray = Array.isArray(rfxEvents) ? rfxEvents : [];
  
  const filteredRfxEvents = rfxEventsArray.filter((rfx: any) => {
    const matchesSearch = rfx.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rfx.scope?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || rfx.status === statusFilter;
    const matchesType = typeFilter === "all" || rfx.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateNextStage = async (parentRfx: any) => {
    try {
      const response = await fetch(`/api/rfx/${parentRfx.id}/create-next-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
        console.log(`Created ${data.nextRfx.type.toUpperCase()} from ${parentRfx.type.toUpperCase()}`);
      } else {
        console.error('Failed to create next stage');
      }
    } catch (error) {
      console.error('Error creating next stage:', error);
    }
  };

  const handleViewRfx = (rfx: any) => {
    toast({
      title: "View RFx",
      description: `Viewing ${rfx.type.toUpperCase()}: ${rfx.title}`,
    });
    // TODO: Navigate to RFx detail page
  };

  const handleEditRfx = (rfx: any) => {
    toast({
      title: "Edit RFx",
      description: `Editing ${rfx.type.toUpperCase()}: ${rfx.title}`,
    });
    // TODO: Open edit dialog with pre-filled data
  };

  const handlePublishRfx = async (rfxId: string) => {
    try {
      const response = await fetch(`/api/rfx/${rfxId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'active' }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "RFx published and made active",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish RFx",
        variant: "destructive",
      });
    }
  };

  const handleCloseRfx = async (rfxId: string) => {
    try {
      const response = await fetch(`/api/rfx/${rfxId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'closed' }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "RFx closed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close RFx",
        variant: "destructive",
      });
    }
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
                <h1 className="text-3xl font-bold text-foreground">RFx Management</h1>
                <p className="text-muted-foreground">Manage Request for Quotes, Proposals, and Information</p>
              </div>
              <div className="flex space-x-3">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create RFx
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Create New RFx Request</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
                      <SimpleRfxForm 
                        onClose={() => setIsCreateDialogOpen(false)}
                        onSuccess={() => {
                          setIsCreateDialogOpen(false);
                          queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
                        }} 
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => setIsAiDialogOpen(true)}>
                  <Bot className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-foreground">{rfxEventsArray.length}</div>
                      <div className="text-sm text-muted-foreground">Total RFx</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {rfxEventsArray.filter((r: any) => r.status === 'active').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Active</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Clock className="w-8 h-8 text-yellow-600" />
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {rfxEventsArray.filter((r: any) => r.status === 'draft').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Draft</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Target className="w-8 h-8 text-slate-600" />
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {rfxEventsArray.filter((r: any) => r.status === 'completed').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-64 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search RFx by title, description, or vendor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="RFI">RFI</SelectItem>
                      <SelectItem value="RFP">RFP</SelectItem>
                      <SelectItem value="RFQ">RFQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* RFx List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>RFx Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading RFx events...</p>
                  </div>
                ) : filteredRfxEvents.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No RFx Found</h3>
                    <p className="text-muted-foreground mb-6">
                      {rfxEventsArray.length === 0 
                        ? "Create your first RFx to get started with vendor management."
                        : "No RFx match your current filters. Try adjusting your search criteria."
                      }
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Request
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredRfxEvents.map((rfx: any) => (
                      <div key={rfx.id} className="p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-foreground">{rfx.title}</h3>
                              <Badge variant={
                                rfx.status === 'active' ? 'default' :
                                rfx.status === 'draft' ? 'secondary' :
                                rfx.status === 'completed' ? 'outline' : 'destructive'
                              }>
                                {rfx.status}
                              </Badge>
                              <Badge variant="secondary">
                                {rfx.type}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-3">{rfx.scope}</p>
                            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Deadline: {rfx.dueDate ? new Date(rfx.dueDate).toLocaleDateString() : 'Not set'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="w-4 h-4" />
                                <span>Budget: {rfx.budget ? `₹${rfx.budget}` : 'Not specified'}</span>
                              </div>
                              {rfx.bomId && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  <FileText className="w-3 h-3 mr-1" />
                                  BOM Linked
                                </Badge>
                              )}
                              {rfx.parentRfxId && (
                                <Badge variant="outline" className="text-xs">
                                  Workflow continuation
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button variant="ghost" size="sm" onClick={() => handleViewRfx(rfx)}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {rfx.status === 'draft' && (
                              <Button variant="ghost" size="sm" onClick={() => handleEditRfx(rfx)}>
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            )}
                            {rfx.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handlePublishRfx(rfx.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Publish
                              </Button>
                            )}
                            {rfx.status === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCloseRfx(rfx.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Close
                              </Button>
                            )}
                            {(rfx.type === 'rfi' || rfx.type === 'rfp') && rfx.status === 'closed' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCreateNextStage(rfx)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Create {rfx.type === 'rfi' ? 'RFP' : 'RFQ'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Assistant Dialog */}
            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>AI RFx Assistant</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <p className="text-muted-foreground">AI-powered assistance for RFx management coming soon...</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}