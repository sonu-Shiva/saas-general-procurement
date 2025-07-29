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

const simpleRfxSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().min(1, "Scope is required"),
  type: z.enum(["rfi", "rfp", "rfq"]),
  dueDate: z.string().min(1, "Due date is required"),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
  criteria: z.string().optional().or(z.literal("")),
});

type SimpleRfxData = z.infer<typeof simpleRfxSchema>;

interface SimpleRfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SimpleRfxForm({ onClose, onSuccess }: SimpleRfxFormProps) {
  const queryClient = useQueryClient();

  // Fetch vendors
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  const form = useForm<SimpleRfxData>({
    resolver: zodResolver(simpleRfxSchema),
    defaultValues: {
      title: "",
      scope: "",
      type: "rfi",
      dueDate: "",
      selectedVendors: [],
      criteria: "",
    },
  });

  const createRfxMutation = useMutation({
    mutationFn: async (data: SimpleRfxData) => {
      const payload = {
        ...data,
        dueDate: new Date(data.dueDate),
        budget: undefined,
        bomId: undefined,
        evaluationParameters: undefined,
      };
      
      console.log("Simple RFx payload:", payload);
      return await apiRequest("/api/rfx", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error("Error creating RFx:", error);
    },
  });

  const onSubmit = (data: SimpleRfxData) => {
    console.log("Simple form data:", data);
    createRfxMutation.mutate(data);
  };

  console.log("Simple RFx Vendors:", vendors);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create RFx Request</h2>
        <p className="text-muted-foreground">Create a simple RFx request</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type Selection */}
        <div className="space-y-2">
          <Label>Request Type</Label>
          <div className="flex gap-2">
            {["rfi", "rfp", "rfq"].map((type) => (
              <Button
                key={type}
                type="button"
                variant={form.watch("type") === type ? "default" : "outline"}
                onClick={() => form.setValue("type", type as any)}
              >
                {type.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="scope">Scope *</Label>
          <Textarea
            id="scope"
            {...form.register("scope")}
            rows={4}
            placeholder="Describe the scope of this request"
          />
          {form.formState.errors.scope && (
            <p className="text-sm text-destructive">{form.formState.errors.scope.message}</p>
          )}
        </div>

        {/* Vendor Selection */}
        <div className="space-y-4">
          <div>
            <Label>Select Vendors *</Label>
            <p className="text-sm text-muted-foreground">Choose vendors to send this RFx to</p>
          </div>

          {vendorsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading vendors...</p>
            </div>
          ) : (vendors as any[]).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No vendors found. Add some vendors first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {(vendors as any[]).map((vendor: any) => (
                <Card key={vendor.id} className="p-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      value={vendor.id}
                      {...form.register("selectedVendors")}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{vendor.companyName || vendor.name}</div>
                      <div className="text-sm text-muted-foreground">{vendor.categories || vendor.category}</div>
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

        {/* Optional Criteria */}
        <div className="space-y-2">
          <Label htmlFor="criteria">Additional Information (Optional)</Label>
          <Textarea
            id="criteria"
            {...form.register("criteria")}
            rows={3}
            placeholder="Any additional requirements or criteria"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createRfxMutation.isPending}>
            {createRfxMutation.isPending ? "Creating..." : `Create ${form.watch("type").toUpperCase()}`}
          </Button>
        </div>
      </form>
    </div>
  );
}