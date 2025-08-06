import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIVendorDiscovery from "@/components/ai-vendor-discovery";

// Manual vendor form schema
const manualVendorSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  contactPerson: z.string().min(1, "Contact person is required"),
  address: z.string().optional(),
  categories: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

type ManualVendorData = z.infer<typeof manualVendorSchema>;

interface AddVendorFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddVendorForm({ onClose, onSuccess }: AddVendorFormProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Manual vendor form
  const form = useForm<ManualVendorData>({
    resolver: zodResolver(manualVendorSchema),
    defaultValues: {
      companyName: "",
      email: "",
      phone: "",
      contactPerson: "",
      address: "",
      categories: "",
      website: "",
      description: "",
    },
  });

  // Create manual vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: ManualVendorData) => {
      return await apiRequest("POST", "/api/vendors", {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        categories: data.categories ? data.categories.split(',').map(c => c.trim()) : [],
        website: data.website,
        description: data.description,
        status: "approved"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor added successfully!",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add vendor",
        variant: "destructive",
      });
    },
  });

  const onManualSubmit = (data: ManualVendorData) => {
    createVendorMutation.mutate(data);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Register Vendor
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Vendor Discovery
          </TabsTrigger>
        </TabsList>

        {/* Manual Vendor Entry */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Register New Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      {...form.register("companyName")}
                      placeholder="Enter company name"
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      {...form.register("contactPerson")}
                      placeholder="Enter contact person name"
                    />
                    {form.formState.errors.contactPerson && (
                      <p className="text-sm text-destructive">{form.formState.errors.contactPerson.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="contact@company.com"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number * (10 digits only)</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="9876543210"
                      maxLength={10}
                      type="tel"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categories">Categories (Optional)</Label>
                    <Input
                      id="categories"
                      {...form.register("categories")}
                      placeholder="e.g., Electronics, Manufacturing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      {...form.register("website")}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    rows={3}
                    placeholder="Brief description of the vendor's business"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Textarea
                    id="address"
                    {...form.register("address")}
                    rows={3}
                    placeholder="Company address"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createVendorMutation.isPending}>
                    {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Vendor Discovery */}
        <TabsContent value="ai" className="space-y-6">
          <AIVendorDiscovery onVendorsFound={(vendors) => {
            // Handle discovered vendors - could show success message
            toast({
              title: "Vendors Discovered",
              description: `Found ${vendors.length} potential vendors matching your criteria!`,
            });
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}