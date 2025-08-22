import { useState, useMemo } from "react";
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
import { RfxResponsesView } from "@/components/rfx-responses-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  ShoppingCart,
  Package
} from "lucide-react";

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function RfxManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
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
  const [selectedRfxForResponses, setSelectedRfxForResponses] = useState<any>(null);
  const [isResponsesDialogOpen, setIsResponsesDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = (user as any)?.role === 'vendor';

  // Use different API endpoints based on user role
  const { data: rfxEvents = [], isLoading, refetch } = useQuery({
    queryKey: isVendor ? ["/api/vendor/rfx-invitations"] : ["/api/rfx"],
    retry: false,
  });

  // For vendors, also fetch response data to show counts
  const { data: vendorResponses = [] } = useQuery({
    queryKey: ["/api/vendor/rfx-responses"],
    enabled: isVendor,
    retry: false,
  });

  console.log("RfxManagement render - rfxEvents:", rfxEvents, "isLoading:", isLoading);

  // Ensure rfxEvents is always an array and define filteredRfxEvents
  const rfxEventsArray = Array.isArray(rfxEvents) ? rfxEvents : [];

  // Filter RFx events based on role and search criteria
  const filteredRfxEvents = useMemo(() => {
    if (!rfxEvents || !Array.isArray(rfxEvents)) return [];

    return rfxEvents.filter((rfx: any) => {
      // Search filter
      const searchableText = [
        rfx.title,
        rfx.rfxTitle, // For vendor invitations
        rfx.referenceNo,
        rfx.rfxReferenceNo, // For vendor invitations
        rfx.rfx?.title, // Nested rfx object
        rfx.rfx?.referenceNo // Nested rfx object
      ].filter(Boolean).join(' ').toLowerCase();

      if (searchQuery && !searchableText.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      const rfxType = rfx.type || rfx.rfxType || rfx.rfx?.type;
      if (typeFilter !== 'all' && rfxType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (isVendor) {
          // For vendors, filter by invitation status
          return (rfx.status || rfx.invitationStatus) === statusFilter;
        } else {
          // For buyers, filter by RFx status
          const rfxStatus = rfx.status || rfx.rfxStatus || rfx.rfx?.status;
          return rfxStatus === statusFilter;
        }
      }

      return true;
    });
  }, [rfxEvents, searchQuery, typeFilter, statusFilter, isVendor]);

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

  const handleViewResponses = (rfx: any) => {
    setSelectedRfxForResponses(rfx);
    setIsResponsesDialogOpen(true);
  };

  const handleCreateVendorInvitations = async () => {
    try {
      const response = await fetch('/api/dev/create-vendor-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Vendor invitations created:', result);
        // Refetch the data to update the UI
        await queryClient.invalidateQueries({ queryKey: [isVendor ? "/api/vendor/rfx-invitations" : "/api/rfx"] });
      } else {
        console.error('Failed to create vendor invitations');
      }
    } catch (error) {
      console.error('Error creating vendor invitations:', error);
    }
  };

  const handleInviteCurrentVendor = async (rfxId: string) => {
    try {
      const response = await fetch(`/api/dev/invite-to-rfx/${rfxId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Development vendor invited:', result);
        // Refetch the data to update the UI
        await queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-invitations"] });
      } else {
        console.error('Failed to invite development vendor');
      }
    } catch (error) {
      console.error('Error inviting development vendor:', error);
    }
  };

  const handleViewRfx = (rfx: any) => {
    setSelectedRfxForView(rfx);
    setIsViewDialogOpen(true);
  };

  // const handleRespondToRfx = (invitation: any) => {
  //   console.log('Opening response form for invitation:', invitation);
  //   setSelectedRfxForResponse(invitation);
  //   setIsResponseDialogOpen(true);
  // };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
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
          {isVendor && (
            <div className="flex space-x-4 mt-4">
              <Badge variant="outline" className="text-sm">
                <Target className="w-4 h-4 mr-1" />
                {rfxEventsArray.length} Invitations
              </Badge>
              <Badge variant="outline" className="text-sm">
                <MessageSquare className="w-4 h-4 mr-1" />
                {Array.isArray(vendorResponses) ? vendorResponses.length : 0} Responses
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Clock className="w-4 h-4 mr-1" />
                {rfxEventsArray.filter((rfx: any) => (rfx.status || rfx.invitationStatus) === 'active').length} Active
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Table/Cards Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              data-testid="button-table-view"
            >
              Table
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              data-testid="button-cards-view"
            >
              Cards
            </Button>
          </div>
          {!isVendor && (
            <>
            <div className="h-4 w-px bg-border"></div>
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
            </>
          )}
        </div>
        {!isVendor && (
          <div className="flex items-center space-x-2">
            {/* Development Test Buttons */}
            {(user as any)?.email === 'dev@sclen.com' && Array.isArray(rfxEvents) && rfxEvents.length > 0 && (
              <div className="mb-4 flex gap-2">
                <Button 
                  onClick={handleCreateVendorInvitations}
                  variant="outline"
                  className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                >
                  🧪 Test: Create Vendor Invitations (All)
                </Button>
                {isVendor && rfxEvents[0] && (
                  <Button 
                    onClick={() => handleInviteCurrentVendor(rfxEvents[0].id)}
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                  >
                    🧪 Test: Invite Me to Latest RFx
                  </Button>
                )}
              </div>
            )}
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="po_generated">PO Generated</SelectItem>
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
                  onViewDetails={handleViewRfx}
                  onRespond={handleRespondToRfx}
                  onViewResponses={handleViewResponses}
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>{selectedRfxForView?.type?.toUpperCase() || selectedRfxForView?.rfxType?.toUpperCase() || selectedRfxForView?.rfx?.type?.toUpperCase()} Details</span>
            </DialogTitle>
          </DialogHeader>
          {selectedRfxForView && (
            <div className="overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="font-medium text-right">
                        {selectedRfxForView.title || selectedRfxForView.rfxTitle || selectedRfxForView.rfx?.title || 'Untitled RFx'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference No:</span>
                      <span className="font-medium">
                        {selectedRfxForView.referenceNo || selectedRfxForView.rfxReferenceNo || selectedRfxForView.rfx?.referenceNo || 'No Reference'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {(selectedRfxForView.type || selectedRfxForView.rfxType || selectedRfxForView.rfx?.type || 'rfx').toUpperCase()}
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
                    {(selectedRfxForView.dueDate || selectedRfxForView.rfxDueDate || selectedRfxForView.rfx?.dueDate) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span className="font-medium">
                          {new Date(selectedRfxForView.dueDate || selectedRfxForView.rfxDueDate || selectedRfxForView.rfx?.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {(selectedRfxForView.budget || selectedRfxForView.rfxBudget || selectedRfxForView.rfx?.budget) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">
                          ₹{(selectedRfxForView.budget || selectedRfxForView.rfxBudget || selectedRfxForView.rfx?.budget)?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact Person:</span>
                      <span className="font-medium">
                        {selectedRfxForView.contactPerson || selectedRfxForView.rfxContactPerson || selectedRfxForView.rfx?.contactPerson || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Scope and Requirements */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Scope & Requirements</h3>
                  <div className="space-y-3">
                    {(selectedRfxForView.scope || selectedRfxForView.rfxScope || selectedRfxForView.rfx?.scope) && (
                      <div>
                        <span className="text-muted-foreground text-sm">Scope:</span>
                        <p className="text-sm mt-1 p-2 bg-gray-50 rounded">
                          {selectedRfxForView.scope || selectedRfxForView.rfxScope || selectedRfxForView.rfx?.scope}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-sm">
                        {(selectedRfxForView.type || selectedRfxForView.rfxType || selectedRfxForView.rfx?.type) === 'rfi' ? 'Information Required:' : 'Requirements:'}
                      </span>
                      <p className="text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {selectedRfxForView.criteria || selectedRfxForView.rfxCriteria || selectedRfxForView.rfx?.criteria || 'No specific criteria provided'}
                      </p>
                    </div>
                    {(selectedRfxForView.evaluationParameters || selectedRfxForView.rfxEvaluationParameters || selectedRfxForView.rfx?.evaluationParameters) && (
                      <div>
                        <span className="text-muted-foreground text-sm">Evaluation Criteria:</span>
                        <p className="text-sm mt-1 p-2 bg-gray-50 rounded">
                          {selectedRfxForView.evaluationParameters || selectedRfxForView.rfxEvaluationParameters || selectedRfxForView.rfx?.evaluationParameters}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Terms & Conditions */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Terms & Conditions</h3>
                {(selectedRfxForView.termsAndConditionsPath || selectedRfxForView.rfxTermsAndConditionsPath || selectedRfxForView.rfx?.termsAndConditionsPath) ? (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const termsPath = selectedRfxForView.termsAndConditionsPath || selectedRfxForView.rfxTermsAndConditionsPath || selectedRfxForView.rfx?.termsAndConditionsPath;
                        if (termsPath) {
                          window.open(termsPath, '_blank');
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Terms & Conditions
                    </Button>
                    <span className="text-sm text-green-600">Document available</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No terms and conditions document uploaded
                  </div>
                )}
              </Card>

              {/* BOM Integration */}
              {(selectedRfxForView.bomId || selectedRfxForView.rfxBomId || selectedRfxForView.rfx?.bomId) && (
                <Card className="p-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <p className="text-blue-800 font-medium">
                        This RFx is linked to a Bill of Materials (BOM ID: {(selectedRfxForView.bomId || selectedRfxForView.rfxBomId || selectedRfxForView.rfx?.bomId)?.slice(-8)})
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Attachments */}
              {(selectedRfxForView.attachments || selectedRfxForView.rfxAttachments || selectedRfxForView.rfx?.attachments) && 
               (selectedRfxForView.attachments || selectedRfxForView.rfxAttachments || selectedRfxForView.rfx?.attachments)?.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Attachments</h3>
                  <div className="space-y-2">
                    {(selectedRfxForView.attachments || selectedRfxForView.rfxAttachments || selectedRfxForView.rfx?.attachments)?.map((attachment: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <a 
                          href={attachment} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Attachment {index + 1}
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              {isVendor && (selectedRfxForView.status || selectedRfxForView.invitationStatus) === 'active' && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      handleRespondToRfx(selectedRfxForView);
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Respond to {(selectedRfxForView.type || selectedRfxForView.rfxType || selectedRfxForView.rfx?.type || 'RFx').toUpperCase()}
                  </Button>
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
              onClose={() => {
                setIsResponseDialogOpen(false);
                setSelectedRfxForResponse(null);
              }}
              onSuccess={() => {
                console.log('Response submitted successfully');
                queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-invitations"] });
                queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-responses"] });
                setIsResponseDialogOpen(false);
                setSelectedRfxForResponse(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* RFx Responses View Dialog for Buyers */}
      <Dialog open={isResponsesDialogOpen} onOpenChange={setIsResponsesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>RFx Responses - {selectedRfxForResponses?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedRfxForResponses && (
            <RfxResponsesView
              rfx={selectedRfxForResponses}
              onClose={() => setIsResponsesDialogOpen(false)}
              onCreatePO={handleCreatePOFromRfx}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// RFx Card Component
function RfxCard({ rfx, isVendor, onViewDetails, onRespond, onViewResponses, onConvert, onCreatePO, onClose }: any) {
  // Extract the proper RFx data based on the structure
  const rfxData = rfx.rfx || rfx;
  const invitationStatus = rfx.status || rfx.invitationStatus;
  const rfxStatus = rfxData.status;

  // Debug logging for vendor response logic
  console.log('RfxCard - Debug Info:', {
    isVendor,
    rfxId: rfx.id,
    invitationStatus,
    rfxStatus,
    canRespondCheck: {
      isVendor,
      statusCheck: (invitationStatus === 'invited' || invitationStatus === 'active'),
      rfxActiveCheck: (rfxStatus === 'active'),
      notRespondedCheck: (invitationStatus !== 'responded')
    }
  });

  // Determine if vendor can respond - check both invitation and RFx status
  const canRespond = isVendor && 
    (invitationStatus === 'invited' || invitationStatus === 'active') && 
    (rfxStatus === 'active') &&
    (invitationStatus !== 'responded');

  console.log('RfxCard - Can Respond:', canRespond);
  
  // EXPLICIT STATUS DISPLAY CHECK
  const vendorDisplayStatus = invitationStatus === 'responded' ? 'responded' : rfxStatus;
  const vendorDisplayText = invitationStatus === 'responded' ? 'RESPONDED' : rfxStatus?.toUpperCase() || 'DRAFT';
  console.log('🔍 VENDOR STATUS DISPLAY:', {
    rfxId: rfx.id,
    isVendor,
    invitationStatus,
    rfxStatus,
    vendorDisplayStatus,
    vendorDisplayText
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'responded': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'po_generated': return 'bg-blue-100 text-blue-700 border-blue-200';
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
            <h3 className="text-lg font-medium text-foreground">
              {rfxData.title || 'Untitled RFx'}
            </h3>
            <Badge className={getTypeColor(rfxData.type)}>
              {(rfxData.type || 'RFX').toUpperCase()}
            </Badge>
            {isVendor ? (
              <Badge className={getStatusColor(invitationStatus === 'responded' ? 'responded' : rfxStatus)}>
                {invitationStatus === 'responded' ? 'RESPONDED' : rfxStatus?.toUpperCase() || 'DRAFT'}
              </Badge>
            ) : (
              <Badge className={getStatusColor(rfxStatus)}>
                {rfxStatus?.toUpperCase() || 'DRAFT'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-3">{rfxData.scope || 'No description available'}</p>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Created: {rfxData.createdAt ? new Date(rfxData.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            {rfxData.dueDate && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Deadline: {new Date(rfxData.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Vendors: {rfxData.invitedVendorsCount || 0}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Button variant="ghost" size="sm" onClick={() => onViewDetails(rfx)}>
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {canRespond && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                console.log('Respond button clicked for RFx:', rfx);
                onRespond(rfx);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-1" />
              Respond
            </Button>
          )}
          {isVendor && invitationStatus === 'responded' && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Responded
            </Badge>
          )}
          {!isVendor && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onViewResponses(rfx)}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Responses
              </Button>
              {(rfxStatus === 'closed' && rfxData.type === 'rfq') && (
                <Button variant="ghost" size="sm" onClick={() => onCreatePO(rfx)}>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Create PO
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onConvert(rfx)}>
                <Target className="w-4 h-4 mr-1" />
                Convert
              </Button>
              {rfxStatus === 'active' && (
                <Button variant="ghost" size="sm" onClick={() => onClose(rfxData.id)}>
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