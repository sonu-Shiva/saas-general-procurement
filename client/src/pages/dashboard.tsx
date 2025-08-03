import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import DashboardCards from "@/components/dashboard-cards";
import AiChat from "@/components/ai-chat";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Gavel,
  CheckCircle,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();

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
    <div className="p-6">
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

      {/* Recent RFx Status Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent RFx Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-sm font-medium">RFx ID</th>
                  <th className="py-3 px-4 text-sm font-medium">Title</th>
                  <th className="py-3 px-4 text-sm font-medium">Type</th>
                  <th className="py-3 px-4 text-sm font-medium">Participants</th>
                  <th className="py-3 px-4 text-sm font-medium">Status</th>
                  <th className="py-3 px-4 text-sm font-medium">Deadline</th>
                  <th className="py-3 px-4 text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">RFQ-2025-001</td>
                  <td className="py-3 px-4 text-sm">Steel Pipes Procurement</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-800">RFQ</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">12 invited / 8 responded</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">Jan 25, 2025</td>
                  <td className="py-3 px-4">
                    <Button variant="link" size="sm">Review</Button>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">RFQ-2025-002</td>
                  <td className="py-3 px-4 text-sm">Office Equipment</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-800">RFQ</Badge>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Widget */}
      <div className="mt-8">
        <AiChat />
      </div>
    </div>
  );
}