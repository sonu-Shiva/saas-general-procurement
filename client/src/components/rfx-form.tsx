import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const rfxFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["RFQ", "RFP", "RFI"]),
  deadline: z.string().min(1, "Deadline is required"),
  budget: z.string().optional(),
  selectedVendors: z.array(z.string()).min(1, "At least one vendor must be selected"),
  bomItems: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  evaluationCriteria: z.string().optional(),
});

type RfxFormData = z.infer<typeof rfxFormSchema>;

interface RfxFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RfxForm({ onClose, onSuccess }: RfxFormProps) {
  const [currentTab, setCurrentTab] = useState("type");
  const queryClient = useQueryClient();

  // Fetch vendors for selection
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Fetch BOMs for selection
  const { data: boms = [] } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });

  const form = useForm<RfxFormData>({
    resolver: zodResolver(rfxFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "RFI",
      deadline: "",
      budget: "",
      selectedVendors: [],
      bomItems: [],
      requirements: "",
      evaluationCriteria: "",
    },
  });

  const createRfxMutation = useMutation({
    mutationFn: async (data: RfxFormData) => {
      return await apiRequest("/api/rfx", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfx"] });
      onSuccess();
      onClose();
    },
  });

  const selectedType = form.watch("type");

  const onSubmit = (data: RfxFormData) => {
    createRfxMutation.mutate(data);
  };

  const tabs = [
    { id: "type", label: "Type Selection" },
    { id: "basic", label: "Basic Info" },
    { id: "vendors", label: "Vendor Selection" },
    ...(selectedType === "RFQ" ? [{ id: "bom", label: "BOM Items" }] : []),
    { id: "requirements", label: selectedType === "RFI" ? "Information Required" : "Requirements" },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Type Selection Tab */}
          {currentTab === "type" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  What type of request would you like to create?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Choose the type that best fits your procurement needs
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* RFI Option */}
                <label className={`relative cursor-pointer rounded-lg border-2 p-6 focus:outline-none ${
                  selectedType === "RFI" 
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}>
                  <input
                    type="radio"
                    value="RFI"
                    {...form.register("type")}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-3xl mb-3">ℹ️</div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Request for Information (RFI)
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Gather information about vendors, capabilities, or market research
                    </p>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      • Information-focused
                      • Market research
                      • Vendor capabilities
                    </div>
                  </div>
                  {selectedType === "RFI" && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>

                {/* RFP Option */}
                <label className={`relative cursor-pointer rounded-lg border-2 p-6 focus:outline-none ${
                  selectedType === "RFP" 
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}>
                  <input
                    type="radio"
                    value="RFP"
                    {...form.register("type")}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-3xl mb-3">📋</div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Request for Proposal (RFP)
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Solicit comprehensive proposals for complex projects or services
                    </p>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      • Solution-focused
                      • Detailed proposals
                      • Evaluation criteria
                    </div>
                  </div>
                  {selectedType === "RFP" && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>

                {/* RFQ Option */}
                <label className={`relative cursor-pointer rounded-lg border-2 p-6 focus:outline-none ${
                  selectedType === "RFQ" 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}>
                  <input
                    type="radio"
                    value="RFQ"
                    {...form.register("type")}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Request for Quote (RFQ)
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get price quotes for specific products or services with detailed specifications
                    </p>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      • Price-focused
                      • Detailed specifications
                      • BOM integration
                    </div>
                  </div>
                  {selectedType === "RFQ" && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>
              </div>

              {/* Type-specific description */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                {selectedType === "RFI" && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">RFI Best Practices:</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Ask specific, focused questions</li>
                      <li>• Research vendor capabilities and experience</li>
                      <li>• Gather market intelligence and benchmarks</li>
                      <li>• Use insights to inform future RFQ/RFP processes</li>
                    </ul>
                  </div>
                )}
                {selectedType === "RFP" && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">RFP Best Practices:</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Define project scope and objectives clearly</li>
                      <li>• Include evaluation criteria and weightings</li>
                      <li>• Specify proposal format and requirements</li>
                      <li>• Set realistic timelines for response and evaluation</li>
                    </ul>
                  </div>
                )}
                {selectedType === "RFQ" && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">RFQ Best Practices:</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Provide detailed specifications and quantities</li>
                      <li>• Include delivery requirements and timelines</li>
                      <li>• Specify evaluation criteria (price, quality, delivery)</li>
                      <li>• Attach BOM items for accurate quoting</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Basic Info Tab */}
          {currentTab === "basic" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Title *
                </label>
                <input
                  type="text"
                  {...form.register("title")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter RFx title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Description *
                </label>
                <textarea
                  {...form.register("description")}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the RFx requirements"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    {...form.register("deadline")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {form.formState.errors.deadline && (
                    <p className="text-sm text-destructive">{form.formState.errors.deadline.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Budget (Optional)
                  </label>
                  <input
                    type="text"
                    {...form.register("budget")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="₹ Budget range"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Vendor Selection Tab */}
          {currentTab === "vendors" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select Vendors</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose vendors to send this RFx to. At least one vendor must be selected.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {(vendors as any[]).map((vendor: any) => (
                  <label
                    key={vendor.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={vendor.id}
                      {...form.register("selectedVendors")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{vendor.category}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              {form.formState.errors.selectedVendors && (
                <p className="text-red-500 text-sm">{form.formState.errors.selectedVendors.message}</p>
              )}
            </div>
          )}

          {/* BOM Items Tab - Only for RFQ */}
          {currentTab === "bom" && selectedType === "RFQ" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">BOM Items (Optional)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select BOM items to include in this RFx.
              </p>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(boms as any[]).map((bom: any) => (
                  <label
                    key={bom.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={bom.id}
                      {...form.register("bomItems")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{bom.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {bom.itemCount} items • Created {new Date(bom.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Requirements Tab - Adapts based on type */}
          {currentTab === "requirements" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {selectedType === "RFI" ? "Information Required" : 
                   selectedType === "RFQ" ? "Detailed Specifications" : 
                   "Project Requirements"}
                </label>
                <textarea
                  {...form.register("requirements")}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    selectedType === "RFI" ? "What specific information do you need from vendors? (capabilities, experience, certifications, etc.)" :
                    selectedType === "RFQ" ? "Provide detailed specifications, quantities, quality requirements, delivery terms, etc." :
                    "Describe the project scope, objectives, deliverables, and technical requirements..."
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {selectedType === "RFI" ? "Response Format" : "Evaluation Criteria"}
                </label>
                <textarea
                  {...form.register("evaluationCriteria")}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    selectedType === "RFI" ? "How should vendors structure their responses? What format do you prefer?" :
                    selectedType === "RFQ" ? "How will quotes be evaluated? (price 40%, quality 30%, delivery 20%, etc.)" :
                    "Describe evaluation criteria and weightings for proposals..."
                  }
                />
              </div>

              {/* Type-specific additional fields */}
              {selectedType === "RFP" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Proposal Format Requirements
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Specify required sections, page limits, presentation format, etc."
                  />
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
                  if (currentIndex > 0) {
                    setCurrentTab(tabs[currentIndex - 1].id);
                  }
                }}
                disabled={currentTab === "type"}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {currentTab !== "requirements" && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
                    if (currentIndex < tabs.length - 1) {
                      setCurrentTab(tabs[currentIndex + 1].id);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRfxMutation.isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createRfxMutation.isPending ? "Creating..." : `Create ${selectedType}`}
              </button>
            </div>
          </div>
        </form>
    </div>
  );
}