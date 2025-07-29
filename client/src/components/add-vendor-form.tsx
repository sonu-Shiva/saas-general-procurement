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
import { Building2, Sparkles, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Manual vendor form schema
const manualVendorSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  address: z.string().optional(),
  categories: z.string().optional(),
});

type ManualVendorData = z.infer<typeof manualVendorSchema>;

interface AddVendorFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddVendorForm({ onClose, onSuccess }: AddVendorFormProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const [aiQuery, setAiQuery] = useState("");
  const [discoveredVendors, setDiscoveredVendors] = useState<any[]>([]);
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
    },
  });

  // Create manual vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: ManualVendorData) => {
      return await apiRequest("/api/vendors", "POST", {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        categories: data.categories ? data.categories.split(',').map(c => c.trim()) : [],
        status: "approved",
        type: "buyer_added"
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

  // AI vendor discovery mutation
  const discoverVendorsMutation = useMutation({
    mutationFn: async (query: string) => {
      return await apiRequest("/api/vendors/discover", "POST", { query });
    },
    onSuccess: (vendors) => {
      setDiscoveredVendors(vendors);
      toast({
        title: "Success",
        description: `Found ${vendors.length} potential vendors!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to discover vendors",
        variant: "destructive",
      });
    },
  });

  const onManualSubmit = (data: ManualVendorData) => {
    createVendorMutation.mutate(data);
  };

  const onDiscoverVendors = () => {
    if (aiQuery.trim()) {
      discoverVendorsMutation.mutate(aiQuery);
    }
  };

  const addDiscoveredVendor = async (vendor: any) => {
    try {
      await apiRequest("/api/vendors", "POST", {
        companyName: vendor.name,
        contactPerson: "Contact Person",
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.location || vendor.address,
        categories: [vendor.category],
        status: "pending",
        type: "ai_discovered"
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: `Added ${vendor.name} to your vendor list!`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add vendor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Discovery
          </TabsTrigger>
        </TabsList>

        {/* Manual Vendor Entry */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Vendor Manually</CardTitle>
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
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="+91 98765 43210"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categories">Categories (Optional)</Label>
                  <Input
                    id="categories"
                    {...form.register("categories")}
                    placeholder="e.g., Electronics, Manufacturing, Services (comma separated)"
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
          <Card>
            <CardHeader>
              <CardTitle>Discover Vendors with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiQuery">What are you looking for?</Label>
                  <Input
                    id="aiQuery"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="e.g., electronics suppliers, manufacturing companies, IT services"
                  />
                </div>

                <Button 
                  onClick={onDiscoverVendors} 
                  disabled={discoverVendorsMutation.isPending || !aiQuery.trim()}
                  className="w-full flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  {discoverVendorsMutation.isPending ? "Discovering..." : "Discover Vendors"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Discovered Vendors */}
          {discoveredVendors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Discovered Vendors ({discoveredVendors.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discoveredVendors.map((vendor, index) => (
                    <Card key={index} className="border-2 border-border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{vendor.name}</h4>
                              <p className="text-sm text-muted-foreground">{vendor.category}</p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => addDiscoveredVendor(vendor)}
                            >
                              Add
                            </Button>
                          </div>
                          
                          {vendor.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {vendor.description}
                            </p>
                          )}
                          
                          <div className="text-sm space-y-1">
                            <div>📧 {vendor.email}</div>
                            <div>📞 {vendor.phone}</div>
                            {vendor.location && <div>📍 {vendor.location}</div>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}