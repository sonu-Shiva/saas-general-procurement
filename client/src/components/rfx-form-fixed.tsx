import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

// Form validation schema
const rfxFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().min(1, "Description is required"),
  type: z.enum(["rfi", "rfp", "rfq"]),
  dueDate: z.string().min(1, "Due date is required"),
  budget: z.string().optional(),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
  bomId: z.string().optional(),
  criteria: z.string().optional(),
  evaluationParameters: z.string().optional(),
});

type RfxFormData = z.infer<typeof rfxFormSchema>;

interface RfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RfxForm({ onClose, onSuccess }: RfxFormProps) {
  const [currentTab, setCurrentTab] = useState("type");
  const queryClient = useQueryClient();

  // Fetch vendors for selection
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Fetch BOMs for selection
  const { data: boms = [] } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });

  const form = useForm<RfxFormData>({
    resolver: zodResolver(rfxFormSchema),
    defaultValues: {
      title: "",
      scope: "",
      type: "rfi",
      dueDate: "",
      budget: "",
      selectedVendors: [],
      bomId: "",
      criteria: "",
      evaluationParameters: "",
    },
  });

  const createRfxMutation = useMutation({
    mutationFn: async (data: RfxFormData) => {
      return await apiRequest("POST", "/api/rfx", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error("Error creating RFx:", error);
      console.error("Error details:", error.message);
    },
  });

  const selectedType = form.watch("type");

  const onSubmit = (data: RfxFormData) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    createRfxMutation.mutate(data);
  };

  const tabs = [
    { id: "type", label: "Type Selection" },
    { id: "basic", label: "Basic Info" },
    { id: "vendors", label: "Vendor Selection" },
    ...(selectedType === "rfq" ? [{ id: "bom", label: "BOM Items" }] : []),
    { id: "requirements", label: selectedType === "rfi" ? "Information Required" : "Requirements" },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-border pb-4">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={currentTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type Selection Tab */}
        {currentTab === "type" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                What type of request would you like to create?
              </h3>
              <p className="text-muted-foreground mb-8">
                Choose the type that best fits your procurement needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* RFI Option */}
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedType === "rfi" 
                  ? "border-2 border-primary bg-primary/5" 
                  : "border-2 border-border hover:border-primary/50"
              }`}>
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="radio"
                      value="rfi"
                      {...form.register("type")}
                      className="sr-only"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-3xl">ℹ️</div>
                      <h4 className={`text-lg font-semibold ${
                        selectedType === "rfi" ? "text-primary" : "text-foreground"
                      }`}>
                        Request for Information (RFI)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Gather information about vendors, capabilities, or market research
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* RFP Option */}
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedType === "rfp" 
                  ? "border-2 border-primary bg-primary/5" 
                  : "border-2 border-border hover:border-primary/50"
              }`}>
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="radio"
                      value="rfp"
                      {...form.register("type")}
                      className="sr-only"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-3xl">📋</div>
                      <h4 className={`text-lg font-semibold ${
                        selectedType === "rfp" ? "text-primary" : "text-foreground"
                      }`}>
                        Request for Proposal (RFP)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Solicit comprehensive proposals for complex projects or services
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* RFQ Option */}
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedType === "rfq" 
                  ? "border-2 border-primary bg-primary/5" 
                  : "border-2 border-border hover:border-primary/50"
              }`}>
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="radio"
                      value="rfq"
                      {...form.register("type")}
                      className="sr-only"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-3xl">💰</div>
                      <h4 className={`text-lg font-semibold ${
                        selectedType === "rfq" ? "text-primary" : "text-foreground"
                      }`}>
                        Request for Quote (RFQ)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Get price quotes for specific products or services
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Basic Info Tab */}
        {currentTab === "basic" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Enter RFx title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Description *</Label>
              <Textarea
                id="scope"
                {...form.register("scope")}
                rows={4}
                placeholder="Describe the RFx requirements"
              />
              {form.formState.errors.scope && (
                <p className="text-sm text-destructive">{form.formState.errors.scope.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  {...form.register("dueDate")}
                />
                {form.formState.errors.dueDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input
                  id="budget"
                  {...form.register("budget")}
                  placeholder="₹ Budget range"
                />
              </div>
            </div>
          </div>
        )}

        {/* Vendor Selection Tab */}
        {currentTab === "vendors" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Select Vendors</h3>
              <p className="text-sm text-muted-foreground">
                Choose vendors to send this RFx to. At least one vendor must be selected.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {(vendors as any[]).map((vendor: any) => (
                <Card key={vendor.id} className="p-3 border-2 border-border hover:border-primary/50 transition-colors">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      value={vendor.id}
                      {...form.register("selectedVendors")}
                      className="h-4 w-4 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{vendor.name}</div>
                      <div className="text-sm text-muted-foreground">{vendor.category}</div>
                    </div>
                  </label>
                </Card>
              ))}
            </div>
            
            {form.formState.errors.selectedVendors && (
              <p className="text-sm text-destructive">{form.formState.errors.selectedVendors.message}</p>
            )}
          </div>
        )}

        {/* Requirements Tab */}
        {currentTab === "requirements" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="criteria">
                {selectedType === "rfi" ? "Information Required" : "Requirements"} (Optional)
              </Label>
              <Textarea
                id="criteria"
                {...form.register("criteria")}
                rows={6}
                placeholder={
                  selectedType === "rfi" 
                    ? "What specific information do you need from vendors?"
                    : "Detailed requirements and specifications"
                }
              />
            </div>

            {selectedType !== "rfi" && (
              <div className="space-y-2">
                <Label htmlFor="evaluationParameters">Evaluation Criteria (Optional)</Label>
                <Textarea
                  id="evaluationParameters"
                  {...form.register("evaluationParameters")}
                  rows={4}
                  placeholder="How will proposals be evaluated? (e.g., price 40%, quality 30%, delivery 30%)"
                />
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
                if (currentIndex > 0) {
                  setCurrentTab(tabs[currentIndex - 1].id);
                }
              }}
              disabled={currentTab === "type"}
            >
              Previous
            </Button>
            
            {currentTab !== "requirements" && (
              <Button
                type="button"
                onClick={() => {
                  const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
                  if (currentIndex < tabs.length - 1) {
                    setCurrentTab(tabs[currentIndex + 1].id);
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRfxMutation.isPending}
              onClick={() => {
                console.log("Submit button clicked");
                console.log("Current tab:", currentTab);
                console.log("Form valid:", form.formState.isValid);
              }}
            >
              {createRfxMutation.isPending ? "Creating..." : `Create ${selectedType.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}