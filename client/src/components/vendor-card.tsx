import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building, 
  MapPin, 
  Award, 
  Star, 
  Mail, 
  Phone, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Eye,
  Send,
  UserPlus
} from "lucide-react";
import type { Vendor } from "@shared/schema";

interface VendorCardProps {
  vendor: Vendor;
  onStatusUpdate?: (id: string, status: string) => void;
  showActions?: boolean;
  showInviteButton?: boolean;
}

export default function VendorCard({ 
  vendor, 
  onStatusUpdate, 
  showActions = true,
  showInviteButton = false 
}: VendorCardProps) {
  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "suspended":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const performanceScore = vendor.performanceScore ? parseFloat(vendor.performanceScore) : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src="" alt={vendor.companyName} />
              <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white font-semibold">
                {vendor.companyName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{vendor.companyName}</h3>
              <p className="text-sm text-muted-foreground">{vendor.contactPerson}</p>
            </div>
          </div>
          <Badge variant={getStatusColor(vendor.status || "pending")}>
            {getStatusIcon(vendor.status || "pending")}
            <span className="ml-1 capitalize">{vendor.status}</span>
          </Badge>
        </div>

        {/* Contact Information */}
        <div className="space-y-2 mb-4">
          {vendor.email && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{vendor.email}</span>
            </div>
          )}
          {vendor.phone && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{vendor.phone}</span>
            </div>
          )}
          {vendor.officeLocations && vendor.officeLocations.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{vendor.officeLocations[0]}</span>
              {vendor.officeLocations.length > 1 && (
                <span className="text-xs">+{vendor.officeLocations.length - 1} more</span>
              )}
            </div>
          )}
        </div>

        {/* Categories */}
        {vendor.categories && vendor.categories.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {vendor.categories.slice(0, 3).map((category, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Building className="w-3 h-3 mr-1" />
                  {category}
                </Badge>
              ))}
              {vendor.categories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{vendor.categories.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Certifications */}
        {vendor.certifications && vendor.certifications.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {vendor.certifications.slice(0, 2).map((cert, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  {cert}
                </Badge>
              ))}
              {vendor.certifications.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{vendor.certifications.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Performance Rating */}
        {performanceScore > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Performance Score</span>
              <span className="text-sm font-bold">{performanceScore.toFixed(1)}/5.0</span>
            </div>
            <div className="flex items-center space-x-1">
              {getRatingStars(performanceScore)}
              {performanceScore >= 4.5 && (
                <Award className="w-4 h-4 text-yellow-500 ml-2" />
              )}
            </div>
          </div>
        )}

        {/* Experience */}
        {vendor.yearsOfExperience && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              {vendor.yearsOfExperience} years of experience
            </div>
          </div>
        )}

        {/* Tags */}
        {vendor.tags && vendor.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {vendor.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Company Details */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          {vendor.gstNumber && (
            <div>
              <p className="text-muted-foreground">GST</p>
              <p className="font-medium text-xs">{vendor.gstNumber}</p>
            </div>
          )}
          {vendor.panNumber && (
            <div>
              <p className="text-muted-foreground">PAN</p>
              <p className="font-medium text-xs">{vendor.panNumber}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="space-y-2">
            {vendor.status === "pending" && onStatusUpdate && (
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={() => onStatusUpdate(vendor.id, "approved")}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => onStatusUpdate(vendor.id, "rejected")}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Eye className="w-3 h-3 mr-1" />
                View Details
              </Button>
              {showInviteButton && (
                <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                  <Send className="w-3 h-3 mr-1" />
                  Invite
                </Button>
              )}
            </div>

            {showInviteButton && (
              <Button size="sm" variant="outline" className="w-full">
                <UserPlus className="w-3 h-3 mr-1" />
                Add to Network
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
