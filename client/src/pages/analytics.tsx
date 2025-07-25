import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart,
  Calendar,
  Download,
  Filter,
  Target,
  Award,
  Clock,
  Package,
  Gavel,
  FileText
} from "lucide-react";

export default function Analytics() {
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["/api/purchase-orders"],
    retry: false,
  });

  const { data: auctions } = useQuery({
    queryKey: ["/api/auctions"],
    retry: false,
  });

  const { data: rfxEvents } = useQuery({
    queryKey: ["/api/rfx"],
    retry: false,
  });

  // Calculate analytics metrics
  const totalSpend = purchaseOrders?.reduce((sum: number, po: any) => 
    sum + parseFloat(po.totalAmount || '0'), 0) || 0;

  const activeVendors = vendors?.filter((v: any) => v.status === 'approved').length || 0;
  const totalVendors = vendors?.length || 0;

  const completedAuctions = auctions?.filter((a: any) => a.status === 'completed').length || 0;
  const totalAuctions = auctions?.length || 0;

  const activeRfx = rfxEvents?.filter((r: any) => r.status === 'active').length || 0;
  const totalRfx = rfxEvents?.length || 0;

  // Mock data for charts (in a real app, this would come from the backend)
  const spendByCategory = [
    { category: "Electronics", amount: 850000, percentage: 35 },
    { category: "Raw Materials", amount: 610000, percentage: 25 },
    { category: "Office Supplies", amount: 365000, percentage: 15 },
    { category: "Industrial", amount: 365000, percentage: 15 },
    { category: "Others", amount: 244000, percentage: 10 },
  ];

  const monthlySpend = [
    { month: "Jan", amount: 180000 },
    { month: "Feb", amount: 230000 },
    { month: "Mar", amount: 200000 },
    { month: "Apr", amount: 280000 },
    { month: "May", amount: 350000 },
    { month: "Jun", amount: 320000 },
  ];

  const vendorPerformance = vendors?.slice(0, 5).map((vendor: any, index: number) => ({
    name: vendor.companyName,
    rating: vendor.performanceScore || (4.5 - index * 0.1),
    orders: Math.floor(Math.random() * 50) + 10,
    onTime: Math.floor(Math.random() * 20) + 80,
  })) || [];

  const savingsData = [
    { method: "Direct PO", savings: 5.2, volume: 45 },
    { method: "RFx", savings: 12.8, volume: 35 },
    { method: "Auction", savings: 18.5, volume: 20 },
  ];

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
                <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
                <p className="text-muted-foreground">Comprehensive insights into your procurement performance</p>
              </div>
              <div className="flex space-x-3">
                <Select defaultValue="6months">
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">Last Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 text-success mr-1" />
                        <span className="text-sm text-success">+12.5%</span>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Cost Savings</p>
                      <p className="text-2xl font-bold">{formatCurrency(340000)}</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 text-success mr-1" />
                        <span className="text-sm text-success">14.2%</span>
                      </div>
                    </div>
                    <Target className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active Vendors</p>
                      <p className="text-2xl font-bold">{activeVendors}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-muted-foreground">of {totalVendors} total</span>
                      </div>
                    </div>
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Avg. PO Cycle</p>
                      <p className="text-2xl font-bold">5.2</p>
                      <div className="flex items-center mt-1">
                        <TrendingDown className="w-3 h-3 text-success mr-1" />
                        <span className="text-sm text-success">days</span>
                      </div>
                    </div>
                    <Clock className="w-8 h-8 text-secondary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
                <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
                <TabsTrigger value="savings">Savings Analysis</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Spend Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        Monthly Spend Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-end justify-between space-x-2">
                        {monthlySpend.map((data, index) => (
                          <div key={data.month} className="flex flex-col items-center flex-1">
                            <div 
                              className="bg-primary rounded-t w-full"
                              style={{ 
                                height: `${(data.amount / Math.max(...monthlySpend.map(m => m.amount))) * 200}px`,
                                minHeight: '20px'
                              }}
                            ></div>
                            <div className="mt-2 text-sm text-muted-foreground">{data.month}</div>
                            <div className="text-xs font-medium">{formatCurrency(data.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Procurement Methods */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Procurement Methods
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-primary rounded-full"></div>
                            <span>Direct PO</span>
                          </div>
                          <span className="font-semibold">45%</span>
                        </div>
                        <Progress value={45} className="h-2" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-secondary rounded-full"></div>
                            <span>RFx Process</span>
                          </div>
                          <span className="font-semibold">35%</span>
                        </div>
                        <Progress value={35} className="h-2" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-accent rounded-full"></div>
                            <span>Auctions</span>
                          </div>
                          <span className="font-semibold">20%</span>
                        </div>
                        <Progress value={20} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Activity Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="text-2xl font-bold">{totalRfx}</p>
                          <p className="text-sm text-muted-foreground">Total RFx</p>
                          <p className="text-xs text-success">{activeRfx} active</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Gavel className="w-8 h-8 text-accent mx-auto mb-2" />
                          <p className="text-2xl font-bold">{totalAuctions}</p>
                          <p className="text-sm text-muted-foreground">Total Auctions</p>
                          <p className="text-xs text-success">{completedAuctions} completed</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <ShoppingCart className="w-8 h-8 text-secondary mx-auto mb-2" />
                          <p className="text-2xl font-bold">{purchaseOrders?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Purchase Orders</p>
                          <p className="text-xs text-success">{formatCurrency(totalSpend)}</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <Users className="w-8 h-8 text-info mx-auto mb-2" />
                          <p className="text-2xl font-bold">{totalVendors}</p>
                          <p className="text-sm text-muted-foreground">Vendors</p>
                          <p className="text-xs text-success">{activeVendors} approved</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Vendor Response Rate</span>
                            <span className="font-semibold">87%</span>
                          </div>
                          <Progress value={87} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>On-time Delivery</span>
                            <span className="font-semibold">92%</span>
                          </div>
                          <Progress value={92} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Budget Compliance</span>
                            <span className="font-semibold">95%</span>
                          </div>
                          <Progress value={95} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Quality Score</span>
                            <span className="font-semibold">89%</span>
                          </div>
                          <Progress value={89} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="spend" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Spend by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Spend by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {spendByCategory.map((category, index) => (
                          <div key={category.category}>
                            <div className="flex justify-between text-sm mb-2">
                              <span>{category.category}</span>
                              <span className="font-semibold">{formatCurrency(category.amount)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Progress value={category.percentage} className="flex-1 h-2" />
                              <span className="text-sm text-muted-foreground w-10">{category.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget vs Actual */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget vs Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{formatCurrency(2400000)}</p>
                          <p className="text-muted-foreground">Total Spend</p>
                          <div className="flex items-center justify-center mt-2">
                            <TrendingDown className="w-4 h-4 text-success mr-1" />
                            <span className="text-success">{formatCurrency(200000)} under budget</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Budget Utilization</span>
                            <span className="font-semibold">83%</span>
                          </div>
                          <Progress value={83} className="h-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-lg font-bold">{formatCurrency(2900000)}</p>
                            <p className="text-sm text-muted-foreground">Budget</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-lg font-bold">{formatCurrency(2400000)}</p>
                            <p className="text-sm text-muted-foreground">Actual</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="vendors" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Vendors */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Award className="w-5 h-5 mr-2" />
                        Top Performing Vendors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {vendorPerformance.map((vendor, index) => (
                          <div key={vendor.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{vendor.name}</p>
                                <p className="text-sm text-muted-foreground">{vendor.orders} orders</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{vendor.rating.toFixed(1)}/5</p>
                              <p className="text-sm text-success">{vendor.onTime}% on-time</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vendor Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Vendor Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-2xl font-bold text-success">{activeVendors}</p>
                            <p className="text-sm text-muted-foreground">Approved</p>
                          </div>
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                            <p className="text-2xl font-bold text-warning">
                              {vendors?.filter((v: any) => v.status === 'pending').length || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Pending</p>
                          </div>
                          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <p className="text-2xl font-bold text-destructive">
                              {vendors?.filter((v: any) => v.status === 'rejected').length || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Rejected</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Approval Rate</p>
                          <Progress value={(activeVendors / totalVendors) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {((activeVendors / totalVendors) * 100).toFixed(1)}% approved
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="savings" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Savings by Method */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Savings by Procurement Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {savingsData.map((method) => (
                          <div key={method.method} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="font-semibold">{method.method}</h3>
                              <Badge variant="secondary">{method.volume}% volume</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-success">{method.savings}%</span>
                              <span className="text-sm text-muted-foreground">avg savings</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cumulative Savings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cumulative Savings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <p className="text-4xl font-bold text-success">{formatCurrency(340000)}</p>
                        <p className="text-muted-foreground">Total savings this year</p>
                        <div className="flex items-center justify-center mt-2">
                          <TrendingUp className="w-4 h-4 text-success mr-1" />
                          <span className="text-success">23% increase from last year</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Q1 2024</span>
                          <span className="font-semibold">{formatCurrency(75000)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Q2 2024</span>
                          <span className="font-semibold">{formatCurrency(95000)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Q3 2024</span>
                          <span className="font-semibold">{formatCurrency(85000)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Q4 2024 (partial)</span>
                          <span className="font-semibold">{formatCurrency(85000)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Compliance Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Documentation Compliance</span>
                            <span className="font-semibold">96%</span>
                          </div>
                          <Progress value={96} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Budget Approval Compliance</span>
                            <span className="font-semibold">98%</span>
                          </div>
                          <Progress value={98} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Vendor Verification</span>
                            <span className="font-semibold">94%</span>
                          </div>
                          <Progress value={94} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Contract Compliance</span>
                            <span className="font-semibold">92%</span>
                          </div>
                          <Progress value={92} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Assessment */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium">Low Risk</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">78% of vendors</p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="font-medium">Medium Risk</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">18% of vendors</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="font-medium">High Risk</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">4% of vendors</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
