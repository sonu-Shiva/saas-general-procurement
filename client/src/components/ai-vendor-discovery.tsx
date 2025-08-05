import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bot, Sparkles, MapPin, Phone, Mail, Globe, Building } from "lucide-react";

interface DiscoveredVendor {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoUrl: string;
  description: string;
  category: string;
}

interface AIVendorDiscoveryProps {
  onVendorsFound?: (vendors: DiscoveredVendor[]) => void;
}

export default function AIVendorDiscovery({ onVendorsFound }: AIVendorDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [discoveredVendors, setDiscoveredVendors] = useState<DiscoveredVendor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const discoverVendors = useMutation({
    mutationFn: async (query: string): Promise<DiscoveredVendor[]> => {
      setIsSearching(true);
      
      const response = await fetch('/api/vendors/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: query,
          location: '',
          category: ''
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const vendors = await response.json();
      setIsSearching(false);
      return vendors;
    },
    onSuccess: (vendors) => {
      setDiscoveredVendors(vendors);
      onVendorsFound?.(vendors);
      toast({
        title: "Discovery Successful",
        description: `Found ${vendors.length} verified suppliers`,
      });
    },
    onError: (error: any) => {
      setIsSearching(false);
      console.error("AI Discovery Error:", error);
      toast({
        title: "Discovery Failed",
        description: error.message || "Failed to discover vendors",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter what you're looking for",
        variant: "destructive",
      });
      return;
    }
    discoverVendors.mutate(searchQuery);
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    discoverVendors.mutate(query);
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
            <Bot className="w-6 h-6 mr-2" />
            AI-Powered Vendor Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Describe what you need... e.g., 'Electronic components with ISO certification'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-lg py-3"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 px-8"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Search
                  </>
                )}
              </Button>
            </div>
            
            {/* Quick Search Options */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-600 hover:text-white"
                onClick={() => handleQuickSearch("Electronic components with ISO 9001 certification")}
              >
                Electronic Components
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-600 hover:text-white"
                onClick={() => handleQuickSearch("Textile manufacturers in Gujarat")}
              >
                Textile Manufacturing
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-600 hover:text-white"
                onClick={() => handleQuickSearch("Chemical suppliers with export license")}
              >
                Chemical Suppliers
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {discoveredVendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Discovered Vendors ({discoveredVendors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoveredVendors.map((vendor, index) => (
                <Card key={index} className="border border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Vendor Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {vendor.name}
                          </h3>
                          <Badge variant="secondary" className="mt-1">
                            {vendor.category || 'General'}
                          </Badge>
                        </div>
                        {vendor.logoUrl && (
                          <img 
                            src={vendor.logoUrl} 
                            alt={`${vendor.name} logo`}
                            className="w-12 h-12 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-2 text-sm">
                        {vendor.email && (
                          <div className="flex items-center text-muted-foreground">
                            <Mail className="w-4 h-4 mr-2" />
                            <span>{vendor.email}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center text-muted-foreground">
                            <Phone className="w-4 h-4 mr-2" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.website && (
                          <div className="flex items-center text-muted-foreground">
                            <Globe className="w-4 h-4 mr-2" />
                            <a 
                              href={vendor.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {vendor.website}
                            </a>
                          </div>
                        )}
                        {vendor.address && (
                          <div className="flex items-start text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                            <span className="text-xs">{vendor.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {vendor.description && (
                        <p className="text-sm text-muted-foreground">
                          {vendor.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" className="flex-1">
                          Add to Network
                        </Button>
                        <Button size="sm" variant="outline">
                          Contact
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}