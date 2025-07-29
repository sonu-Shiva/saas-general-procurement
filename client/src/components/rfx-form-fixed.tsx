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
  description: z.string().min(1, "Description is required"),
  type: z.enum(["RFQ", "RFP", "RFI"]),
  deadline: z.string().min(1, "Deadline is required"),
  budget: z.string().optional(),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
  bomItems: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  evaluationCriteria: z.string().optional(),
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
      description: "",
      type: "RFI",
      deadline: "",
      budget: "",
      selectedVendors: [],
      bomItems: [],
      requirements: "",
      evaluationCriteria: "",
    },
  });

  const createRfxMutation = useMutation({
    mutationFn: async (data: RfxFormData) => {
      return await apiRequest("/api/rfx", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
      onClose();
    },
  });

  const selectedType = form.watch("type");

  const onSubmit = (data: RfxFormData) => {
    createRfxMutation.mutate(data);
  };

  const tabs = [
    { id: "type", label: "Type Selection" },
    { id: "basic", label: "Basic Info" },
    { id: "vendors", label: "Vendor Selection" },
    ...(selectedType === "RFQ" ? [{ id: "bom", label: "BOM Items" }] : []),
    { id: "requirements", label: selectedType === "RFI" ? "Information Required" : "Requirements" },
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
                selectedType === "RFI" 
                  ? "ring-2 ring-primary bg-primary/5 border-primary" 
                  : "hover:border-primary/50"
              }`}>
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="radio"
                      value="RFI"
                      {...form.register("type")}
                      className="sr-only"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-3xl">ℹ️</div>
                      <h4 className={`text-lg font-semibold ${
                        selectedType === "RFI" ? "text-primary" : "text-foreground"
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
                selectedType === "RFP" 
                  ? "ring-2 ring-primary bg-primary/5 border-primary" 
                  : "hover:border-primary/50"
              }`}>
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="radio"
                      value="RFP"
                      {...form.register("type")}
                      className="sr-only"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-3xl">📋</div>
                      <h4 className={`text-lg font-semibold ${
                        selectedType === "RFP" ? "text-primary" : "text-foreground"
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
                selectedType === "RFQ" 
                  ? "ring-2 ring-primary bg-primary/5 border-primary" 
                  : "hover:border-primary/50"
              }`}>
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="radio"
                      value="RFQ"
                      {...form.register("type")}
                      className="sr-only"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-3xl">💰</div>
                      <h4 className={`text-lg font-semibold ${
                        selectedType === "RFQ" ? "text-primary" : "text-foreground"
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
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                rows={4}
                placeholder="Describe the RFx requirements"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  {...form.register("deadline")}
                />
                {form.formState.errors.deadline && (
                  <p className="text-sm text-destructive">{form.formState.errors.deadline.message}</p>
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
                <Card key={vendor.id} className="p-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      value={vendor.id}
                      {...form.register("selectedVendors")}
                      className="rounded border-input text-primary focus:ring-primary"
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
              <Label htmlFor="requirements">
                {selectedType === "RFI" ? "Information Required" : "Requirements"} (Optional)
              </Label>
              <Textarea
                id="requirements"
                {...form.register("requirements")}
                rows={6}
                placeholder={
                  selectedType === "RFI" 
                    ? "What specific information do you need from vendors?"
                    : "Detailed requirements and specifications"
                }
              />
            </div>

            {selectedType !== "RFI" && (
              <div className="space-y-2">
                <Label htmlFor="evaluationCriteria">Evaluation Criteria (Optional)</Label>
                <Textarea
                  id="evaluationCriteria"
                  {...form.register("evaluationCriteria")}
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
            >
              {createRfxMutation.isPending ? "Creating..." : `Create ${selectedType}`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}