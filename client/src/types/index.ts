export interface DashboardStats {
  totalSpend?: number;
  totalVendors: number;
  totalProducts: number;
  totalBoms: number;
  totalRfx: number;
  totalAuctions: number;
  totalPurchaseOrders: number;
  pendingApprovals: number;
  costSavings?: number;
  recentActivity: any[];
}

export interface AuctionBid {
  id: string;
  vendorId: string;
  amount: number;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: string;
  auctionId?: string;
  vendorId?: string;
  amount?: number;
  bid?: AuctionBid;
  message?: string;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
