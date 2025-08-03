import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DashboardCards from "@/components/dashboard-cards";
import AiChat from "@/components/ai-chat";
import AuctionWidget from "@/components/auction-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  CheckCircle, 
  Gavel, 
  Clock,
  TrendingUp,
  Users,
  AlertTriangle
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      // User will be redirected to login form automatically by the App component
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentRfx } = useQuery({
    queryKey: ["/api/rfx"],
    retry: false,
  });

  const { data: activeAuctions } = useQuery({
    queryKey: ["/api/auctions", { status: "live" }],
    retry: false,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["/api/approvals"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Procurement Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.firstName || "User"}! Here's your procurement overview.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-4">
                <Button className="bg-primary hover:bg-primary/90">
                  <FileText className="w-4 h-4 mr-2" />
                  New RFx
                </Button>
                <Button className="bg-secondary hover:bg-secondary/90">
                  <Gavel className="w-4 h-4 mr-2" />
                  Create Auction
                </Button>
                <Button className="bg-accent hover:bg-accent/90">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Direct PO
                </Button>
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  AI Vendor Discovery
                </Button>
              </div>
            </div>

            {/* Dashboard Cards */}
            <DashboardCards stats={dashboardStats} isLoading={statsLoading || !dashboardStats} />

            {/* Bento Grid Layout */}
            <div className="bento-grid mt-8">
              {/* Recent Activities */}
              <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">RFQ-2025-001 Published</p>
                          <p className="text-sm text-muted-foreground">
                            Steel pipes procurement - 12 vendors invited
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">Vendor Approved</p>
                          <p className="text-sm text-muted-foreground">
                            TechCorp Solutions - Electronics category
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">4 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                          <Gavel className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">Auction Completed</p>
                          <p className="text-sm text-muted-foreground">
                            Office supplies - 15% cost savings achieved
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">6 hours ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spend Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-container">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mb-4">
                          <div className="w-32 h-32 mx-auto relative">
                            <svg className="w-32 h-32 progress-ring">
                              <circle 
                                cx="64" 
                                cy="64" 
                                r="40" 
                                stroke="currentColor" 
                                strokeWidth="8" 
                                fill="none" 
                                className="text-muted"
                              />
                              <circle 
                                cx="64" 
                                cy="64" 
                                r="40" 
                                stroke="currentColor" 
                                strokeWidth="8" 
                                fill="none" 
                                className="progress-ring-circle text-primary"
                                style={{ strokeDashoffset: 62.8 }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-2xl font-bold">75%</p>
                                <p className="text-sm text-muted-foreground">Budget Used</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-center">
                            <span className="status-dot bg-primary"></span>
                            <span className="text-muted-foreground">Direct PO: 45%</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="status-dot bg-secondary"></span>
                            <span className="text-muted-foreground">RFx: 35%</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="status-dot bg-accent"></span>
                            <span className="text-muted-foreground">Auction: 20%</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="status-dot bg-muted-foreground"></span>
                            <span className="text-muted-foreground">Others: 5%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Assistant */}
              <AiChat />

              {/* Active Auctions */}
              <AuctionWidget auctions={activeAuctions} />

              {/* Vendor Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Vendors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          TC
                        </div>
                        <div>
                          <p className="font-medium">TechCorp Solutions</p>
                          <p className="text-sm text-muted-foreground">Electronics & IT</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">4.9/5</p>
                        <p className="text-sm text-muted-foreground">98% on-time</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
                          MI
                        </div>
                        <div>
                          <p className="font-medium">MetalCorp India</p>
                          <p className="text-sm text-muted-foreground">Raw Materials</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">4.8/5</p>
                        <p className="text-sm text-muted-foreground">95% on-time</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                          OS
                        </div>
                        <div>
                          <p className="font-medium">OfficeMax Supplies</p>
                          <p className="text-sm text-muted-foreground">Office Supplies</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">4.7/5</p>
                        <p className="text-sm text-muted-foreground">92% on-time</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-4 border-destructive bg-destructive/10 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">High-Value PO - $150,000</p>
                          <p className="text-sm text-muted-foreground">Industrial equipment purchase</p>
                          <Badge variant="destructive" className="mt-1">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Urgent - 2 days overdue
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="bg-success hover:bg-success/90">
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-warning bg-warning/10 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Vendor Registration</p>
                          <p className="text-sm text-muted-foreground">New supplier - SteelTech Solutions</p>
                          <Badge variant="secondary" className="mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending for 1 day
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="bg-success hover:bg-success/90">
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent RFx Status Table */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Recent RFx Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">RFx ID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vendors</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Deadline</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-3 px-4 text-sm">RFQ-2025-001</td>
                        <td className="py-3 px-4 text-sm">Steel Pipes Procurement</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-blue-100 text-blue-800">RFQ</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">12 invited / 8 responded</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">Jan 15, 2025</td>
                        <td className="py-3 px-4">
                          <Button variant="link" size="sm">View</Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm">RFP-2025-002</td>
                        <td className="py-3 px-4 text-sm">IT Infrastructure Setup</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-purple-100 text-purple-800">RFP</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">6 invited / 4 responded</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-yellow-100 text-yellow-800">Evaluation</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">Jan 20, 2025</td>
                        <td className="py-3 px-4">
                          <Button variant="link" size="sm">Evaluate</Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm">RFI-2025-003</td>
                        <td className="py-3 px-4 text-sm">Logistics Service Provider</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-orange-100 text-orange-800">RFI</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">15 invited / 12 responded</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">Completed</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">Jan 10, 2025</td>
                        <td className="py-3 px-4">
                          <Button variant="link" size="sm">Create RFP</Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
