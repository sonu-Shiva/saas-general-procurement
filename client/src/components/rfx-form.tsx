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
  const [currentTab, setCurrentTab] = useState("basic");
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
      type: "RFQ",
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

  const onSubmit = (data: RfxFormData) => {
    createRfxMutation.mutate(data);
  };

  const tabs = [
    { id: "basic", label: "Basic Info" },
    { id: "vendors", label: "Vendor Selection" },
    { id: "bom", label: "BOM Items" },
    { id: "requirements", label: "Requirements" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create RFx</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
          {/* Basic Info Tab */}
          {currentTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  {...form.register("title")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter RFx title"
                />
                {form.formState.errors.title && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  {...form.register("type")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="RFQ">Request for Quote (RFQ)</option>
                  <option value="RFP">Request for Proposal (RFP)</option>
                  <option value="RFI">Request for Information (RFI)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  {...form.register("description")}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the RFx requirements"
                />
                {form.formState.errors.description && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    {...form.register("deadline")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {form.formState.errors.deadline && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.deadline.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Budget (Optional)
                  </label>
                  <input
                    type="text"
                    {...form.register("budget")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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

          {/* BOM Items Tab */}
          {currentTab === "bom" && (
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

          {/* Requirements Tab */}
          {currentTab === "requirements" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detailed Requirements
                </label>
                <textarea
                  {...form.register("requirements")}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Provide detailed requirements and specifications..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Evaluation Criteria
                </label>
                <textarea
                  {...form.register("evaluationCriteria")}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe how proposals will be evaluated..."
                />
              </div>
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
                disabled={currentTab === "basic"}
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
                {createRfxMutation.isPending ? "Creating..." : "Create RFx"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}