import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import RfxForm from "@/components/rfx-form";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Eye,
  Edit,
  Send,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  Bot,
  MessageSquare,
  Target,
  TrendingUp
} from "lucide-react";
import type { RfxEvent } from "@shared/schema";

export default function RfxManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const { data: rfxEvents = [], isLoading } = useQuery<RfxEvent[]>({
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
            <span>Create RFx</span>
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
              <option value="RFQ">RFQ</option>
              <option value="RFP">RFP</option>
              <option value="RFI">RFI</option>
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
                Create First RFx
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
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{rfx.description}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <span>📅 Deadline: {new Date(rfx.deadline).toLocaleDateString()}</span>
                        <span>👥 {rfx.vendorCount} vendors</span>
                        <span>💰 Budget: {rfx.budget || 'Not specified'}</span>
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

  const filteredRfxEvents = rfxEvents.filter((rfx: RfxEvent) => {
    const matchesSearch = rfx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rfx.referenceNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || rfx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || rfx.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "closed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "rfi":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "rfp":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "rfq":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">RFx Management</h1>
                <p className="text-slate-600 dark:text-slate-300">Manage Request for Information, Proposals, and Quotations</p>
              </div>
              <div className="flex space-x-3">
                <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                      <Bot className="w-4 h-4 mr-2" />
                      AI RFx Creator
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Bot className="w-5 h-5 mr-2 text-primary" />
                        AI-Powered RFx Creation
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">AI Assistant</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                          Describe your procurement need, and I'll draft a comprehensive RFx document for you.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            What do you need to procure?
                          </label>
                          <Input
                            placeholder="e.g., 'Office furniture for 50 employees', 'Industrial pumps with 5-year warranty', 'IT infrastructure for new office'"
                            className="text-lg py-3"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              RFx Type
                            </label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rfi">RFI - Request for Information</SelectItem>
                                <SelectItem value="rfp">RFP - Request for Proposal</SelectItem>
                                <SelectItem value="rfq">RFQ - Request for Quotation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Timeline
                            </label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timeline" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="urgent">Urgent (1-3 days)</SelectItem>
                                <SelectItem value="standard">Standard (1-2 weeks)</SelectItem>
                                <SelectItem value="extended">Extended (2-4 weeks)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button className="bg-primary hover:bg-primary/90">
                            <Bot className="w-4 h-4 mr-2" />
                            Generate RFx
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create RFx
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New RFx</DialogTitle>
                    </DialogHeader>
                    <RfxForm onClose={() => setIsCreateDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total RFx</p>
                      <p className="text-2xl font-bold">{rfxEvents.length || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active</p>
                      <p className="text-2xl font-bold text-success">
                        {rfxEvents.filter((r: RfxEvent) => r.status === 'active' || r.status === 'published').length || 0}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Draft</p>
                      <p className="text-2xl font-bold text-warning">
                        {rfxEvents.filter((r: RfxEvent) => r.status === 'draft').length || 0}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">This Month</p>
                      <p className="text-2xl font-bold">
                        {rfxEvents.filter((r: RfxEvent) => {
                          const rfxDate = new Date(r.createdAt || '');
                          const now = new Date();
                          return rfxDate.getMonth() === now.getMonth() && rfxDate.getFullYear() === now.getFullYear();
                        }).length || 0}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-secondary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search RFx events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="rfi">RFI</SelectItem>
                        <SelectItem value="rfp">RFP</SelectItem>
                        <SelectItem value="rfq">RFQ</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RFx Events Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : filteredRfxEvents && filteredRfxEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">RFx Details</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Responses</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Due Date</th>
                          <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRfxEvents.map((rfx: RfxEvent) => (
                          <tr key={rfx.id} className="hover:bg-muted/50">
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white font-semibold">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-medium">{rfx.title}</p>
                                  <p className="text-sm text-muted-foreground">{rfx.referenceNo}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <Badge className={getTypeColor(rfx.type)}>
                                {rfx.type?.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <Badge className={getStatusColor(rfx.status || 'draft')}>
                                <span className="capitalize">{rfx.status}</span>
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">0 responses</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm">
                                {rfx.dueDate ? (
                                  <>
                                    <p>{new Date(rfx.dueDate).toLocaleDateString()}</p>
                                    <p className="text-muted-foreground">
                                      {Math.ceil((new Date(rfx.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">No due date</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                {rfx.status === "draft" && (
                                  <Button size="sm" variant="outline">
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                {(rfx.status === "draft" || rfx.status === "published") && (
                                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                                    <Send className="w-3 h-3 mr-1" />
                                    Publish
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white dark:bg-slate-800">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No RFx events found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your search criteria or filters"
                        : "Start by creating your first RFx event to get started with procurement requests"
                      }
                    </p>
                    {!searchQuery && typeFilter === "all" && statusFilter === "all" && (
                      <div className="flex justify-center space-x-3">
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Create RFx
                        </Button>
                        <Button variant="outline" onClick={() => setIsAiDialogOpen(true)}>
                          <Bot className="w-4 h-4 mr-2" />
                          Try AI Creator
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
