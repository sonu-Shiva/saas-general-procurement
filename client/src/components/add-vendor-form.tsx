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
import { Building2, Sparkles, Search, Plus, Mail, Phone, MapPin, Globe } from "lucide-react";
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
    onSuccess: (data: any) => {
      setDiscoveredVendors(Array.isArray(data) ? data : []);
      toast({
        title: "Success",
        description: `Found ${Array.isArray(data) ? data.length : 0} potential vendors!`,
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
        status: "approved",
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
          {/* AI Search Section */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-primary" />
                AI-Powered Vendor Discovery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Describe what you need... e.g., 'Find stainless steel pipe suppliers in Gujarat with ISO certification'"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      className="text-lg py-3"
                    />
                  </div>
                  <Button 
                    onClick={onDiscoverVendors}
                    className="bg-primary hover:bg-primary/90 px-8"
                    disabled={!aiQuery || discoverVendorsMutation.isPending}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {discoverVendorsMutation.isPending ? "Searching..." : "AI Search"}
                  </Button>
                </div>
                
                {/* Sample AI Queries */}
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setAiQuery("Electronics suppliers in Mumbai with ISO certification")}
                  >
                    Electronics suppliers
                  </Badge>
                  <Badge 
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setAiQuery("Steel manufacturers in Gujarat")}
                  >
                    Steel manufacturers
                  </Badge>
                  <Badge 
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setAiQuery("IT services companies in Bangalore")}
                  >
                    IT services
                  </Badge>
                  <Badge 
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setAiQuery("Chemical suppliers with export license")}
                  >
                    Chemical suppliers
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          {aiQuery && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">AI Insights</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                      Based on your search, I'll find vendors specializing in your requirements. 
                      Results are ranked by relevance, certifications, and performance ratings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discovered Vendors Results */}
          {discoveredVendors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Discovered Vendors ({discoveredVendors.length})</span>
                  <Badge variant="secondary">AI-Curated Results</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {discoveredVendors.map((vendor, index) => (
                    <Card key={index} className="border-2 border-border hover:border-primary/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold">{vendor.name}</h4>
                              <Badge variant="outline">{vendor.category}</Badge>
                            </div>
                            
                            {vendor.description && (
                              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                {vendor.description}
                              </p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{vendor.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{vendor.phone}</span>
                              </div>
                              {vendor.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{vendor.location}</span>
                                </div>
                              )}
                              {vendor.website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span>{vendor.website}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => addDiscoveredVendor(vendor)}
                            className="ml-4"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Vendors
                          </Button>
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