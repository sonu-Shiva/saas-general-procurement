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
import { Calendar, Clock, FileText, Plus, Search, User, Building2, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { CreateProcurementRequestDialog } from "@/components/create-procurement-request";

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

// CreateProcurementRequestDialog moved to separate component file

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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  
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
    
    const matchesStatus = !statusFilter || request.overallStatus === statusFilter;
    const matchesPriority = !priorityFilter || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Role-based capabilities
  const canCreateRequests = user && ['requester', 'admin'].includes(user.role);
  const canApprove = user && ['request_approver', 'procurement_approver', 'admin'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Procurement Requests</h1>
          <p className="text-muted-foreground">
            Manage procurement requests through the 5-step approval workflow
          </p>
        </div>
        
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="request_approval_pending">Request Approval Pending</SelectItem>
                <SelectItem value="request_approved">Request Approved</SelectItem>
                <SelectItem value="procurement_method_pending">Procurement Method Pending</SelectItem>
                <SelectItem value="procurement_approved">Procurement Approved</SelectItem>
                <SelectItem value="in_procurement">In Procurement</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`card-request-${request.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {request.requestNumber}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge className={priorityColors[request.priority]} data-testid={`badge-priority-${request.priority}`}>
                        {request.priority.toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[request.overallStatus]} data-testid={`badge-status-${request.overallStatus}`}>
                        {request.overallStatus.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {request.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{request.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(request.requestedDeliveryDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">Requester</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(request.createdAt), 'MMM dd')}</span>
                    </div>
                  </div>

                  {request.estimatedBudget && (
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground">Estimated Budget</div>
                      <div className="font-semibold">${request.estimatedBudget.toLocaleString()}</div>
                    </div>
                  )}

                  <ApprovalActions request={request} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}