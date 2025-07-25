import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertRfxEventSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  Users, 
  Target, 
  Plus, 
  X, 
  Upload,
  Bot,
  Clock,

  CheckCircle
} from "lucide-react";

interface RfxFormProps {
  onClose: () => void;
}

export default function RfxForm({ onClose }: RfxFormProps) {
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [evaluationCriteria, setEvaluationCriteria] = useState<{ name: string; weight: number }[]>([
    { name: "Price", weight: 40 },
    { name: "Quality", weight: 25 },
    { name: "Delivery Time", weight: 20 },
    { name: "Experience", weight: 15 }
  ]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertRfxEventSchema),
    defaultValues: {
      title: "",
      type: "rfq" as const,
      scope: "",
      criteria: "",
      dueDate: "",
      contactPerson: "",
      budget: "",
      evaluationParameters: {},
      bomId: "",
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors", { status: "approved" }],
    retry: false,
  });

  const { data: boms } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });

  const createRfxMutation = useMutation({
    mutationFn: async (data: any) => {
      const rfxData = {
        ...data,
        budget: data.budget ? parseFloat(data.budget) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        evaluationParameters: {
          criteria: evaluationCriteria,
          vendors: selectedVendors,
          attachments,
        },
      };
      await apiRequest("POST", "/api/rfx", rfxData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      toast({
        title: "Success",
        description: "RFx created successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create RFx",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createRfxMutation.mutate(data);
  };

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const addEvaluationCriterion = () => {
    setEvaluationCriteria(prev => [...prev, { name: "", weight: 0 }]);
  };

  const removeEvaluationCriterion = (index: number) => {
    setEvaluationCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const updateEvaluationCriterion = (index: number, field: 'name' | 'weight', value: string | number) => {
    setEvaluationCriteria(prev => 
      prev.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    );
  };

  const totalWeight = evaluationCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RFx Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Office Furniture Procurement" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RFx Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rfi">RFI - Request for Information</SelectItem>
                                <SelectItem value="rfp">RFP - Request for Proposal</SelectItem>
                                <SelectItem value="rfq">RFQ - Request for Quotation</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (Optional)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Due Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated BOM (Optional)</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select BOM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No BOM</SelectItem>
                              {boms?.map((bom: any) => (
                                <SelectItem key={bom.id} value={bom.id}>
                                  {bom.name} (v{bom.version})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Requirements & Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Scope</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the overall scope and objectives of this procurement..."
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="criteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Requirements</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="List specific requirements, technical specifications, delivery expectations..."
                            rows={6}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Attachments
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drop files here or click to upload
                      </p>
                      <Button type="button" variant="outline" size="sm">
                        Choose Files
                      </Button>
                    </div>
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{file}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Vendor Selection
                    </div>
                    <Badge variant="secondary">
                      {selectedVendors.length} selected
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input placeholder="Search vendors..." className="max-w-md" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendors?.map((vendor: any) => (
                      <div
                        key={vendor.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedVendors.includes(vendor.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleVendorToggle(vendor.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox 
                              checked={selectedVendors.includes(vendor.id)}
                              onChange={() => {}}
                            />
                            <div>
                              <h4 className="font-medium">{vendor.companyName}</h4>
                              <p className="text-sm text-muted-foreground">{vendor.contactPerson}</p>
                            </div>
                          </div>
                          {vendor.performanceScore && (
                            <Badge variant="outline">
                              {parseFloat(vendor.performanceScore).toFixed(1)}/5
                            </Badge>
                          )}
                        </div>
                        {vendor.categories && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {vendor.categories.slice(0, 2).map((category: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evaluation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Evaluation Criteria
                    </div>
                    <Badge variant={totalWeight === 100 ? "default" : "destructive"}>
                      Total: {totalWeight}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {evaluationCriteria.map((criterion, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Input
                        placeholder="Criterion name"
                        value={criterion.name}
                        onChange={(e) => updateEvaluationCriterion(index, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Weight"
                          value={criterion.weight}
                          onChange={(e) => updateEvaluationCriterion(index, 'weight', parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEvaluationCriterion(index)}
                        disabled={evaluationCriteria.length <= 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addEvaluationCriterion}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Criterion
                  </Button>

                  {totalWeight !== 100 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Warning: Total weight should equal 100%. Current total is {totalWeight}%.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="outline">
                <Bot className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline">
                Save Draft
              </Button>
              <Button type="submit" disabled={createRfxMutation.isPending || totalWeight !== 100}>
                {createRfxMutation.isPending ? "Creating..." : "Create & Publish"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
