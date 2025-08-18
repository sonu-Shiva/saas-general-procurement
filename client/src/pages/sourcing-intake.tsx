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
  Settings,
  Upload
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
  const [isCreateFormDialogOpen, setIsCreateFormDialogOpen] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<"rfx" | "auction" | "direct" | null>(null);
  
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

  // Fetch all BOMs for dropdown selection
  const { data: allBoms = [] } = useQuery({
    queryKey: ["/api/boms"],
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

    // Store PR context for the creation pages
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
    }, {
      onSuccess: () => {
        // Open the appropriate dialog with prefilled data
        setTimeout(() => {
          setSelectedMethodType(method);
          setIsCreateFormDialogOpen(true);
        }, 100);
      }
    });

    setIsMethodModalOpen(false);
  };

  const filteredRequests = (procurementRequests as ProcurementRequest[]).filter((pr: ProcurementRequest) =>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sourcing Intake</h1>
          <p className="text-muted-foreground">
            Review approved procurement requests and select procurement methods
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium">Search PRs</Label>
              <Input
                id="search"
                placeholder="Search by PR number, title, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-prs"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Awaiting Method Selection</p>
                <p className="text-2xl font-bold">{filteredRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <IndianRupee className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Est. Value</p>
                <p className="text-2xl font-bold">
                  ₹{filteredRequests.reduce((sum, pr) => sum + (pr.estimatedBudget || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Urgent Priority</p>
                <p className="text-2xl font-bold">
                  {filteredRequests.filter(pr => pr.priority === "urgent").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-1">
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
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Approved Procurement Requests Queue</CardTitle>
          <CardDescription>
            Select procurement methods for approved requests
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
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
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl">Procurement Request Details</DialogTitle>
            <DialogDescription>
              Review the full details of the procurement request
            </DialogDescription>
          </DialogHeader>

          {selectedPR && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    Request Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
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
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="w-5 h-5" />
                    BOM Items ({(bomItems as BOMItem[]).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
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
                      {(bomItems as BOMItem[]).map((item: BOMItem) => (
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
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl">Select Procurement Method</DialogTitle>
            <DialogDescription>
              Choose the appropriate procurement method. The creation form will open with PR details pre-filled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Method Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Procurement Method *</Label>
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
                    A creation form will open with the procurement request details pre-filled for easy {selectedMethod === "rfx" ? "RFx" : selectedMethod === "auction" ? "auction" : "direct procurement"} event creation.
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

      {/* Create Form Dialog */}
      <Dialog open={isCreateFormDialogOpen} onOpenChange={setIsCreateFormDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl">
              Create {selectedMethodType === "rfx" ? "RFx Event" : selectedMethodType === "auction" ? "Auction Event" : "Direct Procurement"}
            </DialogTitle>
            <DialogDescription>
              Create a new {selectedMethodType} event with prefilled data from PR: {selectedPR?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] pt-0">
            {selectedMethodType === "auction" && selectedPR && (
              <CreateAuctionFormEmbedded 
                procurementRequest={selectedPR}
                bomItems={bomItems}
                allBoms={allBoms}
                vendors={vendors}
                onClose={() => {
                  setIsCreateFormDialogOpen(false);
                  setSelectedMethodType(null);
                }}
                onSuccess={() => {
                  setIsCreateFormDialogOpen(false);
                  setSelectedMethodType(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/procurement-requests/sourcing-queue"] });
                  toast({
                    title: "Success",
                    description: "Auction created successfully from procurement request",
                  });
                }}
              />
            )}
            {selectedMethodType === "rfx" && selectedPR && (
              <CreateRfxFormEmbedded 
                procurementRequest={selectedPR}
                bomItems={bomItems}
                allBoms={allBoms}
                vendors={vendors}
                onClose={() => {
                  setIsCreateFormDialogOpen(false);
                  setSelectedMethodType(null);
                }}
                onSuccess={() => {
                  setIsCreateFormDialogOpen(false);
                  setSelectedMethodType(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/procurement-requests/sourcing-queue"] });
                  toast({
                    title: "Success",
                    description: "RFx event created successfully from procurement request",
                  });
                }}
              />
            )}
            {selectedMethodType === "direct" && selectedPR && (
              <CreateDirectProcurementFormEmbedded 
                procurementRequest={selectedPR}
                bomItems={bomItems}
                allBoms={allBoms}
                vendors={vendors}
                onClose={() => {
                  setIsCreateFormDialogOpen(false);
                  setSelectedMethodType(null);
                }}
                onSuccess={() => {
                  setIsCreateFormDialogOpen(false);
                  setSelectedMethodType(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/procurement-requests/sourcing-queue"] });
                  toast({
                    title: "Success",
                    description: "Direct procurement created successfully from procurement request",
                  });
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Embedded form components with prefilled data from PR context

// Create Auction Form with prefilled data
function CreateAuctionFormEmbedded({ procurementRequest, bomItems, allBoms, vendors, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: `Auction for ${procurementRequest.title} (${procurementRequest.requestNumber})`,
    description: procurementRequest.description || `Reverse auction for procurement request: ${procurementRequest.title}`,
    bomId: procurementRequest.bomId || '',
    ceilingPrice: procurementRequest.estimatedBudget || '',
    startTime: '',
    endTime: '',
    selectedVendors: [] as string[],
    selectedBomItems: bomItems.map((item: any) => item.id) || [],
    termsFile: null as File | null,
  });

  const [uploadingTerms, setUploadingTerms] = useState(false);

  const [editableBomItems, setEditableBomItems] = useState<{[key: string]: {quantity: number, unitPrice: number}}>({});

  const createAuctionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          bomId: data.bomId || null,
          selectedBomItems: data.selectedBomItems || [],
          selectedVendors: data.selectedVendors || [],
          reservePrice: data.ceilingPrice,
          startTime: data.startTime ? new Date(data.startTime).toISOString() : null,
          endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
          status: 'scheduled',
          termsUrl: data.termsFile ? 'uploaded' : '',
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Auction created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create auction",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast({
        title: "Error",
        description: "Please specify both start and end times for the auction",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    if (endDate <= startDate) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    if (!formData.termsFile) {
      toast({
        title: "Error",
        description: "Please upload Terms & Conditions before creating the auction",
        variant: "destructive",
      });
      return;
    }

    createAuctionMutation.mutate(formData);
  };

  const handleVendorToggle = (vendorId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.includes(vendorId)
        ? prev.selectedVendors.filter(id => id !== vendorId)
        : [...prev.selectedVendors, vendorId]
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, termsFile: file }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PR Context Display */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Procurement Request Context</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 dark:text-blue-300">PR Number:</span>
            <span className="ml-2 font-medium">{procurementRequest.requestNumber}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Department:</span>
            <span className="ml-2 font-medium">{procurementRequest.department}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Budget:</span>
            <span className="ml-2 font-medium">₹{procurementRequest.estimatedBudget?.toLocaleString() || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">BOM Items:</span>
            <span className="ml-2 font-medium">{bomItems.length} items</span>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Auction Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter auction name"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the auction requirements"
            rows={3}
            required
          />
        </div>

        <div>
          <Label htmlFor="ceilingPrice">Ceiling Price (₹)</Label>
          <Input
            id="ceilingPrice"
            type="number"
            value={formData.ceilingPrice}
            onChange={(e) => setFormData(prev => ({ ...prev, ceilingPrice: e.target.value }))}
            placeholder="Maximum budget for this auction"
            step="0.01"
          />
        </div>
      </div>

      {/* BOM Selection */}
      <div className="space-y-3">
        <Label>Bill of Materials</Label>
        <Select
          value={formData.bomId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, bomId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select BOM (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {allBoms.map((bom: any) => (
              <SelectItem key={bom.id} value={bom.id}>
                {bom.name} ({bom.version}) - {bom.department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Vendor Selection */}
      <div className="space-y-3">
        <Label>Select Vendors</Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`vendor-${vendor.id}`}
                checked={formData.selectedVendors.includes(vendor.id)}
                onChange={() => handleVendorToggle(vendor.id)}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`vendor-${vendor.id}`} className="text-sm cursor-pointer">
                {vendor.companyName}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Selected: {formData.selectedVendors.length} vendors
        </p>
      </div>

      {/* Terms & Conditions Upload */}
      <div className="space-y-3">
        <Label>Terms & Conditions *</Label>
        <p className="text-sm text-muted-foreground">
          Upload terms and conditions that vendors must accept before bidding
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('terms-upload')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Terms & Conditions
          </Button>
          {formData.termsFile && (
            <span className="text-sm text-green-600 dark:text-green-400">
              ✓ {formData.termsFile.name}
            </span>
          )}
        </div>
        <input
          id="terms-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          disabled={createAuctionMutation.isPending}
          className="flex-1"
        >
          {createAuctionMutation.isPending ? "Creating..." : "Create Auction"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Create RFx Form with prefilled data
function CreateRfxFormEmbedded({ procurementRequest, bomItems, allBoms, vendors, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: `RFx for ${procurementRequest.title} (${procurementRequest.requestNumber})`,
    type: 'rfq' as 'rfi' | 'rfp' | 'rfq',
    scope: procurementRequest.description || `RFx for procurement request: ${procurementRequest.title}`,
    criteria: '',
    dueDate: '',
    budget: procurementRequest.estimatedBudget || '',
    contactPerson: '',
    bomId: procurementRequest.bomId || '',
    selectedVendors: [] as string[],
  });

  const createRfxMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/rfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          type: data.type,
          scope: data.scope,
          criteria: data.criteria,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          budget: data.budget,
          contactPerson: data.contactPerson,
          bomId: procurementRequest.bomId,
          selectedVendors: data.selectedVendors,
          status: 'draft',
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "RFx event created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFx event",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.scope) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createRfxMutation.mutate(formData);
  };

  const handleVendorToggle = (vendorId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.includes(vendorId)
        ? prev.selectedVendors.filter(id => id !== vendorId)
        : [...prev.selectedVendors, vendorId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PR Context Display */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Procurement Request Context</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 dark:text-blue-300">PR Number:</span>
            <span className="ml-2 font-medium">{procurementRequest.requestNumber}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Department:</span>
            <span className="ml-2 font-medium">{procurementRequest.department}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Budget:</span>
            <span className="ml-2 font-medium">₹{procurementRequest.estimatedBudget?.toLocaleString() || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">BOM Items:</span>
            <span className="ml-2 font-medium">{bomItems.length} items</span>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">RFx Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter RFx title"
            required
          />
        </div>

        <div>
          <Label htmlFor="type">RFx Type *</Label>
          <Select value={formData.type} onValueChange={(value: 'rfi' | 'rfp' | 'rfq') => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select RFx type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rfi">RFI - Request for Information</SelectItem>
              <SelectItem value="rfp">RFP - Request for Proposal</SelectItem>
              <SelectItem value="rfq">RFQ - Request for Quotation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scope">Scope *</Label>
          <Textarea
            id="scope"
            value={formData.scope}
            onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))}
            placeholder="Describe the scope and requirements"
            rows={3}
            required
          />
        </div>

        {/* BOM Integration */}
        <div>
          <Label>BOM Integration (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Link this request to a specific Bill of Materials for structured procurement
          </p>
          <Label htmlFor="bomSelect">Select BOM</Label>
          <Select
            value={formData.bomId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, bomId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a BOM (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {allBoms.map((bom: any) => (
                <SelectItem key={bom.id} value={bom.id}>
                  {bom.name} (v{bom.version}) - {bom.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="criteria">Evaluation Criteria</Label>
          <Textarea
            id="criteria"
            value={formData.criteria}
            onChange={(e) => setFormData(prev => ({ ...prev, criteria: e.target.value }))}
            placeholder="Specify evaluation criteria and requirements"
            rows={2}
          />
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dueDate">Response Due Date</Label>
          <Input
            id="dueDate"
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="budget">Budget (₹)</Label>
          <Input
            id="budget"
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="Estimated budget"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contactPerson">Contact Person</Label>
        <Input
          id="contactPerson"
          value={formData.contactPerson}
          onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
          placeholder="Contact person for this RFx"
        />
      </div>

      {/* Vendor Selection */}
      <div className="space-y-3">
        <Label>Select Vendors</Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`vendor-${vendor.id}`}
                checked={formData.selectedVendors.includes(vendor.id)}
                onChange={() => handleVendorToggle(vendor.id)}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`vendor-${vendor.id}`} className="text-sm cursor-pointer">
                {vendor.companyName}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Selected: {formData.selectedVendors.length} vendors
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          disabled={createRfxMutation.isPending}
          className="flex-1"
        >
          {createRfxMutation.isPending ? "Creating..." : "Create RFx Event"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Create Direct Procurement Form with prefilled data
function CreateDirectProcurementFormEmbedded({ procurementRequest, bomItems, allBoms, vendors, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: `Direct PO for ${procurementRequest.title} (${procurementRequest.requestNumber})`,
    description: procurementRequest.description || `Direct procurement for: ${procurementRequest.title}`,
    bomId: procurementRequest.bomId || '',
    vendorId: '',
    totalAmount: procurementRequest.estimatedBudget || '',
    deliveryDate: '',
    paymentTerms: '',
    deliveryTerms: '',
  });

  const createDirectProcurementMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/direct-procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          vendorId: data.vendorId,
          totalAmount: data.totalAmount,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString() : null,
          paymentTerms: data.paymentTerms,
          deliveryTerms: data.deliveryTerms,
          bomId: data.bomId || null,
          status: 'draft',
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Direct procurement created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/direct-procurement"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create direct procurement",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.vendorId || !formData.totalAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createDirectProcurementMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PR Context Display */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Procurement Request Context</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 dark:text-blue-300">PR Number:</span>
            <span className="ml-2 font-medium">{procurementRequest.requestNumber}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Department:</span>
            <span className="ml-2 font-medium">{procurementRequest.department}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Budget:</span>
            <span className="ml-2 font-medium">₹{procurementRequest.estimatedBudget?.toLocaleString() || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">BOM Items:</span>
            <span className="ml-2 font-medium">{bomItems.length} items</span>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Purchase Order Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter PO title"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the procurement requirements"
            rows={3}
          />
        </div>

        <div>
          <Label>Bill of Materials (BOM) *</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Select BOM to procure against
          </p>
          <Select
            value={formData.bomId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, bomId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select BOM to procure against" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {allBoms.map((bom: any) => (
                <SelectItem key={bom.id} value={bom.id}>
                  {bom.name} (v{bom.version}) - {bom.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="vendorId">Select Vendor *</Label>
          <Select value={formData.vendorId} onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose vendor" />
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

        <div>
          <Label htmlFor="totalAmount">Total Amount (₹) *</Label>
          <Input
            id="totalAmount"
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
            placeholder="Enter total amount"
            step="0.01"
            required
          />
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
          <Input
            id="deliveryDate"
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input
            id="paymentTerms"
            value={formData.paymentTerms}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
            placeholder="e.g., Net 30 days"
          />
        </div>

        <div>
          <Label htmlFor="deliveryTerms">Delivery Terms</Label>
          <Input
            id="deliveryTerms"
            value={formData.deliveryTerms}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryTerms: e.target.value }))}
            placeholder="e.g., FOB destination"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          disabled={createDirectProcurementMutation.isPending}
          className="flex-1"
        >
          {createDirectProcurementMutation.isPending ? "Creating..." : "Create Purchase Order"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}