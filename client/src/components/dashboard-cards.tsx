import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import type { DashboardStats } from "@/types";

interface DashboardCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
  userRole?: string;
}

export default function DashboardCards({ stats, isLoading, userRole }: DashboardCardsProps) {
  // Role-based card filtering
  const getVisibleCards = (role: string | undefined) => {
    const allCards = [
      { key: 'totalVendors', roles: ['sourcing_exec', 'sourcing_manager', 'admin'] },
      { key: 'totalProducts', roles: ['sourcing_exec', 'department_requester', 'vendor', 'admin'] },
      { key: 'totalPOs', roles: ['sourcing_exec', 'sourcing_manager', 'admin'] },
      { key: 'totalRfx', roles: ['sourcing_exec', 'sourcing_manager'] }
    ];
    
    if (!role) return allCards.map(card => card.key);
    return allCards.filter(card => card.roles.includes(role)).map(card => card.key);
  };
  
  const visibleCards = getVisibleCards(userRole);
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 1000000) {
      return `₹${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />;
      case 'down':
        return <ArrowDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral', isPositive: boolean = true) => {
    if (trend === 'neutral') return 'text-muted-foreground';
    const color = isPositive ? 'text-success' : 'text-destructive';
    return (trend === 'up') === isPositive ? color : (isPositive ? 'text-destructive' : 'text-success');
  };

  // Mock trend data (in a real app, this would come from the API)
  const trends = {
    totalSpend: { direction: 'up' as const, percentage: 12.5, isPositive: false },
    activeVendors: { direction: 'up' as const, percentage: 8.3, isPositive: true },
    pendingApprovals: { direction: 'down' as const, percentage: 15.2, isPositive: true },
    costSavings: { direction: 'up' as const, percentage: 23.1, isPositive: true },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Spend */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
              <p className="text-2xl font-bold text-foreground">
                {stats ? formatCurrency((stats as any).totalSpend || 0) : '₹0'}
              </p>
              <div className={`flex items-center mt-1 ${getTrendColor(trends.totalSpend.direction, trends.totalSpend.isPositive)}`}>
                {getTrendIcon(trends.totalSpend.direction)}
                <span className="text-sm ml-1">
                  {trends.totalSpend.percentage}% from last month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 text-primary flex items-center justify-center font-bold text-lg">₹</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Vendors */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Vendors</p>
              <p className="text-2xl font-bold text-foreground">
                {(stats as any)?.totalVendors || 0}
              </p>
              <div className={`flex items-center mt-1 ${getTrendColor(trends.activeVendors.direction, trends.activeVendors.isPositive)}`}>
                {getTrendIcon(trends.activeVendors.direction)}
                <span className="text-sm ml-1">
                  +8 new this month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">
                {(stats as any)?.pendingApprovals || 0}
              </p>
              <div className="flex items-center mt-1">
                {stats && stats.pendingApprovals > 5 ? (
                  <Badge variant="destructive" className="text-xs">
                    {Math.min(5, stats.pendingApprovals)} urgent
                  </Badge>
                ) : (
                  <div className={`flex items-center ${getTrendColor(trends.pendingApprovals.direction, trends.pendingApprovals.isPositive)}`}>
                    {getTrendIcon(trends.pendingApprovals.direction)}
                    <span className="text-sm ml-1">
                      {trends.pendingApprovals.percentage}% decrease
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Savings */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cost Savings</p>
              <p className="text-2xl font-bold text-foreground">
                {stats ? formatCurrency(stats.costSavings || 340000) : '₹340K'}
              </p>
              <div className={`flex items-center mt-1 ${getTrendColor(trends.costSavings.direction, trends.costSavings.isPositive)}`}>
                {getTrendIcon(trends.costSavings.direction)}
                <span className="text-sm ml-1">
                  14.2% vs budget
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
