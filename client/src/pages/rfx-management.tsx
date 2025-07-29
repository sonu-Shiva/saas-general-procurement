import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import RfxForm from "@/components/rfx-form";

export default function RfxManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: rfxEvents = [], isLoading } = useQuery({
    queryKey: ["/api/rfx"],
    retry: false,
  });

  console.log("RfxManagement render - rfxEvents:", rfxEvents, "isLoading:", isLoading);
  
  // Ensure rfxEvents is always an array and define filteredRfxEvents
  const rfxEventsArray = Array.isArray(rfxEvents) ? rfxEvents : [];
  
  const filteredRfxEvents = rfxEventsArray.filter((rfx: any) => {
    const matchesSearch = rfx.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rfx.scope?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || rfx.status === statusFilter;
    const matchesType = typeFilter === "all" || rfx.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">RFx Management</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Manage Request for Quotes, Proposals, and Information
            </p>
          </div>
          <button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>Create Request</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-blue-600">{rfxEventsArray.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total RFx</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-green-600">
              {rfxEventsArray.filter((r: any) => r.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-yellow-600">
              {rfxEventsArray.filter((r: any) => r.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Draft</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-gray-600">
              {rfxEventsArray.filter((r: any) => r.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search RFx by title, description, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="RFI">RFI</option>
              <option value="RFP">RFP</option>
              <option value="RFQ">RFQ</option>
            </select>
          </div>
        </div>

        {/* RFx List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading RFx events...</p>
            </div>
          ) : filteredRfxEvents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No RFx Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {rfxEventsArray.length === 0 
                  ? "Create your first RFx to get started with vendor management."
                  : "No RFx match your current filters. Try adjusting your search criteria."
                }
              </p>
              <button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Create First Request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRfxEvents.map((rfx: any) => (
                <div key={rfx.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{rfx.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rfx.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          rfx.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          rfx.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {rfx.status}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                          {rfx.type}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{rfx.scope}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <span>📅 Deadline: {rfx.dueDate ? new Date(rfx.dueDate).toLocaleDateString() : 'Not set'}</span>
                        <span>💰 Budget: {rfx.budget ? `₹${rfx.budget}` : 'Not specified'}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        View
                      </button>
                      <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 font-medium">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create RFx Dialog */}
        {isCreateDialogOpen && (
          <RfxForm
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={() => {
              console.log("RFx created successfully!");
            }}
          />
        )}
      </div>
    </div>
  );
}