import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Activity,
  Users,
  AlertTriangle,
  Filter,
  Calendar,
  Search,
  BarChart,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  userId: string;
  entityType: string;
  entityId?: string;
  action: string;
  description: string;
  previousData?: any;
  newData?: any;
  metadata?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface AuditLogStats {
  totalActions: number;
  criticalEvents: number;
  securityEvents: number;
  activeUsers: number;
  topActions: Array<{ action: string; count: number }>;
  recentActivities: AuditLog[];
}

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    userId: "",
    entityType: "",
    action: "",
    severity: "",
    startDate: "",
    endDate: "",
    search: "",
    timeRange: "day",
  });

  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
  });

  // Fetch audit logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: [
      '/api/audit-logs',
      filters.userId,
      filters.entityType,
      filters.action,
      filters.severity,
      filters.startDate,
      filters.endDate,
      pagination.limit,
      pagination.offset,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'search' && key !== 'timeRange') {
          params.append(key, value);
        }
      });
      
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      return response.json();
    },
  });

  // Fetch audit statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/audit-logs/stats', filters.timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/audit-logs/stats?timeRange=${filters.timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit statistics');
      }
      return response.json();
    },
  }) as { data: AuditLogStats | undefined; isLoading: boolean; refetch: () => void };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination({ limit: 50, offset: 0 }); // Reset pagination
  };

  const handleRefresh = () => {
    refetchLogs();
    refetchStats();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const statsCards = [
    {
      title: "Total Actions",
      value: stats?.totalActions || 0,
      icon: Activity,
      color: "text-blue-600",
    },
    {
      title: "Critical Events",
      value: stats?.criticalEvents || 0,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Active Users",
      value: stats?.activeUsers || 0,
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Security Events",
      value: stats?.securityEvents || 0,
      icon: Shield,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="audit-logs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Audit Logs
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Monitor system activities and security events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.timeRange}
            onValueChange={(value) => handleFilterChange("timeRange", value)}
          >
            <SelectTrigger className="w-32" data-testid="select-timerange">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={stat.title} data-testid={`stat-card-${index}`}>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <stat.icon className={cn("w-8 h-8", stat.color)} />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card data-testid="filters-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Entity Type
              </label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => handleFilterChange("entityType", value)}
              >
                <SelectTrigger data-testid="select-entity-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="bom">BOM</SelectItem>
                  <SelectItem value="rfx">RFx</SelectItem>
                  <SelectItem value="auction">Auction</SelectItem>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  <SelectItem value="user_management">User Management</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Action
              </label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange("action", value)}
              >
                <SelectTrigger data-testid="select-action">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Severity
              </label>
              <Select
                value={filters.severity}
                onValueChange={(value) => handleFilterChange("severity", value)}
              >
                <SelectTrigger data-testid="select-severity">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                User ID
              </label>
              <Input
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
                data-testid="input-userid"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card data-testid="logs-table-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs && logs.length > 0 ? (
                    logs.map((log: AuditLog) => (
                      <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>{log.userId}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.entityType}</div>
                            {log.entityId && (
                              <div className="text-sm text-muted-foreground truncate max-w-24">
                                {log.entityId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">
                          {log.description}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Shield className="w-8 h-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No audit logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {logs && logs.length > 0 && (
            <div className="flex items-center justify-between mt-4" data-testid="pagination-controls">
              <div className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1} to{" "}
                {Math.min(pagination.offset + pagination.limit, pagination.offset + logs.length)} of results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.offset === 0}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      offset: Math.max(0, prev.offset - prev.limit),
                    }))
                  }
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logs.length < pagination.limit}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      offset: prev.offset + prev.limit,
                    }))
                  }
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}