import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const rfxSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().min(1, "Scope is required"),
  type: z.enum(["rfi", "rfp", "rfq"]),
  dueDate: z.string().min(1, "Due date is required"),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
});

type RfxData = z.infer<typeof rfxSchema>;

interface SimpleRfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SimpleRfxForm({ onClose, onSuccess }: SimpleRfxFormProps) {
  console.log("SimpleRfxForm rendering");
  
  const queryClient = useQueryClient();
  
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  const form = useForm<RfxData>({
    resolver: zodResolver(rfxSchema),
    defaultValues: {
      title: "",
      scope: "",
      type: "rfi",
      dueDate: "",
      selectedVendors: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RfxData) => {
      const response = await fetch("/api/rfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          scope: data.scope,
          type: data.type,
          dueDate: data.dueDate,
          status: "draft",
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
    },
  });

  const onSubmit = (data: RfxData) => {
    console.log("Submitting:", data);
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  console.log("Vendors:", vendors);

  return (
    <div className="p-6 bg-white min-h-[400px]">
      <h2 className="text-xl font-bold mb-6">Create RFx Request</h2>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Enter RFx title"
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                {...form.register("scope")}
                placeholder="Describe the scope"
                rows={3}
              />
              {form.formState.errors.scope && (
                <p className="text-red-500 text-sm">{form.formState.errors.scope.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                {...form.register("type")}
                className="w-full p-2 border rounded"
              >
                <option value="rfi">RFI - Request for Information</option>
                <option value="rfp">RFP - Request for Proposal</option>
                <option value="rfq">RFQ - Request for Quote</option>
              </select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register("dueDate")}
              />
              {form.formState.errors.dueDate && (
                <p className="text-red-500 text-sm">{form.formState.errors.dueDate.message}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Select Vendors</h3>
          {Array.isArray(vendors) && vendors.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {vendors.map((vendor: any) => (
                <label key={vendor.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={vendor.id}
                    {...form.register("selectedVendors")}
                  />
                  <span>{vendor.companyName || vendor.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No vendors available</p>
          )}
          {form.formState.errors.selectedVendors && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.selectedVendors.message}</p>
          )}
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create RFx"}
          </Button>
        </div>
      </form>
    </div>
  );
}