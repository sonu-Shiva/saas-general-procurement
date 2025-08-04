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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Building2, Mail, Phone, MapPin, Globe, Sparkles, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Manual vendor form schema
const manualVendorSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  category: z.string().min(1, "Category is required"),
  address: z.string().optional(),
  website: z.string().url("Valid website URL required").optional().or(z.literal("")),
  description: z.string().optional(),
});

type ManualVendorData = z.infer<typeof manualVendorSchema>;

// AI discovery form schema
const aiDiscoverySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  location: z.string().optional(),
  category: z.string().optional(),
});

type AIDiscoveryData = z.infer<typeof aiDiscoverySchema>;

interface VendorDiscoveryProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function VendorDiscovery({ onClose, onSuccess }: VendorDiscoveryProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const [discoveredVendors, setDiscoveredVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Manual vendor form
  const manualForm = useForm<ManualVendorData>({
    resolver: zodResolver(manualVendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      category: "",
      address: "",
      website: "",
      description: "",
    },
  });

  // AI discovery form
  const discoveryForm = useForm<AIDiscoveryData>({
    resolver: zodResolver(aiDiscoverySchema),
    defaultValues: {
      query: "",
      location: "",
      category: "",
    },
  });

  // Create manual vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: ManualVendorData) => {
      return await apiRequest("/api/vendors", "POST", {
        ...data,
        type: "buyer_added",
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor added successfully!",
      });
      manualForm.reset();
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
    mutationFn: async (data: AIDiscoveryData) => {
      return await apiRequest("/api/vendors/discover", "POST", data);
    },
    onSuccess: (vendors) => {
      setDiscoveredVendors(vendors);
      toast({
        title: "Success",
        description: `Found ${vendors.length} potential vendors!`,
      });
    },
    onError: (error: any) => {
      console.error("AI Discovery Error:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      toast({
        title: "Discovery Failed",
        description: error.message || "Failed to discover vendors",
        variant: "destructive",
      });
    },
  });

  // Add selected vendors mutation
  const addSelectedVendorsMutation = useMutation({
    mutationFn: async (vendors: any[]) => {
      const promises = vendors.map(vendor =>
        apiRequest("/api/vendors", "POST", {
          ...vendor,
          type: "ai_discovered",
          status: "pending_verification"
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: `Added ${selectedVendors.size} vendors to your network!`,
      });
      setDiscoveredVendors([]);
      setSelectedVendors(new Set());
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add vendors",
        variant: "destructive",
      });
    },
  });

  const onManualSubmit = (data: ManualVendorData) => {
    createVendorMutation.mutate(data);
  };

  const onDiscoverySubmit = (data: AIDiscoveryData) => {
    discoverVendorsMutation.mutate(data);
  };

  const toggleVendorSelection = (index: number) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVendors(newSelected);
  };

  const addSelectedVendors = () => {
    const vendors = Array.from(selectedVendors).map(index => discoveredVendors[index]);
    addSelectedVendorsMutation.mutate(vendors);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
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
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Add Vendor Manually
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      {...manualForm.register("name")}
                      placeholder="Enter company name"
                    />
                    {manualForm.formState.errors.name && (
                      <p className="text-sm text-destructive">{manualForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...manualForm.register("email")}
                      placeholder="contact@company.com"
                    />
                    {manualForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{manualForm.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      {...manualForm.register("phone")}
                      placeholder="+91 98765 43210"
                    />
                    {manualForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">{manualForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      {...manualForm.register("category")}
                      placeholder="e.g., Electronics, Manufacturing, Services"
                    />
                    {manualForm.formState.errors.category && (
                      <p className="text-sm text-destructive">{manualForm.formState.errors.category.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      {...manualForm.register("website")}
                      placeholder="https://company.com"
                    />
                    {manualForm.formState.errors.website && (
                      <p className="text-sm text-destructive">{manualForm.formState.errors.website.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address (Optional)</Label>
                    <Input
                      id="address"
                      {...manualForm.register("address")}
                      placeholder="City, State, Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...manualForm.register("description")}
                    rows={3}
                    placeholder="Brief description of the vendor's services or products"
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
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Discover Vendors with AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={discoveryForm.handleSubmit(onDiscoverySubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="query">What are you looking for? *</Label>
                  <Input
                    id="query"
                    {...discoveryForm.register("query")}
                    placeholder="e.g., electronics suppliers, manufacturing companies, IT services"
                  />
                  {discoveryForm.formState.errors.query && (
                    <p className="text-sm text-destructive">{discoveryForm.formState.errors.query.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Preferred Location (Optional)</Label>
                    <Input
                      id="location"
                      {...discoveryForm.register("location")}
                      placeholder="e.g., Mumbai, Chennai, Bangalore"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Input
                      id="category"
                      {...discoveryForm.register("category")}
                      placeholder="e.g., Electronics, Manufacturing, Services"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={discoverVendorsMutation.isPending} className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    {discoverVendorsMutation.isPending ? "Discovering..." : "Discover Vendors"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Discovered Vendors */}
          {discoveredVendors.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Discovered Vendors ({discoveredVendors.length})</CardTitle>
                  {selectedVendors.size > 0 && (
                    <Button 
                      onClick={addSelectedVendors}
                      disabled={addSelectedVendorsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {addSelectedVendorsMutation.isPending ? "Adding..." : `Add Selected (${selectedVendors.size})`}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discoveredVendors.map((vendor, index) => (
                    <Card 
                      key={index}
                      className={`border-2 cursor-pointer transition-colors ${
                        selectedVendors.has(index) 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleVendorSelection(index)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-foreground">{vendor.name}</h4>
                              <Badge variant="outline">{vendor.category}</Badge>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedVendors.has(index)}
                              onChange={() => toggleVendorSelection(index)}
                              className="h-4 w-4 rounded border-2 border-border text-primary"
                            />
                          </div>
                          
                          {vendor.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {vendor.description}
                            </p>
                          )}
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{vendor.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{vendor.phone}</span>
                            </div>
                            {vendor.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{vendor.location}</span>
                              </div>
                            )}
                            {vendor.website && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate">{vendor.website}</span>
                              </div>
                            )}
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