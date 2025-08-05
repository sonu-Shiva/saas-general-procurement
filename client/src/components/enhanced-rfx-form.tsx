import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TermsUploader } from "@/components/TermsUploader";
import { useToast } from "@/hooks/use-toast";
import { RfxAttachmentUploader } from "./RfxAttachmentUploader";

const rfxFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["rfi", "rfp", "rfq"]),
  scope: z.string().optional(),
  criteria: z.string().optional(),
  dueDate: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional().transform(val => 
    val ? (typeof val === 'string' ? parseFloat(val) : val) : undefined
  ),
  contactPerson: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  termsAndConditionsRequired: z.boolean().default(false),
  termsAndConditionsPath: z.string().optional(),
});

type RfxFormData = z.infer<typeof rfxFormSchema>;

interface EnhancedRfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnhancedRfxForm({ onClose, onSuccess }: EnhancedRfxFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vendors and BOMs
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

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
      termsAndConditionsPath: "",
    },
  });

  const selectedType = form.watch("type");

  const createRfxMutation = useMutation({
    mutationFn: async (data: RfxFormData) => {
      try {
        setIsSubmitting(true);

        // Transform data for API
        const transformedData = {
          title: data.title,
          type: data.type,
          scope: data.scope || '',
          criteria: data.criteria || '',
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          budget: data.budget ? parseFloat(data.budget.toString()) : null,
          contactPerson: data.contactPerson || '',
          status: data.status || 'draft',
          attachments: attachments.length > 0 ? attachments : [],
          termsAndConditionsRequired: data.termsAndConditionsRequired || false,
          termsAndConditionsPath: data.termsAndConditionsPath || null,
        };

        console.log('Submitting RFx data:', transformedData);

        const response = await fetch("/api/rfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformedData),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Server error response:', errorData);
          throw new Error(`Failed to create RFx: ${response.status}`);
        }

        const rfxEvent = await response.json();

        // Create vendor invitations
        if (data.selectedVendors?.length) {
          await Promise.all(
            data.selectedVendors.map(vendorId =>
              fetch("/api/rfx/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rfxId: rfxEvent.id, vendorId }),
                credentials: "include",
              })
            )
          );
        }

        return rfxEvent;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });

      // Close dialog and refresh data
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error creating RFx:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create RFx",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: RfxFormData) => {
    try {
      setIsSubmitting(true);

      // Transform data for API
      const transformedData = {
        title: data.title,
        type: data.type,
        scope: data.scope || '',
        criteria: data.criteria || '',
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        budget: data.budget ? parseFloat(data.budget.toString()) : null,
        contactPerson: data.contactPerson || '',
        status: data.status || 'draft',
        attachments: attachments.length > 0 ? attachments : [],
        termsAndConditionsRequired: data.termsAndConditionsRequired || false,
        termsAndConditionsPath: data.termsAndConditionsPath || null,
      };

      console.log('Submitting RFx data:', transformedData);

      const response = await fetch('/api/rfx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server error response:', errorData);
        throw new Error(`Failed to create RFx: ${response.status}`);
      }

      const result = await response.json();
      console.log('RFx created successfully:', result);

      toast({
        title: "Success",
        description: "RFx created successfully",
      });

      // Reset form
      form.reset();
      setAttachments([]);

      // Close dialog and refresh data
      onClose();
      onSuccess?.();

    } catch (error) {
      console.error('Error creating RFx:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create RFx",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (vendorsLoading) {
    return (
      <div className="w-full p-6 bg-background">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vendors and BOMs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6 bg-background">
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type Selection */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Request Type</h3>
              <p className="text-sm text-muted-foreground">Choose the type of request</p>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter request title"
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
                  type="date"
                  {...form.register("dueDate")}
                  className="border-2 border-border focus:border-primary"
                />
                {form.formState.errors.dueDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope *</Label>
              <Textarea
                id="scope"
                {...form.register("scope")}
                rows={3}
                placeholder="Describe the scope and requirements"
                className="border-2 border-border focus:border-primary"
              />
              {form.formState.errors.scope && (
                <p className="text-sm text-destructive">{form.formState.errors.scope.message}</p>
              )}
            </div>

            {selectedType !== "rfi" && (
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input
                  id="budget"
                  {...form.register("budget")}
                  placeholder="e.g., ₹50,000 - ₹100,000"
                  className="border-2 border-border focus:border-primary"
                />
                {form.formState.errors.budget && (
                  <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* BOM Selection */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">BOM Integration (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Link this request to a specific Bill of Materials for structured procurement
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bomId">Select BOM</Label>
              <Select onValueChange={(value) => form.setValue("bomId", value)}>
                <SelectTrigger className="border-2 border-border focus:border-primary">
                  <SelectValue placeholder="Choose a BOM (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(boms) && boms.map((bom: any) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      <div>
                        <div className="font-medium">{bom.name}</div>
                        <div className="text-xs text-muted-foreground">
                          v{bom.version} • {bom.category}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.watch("bomId") && Array.isArray(boms) && (
                <div className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    BOM Linked: {boms.find((b: any) => b.id === form.watch("bomId"))?.name || 'Selected BOM'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Vendor Selection */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Vendor Selection</h3>
              <p className="text-sm text-muted-foreground">
                Choose vendors to send this {selectedType.toUpperCase()} to
              </p>
            </div>

            {Array.isArray(vendors) && vendors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                {vendors.map((vendor: any) => (
                  <Card key={vendor.id} className="p-4 border-2 border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        value={vendor.id}
                        {...form.register("selectedVendors")}
                        className="h-4 w-4 mt-1 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
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
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No vendors available for selection.</p>
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
                      ? "What specific information do you need from vendors?"
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

        {/* Terms & Conditions Upload */}
        <Card className="p-6 border-2 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Terms & Conditions *</h3>
              <p className="text-sm text-muted-foreground">
                Upload terms and conditions that vendors must accept before participating in this {selectedType.toUpperCase()}
              </p>
            </div>

            <TermsUploader
              onUploadComplete={(filePath: string) => {
                setTermsAndConditionsPath(filePath);
                form.setValue("termsAndConditionsPath", filePath);
              }}
              currentFilePath={termsAndConditionsPath}
            />
            {form.formState.errors.termsAndConditionsPath && (
              <p className="text-sm text-destructive">{form.formState.errors.termsAndConditionsPath.message}</p>
            )}
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="border-2 border-border">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
            onClick={(e) => {
              console.log("Create RFx button clicked");
              // Let the form handle submission
            }}
          >
            {isSubmitting ? "Creating..." : `Create ${selectedType.toUpperCase()}`}
          </Button>
        </div>
      </form>
    </div>
  );
}