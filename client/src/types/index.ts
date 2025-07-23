export interface DashboardStats {
  totalSpend: number;
  activeVendors: number;
  pendingApprovals: number;
  costSavings: number;
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
