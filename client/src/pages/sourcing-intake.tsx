import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Search, 
  User, 
  Building2, 
  CheckCircle, 
  Eye, 
  Package, 
  ShoppingCart,
  Gavel,
  FileQuestion,
  FileCheck,
  IndianRupee,
  Users,
  AlertCircle,
  ArrowRight,
  Settings
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ProcurementRequest {
  id: string;
  requestNumber: string;
  title: string;
  description?: string;
  department: string;
  bomId: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedBy: string;
  requestedDeliveryDate: string;
  justification?: string;
  estimatedBudget?: number;
  requestApprovalStatus: "pending" | "approved" | "rejected";
  procurementMethod?: "rfx" | "auction" | "direct";
  procurementMethodStatus: "pending" | "approved" | "rejected";
  overallStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface BOMItem {
  id: string;
  itemName: string;
  quantity: string;
  uom: string;
  unitPrice?: string;
  totalPrice?: string;
  specifications?: string;
}

interface SourcingEvent {
  id: string;
  eventNumber: string;
  procurementRequestId: string;
  type: "RFI" | "RFP" | "RFQ" | "AUCTION" | "DIRECT_PO";
  title: string;
  description?: string;
  spendEstimate?: string;
  justification?: string;
  selectedVendorIds: string[];
  status: string;
  createdAt: string;
}

export default function SourcingIntake() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPR, setSelectedPR] = useState<ProcurementRequest | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"rfx" | "auction" | "direct" | "">("");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [spendEstimate, setSpendEstimate] = useState("");
  const [justification, setJustification] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [isRfxDialogOpen, setIsRfxDialogOpen] = useState(false);
  const [isAuctionDialogOpen, setIsAuctionDialogOpen] = useState(false);
  const [isDirectDialogOpen, setIsDirectDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch approved procurement requests assigned to sourcing exec
  const { data: procurementRequests = [], isLoading } = useQuery({
    queryKey: ["/api/procurement-requests/sourcing-queue"],
    retry: false,
  });

  // Fetch BOM details for selected PR
  const { data: bomItems = [] } = useQuery({
    queryKey: ["/api/boms", selectedPR?.bomId, "items"],
    enabled: !!selectedPR?.bomId,
    retry: false,
  });

  // Fetch vendors for method creation
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Update PR with selected method mutation
  const updatePRMethodMutation = useMutation({
    mutationFn: async (data: { prId: string; method: string }) => {
      return await apiRequest(`/api/procurement-requests/${data.prId}/method`, {
        method: "PATCH",
        body: JSON.stringify({ procurementMethod: data.method }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Method Selected",
        description: `Procurement method set to ${variables.method.toUpperCase()}. Redirecting to creation screen...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement-requests/sourcing-queue"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update procurement method",
        variant: "destructive",
      });
    },
  });

  const resetMethodForm = () => {
    setSelectedMethod("");
    setEventTitle("");
    setEventDescription("");
    setSpendEstimate("");
    setJustification("");
    setSelectedVendors([]);
  };

  const handleMethodSelection = (method: "rfx" | "auction" | "direct") => {
    if (!selectedPR) {
      toast({
        title: "Missing Information",
        description: "Please select a procurement request first",
        variant: "destructive",
      });
      return;
    }

    // Store PR context for the dialog components
    const prContext = {
      prId: selectedPR.id,
      prNumber: selectedPR.requestNumber,
      prTitle: selectedPR.title,
      prDescription: selectedPR.description,
      department: selectedPR.department,
      estimatedBudget: selectedPR.estimatedBudget,
      bomId: selectedPR.bomId,
      bomItems: bomItems
    };
    
    sessionStorage.setItem('procurementContext', JSON.stringify(prContext));

    // Update the PR with selected method first
    updatePRMethodMutation.mutate({ 
      prId: selectedPR.id, 
      method: method 
    });

    // Open appropriate dialog with prefilled information
    switch (method) {
      case "rfx":
        setEventTitle(`RFx - ${selectedPR.title}`);
        setEventDescription(`Request for information/quotation for ${selectedPR.description || selectedPR.title}`);
        setIsRfxDialogOpen(true);
        break;
      case "auction":
        setEventTitle(`Auction - ${selectedPR.title}`);
        setEventDescription(`Auction for ${selectedPR.description || selectedPR.title}`);
        setIsAuctionDialogOpen(true);
        break;
      case "direct":
        setEventTitle(`Direct Procurement - ${selectedPR.title}`);
        setEventDescription(`Direct procurement for ${selectedPR.description || selectedPR.title}`);
        setIsDirectDialogOpen(true);
        break;
    }
    setIsMethodModalOpen(false);
  };

  const filteredRequests = procurementRequests.filter((pr: ProcurementRequest) =>
    pr.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pr.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const priorityColors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const methodIcons = {
    rfx: <FileQuestion className="w-4 h-4" />,
    auction: <Gavel className="w-4 h-4" />,
    direct: <ShoppingCart className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sourcing Intake</h1>
          <p className="text-muted-foreground">
            Review approved procurement requests and select procurement methods
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search PRs</Label>
              <Input
                id="search"
                placeholder="Search by PR number, title, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-prs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Method Selection</p>
                <p className="text-2xl font-bold">{filteredRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Est. Value</p>
                <p className="text-2xl font-bold">
                  ₹{filteredRequests.reduce((sum, pr) => sum + (pr.estimatedBudget || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Urgent Priority</p>
                <p className="text-2xl font-bold">
                  {filteredRequests.filter(pr => pr.priority === "urgent").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredRequests.map(pr => pr.department)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procurement Requests Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Procurement Requests Queue</CardTitle>
          <CardDescription>
            Select procurement methods for approved requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading procurement requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approved procurement requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Est. Budget</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-medium">{pr.requestNumber}</TableCell>
                    <TableCell>{pr.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {pr.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[pr.priority]}>
                        {pr.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pr.estimatedBudget ? `₹${pr.estimatedBudget.toLocaleString()}` : "N/A"}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(pr.requestedDeliveryDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPR(pr);
                            setIsDetailsModalOpen(true);
                          }}
                          data-testid={`button-view-pr-${pr.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPR(pr);
                            setEventTitle(`Sourcing Event for ${pr.title}`);
                            setIsMethodModalOpen(true);
                          }}
                          data-testid={`button-select-method-${pr.id}`}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Select Method
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PR Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Procurement Request Details</DialogTitle>
            <DialogDescription>
              Review the full details of the procurement request
            </DialogDescription>
          </DialogHeader>

          {selectedPR && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Request Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>PR Number</Label>
                      <p className="font-medium">{selectedPR.requestNumber}</p>
                    </div>
                    <div>
                      <Label>Department</Label>
                      <p className="font-medium">{selectedPR.department}</p>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Badge className={priorityColors[selectedPR.priority]}>
                        {selectedPR.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <Label>Estimated Budget</Label>
                      <p className="font-medium">
                        {selectedPR.estimatedBudget ? `₹${selectedPR.estimatedBudget.toLocaleString()}` : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <p className="font-medium">{selectedPR.title}</p>
                  </div>
                  {selectedPR.description && (
                    <div>
                      <Label>Description</Label>
                      <p>{selectedPR.description}</p>
                    </div>
                  )}
                  {selectedPR.justification && (
                    <div>
                      <Label>Business Justification</Label>
                      <p>{selectedPR.justification}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BOM Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    BOM Items ({bomItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Specifications</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomItems.map((item: BOMItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.quantity} {item.uom}</TableCell>
                          <TableCell>
                            {item.unitPrice ? `₹${parseFloat(item.unitPrice).toLocaleString()}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            {item.totalPrice ? `₹${parseFloat(item.totalPrice).toLocaleString()}` : "N/A"}
                          </TableCell>
                          <TableCell>{item.specifications || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Method Selection Modal */}
      <Dialog open={isMethodModalOpen} onOpenChange={setIsMethodModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Procurement Method</DialogTitle>
            <DialogDescription>
              Choose the appropriate procurement method. A prefilled creation dialog will open with PR details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Method Selection */}
            <div className="space-y-4">
              <Label>Procurement Method *</Label>
              <div className="grid grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-colors ${
                    selectedMethod === "rfx" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedMethod("rfx")}
                >
                  <CardContent className="p-4 text-center">
                    <FileQuestion className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="font-medium">RFx Process</h3>
                    <p className="text-sm text-muted-foreground">RFI → RFP → RFQ flow</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-colors ${
                    selectedMethod === "auction" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedMethod("auction")}
                >
                  <CardContent className="p-4 text-center">
                    <Gavel className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="font-medium">Auction</h3>
                    <p className="text-sm text-muted-foreground">Reverse auction bidding</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-colors ${
                    selectedMethod === "direct" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedMethod("direct")}
                >
                  <CardContent className="p-4 text-center">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="font-medium">Direct PO</h3>
                    <p className="text-sm text-muted-foreground">Direct procurement</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons */}
            {selectedMethod && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">Next Steps</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    A prefilled {selectedMethod === "rfx" ? "RFx creation" : selectedMethod === "auction" ? "auction creation" : "direct procurement"} dialog will open with the procurement request details.
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleMethodSelection(selectedMethod)}
                    disabled={updatePRMethodMutation.isPending}
                    data-testid="button-proceed-to-creation"
                    className="flex-1"
                  >
                    {updatePRMethodMutation.isPending ? "Processing..." : `Create ${selectedMethod === "rfx" ? "RFx Event" : selectedMethod === "auction" ? "Auction Event" : "Direct Procurement"}`}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsMethodModalOpen(false);
                      resetMethodForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* RFx Creation Dialog */}
      <Dialog open={isRfxDialogOpen} onOpenChange={setIsRfxDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create RFx Event</DialogTitle>
            <DialogDescription>
              Create a new RFx event with prefilled procurement request details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedPR && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Procurement Request Context</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">PR Number:</span>
                    <span className="ml-2 font-medium">{selectedPR.requestNumber}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Department:</span>
                    <span className="ml-2 font-medium">{selectedPR.department}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Budget:</span>
                    <span className="ml-2 font-medium">
                      {selectedPR.estimatedBudget ? `₹${selectedPR.estimatedBudget.toLocaleString()}` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">BOM Items:</span>
                    <span className="ml-2 font-medium">{bomItems.length} items</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="rfx-title">Event Title *</Label>
                <Input
                  id="rfx-title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter RFx event title"
                  data-testid="input-rfx-title"
                />
              </div>

              <div>
                <Label htmlFor="rfx-description">Description</Label>
                <Textarea
                  id="rfx-description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Enter event description"
                  rows={3}
                  data-testid="textarea-rfx-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rfx-spend">Spend Estimate</Label>
                  <Input
                    id="rfx-spend"
                    value={spendEstimate}
                    onChange={(e) => setSpendEstimate(e.target.value)}
                    placeholder="Enter spend estimate"
                    data-testid="input-rfx-spend"
                  />
                </div>
                <div>
                  <Label htmlFor="rfx-justification">Justification</Label>
                  <Input
                    id="rfx-justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter justification"
                    data-testid="input-rfx-justification"
                  />
                </div>
              </div>

              <div>
                <Label>Select Vendors *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {vendors.map((vendor: any) => (
                    <label key={vendor.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(vendor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVendors([...selectedVendors, vendor.id]);
                          } else {
                            setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{vendor.companyName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  // Navigate to RFx page with data
                  sessionStorage.setItem('rfxFormData', JSON.stringify({
                    title: eventTitle,
                    description: eventDescription,
                    spendEstimate: spendEstimate,
                    justification: justification,
                    selectedVendors: selectedVendors,
                    procurementRequestId: selectedPR?.id
                  }));
                  setLocation("/rfx");
                  setIsRfxDialogOpen(false);
                }}
                disabled={!eventTitle || selectedVendors.length === 0}
                data-testid="button-create-rfx"
                className="flex-1"
              >
                Create RFx Event
              </Button>
              <Button variant="outline" onClick={() => setIsRfxDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auction Creation Dialog */}
      <Dialog open={isAuctionDialogOpen} onOpenChange={setIsAuctionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Auction Event</DialogTitle>
            <DialogDescription>
              Create a new auction event with prefilled procurement request details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedPR && (
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Procurement Request Context</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 dark:text-green-300">PR Number:</span>
                    <span className="ml-2 font-medium">{selectedPR.requestNumber}</span>
                  </div>
                  <div>
                    <span className="text-green-700 dark:text-green-300">Department:</span>
                    <span className="ml-2 font-medium">{selectedPR.department}</span>
                  </div>
                  <div>
                    <span className="text-green-700 dark:text-green-300">Budget:</span>
                    <span className="ml-2 font-medium">
                      {selectedPR.estimatedBudget ? `₹${selectedPR.estimatedBudget.toLocaleString()}` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700 dark:text-green-300">BOM Items:</span>
                    <span className="ml-2 font-medium">{bomItems.length} items</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="auction-title">Event Title *</Label>
                <Input
                  id="auction-title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter auction title"
                  data-testid="input-auction-title"
                />
              </div>

              <div>
                <Label htmlFor="auction-description">Description</Label>
                <Textarea
                  id="auction-description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Enter auction description"
                  rows={3}
                  data-testid="textarea-auction-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="auction-spend">Starting Price</Label>
                  <Input
                    id="auction-spend"
                    value={spendEstimate}
                    onChange={(e) => setSpendEstimate(e.target.value)}
                    placeholder="Enter starting price"
                    data-testid="input-auction-starting-price"
                  />
                </div>
                <div>
                  <Label htmlFor="auction-justification">Justification</Label>
                  <Input
                    id="auction-justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter justification"
                    data-testid="input-auction-justification"
                  />
                </div>
              </div>

              <div>
                <Label>Select Vendors *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {vendors.map((vendor: any) => (
                    <label key={vendor.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(vendor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVendors([...selectedVendors, vendor.id]);
                          } else {
                            setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{vendor.companyName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  // Navigate to auction page with data
                  sessionStorage.setItem('auctionFormData', JSON.stringify({
                    title: eventTitle,
                    description: eventDescription,
                    startingPrice: spendEstimate,
                    justification: justification,
                    selectedVendors: selectedVendors,
                    procurementRequestId: selectedPR?.id
                  }));
                  setLocation("/auctions");
                  setIsAuctionDialogOpen(false);
                }}
                disabled={!eventTitle || selectedVendors.length === 0}
                data-testid="button-create-auction"
                className="flex-1"
              >
                Create Auction Event
              </Button>
              <Button variant="outline" onClick={() => setIsAuctionDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Procurement Dialog */}
      <Dialog open={isDirectDialogOpen} onOpenChange={setIsDirectDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Direct Procurement</DialogTitle>
            <DialogDescription>
              Create a direct procurement order with prefilled procurement request details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedPR && (
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Procurement Request Context</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">PR Number:</span>
                    <span className="ml-2 font-medium">{selectedPR.requestNumber}</span>
                  </div>
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">Department:</span>
                    <span className="ml-2 font-medium">{selectedPR.department}</span>
                  </div>
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">Budget:</span>
                    <span className="ml-2 font-medium">
                      {selectedPR.estimatedBudget ? `₹${selectedPR.estimatedBudget.toLocaleString()}` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">BOM Items:</span>
                    <span className="ml-2 font-medium">{bomItems.length} items</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="direct-title">Order Title *</Label>
                <Input
                  id="direct-title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter order title"
                  data-testid="input-direct-title"
                />
              </div>

              <div>
                <Label htmlFor="direct-description">Description</Label>
                <Textarea
                  id="direct-description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Enter order description"
                  rows={3}
                  data-testid="textarea-direct-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="direct-amount">Order Amount</Label>
                  <Input
                    id="direct-amount"
                    value={spendEstimate}
                    onChange={(e) => setSpendEstimate(e.target.value)}
                    placeholder="Enter order amount"
                    data-testid="input-direct-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="direct-justification">Justification *</Label>
                  <Input
                    id="direct-justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter justification for direct procurement"
                    data-testid="input-direct-justification"
                  />
                </div>
              </div>

              <div>
                <Label>Select Vendor *</Label>
                <Select value={selectedVendors[0] || ""} onValueChange={(value) => setSelectedVendors([value])}>
                  <SelectTrigger data-testid="select-direct-vendor">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  // Navigate to direct procurement page with data
                  sessionStorage.setItem('directFormData', JSON.stringify({
                    title: eventTitle,
                    description: eventDescription,
                    orderAmount: spendEstimate,
                    justification: justification,
                    selectedVendor: selectedVendors[0],
                    procurementRequestId: selectedPR?.id
                  }));
                  setLocation("/direct-procurement");
                  setIsDirectDialogOpen(false);
                }}
                disabled={!eventTitle || !justification || selectedVendors.length === 0}
                data-testid="button-create-direct"
                className="flex-1"
              >
                Create Direct Order
              </Button>
              <Button variant="outline" onClick={() => setIsDirectDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}