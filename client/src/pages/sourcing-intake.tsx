
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Package, 
  DollarSign, 
  Users, 
  Search,
  Gavel,
  ShoppingCart,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Bot
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface ProcurementRequest {
  id: string;
  title: string;
  department: string;
  needByDate: string;
  urgency: string;
  status: string;
  bomLineItems: Array<{
    itemName: string;
    quantity: number;
    uom: string;
    estimatedPrice?: number;
    isMapped: boolean;
    catalogReference?: string;
  }>;
  estimatedValue?: number;
}

interface Vendor {
  id: string;
  companyName: string;
  email?: string;
  phone?: string;
  categories: string[];
  status: string;
  performanceScore?: number;
}

interface SourcingEventData {
  procurementRequestId: string;
  type: string;
  justification?: string;
  selectedVendors: string[];
  aiDiscoveryQuery?: string;
}

export default function SourcingIntake() {
  const [selectedPR, setSelectedPR] = useState<string>("");
  const [procurementMethod, setProcurementMethod] = useState<string>("");
  const [justification, setJustification] = useState<string>("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [aiDiscoveryQuery, setAiDiscoveryQuery] = useState<string>("");
  const [showAiDiscovery, setShowAiDiscovery] = useState<boolean>(false);
  const [discoveredVendors, setDiscoveredVendors] = useState<Vendor[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get pending procurement requests
  const { data: procurementRequests = [] } = useQuery<ProcurementRequest[]>({
    queryKey: ['/api/procurement-requests'],
  });

  // Get approved vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  // Filter approved vendors
  const approvedVendors = vendors.filter(v => v.status === 'approved');

  // Get selected PR details
  const selectedPRData = procurementRequests.find(pr => pr.id === selectedPR);

  // Calculate spend estimate
  const spendEstimate = selectedPRData?.bomLineItems.reduce((total, item) => {
    const price = item.estimatedPrice || 0;
    return total + (price * item.quantity);
  }, 0) || 0;

  // Mapped vs unmapped items
  const mappedItems = selectedPRData?.bomLineItems.filter(item => item.isMapped).length || 0;
  const totalItems = selectedPRData?.bomLineItems.length || 0;
  const unmappedItems = totalItems - mappedItems;

  // AI Vendor Discovery mutation
  const aiDiscoveryMutation = useMutation({
    mutationFn: async (query: string) => {
      return apiRequest('/api/vendors/ai-discovery', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    },
    onSuccess: (vendors) => {
      setDiscoveredVendors(vendors);
      toast({
        title: "Vendors Discovered",
        description: `Found ${vendors.length} potential vendors`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create sourcing event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: SourcingEventData) => {
      return apiRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Sourcing Event Created",
        description: `Event ${result.referenceNo} submitted for manager approval`,
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPR("");
    setProcurementMethod("");
    setJustification("");
    setSelectedVendors([]);
    setAiDiscoveryQuery("");
    setShowAiDiscovery(false);
    setDiscoveredVendors([]);
  };

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleAiDiscovery = () => {
    if (!aiDiscoveryQuery.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query for AI vendor discovery",
        variant: "destructive",
      });
      return;
    }
    aiDiscoveryMutation.mutate(aiDiscoveryQuery);
  };

  const isFormValid = () => {
    if (!selectedPR || !procurementMethod) return false;
    if (procurementMethod === 'DIRECT_PO' && !justification.trim()) return false;
    if (selectedVendors.length === 0) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const eventData: SourcingEventData = {
      procurementRequestId: selectedPR,
      type: procurementMethod,
      selectedVendors,
    };

    if (procurementMethod === 'DIRECT_PO') {
      eventData.justification = justification;
    }

    if (aiDiscoveryQuery.trim()) {
      eventData.aiDiscoveryQuery = aiDiscoveryQuery;
    }

    createEventMutation.mutate(eventData);
  };

  // Check user role
  if (user?.role !== 'SOURCING_EXEC') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">This page is only accessible to Sourcing Executives.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Sourcing Intake</h1>
        <p className="text-muted-foreground">
          Select procurement method and vendors for sourcing events
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - PR Selection & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* PR Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Procurement Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {procurementRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No procurement requests available for sourcing
                  </p>
                ) : (
                  <RadioGroup value={selectedPR} onValueChange={setSelectedPR}>
                    {procurementRequests.map((pr) => (
                      <div key={pr.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <RadioGroupItem value={pr.id} id={pr.id} />
                        <div className="flex-1">
                          <Label htmlFor={pr.id} className="cursor-pointer">
                            <div className="font-medium">{pr.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {pr.department} • Due: {format(new Date(pr.needByDate), 'MMM dd, yyyy')}
                            </div>
                          </Label>
                        </div>
                        <Badge variant={
                          pr.urgency === 'CRITICAL' ? 'destructive' :
                          pr.urgency === 'HIGH' ? 'default' : 'secondary'
                        }>
                          {pr.urgency}
                        </Badge>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BOM Summary */}
          {selectedPRData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  BOM Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Mapped: {mappedItems}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span>Unmapped: {unmappedItems}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span>Estimated: ${spendEstimate.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Est. Price</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPRData.bomLineItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.uom}</TableCell>
                            <TableCell>
                              {item.estimatedPrice ? `$${item.estimatedPrice.toLocaleString()}` : 'TBD'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.isMapped ? 'default' : 'secondary'}>
                                {item.isMapped ? 'Mapped' : 'Unmapped'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Method & Vendors */}
        <div className="space-y-6">
          {/* Procurement Method */}
          <Card>
            <CardHeader>
              <CardTitle>Procurement Method</CardTitle>
              <CardDescription>Select the sourcing approach</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={procurementMethod} onValueChange={setProcurementMethod}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="RFI" id="rfi" />
                  <div className="flex-1">
                    <Label htmlFor="rfi" className="cursor-pointer flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <div>
                        <div className="font-medium">RFI - Request for Information</div>
                        <div className="text-xs text-muted-foreground">Gather vendor capabilities</div>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="RFP" id="rfp" />
                  <div className="flex-1">
                    <Label htmlFor="rfp" className="cursor-pointer flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <div>
                        <div className="font-medium">RFP - Request for Proposal</div>
                        <div className="text-xs text-muted-foreground">Detailed proposals required</div>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="RFQ" id="rfq" />
                  <div className="flex-1">
                    <Label htmlFor="rfq" className="cursor-pointer flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <div>
                        <div className="font-medium">RFQ - Request for Quote</div>
                        <div className="text-xs text-muted-foreground">Price quotes only</div>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="AUCTION" id="auction" />
                  <div className="flex-1">
                    <Label htmlFor="auction" className="cursor-pointer flex items-center gap-2">
                      <Gavel className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Auction</div>
                        <div className="text-xs text-muted-foreground">Competitive bidding</div>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="DIRECT_PO" id="direct_po" />
                  <div className="flex-1">
                    <Label htmlFor="direct_po" className="cursor-pointer flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Direct PO</div>
                        <div className="text-xs text-muted-foreground">Skip sourcing process</div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {/* Justification for Direct PO */}
              {procurementMethod === 'DIRECT_PO' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="justification">Justification *</Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explain why direct PO is necessary..."
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Pool Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Vendor Pool
              </CardTitle>
              <CardDescription>
                Select vendors or discover new ones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="approved" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="approved">Approved Vendors</TabsTrigger>
                  <TabsTrigger value="discovery">AI Discovery</TabsTrigger>
                </TabsList>

                <TabsContent value="approved" className="space-y-3">
                  {approvedVendors.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No approved vendors available
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {approvedVendors.map((vendor) => (
                        <div key={vendor.id} className="flex items-center space-x-3 p-2 border rounded">
                          <Checkbox
                            id={vendor.id}
                            checked={selectedVendors.includes(vendor.id)}
                            onCheckedChange={() => handleVendorToggle(vendor.id)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={vendor.id} className="cursor-pointer">
                              <div className="font-medium text-sm">{vendor.companyName}</div>
                              <div className="text-xs text-muted-foreground">
                                {vendor.categories.join(', ')}
                              </div>
                            </Label>
                          </div>
                          {vendor.performanceScore && (
                            <Badge variant="outline" className="text-xs">
                              {vendor.performanceScore}/5
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="discovery" className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ai-query">Search Query</Label>
                    <Input
                      id="ai-query"
                      value={aiDiscoveryQuery}
                      onChange={(e) => setAiDiscoveryQuery(e.target.value)}
                      placeholder="e.g., automotive parts suppliers in India"
                    />
                    <Button
                      onClick={handleAiDiscovery}
                      disabled={aiDiscoveryMutation.isPending}
                      className="w-full"
                      variant="outline"
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      {aiDiscoveryMutation.isPending ? 'Discovering...' : 'Discover Vendors'}
                    </Button>
                  </div>

                  {discoveredVendors.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {discoveredVendors.map((vendor) => (
                        <div key={vendor.id} className="flex items-center space-x-3 p-2 border rounded">
                          <Checkbox
                            id={`discovered-${vendor.id}`}
                            checked={selectedVendors.includes(vendor.id)}
                            onCheckedChange={() => handleVendorToggle(vendor.id)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`discovered-${vendor.id}`} className="cursor-pointer">
                              <div className="font-medium text-sm">{vendor.companyName}</div>
                              <div className="text-xs text-muted-foreground">
                                {vendor.email} • AI Discovered
                              </div>
                            </Label>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {selectedVendors.length > 0 && (
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-800">
                    {selectedVendors.length} vendors selected
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || createEventMutation.isPending}
            className="w-full"
            size="lg"
          >
            {createEventMutation.isPending ? 'Creating...' : 'Proceed to Sourcing'}
          </Button>
        </div>
      </div>
    </div>
  );
}
