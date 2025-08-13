import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ShoppingCart, 
  FileText, 
  DollarSign, 
  Users, 
  Clock,
  CheckCircle,
  Package,
  Info,
  Building,
  Calendar,
  Target
} from "lucide-react";
import type { ProcurementRequest } from "@shared/schema";

// Form schema for sourcing intake
const sourcingIntakeSchema = z.object({
  procurementRequestId: z.string().min(1, "Please select a procurement request"),
  procurementMethod: z.enum(["rfq", "rfp", "rfi"], {
    required_error: "Please select a procurement method",
  }),
  vendorCount: z.number().min(1, "At least 1 vendor is required").max(20, "Maximum 20 vendors allowed"),
  notes: z.string().optional(),
  urgencyLevel: z.enum(["low", "medium", "high"], {
    required_error: "Please select urgency level",
  }),
  estimatedTimeToComplete: z.number().min(1, "Please provide estimated time"),
});

type SourcingIntakeFormData = z.infer<typeof sourcingIntakeSchema>;

export default function SourcingIntakePage() {
  const [selectedPR, setSelectedPR] = useState<ProcurementRequest | null>(null);
  const [spendEstimateData, setSpendEstimateData] = useState<any>(null);

  const form = useForm<SourcingIntakeFormData>({
    resolver: zodResolver(sourcingIntakeSchema),
    defaultValues: {
      vendorCount: 5,
      urgencyLevel: "medium",
      estimatedTimeToComplete: 7,
    },
  });

  // Fetch approved procurement requests
  const { data: approvedRequests = [], isLoading: loadingRequests } = useQuery<ProcurementRequest[]>({
    queryKey: ["/api/procurement-requests/approved"],
    refetchOnWindowFocus: false,
  });

  // Fetch spend estimate for selected PR
  const { refetch: fetchSpendEstimate, isLoading: loadingSpendEstimate } = useQuery({
    queryKey: ["/api/procurement-requests", selectedPR?.id, "spend-estimate"],
    enabled: false,
    refetchOnWindowFocus: false,
  });

  // Create sourcing event mutation
  const createSourcingEventMutation = useMutation({
    mutationFn: async (data: SourcingIntakeFormData) => {
      const response = await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify({
          procurementRequestId: data.procurementRequestId,
          procurementMethod: data.procurementMethod,
          vendorCount: data.vendorCount,
          notes: data.notes,
          urgencyLevel: data.urgencyLevel,
          estimatedTimeToComplete: data.estimatedTimeToComplete,
          status: "draft",
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      console.log("Sourcing event created:", data);
      // Reset form and state
      form.reset();
      setSelectedPR(null);
      setSpendEstimateData(null);
    },
  });

  const handlePRSelection = async (prId: string) => {
    const selected = approvedRequests.find((pr) => pr.id === prId);
    setSelectedPR(selected || null);
    form.setValue("procurementRequestId", prId);

    if (selected) {
      console.log("Fetching spend estimate for PR:", prId);
      try {
        const response = await apiRequest(`/api/procurement-requests/${prId}/spend-estimate`);
        setSpendEstimateData(response);
        console.log("Spend estimate data:", response);
      } catch (error) {
        console.error("Error fetching spend estimate:", error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getProcurementMethodDescription = (method: string) => {
    switch (method) {
      case "rfq":
        return "Request for Quote - For standardized items with clear specifications";
      case "rfp":
        return "Request for Proposal - For complex requirements needing vendor expertise";
      case "rfi":
        return "Request for Information - For market research and vendor capabilities";
      default:
        return "";
    }
  };

  const onSubmit = (data: SourcingIntakeFormData) => {
    console.log("Submitting sourcing intake:", data);
    createSourcingEventMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="sourcing-intake-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="h-8 w-8" />
          Sourcing Intake
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Convert approved procurement requests into sourcing events for vendor engagement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Form */}
        <Card data-testid="sourcing-form-card">
          <CardHeader>
            <CardTitle>Create Sourcing Event</CardTitle>
            <CardDescription>
              Select an approved procurement request and configure sourcing parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Procurement Request Selection */}
                <FormField
                  control={form.control}
                  name="procurementRequestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approved Procurement Request *</FormLabel>
                      <Select 
                        onValueChange={handlePRSelection} 
                        value={field.value}
                        data-testid="select-procurement-request"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select approved procurement request" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingRequests ? (
                            <SelectItem value="loading" disabled>
                              Loading requests...
                            </SelectItem>
                          ) : approvedRequests.length === 0 ? (
                            <SelectItem value="no-requests" disabled>
                              No approved requests available
                            </SelectItem>
                          ) : (
                            approvedRequests.map((request) => (
                              <SelectItem key={request.id} value={request.id}>
                                {request.title} - {request.department} ({request.requestNumber})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Procurement Method */}
                <FormField
                  control={form.control}
                  name="procurementMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procurement Method *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-procurement-method"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select procurement method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rfq">Request for Quote (RFQ)</SelectItem>
                          <SelectItem value="rfp">Request for Proposal (RFP)</SelectItem>
                          <SelectItem value="rfi">Request for Information (RFI)</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.watch("procurementMethod") && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <Info className="h-4 w-4 inline mr-1" />
                          {getProcurementMethodDescription(form.watch("procurementMethod"))}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vendor Count */}
                <FormField
                  control={form.control}
                  name="vendorCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Vendors to Invite *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-vendor-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Urgency Level */}
                <FormField
                  control={form.control}
                  name="urgencyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency Level *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-urgency-level"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Estimated Time to Complete */}
                <FormField
                  control={form.control}
                  name="estimatedTimeToComplete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Days to Complete *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-estimated-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any internal notes or special instructions..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createSourcingEventMutation.isPending}
                  data-testid="button-submit-sourcing-event"
                >
                  {createSourcingEventMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                      Creating Sourcing Event...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Sourcing Event
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Selected PR Details & Spend Estimate */}
        <div className="space-y-6">
          {selectedPR && (
            <Card data-testid="selected-pr-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Selected Procurement Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Request Number:</span>
                    <p className="text-gray-600 dark:text-gray-400" data-testid="text-request-number">
                      {selectedPR.requestNumber}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">Department:</span>
                    <p className="text-gray-600 dark:text-gray-400" data-testid="text-department">
                      <Building className="h-4 w-4 inline mr-1" />
                      {selectedPR.department}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">Requested By:</span>
                    <p className="text-gray-600 dark:text-gray-400" data-testid="text-requested-by">
                      {selectedPR.requestedBy}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">Delivery Date:</span>
                    <p className="text-gray-600 dark:text-gray-400" data-testid="text-delivery-date">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {selectedPR.requestedDeliveryDate 
                        ? new Date(selectedPR.requestedDeliveryDate).toLocaleDateString()
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <span className="font-semibold">Title:</span>
                  <p className="text-gray-600 dark:text-gray-400" data-testid="text-title">
                    {selectedPR.title}
                  </p>
                </div>

                <div>
                  <span className="font-semibold">Justification:</span>
                  <p className="text-gray-600 dark:text-gray-400 text-sm" data-testid="text-justification">
                    {selectedPR.justification}
                  </p>
                </div>

                <div>
                  <span className="font-semibold">Status:</span>
                  <Badge variant="secondary" className="ml-2" data-testid="badge-status">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {selectedPR.overallStatus?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {spendEstimateData && (
            <Card data-testid="spend-estimate-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Spend Estimate Analysis
                </CardTitle>
                <CardDescription>
                  Based on BOM items and catalog pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-total-estimate">
                      {formatCurrency(spendEstimateData.spendEstimate)}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-500">Total Estimate</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid="text-total-items">
                      {spendEstimateData.totalItems}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-500">Total Items</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Catalog Mapped Items:</span>
                  <Badge variant={spendEstimateData.catalogMappedItems > 0 ? "default" : "secondary"} data-testid="badge-catalog-mapped">
                    <Package className="h-3 w-3 mr-1" />
                    {spendEstimateData.catalogMappedItems} / {spendEstimateData.totalItems}
                  </Badge>
                </div>

                {spendEstimateData.catalogMappedItems < spendEstimateData.totalItems && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <Info className="h-4 w-4 inline mr-1" />
                      Some items don't have catalog pricing. Vendor quotes will be essential for accurate costs.
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <h4 className="font-semibold mb-2">Item Breakdown:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {spendEstimateData.itemEstimates?.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="truncate flex-1" data-testid={`text-item-name-${index}`}>{item.itemName}</span>
                        <span className="text-gray-600 dark:text-gray-400" data-testid={`text-item-estimate-${index}`}>
                          {item.hasCatalogPrice ? formatCurrency(item.lineEstimate) : 'TBD'}
                        </span>
                      </div>
                    ))}
                    {spendEstimateData.itemEstimates?.length > 5 && (
                      <div className="text-sm text-gray-500 text-center pt-2" data-testid="text-more-items">
                        ... and {spendEstimateData.itemEstimates.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedPR && (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Select a procurement request to view details and spend estimate
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Success Message */}
      {createSourcingEventMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg" data-testid="success-message">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>Sourcing event created successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}