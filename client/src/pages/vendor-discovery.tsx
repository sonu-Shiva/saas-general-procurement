import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import VendorCard from "@/components/vendor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Search, 
  Filter, 
  Bot, 
  MapPin, 
  Award, 
  Star,
  Sparkles,
  Globe,
  Users,
  Building,
  CheckCircle
} from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function VendorDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [certificationFilters, setCertificationFilters] = useState<string[]>([]);
  const [performanceRange, setPerformanceRange] = useState([4.0]);
  const [aiSearchMode, setAiSearchMode] = useState(false);

  const { data: searchResults, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/search", { 
      q: searchQuery, 
      location: locationFilter, 
      category: categoryFilter,
      certifications: certificationFilters.join(',')
    }],
    enabled: searchQuery.length > 2,
    retry: false,
  });

  const { data: allVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors", { status: "approved" }],
    retry: false,
  });

  const handleCertificationChange = (certification: string, checked: boolean) => {
    if (checked) {
      setCertificationFilters([...certificationFilters, certification]);
    } else {
      setCertificationFilters(certificationFilters.filter(c => c !== certification));
    }
  };

  const handleAiSearch = () => {
    setAiSearchMode(true);
    // AI search functionality would be implemented here
  };

  const displayVendors = searchQuery.length > 2 ? (searchResults || []) : (allVendors || []).filter((vendor: Vendor) => {
    const matchesLocation = locationFilter === "all" || vendor.officeLocations?.includes(locationFilter);
    const matchesCategory = categoryFilter === "all" || vendor.categories?.includes(categoryFilter);
    const matchesCertifications = certificationFilters.length === 0 || 
      certificationFilters.some(cert => vendor.certifications?.includes(cert));
    const matchesPerformance = !vendor.performanceScore || 
      parseFloat(vendor.performanceScore) >= performanceRange[0];
    
    return matchesLocation && matchesCategory && matchesCertifications && matchesPerformance;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Vendor Discovery</h1>
              <p className="text-muted-foreground">
                Find and connect with suppliers using AI-powered search and intelligent recommendations
              </p>
            </div>

            {/* AI Search Section */}
            <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="w-6 h-6 mr-2 text-primary" />
                  AI-Powered Vendor Discovery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Describe what you need... e.g., 'Find stainless steel pipe suppliers in Gujarat with ISO certification'"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-lg py-3"
                      />
                    </div>
                    <Button 
                      onClick={handleAiSearch}
                      className="bg-primary hover:bg-primary/90 px-8"
                      disabled={!searchQuery}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Search
                    </Button>
                  </div>
                  
                  {/* Sample AI Queries */}
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setSearchQuery("Electronic components suppliers with ISO 9001 certification")}
                    >
                      Electronic components with ISO 9001
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setSearchQuery("Bulk cotton yarn suppliers in Tamil Nadu")}
                    >
                      Bulk cotton yarn in Tamil Nadu
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setSearchQuery("Office furniture suppliers with delivery within 7 days")}
                    >
                      Quick delivery office furniture
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Filter className="w-5 h-5 mr-2" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                          <SelectItem value="electronics">Electronics & IT</SelectItem>
                          <SelectItem value="raw-materials">Raw Materials</SelectItem>
                          <SelectItem value="office-supplies">Office Supplies</SelectItem>
                          <SelectItem value="industrial">Industrial Equipment</SelectItem>
                          <SelectItem value="automotive">Automotive</SelectItem>
                          <SelectItem value="textiles">Textiles</SelectItem>
                          <SelectItem value="chemicals">Chemicals</SelectItem>
                          <SelectItem value="food">Food & Beverages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Certifications Filter */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        <Award className="w-4 h-4 inline mr-1" />
                        Certifications
                      </label>
                      <div className="space-y-2">
                        {[
                          "ISO 9001",
                          "ISO 14001",
                          "ISO 45001",
                          "CE Marking",
                          "MSME Certified",
                          "Export License",
                          "FDA Approved",
                          "GMP Certified"
                        ].map((cert) => (
                          <div key={cert} className="flex items-center space-x-2">
                            <Checkbox
                              id={cert}
                              checked={certificationFilters.includes(cert)}
                              onCheckedChange={(checked) => handleCertificationChange(cert, checked as boolean)}
                            />
                            <label htmlFor={cert} className="text-sm cursor-pointer">
                              {cert}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance Rating Filter */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        <Star className="w-4 h-4 inline mr-1" />
                        Minimum Rating
                      </label>
                      <div className="px-2">
                        <Slider
                          value={performanceRange}
                          onValueChange={setPerformanceRange}
                          max={5}
                          min={1}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1.0</span>
                          <span className="font-medium">{performanceRange[0].toFixed(1)}+</span>
                          <span>5.0</span>
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setLocationFilter("all");
                        setCategoryFilter("all");
                        setCertificationFilters([]);
                        setPerformanceRange([4.0]);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-3">
                {/* Results Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {searchQuery ? "Search Results" : "Recommended Vendors"}
                    </h2>
                    <p className="text-muted-foreground">
                      {displayVendors?.length || 0} vendors found
                      {searchQuery && ` for "${searchQuery}"`}
                    </p>
                  </div>
                  <Select defaultValue="relevance">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Sort by Relevance</SelectItem>
                      <SelectItem value="rating">Sort by Rating</SelectItem>
                      <SelectItem value="experience">Sort by Experience</SelectItem>
                      <SelectItem value="location">Sort by Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Insights */}
                {searchQuery && (
                  <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-blue-900 dark:text-blue-100">AI Insights</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                            Based on your search, I found vendors specializing in your requirements. 
                            Top matches are ranked by relevance, certifications, and past performance.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results Grid */}
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                            <div className="h-8 bg-muted rounded w-full"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : displayVendors && displayVendors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayVendors.map((vendor: Vendor) => (
                      <div key={vendor.id} className="relative">
                        <VendorCard 
                          vendor={vendor} 
                          showActions={true}
                          showInviteButton={true}
                        />
                        {searchQuery && (
                          <Badge className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-indigo-500">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Match
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      {searchQuery ? (
                        <>
                          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">No vendors found</h3>
                          <p className="text-muted-foreground mb-4">
                            Try adjusting your search query or filters to find more vendors.
                          </p>
                          <Button variant="outline" onClick={() => setSearchQuery("")}>
                            Clear Search
                          </Button>
                        </>
                      ) : (
                        <>
                          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">Start discovering vendors</h3>
                          <p className="text-muted-foreground mb-4">
                            Use the AI-powered search above to find vendors that match your specific requirements.
                          </p>
                          <Button onClick={() => setSearchQuery("Electronics suppliers with ISO certification")}>
                            Try Sample Search
                          </Button>
                        </>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Pagination could be added here if needed */}
            </div>
          </div>
    </div>
  );
}
