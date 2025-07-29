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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Sparkles, Search, Plus, Mail, Phone, MapPin, Globe, Filter, Building, Star, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Manual vendor form schema
const manualVendorSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  contactPerson: z.string().min(1, "Contact person is required"),
  address: z.string().optional(),
  categories: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
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
  const [locationFilter, setLocationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
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
        logoUrl: data.logoUrl,
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

  // AI vendor discovery mutation
  const discoverVendorsMutation = useMutation({
    mutationFn: async (searchData: { query: string; location?: string; category?: string }) => {
      const response = await apiRequest("POST", "/api/vendors/discover", searchData);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setDiscoveredVendors(Array.isArray(data) ? data : []);
      toast({
        title: "AI Discovery Complete",
        description: `Found ${Array.isArray(data) ? data.length : 0} potential vendors matching your criteria!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Discovery Failed",
        description: error.message || "Failed to discover vendors. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onManualSubmit = (data: ManualVendorData) => {
    createVendorMutation.mutate(data);
  };

  const onDiscoverVendors = () => {
    // Allow empty search to show all vendors for browsing
    discoverVendorsMutation.mutate({
      query: aiQuery.trim(),
      location: locationFilter === "all" ? "" : locationFilter,
      category: categoryFilter === "all" ? "" : categoryFilter,
    });
  };

  const addDiscoveredVendor = async (vendor: any) => {
    try {
      await apiRequest("POST", "/api/vendors", {
        companyName: vendor.name,
        contactPerson: "Contact Person",
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.location || vendor.address,
        website: vendor.website,
        logoUrl: vendor.logoUrl,
        categories: [vendor.category],
        description: vendor.description,
        status: "approved",
        type: "supplier"
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Vendor Added Successfully",
        description: `${vendor.name} has been added to your vendor database and is ready for RFx workflows.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Add Vendor",
        description: error.message || "Unable to add vendor. Please try again.",
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
            Register Vendor
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
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
                  <Label htmlFor="logoFile">Company Logo (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <Input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            form.setValue("logoUrl", result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div 
                      className="cursor-pointer"
                      onClick={() => document.getElementById("logoFile")?.click()}
                    >
                      {form.watch("logoUrl") ? (
                        <div className="flex flex-col items-center gap-2">
                          <img 
                            src={form.watch("logoUrl")} 
                            alt="Company logo preview"
                            className="w-16 h-16 object-cover rounded-lg border-2 border-border"
                          />
                          <p className="text-sm text-foreground font-medium">
                            Logo uploaded successfully
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click to change image
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload company logo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    Search Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="Mumbai">Mumbai</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Bangalore">Bangalore</SelectItem>
                        <SelectItem value="Chennai">Chennai</SelectItem>
                        <SelectItem value="Kolkata">Kolkata</SelectItem>
                        <SelectItem value="Pune">Pune</SelectItem>
                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                        <SelectItem value="Ahmedabad">Ahmedabad</SelectItem>
                        <SelectItem value="Gujarat">Gujarat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      <Building className="w-4 h-4 inline mr-1" />
                      Category
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Electronics">Electronics & IT</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Steel">Steel & Metals</SelectItem>
                        <SelectItem value="Services">Services</SelectItem>
                        <SelectItem value="Chemicals">Chemicals</SelectItem>
                        <SelectItem value="Textiles">Textiles</SelectItem>
                        <SelectItem value="Automotive">Automotive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Discovery Area */}
            <div className="lg:col-span-3 space-y-6">
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
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setAiQuery("Electronic components suppliers with ISO 9001 certification")}
                      >
                        Electronic components with ISO 9001
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setAiQuery("Bulk steel suppliers in Gujarat with export capability")}
                      >
                        Bulk steel suppliers in Gujarat
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setAiQuery("IT services companies with 24/7 support in Bangalore")}
                      >
                        IT services with 24/7 support
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setAiQuery("Chemical suppliers with safety certifications")}
                      >
                        Certified chemical suppliers
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
                          Analyzing your requirements: "{aiQuery}". Searching for vendors 
                          {locationFilter !== "all" && ` in ${locationFilter}`}
                          {categoryFilter !== "all" && ` specializing in ${categoryFilter}`}.
                          Results ranked by relevance, certifications, and performance.
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
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        AI-Curated Results
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {discoveredVendors.map((vendor, index) => (
                        <Card key={index} className="border-2 border-border hover:border-primary/50 transition-all duration-200 hover:shadow-md">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h4 className="text-xl font-semibold">{vendor.name}</h4>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {vendor.category}
                                  </Badge>
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    Verified
                                  </Badge>
                                </div>
                                
                                {vendor.description && (
                                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
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
                                      <span className="truncate">{vendor.website}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Button 
                                onClick={() => addDiscoveredVendor(vendor)}
                                className="ml-6 flex items-center gap-2"
                                size="lg"
                              >
                                <Plus className="h-4 w-4" />
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

              {/* Empty State */}
              {aiQuery && discoveredVendors.length === 0 && !discoverVendorsMutation.isPending && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Vendors Found</h3>
                    <p className="text-muted-foreground mb-6">
                      Try adjusting your search query or filters to find relevant vendors.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setAiQuery("");
                        setLocationFilter("all");
                        setCategoryFilter("all");
                      }}
                    >
                      Clear Search
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}