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
  DollarSign,
  Users,
  AlertCircle,
  ArrowRight,
  Settings
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Create sourcing event mutation
  const createSourcingEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await apiRequest("/api/sourcing-events", {
        method: "POST",
        body: JSON.stringify(eventData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Sourcing Event Created",
        description: "Draft has been submitted for Sourcing Manager approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement-requests/sourcing-queue"] });
      setIsMethodModalOpen(false);
      resetMethodForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sourcing event",
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

  const handleCreateSourcingEvent = () => {
    if (!selectedPR || !selectedMethod || !eventTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (selectedMethod === "direct" && !justification) {
      toast({
        title: "Justification Required",
        description: "Direct procurement requires business justification",
        variant: "destructive",
      });
      return;
    }

    if (selectedVendors.length === 0) {
      toast({
        title: "Vendors Required",
        description: "Please select at least one vendor",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      procurementRequestId: selectedPR.id,
      type: selectedMethod === "rfx" ? "RFQ" : selectedMethod === "auction" ? "AUCTION" : "DIRECT_PO",
      title: eventTitle,
      description: eventDescription,
      spendEstimate: spendEstimate ? parseFloat(spendEstimate) : null,
      justification: justification,
      selectedVendorIds: selectedVendors,
    };

    createSourcingEventMutation.mutate(eventData);
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
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Est. Value</p>
                <p className="text-2xl font-bold">
                  ${filteredRequests.reduce((sum, pr) => sum + (pr.estimatedBudget || 0), 0).toLocaleString()}
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
                      {pr.estimatedBudget ? `$${pr.estimatedBudget.toLocaleString()}` : "N/A"}
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
                        {selectedPR.estimatedBudget ? `$${selectedPR.estimatedBudget.toLocaleString()}` : "N/A"}
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
                            {item.unitPrice ? `$${parseFloat(item.unitPrice).toLocaleString()}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            {item.totalPrice ? `$${parseFloat(item.totalPrice).toLocaleString()}` : "N/A"}
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
              Choose the appropriate procurement method and configure the sourcing event
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

            {/* Event Configuration */}
            {selectedMethod && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventTitle">Event Title *</Label>
                    <Input
                      id="eventTitle"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Enter event title"
                      data-testid="input-event-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spendEstimate">Spend Estimate</Label>
                    <Input
                      id="spendEstimate"
                      type="number"
                      value={spendEstimate}
                      onChange={(e) => setSpendEstimate(e.target.value)}
                      placeholder="Enter estimated spend"
                      data-testid="input-spend-estimate"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventDescription">Event Description</Label>
                  <Textarea
                    id="eventDescription"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Describe the sourcing event requirements"
                    rows={3}
                    data-testid="textarea-event-description"
                  />
                </div>

                {selectedMethod === "direct" && (
                  <div className="space-y-2">
                    <Label htmlFor="justification">Business Justification *</Label>
                    <Textarea
                      id="justification"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Provide justification for direct procurement"
                      rows={3}
                      data-testid="textarea-justification"
                    />
                  </div>
                )}

                {/* Vendor Selection */}
                <div className="space-y-2">
                  <Label>Select Vendors *</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                    {vendors.map((vendor: any) => (
                      <div key={vendor.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`vendor-${vendor.id}`}
                          checked={selectedVendors.includes(vendor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVendors([...selectedVendors, vendor.id]);
                            } else {
                              setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`vendor-${vendor.id}`} className="text-sm">
                          {vendor.companyName}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedVendors.length} vendor(s)
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateSourcingEvent}
                    disabled={createSourcingEventMutation.isPending}
                    data-testid="button-create-sourcing-event"
                  >
                    {createSourcingEventMutation.isPending ? "Creating..." : "Create Sourcing Event"}
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
    </div>
  );
}