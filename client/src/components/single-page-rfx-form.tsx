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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const rfxFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().min(1, "Scope is required"),
  type: z.enum(["rfi", "rfp", "rfq"]),
  dueDate: z.string().min(1, "Due date is required"),
  budget: z.string().optional(),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
  criteria: z.string().optional(),
  evaluationParameters: z.string().optional(),
});

type RfxFormData = z.infer<typeof rfxFormSchema>;

interface SinglePageRfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SinglePageRfxForm({ onClose, onSuccess }: SinglePageRfxFormProps) {
  const queryClient = useQueryClient();

  // Fetch vendors for selection
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Fetch BOMs for RFQ
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
      criteria: "",
      evaluationParameters: "",
    },
  });

  const selectedType = form.watch("type");

  const createRfxMutation = useMutation({
    mutationFn: async (data: RfxFormData) => {
      const payload = {
        ...data,
        dueDate: new Date(data.dueDate),
        budget: data.budget || undefined,
        bomId: undefined, // Will be handled separately for RFQ
        criteria: data.criteria || undefined,
        evaluationParameters: data.evaluationParameters || undefined,
      };
      
      console.log("RFx payload:", payload);
      return await apiRequest("/api/rfx", "POST", payload);
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

  const onSubmit = (data: RfxFormData) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    createRfxMutation.mutate(data);
  };

  console.log("Vendors data:", vendors);
  console.log("Vendors loading:", vendorsLoading);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Create {selectedType.toUpperCase()} Request
        </h2>
        <p className="text-muted-foreground">
          {selectedType === "rfi" 
            ? "Request information from vendors to understand their capabilities"
            : selectedType === "rfp" 
            ? "Request detailed proposals from qualified vendors"
            : "Request quotes for specific products or services"}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Type Selection */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Request Type</h3>
              <p className="text-sm text-muted-foreground">Choose the type of request you want to create</p>
            </div>
            <div className="flex gap-3">
              {[
                { value: "rfi", label: "RFI", desc: "Request for Information" },
                { value: "rfp", label: "RFP", desc: "Request for Proposal" },
                { value: "rfq", label: "RFQ", desc: "Request for Quote" }
              ].map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={selectedType === type.value ? "default" : "outline"}
                  className={`flex-1 h-auto p-4 text-left ${
                    selectedType === type.value ? "border-2 border-primary" : "border-2 border-border"
                  }`}
                  onClick={() => form.setValue("type", type.value as any)}
                >
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs opacity-75">{type.desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
              <p className="text-sm text-muted-foreground">Provide the essential details for your request</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder={`Enter ${selectedType.toUpperCase()} title`}
                  className="border-2 border-border focus:border-primary"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  {...form.register("dueDate")}
                  className="border-2 border-border focus:border-primary"
                />
                {form.formState.errors.dueDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope/Description *</Label>
              <Textarea
                id="scope"
                {...form.register("scope")}
                rows={4}
                placeholder={
                  selectedType === "rfi" 
                    ? "Describe what information you need from vendors"
                    : selectedType === "rfp"
                    ? "Describe the project requirements and objectives"
                    : "Describe the products or services you need quotes for"
                }
                className="border-2 border-border focus:border-primary"
              />
              {form.formState.errors.scope && (
                <p className="text-sm text-destructive">{form.formState.errors.scope.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (Optional)</Label>
              <Input
                id="budget"
                {...form.register("budget")}
                placeholder="₹ Budget range or maximum amount"
                className="border-2 border-border focus:border-primary"
              />
            </div>
          </div>
        </Card>

        {/* Vendor Selection */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Vendor Selection</h3>
              <p className="text-sm text-muted-foreground">
                Choose vendors to send this {selectedType.toUpperCase()} to. At least one vendor must be selected.
              </p>
            </div>
            
            {vendorsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading vendors...</p>
              </div>
            ) : (vendors as any[]).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No vendors available for selection.</p>
                <p className="text-sm text-muted-foreground mt-2">Add some vendors first to create RFx requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                {(vendors as any[]).map((vendor: any) => (
                  <Card key={vendor.id} className="p-4 border-2 border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        value={vendor.id}
                        {...form.register("selectedVendors")}
                        className="h-4 w-4 mt-1 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">{vendor.companyName || vendor.name}</div>
                        <div className="text-sm text-muted-foreground">{vendor.categories || vendor.category}</div>
                        {vendor.contactPerson && (
                          <div className="text-xs text-muted-foreground mt-1">Contact: {vendor.contactPerson}</div>
                        )}
                        {vendor.email && (
                          <div className="text-xs text-muted-foreground">{vendor.email}</div>
                        )}
                      </div>
                    </label>
                  </Card>
                ))}
              </div>
            )}
            
            {form.formState.errors.selectedVendors && (
              <p className="text-sm text-destructive">{form.formState.errors.selectedVendors.message}</p>
            )}
          </div>
        </Card>

        {/* Requirements and Criteria */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {selectedType === "rfi" ? "Information Requirements" : "Requirements & Criteria"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedType === "rfi" 
                  ? "Specify what information you need from vendors"
                  : "Define your requirements and evaluation criteria"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="criteria">
                  {selectedType === "rfi" ? "Information Required" : "Requirements"} (Optional)
                </Label>
                <Textarea
                  id="criteria"
                  {...form.register("criteria")}
                  rows={4}
                  placeholder={
                    selectedType === "rfi" 
                      ? "What specific information do you need from vendors? (e.g., company capabilities, certifications, experience)"
                      : "Detailed requirements and specifications"
                  }
                  className="border-2 border-border focus:border-primary"
                />
              </div>

              {selectedType !== "rfi" && (
                <div className="space-y-2">
                  <Label htmlFor="evaluationParameters">Evaluation Criteria (Optional)</Label>
                  <Textarea
                    id="evaluationParameters"
                    {...form.register("evaluationParameters")}
                    rows={3}
                    placeholder="How will proposals be evaluated? (e.g., price 40%, quality 30%, delivery 30%)"
                    className="border-2 border-border focus:border-primary"
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="border-2 border-border">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createRfxMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createRfxMutation.isPending ? "Creating..." : `Create ${selectedType.toUpperCase()}`}
          </Button>
        </div>
      </form>
    </div>
  );
}