import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, FileText, Plus, Search, User, Building2, CheckCircle, XCircle, AlertCircle, Package, Eye, Trash2, Filter, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { CreateProcurementRequestDialog } from "@/components/create-procurement-request";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface ProcurementRequest {
  id: string;
  requestNumber: string;
  title: string;
  description?: string;
  department: string;
  bomId: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedBy: string;
  requestedDeliveryDate: string;
  justification?: string;
  estimatedBudget?: number;
  requestApprovalStatus: "pending" | "approved" | "rejected";
  currentRequestApprover?: string;
  procurementMethod?: "rfx" | "auction" | "direct";
  procurementMethodStatus: "pending" | "approved" | "rejected";
  currentProcurementApprover?: string;
  overallStatus: "draft" | "request_approval_pending" | "request_approved" | "procurement_method_pending" | "procurement_approved" | "in_procurement" | "completed" | "rejected";
  createdAt: string;
  updatedAt: string;
}

interface BOM {
  id: string;
  name: string;
  version: string;
  category?: string;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  request_approval_pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  request_approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  procurement_method_pending: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  procurement_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  in_procurement: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function ApprovalActions({ request }: { request: ProcurementRequest }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState("");
  const [showComments, setShowComments] = useState(false);

  const canApprove = user && ['request_approver', 'procurement_approver', 'admin'].includes(user.role);
  
  const approveMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      return apiRequest(`/api/approval-requests/${request.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement-requests'] });
      toast({
        title: "Success",
        description: "Request processed successfully",
      });
      setComments("");
      setShowComments(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
    },
  });

  if (!canApprove) return null;

  const needsApproval = (
    (user.role === 'request_approver' && request.requestApprovalStatus === 'pending') ||
    (user.role === 'procurement_approver' && request.procurementMethodStatus === 'pending')
  );

  if (!needsApproval) return null;

  return (
    <div className="space-y-2">
      {!showComments ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900"
            onClick={() => setShowComments(true)}
            data-testid={`button-approve-${request.id}`}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900"
            onClick={() => setShowComments(true)}
            data-testid={`button-reject-${request.id}`}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-2 p-3 border rounded">
          <Label htmlFor="comments">Comments (Optional)</Label>
          <Textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add approval comments..."
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => approveMutation.mutate('approve')}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => approveMutation.mutate('reject')}
              disabled={approveMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowComments(false);
                setComments("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProcurementRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch procurement requests
  const { data: requests = [], isLoading } = useQuery<ProcurementRequest[]>({
    queryKey: ['/api/procurement-requests'],
  });

  // Filter requests based on search and filters
  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || request.overallStatus === statusFilter;
    const matchesPriority = !priorityFilter || priorityFilter === "all" || request.priority === priorityFilter;
    const matchesDepartment = !departmentFilter || departmentFilter === "all" || request.department === departmentFilter;
    
    // Date range filtering
    let matchesDateRange = true;
    if (fromDate) {
      const requestDate = parseISO(request.createdAt);
      matchesDateRange = matchesDateRange && requestDate >= fromDate;
    }
    if (toDate) {
      const requestDate = parseISO(request.createdAt);
      matchesDateRange = matchesDateRange && requestDate <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDepartment && matchesDateRange;
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(requests.map(r => r.department).filter(Boolean)));

  // Role-based capabilities
  const canCreateRequests = user && ['requester', 'admin'].includes(user.role);
  const canApprove = user && ['request_approver', 'procurement_approver', 'admin'].includes(user.role);
  const isRequester = user && user.role === 'requester';

  // Withdraw request mutation
  const withdrawMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest(`/api/procurement-requests/${requestId}/withdraw`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement-requests'] });
      toast({
        title: "Success",
        description: "Request withdrawn successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw request",
        variant: "destructive",
      });
    },
  });

  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isRequester ? "My Requests" : "Procurement Requests"}
          </h1>
          <p className="text-muted-foreground">
            {isRequester 
              ? "Track and manage your procurement requests"
              : "Manage procurement requests through the 5-step approval workflow"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {isRequester && (
            <div className="flex gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                data-testid="button-table-view"
              >
                Table
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
                data-testid="button-cards-view"
              >
                Cards
              </Button>
            </div>
          )}
          {canCreateRequests && (
            <CreateProcurementRequestDialog
              trigger={
                <Button data-testid="button-create-request">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Request
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search PR#, title, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="request_approval_pending">Submitted</SelectItem>
                  <SelectItem value="request_approved">Request Approved</SelectItem>
                  <SelectItem value="procurement_method_pending">Procurement Pending</SelectItem>
                  <SelectItem value="procurement_approved">Procurement Approved</SelectItem>
                  <SelectItem value="in_procurement">In Procurement</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div>
              <Label htmlFor="department-filter">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger id="department-filter">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-2">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      disabled={(date) => date > new Date() || (toDate ? date > toDate : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground self-center">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-2">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      disabled={(date) => date > new Date() || (fromDate ? date < fromDate : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate(undefined);
                    setToDate(undefined);
                  }}
                  className="h-6 px-2 text-xs mt-1"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Display */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PR#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted On</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead>Need By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }, (_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-32"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-24"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-24"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-24"></div></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded w-16"></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
            <p className="text-muted-foreground mb-4">
              {requests.length === 0 
                ? "No procurement requests have been created yet."
                : "No requests match your current filters."
              }
            </p>
            {canCreateRequests && requests.length === 0 && (
              <CreateProcurementRequestDialog
                trigger={
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Request
                  </Button>
                }
              />
            )}
          </Card>
        ) : (
          <>
            {/* Table View for Requesters */}
            {isRequester && viewMode === "table" && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PR#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted On</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead>Need By</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium" data-testid={`pr-number-${request.id}`}>
                            {request.requestNumber}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`pr-title-${request.id}`}>
                            {request.title}
                          </TableCell>
                          <TableCell data-testid={`pr-department-${request.id}`}>
                            {request.department}
                          </TableCell>
                          <TableCell data-testid={`pr-status-${request.id}`}>
                            <Badge className={statusColors[request.overallStatus]}>
                              {request.overallStatus === 'request_approval_pending' 
                                ? 'SUBMITTED' 
                                : request.overallStatus.replace(/_/g, ' ').toUpperCase()
                              }
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`pr-submitted-${request.id}`}>
                            {format(parseISO(request.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell data-testid={`pr-approver-${request.id}`}>
                            {request.currentRequestApprover || request.currentProcurementApprover || 'Pending'}
                          </TableCell>
                          <TableCell data-testid={`pr-needby-${request.id}`}>
                            {format(parseISO(request.requestedDeliveryDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-view-${request.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {request.overallStatus === 'request_approval_pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => withdrawMutation.mutate(request.id)}
                                  disabled={withdrawMutation.isPending}
                                  data-testid={`button-withdraw-${request.id}`}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Cards View */}
            {(!isRequester || viewMode === "cards") && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{request.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {request.requestNumber} • {request.department}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 flex-col items-end">
                          <Badge className={priorityColors[request.priority]}>
                            {request.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>Need by: {format(parseISO(request.requestedDeliveryDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="w-4 h-4 mr-1" />
                          <span>Requested by: {request.requestedBy}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>Created: {format(parseISO(request.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Badge className={statusColors[request.overallStatus]}>
                          {request.overallStatus.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <ApprovalActions request={request} />

                      {request.description && (
                        <div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {request.description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}