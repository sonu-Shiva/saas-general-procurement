import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react";

// Company Profile Schema
const companyProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  businessType: z.string().min(1, "Business type is required"),
  incorporationDate: z.string().min(1, "Incorporation date is required"),
  authorizedCapital: z.string().optional(),
  paidUpCapital: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  fax: z.string().optional(),
  description: z.string().optional(),
});

// Company Branch Schema
const companyBranchSchema = z.object({
  branchName: z.string().min(1, "Branch name is required"),
  branchCode: z.string().min(1, "Branch code is required"),
  branchType: z.string().min(1, "Branch type is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  gstNumber: z.string().optional(),
  contactPerson: z.string().min(1, "Contact person is required"),
  contactDesignation: z.string().optional(),
});

type CompanyProfile = z.infer<typeof companyProfileSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
};

type CompanyBranch = z.infer<typeof companyBranchSchema> & {
  id: string;
  companyProfileId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
};

export default function CompanyProfilePage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CompanyProfile | null>(null);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch company profile
  const { data: companyProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/company-profile'],
    queryFn: () => apiRequest('/api/company-profile'),
  });

  // Fetch company branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['/api/company-branches'],
    queryFn: () => apiRequest('/api/company-branches'),
  });

  // Company profile form
  const profileForm = useForm<z.infer<typeof companyProfileSchema>>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: "",
      registrationNumber: "",
      taxId: "",
      gstNumber: "",
      panNumber: "",
      industry: "",
      businessType: "",
      incorporationDate: "",
      authorizedCapital: "",
      paidUpCapital: "",
      website: "",
      email: "",
      phone: "",
      fax: "",
      description: "",
    },
  });

  // Company branch form
  const branchForm = useForm<z.infer<typeof companyBranchSchema>>({
    resolver: zodResolver(companyBranchSchema),
    defaultValues: {
      branchName: "",
      branchCode: "",
      branchType: "branch",
      address: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
      phone: "",
      email: "",
      gstNumber: "",
      contactPerson: "",
      contactDesignation: "",
    },
  });

  // Create/Update company profile mutation
  const profileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof companyProfileSchema>) => {
      if (editingProfile) {
        return apiRequest(`/api/company-profile/${editingProfile.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/company-profile", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-profile'] });
      setShowCreateDialog(false);
      setEditingProfile(null);
      profileForm.reset();
      toast({
        title: "Success",
        description: editingProfile ? "Company profile updated successfully" : "Company profile created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to save company profile",
        variant: "destructive",
      });
    },
  });

  // Create/Update branch mutation
  const branchMutation = useMutation({
    mutationFn: async (data: z.infer<typeof companyBranchSchema>) => {
      if (editingBranch) {
        return apiRequest(`/api/company-branches/${editingBranch.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/company-branches", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-branches'] });
      setShowBranchDialog(false);
      setEditingBranch(null);
      branchForm.reset();
      toast({
        title: "Success",
        description: editingBranch ? "Branch updated successfully" : "Branch created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to save branch",
        variant: "destructive",
      });
    },
  });

  // Delete branch mutation
  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      return apiRequest(`/api/company-branches/${branchId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-branches'] });
      toast({
        title: "Success",
        description: "Branch deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete branch",
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    if (companyProfile) {
      setEditingProfile(companyProfile);
      profileForm.reset(companyProfile);
      setShowCreateDialog(true);
    }
  };

  const handleEditBranch = (branch: CompanyBranch) => {
    setEditingBranch(branch);
    branchForm.reset(branch);
    setShowBranchDialog(true);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      deleteBranchMutation.mutate(branchId);
    }
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingProfile(null);
    profileForm.reset();
  };

  const handleCloseBranchDialog = () => {
    setShowBranchDialog(false);
    setEditingBranch(null);
    branchForm.reset();
  };

  if (profileLoading || branchesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Company Profile</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground">
            Manage your company profile and branch information
          </p>
        </div>
        {!companyProfile && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-company-profile">
                <Plus className="mr-2 h-4 w-4" />
                Create Company Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Company Profile</DialogTitle>
                <DialogDescription>
                  Enter your company information to create the profile
                </DialogDescription>
              </DialogHeader>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-company-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-registration-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-tax-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="gstNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Number</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-gst-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="panNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-pan-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-industry" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-business-type" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="incorporationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incorporation Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-incorporation-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="fax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fax</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-fax" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={profileMutation.isPending} data-testid="button-save-profile">
                      <Save className="mr-2 h-4 w-4" />
                      {profileMutation.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Company Profile Card */}
      {companyProfile && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {companyProfile.companyName}
              </CardTitle>
              <CardDescription>{companyProfile.industry}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditProfile} data-testid="button-edit-profile">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Registration:</span>
                  <span data-testid="text-registration-number">{companyProfile.registrationNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Tax ID:</span>
                  <span data-testid="text-tax-id">{companyProfile.taxId}</span>
                </div>
                {companyProfile.gstNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">GST:</span>
                    <span data-testid="text-gst-number">{companyProfile.gstNumber}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span data-testid="text-email">{companyProfile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span data-testid="text-phone">{companyProfile.phone}</span>
                </div>
                {companyProfile.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Website:</span>
                    <a 
                      href={companyProfile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      data-testid="link-website"
                    >
                      {companyProfile.website}
                    </a>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Business Type:</span>
                  <Badge variant="secondary" className="ml-2" data-testid="badge-business-type">
                    {companyProfile.businessType}
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Incorporation:</span>
                  <span className="ml-2" data-testid="text-incorporation-date">
                    {new Date(companyProfile.incorporationDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {companyProfile.description && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-description">
                    {companyProfile.description}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Branches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Company Branches</h2>
          <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-branch">
                <Plus className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? "Edit Branch" : "Add New Branch"}
                </DialogTitle>
                <DialogDescription>
                  {editingBranch ? "Update branch information" : "Add a new company branch or office"}
                </DialogDescription>
              </DialogHeader>
              <Form {...branchForm}>
                <form onSubmit={branchForm.handleSubmit((data) => branchMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={branchForm.control}
                      name="branchName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-branch-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={branchForm.control}
                      name="branchCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch Code</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-branch-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={branchForm.control}
                      name="branchType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch Type</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-branch-type" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={branchForm.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-person" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={branchForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={branchForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={branchForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-state" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={branchForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-postal-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={branchForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-branch-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={branchForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-branch-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCloseBranchDialog} data-testid="button-cancel-branch">
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={branchMutation.isPending} data-testid="button-save-branch">
                      <Save className="mr-2 h-4 w-4" />
                      {branchMutation.isPending ? "Saving..." : editingBranch ? "Update Branch" : "Add Branch"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No branches found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first company branch to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch: CompanyBranch) => (
              <Card key={branch.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-branch-name-${branch.id}`}>
                        {branch.branchName}
                      </CardTitle>
                      <CardDescription>
                        <Badge variant="outline" data-testid={`badge-branch-type-${branch.id}`}>
                          {branch.branchType}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBranch(branch)}
                        data-testid={`button-edit-branch-${branch.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-branch-${branch.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div data-testid={`text-branch-address-${branch.id}`}>{branch.address}</div>
                      <div className="text-muted-foreground">
                        {branch.city}, {branch.state} {branch.postalCode}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span data-testid={`text-branch-phone-${branch.id}`}>{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span data-testid={`text-branch-email-${branch.id}`}>{branch.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Contact:</span>
                    <span data-testid={`text-branch-contact-${branch.id}`}>{branch.contactPerson}</span>
                  </div>
                  {branch.gstNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">GST:</span>
                      <span data-testid={`text-branch-gst-${branch.id}`}>{branch.gstNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}