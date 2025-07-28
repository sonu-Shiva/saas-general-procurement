import {
  users,
  vendors,
  products,
  boms,
  bomItems,
  rfxEvents,
  rfxInvitations,
  rfxResponses,
  auctions,
  auctionParticipants,
  bids,
  purchaseOrders,
  poLineItems,
  approvals,
  notifications,
  organizations,
  type User,
  type UpsertUser,
  type Vendor,
  type InsertVendor,
  type Product,
  type InsertProduct,
  type Bom,
  type InsertBom,
  type BomItem,
  type InsertBomItem,
  type RfxEvent,
  type InsertRfxEvent,
  type RfxInvitation,
  type InsertRfxInvitation,
  type RfxResponse,
  type InsertRfxResponse,
  type Auction,
  type InsertAuction,
  type AuctionParticipant,
  type InsertAuctionParticipant,
  type Bid,
  type InsertBid,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PoLineItem,
  type InsertPoLineItem,
  type Approval,
  type InsertApproval,
  type Notification,
  type InsertNotification,
  type Organization,
  type InsertOrganization,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  
  // Vendor operations
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendors(filters?: { status?: string; category?: string; search?: string }): Promise<Vendor[]>;
  updateVendor(id: string, updates: Partial<InsertVendor>): Promise<Vendor>;
  
  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: string): Promise<Product | undefined>;
  getProducts(filters?: { category?: string; search?: string; isActive?: boolean }): Promise<Product[]>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  
  // BOM operations
  createBom(bom: InsertBom): Promise<Bom>;
  getBom(id: string): Promise<Bom | undefined>;
  getBoms(createdBy?: string): Promise<Bom[]>;
  createBomItem(bomItem: InsertBomItem): Promise<BomItem>;
  getBomItems(bomId: string): Promise<BomItem[]>;
  
  // RFx operations
  createRfxEvent(rfx: InsertRfxEvent): Promise<RfxEvent>;
  getRfxEvent(id: string): Promise<RfxEvent | undefined>;
  getRfxEvents(filters?: { status?: string; type?: string; createdBy?: string }): Promise<RfxEvent[]>;
  updateRfxEvent(id: string, updates: Partial<InsertRfxEvent>): Promise<RfxEvent>;
  
  createRfxInvitation(invitation: InsertRfxInvitation): Promise<RfxInvitation>;
  getRfxInvitations(rfxId: string): Promise<RfxInvitation[]>;
  
  createRfxResponse(response: InsertRfxResponse): Promise<RfxResponse>;
  getRfxResponses(rfxId: string): Promise<RfxResponse[]>;
  
  // Auction operations
  createAuction(auction: InsertAuction): Promise<Auction>;
  getAuction(id: string): Promise<Auction | undefined>;
  getAuctions(filters?: { status?: string; createdBy?: string }): Promise<Auction[]>;
  updateAuction(id: string, updates: Partial<InsertAuction>): Promise<Auction>;
  
  addAuctionParticipant(participant: InsertAuctionParticipant): Promise<AuctionParticipant>;
  getAuctionParticipants(auctionId: string): Promise<AuctionParticipant[]>;
  
  createBid(bid: InsertBid): Promise<Bid>;
  getBids(auctionId: string): Promise<Bid[]>;
  getLatestBid(auctionId: string): Promise<Bid | undefined>;
  
  // Purchase Order operations
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrders(filters?: { status?: string; vendorId?: string; createdBy?: string }): Promise<PurchaseOrder[]>;
  updatePurchaseOrder(id: string, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  
  createPoLineItem(lineItem: InsertPoLineItem): Promise<PoLineItem>;
  getPoLineItems(poId: string): Promise<PoLineItem[]>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  getApprovals(approverId: string): Promise<Approval[]>;
  updateApproval(id: string, updates: Partial<InsertApproval>): Promise<Approval>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // Dashboard analytics
  getDashboardStats(userId: string): Promise<{
    totalSpend: number;
    activeVendors: number;
    pendingApprovals: number;
    costSavings: number;
  }>;
  
  // AI/Search operations
  searchVendors(query: string, filters?: { location?: string; category?: string; certifications?: string[] }): Promise<Vendor[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Organization operations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(org).returning();
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }
  
  // Vendor operations
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getVendors(filters?: { status?: string; category?: string; search?: string }): Promise<Vendor[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(vendors.status, filters.status as any));
    }
    
    if (filters?.search) {
      conditions.push(like(vendors.companyName, `%${filters.search}%`));
    }
    
    return await db
      .select()
      .from(vendors)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vendors.createdAt));
  }

  async updateVendor(id: string, updates: Partial<InsertVendor>): Promise<Vendor> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }
  
  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(filters?: { category?: string; search?: string; isActive?: boolean }): Promise<Product[]> {
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }
    
    if (filters?.search) {
      conditions.push(like(products.itemName, `%${filters.search}%`));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    }
    
    return await db
      .select()
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt));
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }
  
  // BOM operations
  async createBom(bom: InsertBom): Promise<Bom> {
    const [newBom] = await db.insert(boms).values(bom).returning();
    return newBom;
  }

  async getBom(id: string): Promise<Bom | undefined> {
    const [bom] = await db.select().from(boms).where(eq(boms.id, id));
    return bom;
  }

  async getBoms(createdBy?: string): Promise<Bom[]> {
    return await db
      .select()
      .from(boms)
      .where(createdBy ? eq(boms.createdBy, createdBy) : undefined)
      .orderBy(desc(boms.createdAt));
  }

  async createBomItem(bomItem: InsertBomItem): Promise<BomItem> {
    const [newBomItem] = await db.insert(bomItems).values(bomItem).returning();
    return newBomItem;
  }

  async getBomItems(bomId: string): Promise<BomItem[]> {
    return await db.select().from(bomItems).where(eq(bomItems.bomId, bomId));
  }

  async updateBom(id: string, updates: Partial<InsertBom>): Promise<Bom> {
    const [bom] = await db
      .update(boms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(boms.id, id))
      .returning();
    return bom;
  }

  async deleteBomItems(bomId: string): Promise<void> {
    await db.delete(bomItems).where(eq(bomItems.bomId, bomId));
  }
  
  // RFx operations
  async createRfxEvent(rfx: InsertRfxEvent): Promise<RfxEvent> {
    const [newRfx] = await db.insert(rfxEvents).values(rfx).returning();
    return newRfx;
  }

  async getRfxEvent(id: string): Promise<RfxEvent | undefined> {
    const [rfx] = await db.select().from(rfxEvents).where(eq(rfxEvents.id, id));
    return rfx;
  }

  async getRfxEvents(filters?: { status?: string; type?: string; createdBy?: string }): Promise<RfxEvent[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(rfxEvents.status, filters.status as any));
    }
    
    if (filters?.type) {
      conditions.push(eq(rfxEvents.type, filters.type as any));
    }
    
    if (filters?.createdBy) {
      conditions.push(eq(rfxEvents.createdBy, filters.createdBy));
    }
    
    return await db
      .select()
      .from(rfxEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(rfxEvents.createdAt));
  }

  async updateRfxEvent(id: string, updates: Partial<InsertRfxEvent>): Promise<RfxEvent> {
    const [rfx] = await db
      .update(rfxEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rfxEvents.id, id))
      .returning();
    return rfx;
  }

  async createRfxInvitation(invitation: InsertRfxInvitation): Promise<RfxInvitation> {
    const [newInvitation] = await db.insert(rfxInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getRfxInvitations(rfxId: string): Promise<RfxInvitation[]> {
    return await db.select().from(rfxInvitations).where(eq(rfxInvitations.rfxId, rfxId));
  }

  async createRfxResponse(response: InsertRfxResponse): Promise<RfxResponse> {
    const [newResponse] = await db.insert(rfxResponses).values(response).returning();
    return newResponse;
  }

  async getRfxResponses(rfxId: string): Promise<RfxResponse[]> {
    return await db.select().from(rfxResponses).where(eq(rfxResponses.rfxId, rfxId));
  }
  
  // Auction operations
  async createAuction(auction: InsertAuction): Promise<Auction> {
    const [newAuction] = await db.insert(auctions).values(auction).returning();
    return newAuction;
  }

  async getAuction(id: string): Promise<Auction | undefined> {
    const [auction] = await db.select().from(auctions).where(eq(auctions.id, id));
    return auction;
  }

  async getAuctions(filters?: { status?: string; createdBy?: string }): Promise<Auction[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(auctions.status, filters.status as any));
    }
    
    if (filters?.createdBy) {
      conditions.push(eq(auctions.createdBy, filters.createdBy));
    }
    
    return await db
      .select()
      .from(auctions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auctions.createdAt));
  }

  async updateAuction(id: string, updates: Partial<InsertAuction>): Promise<Auction> {
    const [auction] = await db
      .update(auctions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(auctions.id, id))
      .returning();
    return auction;
  }

  async addAuctionParticipant(participant: InsertAuctionParticipant): Promise<AuctionParticipant> {
    const [newParticipant] = await db.insert(auctionParticipants).values(participant).returning();
    return newParticipant;
  }

  async getAuctionParticipants(auctionId: string): Promise<AuctionParticipant[]> {
    return await db.select().from(auctionParticipants).where(eq(auctionParticipants.auctionId, auctionId));
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const [newBid] = await db.insert(bids).values(bid).returning();
    
    // Update auction current bid
    await db
      .update(auctions)
      .set({ currentBid: bid.amount })
      .where(eq(auctions.id, bid.auctionId));
    
    return newBid;
  }

  async getBids(auctionId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.auctionId, auctionId)).orderBy(desc(bids.timestamp));
  }

  async getLatestBid(auctionId: string): Promise<Bid | undefined> {
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.timestamp))
      .limit(1);
    return bid;
  }
  
  // Purchase Order operations
  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [newPo] = await db.insert(purchaseOrders).values(po).returning();
    return newPo;
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  }

  async getPurchaseOrders(filters?: { status?: string; vendorId?: string; createdBy?: string }): Promise<PurchaseOrder[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(purchaseOrders.status, filters.status as any));
    }
    
    if (filters?.vendorId) {
      conditions.push(eq(purchaseOrders.vendorId, filters.vendorId));
    }
    
    if (filters?.createdBy) {
      conditions.push(eq(purchaseOrders.createdBy, filters.createdBy));
    }
    
    return await db
      .select()
      .from(purchaseOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async updatePurchaseOrder(id: string, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    const [po] = await db
      .update(purchaseOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po;
  }

  async createPoLineItem(lineItem: InsertPoLineItem): Promise<PoLineItem> {
    const [newLineItem] = await db.insert(poLineItems).values(lineItem).returning();
    return newLineItem;
  }

  async getPoLineItems(poId: string): Promise<PoLineItem[]> {
    return await db.select().from(poLineItems).where(eq(poLineItems.poId, poId));
  }
  
  // Approval operations
  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [newApproval] = await db.insert(approvals).values(approval).returning();
    return newApproval;
  }

  async getApprovals(approverId: string): Promise<Approval[]> {
    return await db.select().from(approvals).where(eq(approvals.approverId, approverId)).orderBy(desc(approvals.createdAt));
  }

  async updateApproval(id: string, updates: Partial<InsertApproval>): Promise<Approval> {
    const [approval] = await db
      .update(approvals)
      .set({ ...updates, approvedAt: updates.status === 'approved' ? new Date() : undefined })
      .where(eq(approvals.id, id))
      .returning();
    return approval;
  }
  
  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }
  
  // Dashboard analytics
  async getDashboardStats(userId: string): Promise<{
    totalSpend: number;
    activeVendors: number;
    pendingApprovals: number;
    costSavings: number;
  }> {
    // Get total spend
    const totalSpendResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.createdBy, userId));

    // Get active vendors count
    const activeVendorsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vendors)
      .where(eq(vendors.status, 'approved'));

    // Get pending approvals count
    const pendingApprovalsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(approvals)
      .where(and(eq(approvals.approverId, userId), eq(approvals.status, 'pending')));

    return {
      totalSpend: totalSpendResult[0]?.total || 0,
      activeVendors: activeVendorsResult[0]?.count || 0,
      pendingApprovals: pendingApprovalsResult[0]?.count || 0,
      costSavings: 0, // Calculate based on budget vs actual spend
    };
  }
  
  // AI/Search operations
  async searchVendors(query: string, filters?: { location?: string; category?: string; certifications?: string[] }): Promise<Vendor[]> {
    const conditions = [
      like(vendors.companyName, `%${query}%`),
      eq(vendors.status, 'approved') // Only show approved vendors
    ];
    
    if (filters?.location && filters.location !== 'all') {
      conditions.push(sql`${vendors.officeLocations} @> ARRAY[${filters.location}]::text[]`);
    }
    
    if (filters?.category && filters.category !== 'all') {
      conditions.push(sql`${vendors.categories} @> ARRAY[${filters.category}]::text[]`);
    }
    
    if (filters?.certifications && filters.certifications.length > 0) {
      conditions.push(sql`${vendors.certifications} && ARRAY[${filters.certifications.join(',')}]::text[]`);
    }
    
    return await db
      .select()
      .from(vendors)
      .where(and(...conditions))
      .orderBy(desc(vendors.performanceScore));
  }
}

export const storage = new DatabaseStorage();
