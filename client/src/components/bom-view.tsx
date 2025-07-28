import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Layers, 
  Package, 
  Calendar, 
  Tag,
  FileText,
  Calculator,
  Eye,
  ExternalLink
} from "lucide-react";
import { TbCurrencyRupee } from "react-icons/tb";
import type { Bom } from "@shared/schema";

interface BomViewProps {
  bom: Bom;
  onClose: () => void;
}

interface BomItem {
  id: string;
  productId?: string;
  itemName: string;
  itemCode?: string;
  description?: string;
  category?: string;
  quantity: string;
  uom?: string;
  unitPrice?: string;
  totalPrice?: string;
  specifications?: any;
}

export default function BomView({ bom, onClose }: BomViewProps) {
  const [bomItems, setBomItems] = useState<BomItem[]>([]);

  // Fetch BOM items
  const { data: bomItemsData, isLoading } = useQuery<BomItem[]>({
    queryKey: ["/api/boms", bom.id, "items"],
    queryFn: async () => {
      console.log("BOM View - Fetching items for BOM:", bom.id);
      const response = await apiRequest("GET", `/api/boms/${bom.id}`) as any;
      console.log("BOM View - API response:", response);
      console.log("BOM View - Items from response:", response?.items);
      return response?.items || [];
    },
    retry: false,
  });

  useEffect(() => {
    console.log("BOM View - bomItemsData changed:", bomItemsData);
    if (bomItemsData) {
      console.log("BOM View - Setting BOM items:", bomItemsData);
      setBomItems(bomItemsData);
    }
  }, [bomItemsData]);

  const totalBomValue = bomItems.reduce((sum, item) => {
    const totalPrice = parseFloat(item.totalPrice || '0');
    return sum + totalPrice;
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount).replace('₹', '');
  };

  return (
    <div className="space-y-6">
      {/* BOM Header Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{bom.name}</CardTitle>
                <p className="text-muted-foreground">Version {bom.version}</p>
              </div>
            </div>
            <Badge variant={bom.isActive ? "default" : "secondary"} className="text-sm">
              {bom.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bom.description && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Description</h4>
              <p className="text-sm">{bom.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bom.category && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
                <Badge variant="outline">{bom.category}</Badge>
              </div>
            )}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Created</h4>
              <p className="text-sm">{new Date(bom.createdAt || '').toLocaleDateString()}</p>
            </div>
            {bom.validFrom && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Valid From</h4>
                <p className="text-sm">{new Date(bom.validFrom).toLocaleDateString()}</p>
              </div>
            )}
            {bom.validTo && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Valid Until</h4>
                <p className="text-sm">{new Date(bom.validTo).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {bom.tags && bom.tags.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {bom.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOM Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              BOM Items ({bomItems.length})
            </CardTitle>
            <div className="flex items-center text-lg font-semibold text-green-600">
              <TbCurrencyRupee className="w-5 h-5" />
              {formatCurrency(totalBomValue)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : bomItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items found in this BOM</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bomItems.map((item, index) => (
                <div key={item.id || index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{item.itemName}</h4>
                        {item.itemCode && (
                          <Badge variant="outline" className="text-xs">
                            {item.itemCode}
                          </Badge>
                        )}
                        {!item.productId && (
                          <Badge variant="secondary" className="text-xs">
                            Custom Item
                          </Badge>
                        )}
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-medium ml-2">
                            {item.quantity} {item.uom || 'units'}
                          </span>
                        </div>
                        {item.unitPrice && (
                          <div>
                            <span className="text-muted-foreground">Unit Price:</span>
                            <span className="font-medium ml-2 flex items-center">
                              <TbCurrencyRupee className="w-3 h-3" />
                              {formatCurrency(parseFloat(item.unitPrice))}
                            </span>
                          </div>
                        )}
                        {item.totalPrice && (
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-medium ml-2 flex items-center text-green-600">
                              <TbCurrencyRupee className="w-3 h-3" />
                              {formatCurrency(parseFloat(item.totalPrice))}
                            </span>
                          </div>
                        )}
                        {item.category && (
                          <div>
                            <span className="text-muted-foreground">Category:</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            BOM Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{bomItems.length}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {bomItems.filter(item => !item.productId).length}
              </p>
              <p className="text-sm text-muted-foreground">Custom Items</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {bomItems.filter(item => item.productId).length}
              </p>
              <p className="text-sm text-muted-foreground">Catalog Items</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center text-2xl font-bold text-green-600">
                <TbCurrencyRupee className="w-6 h-6" />
                {formatCurrency(totalBomValue)}
              </div>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button>
          <ExternalLink className="w-4 h-4 mr-2" />
          Export BOM
        </Button>
      </div>
    </div>
  );
}