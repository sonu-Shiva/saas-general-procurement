import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import SinglePageRfxForm from "@/components/single-page-rfx-form";
import TestRfxForm from "@/components/test-rfx-form";
import SimpleRfxForm from "@/components/simple-rfx-form";
import EnhancedRfxForm from "@/components/enhanced-rfx-form";
import ConvertRfxForm from "@/components/convert-rfx-form";
import { CreatePOFromRfxDialog } from "@/components/CreatePOFromRfxDialog";
import { TermsUploader } from "@/components/TermsUploader";
import { RfxResponseForm } from "@/components/rfx-response-form";
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
  X,
  ShoppingCart
} from "lucide-react";

export default function RfxManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [convertSourceRfx, setConvertSourceRfx] = useState<any>(null);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedRfxForResponse, setSelectedRfxForResponse] = useState<any>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [selectedRfxForPO, setSelectedRfxForPO] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedRfxForView, setSelectedRfxForView] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = (user as any)?.role === 'vendor';

  // Use different API endpoints based on user role
  const { data: rfxEvents = [], isLoading } = useQuery({
    queryKey: isVendor ? ["/api/vendor/rfx-invitations"] : ["/api/rfx"],
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

  const handleCloseRfx = async (rfxId: string) => {
    try {
      const response = await fetch(`/api/rfx/${rfxId}/close`, {
        method: 'PATCH',
        credentials: "include",
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

  const handleConvertRfx = (sourceRfx: any) => {
    setConvertSourceRfx(sourceRfx);
    setIsConvertDialogOpen(true);
  };

  const handleCreatePOFromRfx = (rfx: any) => {
    setSelectedRfxForPO(rfx);
    setIsPODialogOpen(true);
  };

  const handleRespondToRfx = (rfx: any) => {
    setSelectedRfxForResponse(rfx);
    setIsResponseDialogOpen(true);
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isVendor ? "RFx Invitations" : "RFx Management"}
          </h1>
          <p className="text-muted-foreground">
            {isVendor 
              ? "View and respond to RFx invitations from buyers" 
              : "Manage Request for Quotes, Proposals, and Information"
            }
          </p>
        </div>
        {!isVendor && (
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
                  <EnhancedRfxForm 
                    onClose={() => setIsCreateDialogOpen(false)}
                    onSuccess={() => {
                      setIsCreateDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-200 hover:bg-blue-50">
                  <Bot className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <span>AI Assistant</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">AI Assistant</h3>
                    <p className="text-muted-foreground">AI-powered assistance for RFx management coming soon...</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-green-200 hover:bg-green-50">
                  <Target className="w-4 h-4 mr-2" />
                  Convert RFx
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Convert RFx to Different Type</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
                  {convertSourceRfx && (
                    <ConvertRfxForm 
                      sourceRfx={convertSourceRfx}
                      onClose={() => {
                        setIsConvertDialogOpen(false);
                        setConvertSourceRfx(null);
                      }}
                      onSuccess={() => {
                        setIsConvertDialogOpen(false);
                        setConvertSourceRfx(null);
                        queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
                      }}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search RFx events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="rfq">RFQ</SelectItem>
                  <SelectItem value="rfp">RFP</SelectItem>
                  <SelectItem value="rfi">RFI</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RFx Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{isVendor ? "RFx Invitations" : "RFx Events"}</span>
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
              <h3 className="text-lg font-medium text-foreground mb-2">No RFx Events Found</h3>
              <p className="text-muted-foreground mb-6">
                {rfxEventsArray.length === 0 
                  ? isVendor ? "No RFx invitations available." : "Create your first RFx request to get started."
                  : "No RFx events match your current filters. Try adjusting your search criteria."
                }
              </p>
              {!isVendor && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First RFx
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRfxEvents.map((rfx: any) => (
                <RfxCard 
                  key={rfx.id} 
                  rfx={rfx}
                  isVendor={isVendor}
                  onViewDetails={(rfx) => {
                    setSelectedRfxForView(rfx);
                    setIsViewDialogOpen(true);
                  }}
                  onRespond={handleRespondToRfx}
                  onConvert={handleConvertRfx}
                  onCreatePO={handleCreatePOFromRfx}
                  onClose={handleCloseRfx}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order Creation Dialog */}
      {!isVendor && (
        <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Create Purchase Order from RFx
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
              {selectedRfxForPO && (
                <CreatePOFromRfxDialog 
                  rfx={selectedRfxForPO}
                  onClose={() => setIsPODialogOpen(false)}
                  onSuccess={() => {
                    setIsPODialogOpen(false);
                    toast({
                      title: "Success",
                      description: "Purchase Order created successfully",
                    });
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* RFx View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>{selectedRfxForView?.type?.toUpperCase()} Details</span>
            </DialogTitle>
          </DialogHeader>
          {selectedRfxForView && (
            <div className="overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title:</span>
                        <span className="font-medium">{selectedRfxForView.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reference No:</span>
                        <span className="font-medium">{selectedRfxForView.referenceNo || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {selectedRfxForView.type?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={
                          selectedRfxForView.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedRfxForView.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {selectedRfxForView.status?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {selectedRfxForView.bomId && (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 font-medium">
                      This RFx is linked to a Bill of Materials (BOM ID: {selectedRfxForView.bomId?.slice(-8)})
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* RFx Response Dialog for Vendors */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit RFx Response</DialogTitle>
          </DialogHeader>
          {selectedRfxForResponse && (
            <RfxResponseForm
              rfx={selectedRfxForResponse}
              onClose={() => setIsResponseDialogOpen(false)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-invitations"] });
                toast({
                  title: "Response Submitted",
                  description: "Your RFx response has been submitted successfully.",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// RFx Card Component
function RfxCard({ rfx, isVendor, onViewDetails, onRespond, onConvert, onCreatePO, onClose }: any) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'rfq': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rfp': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'rfi': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-foreground">{rfx.title || 'Untitled RFx'}</h3>
            <Badge className={getTypeColor(rfx.type)}>
              {rfx.type?.toUpperCase() || 'RFX'}
            </Badge>
            <Badge className={getStatusColor(rfx.status)}>
              {rfx.status?.toUpperCase() || 'DRAFT'}
            </Badge>
          </div>
          <p className="text-muted-foreground mb-3">{rfx.scope || 'No description available'}</p>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Created: {rfx.createdAt ? new Date(rfx.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            {rfx.submissionDeadline && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Deadline: {new Date(rfx.submissionDeadline).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Vendors: {rfx.invitedVendorsCount || 0}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Button variant="ghost" size="sm" onClick={() => onViewDetails(rfx)}>
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {isVendor && rfx.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => onRespond(rfx)}>
              <Send className="w-4 h-4 mr-1" />
              Respond
            </Button>
          )}
          {!isVendor && (
            <>
              {rfx.status === 'closed' && rfx.type === 'rfq' && (
                <Button variant="ghost" size="sm" onClick={() => onCreatePO(rfx)}>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Create PO
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onConvert(rfx)}>
                <Target className="w-4 h-4 mr-1" />
                Convert
              </Button>
              {rfx.status === 'active' && (
                <Button variant="ghost" size="sm" onClick={() => onClose(rfx.id)}>
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}