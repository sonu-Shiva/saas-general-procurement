import {
  users,
  vendors,
  products,
  productCategories,
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
  directProcurementOrders,
  approvals,
  notifications,
  organizations,
  termsAcceptance,
  type User,
  type UpsertUser,
  type Vendor,
  type InsertVendor,
  type Product,
  type InsertProduct,
  type ProductCategory,
  type InsertProductCategory,
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
  type DirectProcurementOrder,
  type InsertDirectProcurementOrder,
  type Approval,
  type InsertApproval,
  type Notification,
  type InsertNotification,
  type Organization,
  type InsertOrganization,
  type TermsAcceptance,
  type InsertTermsAcceptance,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, like, inArray, isNull, or } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;

  // Vendor operations
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByUserId(userId: string): Promise<Vendor | undefined>;
  getVendors(filters?: { status?: string; category?: string; search?: string }): Promise<Vendor[]>;
  updateVendor(id: string, updates: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<boolean>;

  // Product Category operations
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  getProductCategory(id: string): Promise<ProductCategory | undefined>;
  getProductCategories(filters?: { parentId?: string; level?: number; isActive?: boolean }): Promise<ProductCategory[]>;
  updateProductCategory(id: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory>;
  deleteProductCategory(id: string): Promise<void>;
  getProductCategoryHierarchy(): Promise<any[]>;

  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: string): Promise<Product | undefined>;
  getProducts(filters?: { category?: string; categoryId?: string; search?: string; isActive?: boolean }): Promise<Product[]>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // BOM operations
  createBom(bom: InsertBom): Promise<Bom>;
  getBom(id: string): Promise<Bom | undefined>;
  getBoms(createdBy?: string): Promise<Bom[]>;
  checkBomExists(name: string, version: string): Promise<boolean>;
  copyBom(bomId: string, newName: string, newVersion: string, createdBy: string): Promise<Bom>;
  createBomItem(bomItem: InsertBomItem): Promise<BomItem>;
  getBomItems(bomId: string): Promise<BomItem[]>;

  // RFx operations
  createRfxEvent(rfx: InsertRfxEvent): Promise<RfxEvent>;
  getRfxEvent(id: string): Promise<RfxEvent | undefined>;
  getRfxEvents(filters?: { status?: string; type?: string; createdBy?: string }): Promise<RfxEvent[]>;
  getRfxEventsForVendor(vendorUserId: string): Promise<RfxEvent[]>;
  updateRfxEvent(id: string, updates: Partial<InsertRfxEvent>): Promise<RfxEvent>;
  updateRfxEventStatus(id: string, status: string): Promise<RfxEvent>;

  createRfxInvitation(invitation: InsertRfxInvitation): Promise<RfxInvitation>;
  getRfxInvitations(rfxId: string): Promise<RfxInvitation[]>;
  getRfxInvitation(rfxId: string, vendorId: string): Promise<RfxInvitation | undefined>;
  getRfxInvitationsByVendor(vendorId: string): Promise<any[]>;
  updateRfxInvitationStatus(rfxId: string, vendorId: string, status: string): Promise<void>;

  createRfxResponse(response: InsertRfxResponse): Promise<RfxResponse>;
  getRfxResponses(filters?: { rfxId?: string; vendorId?: string }): Promise<RfxResponse[]>;
  getRfxResponsesByVendor(vendorId: string): Promise<RfxResponse[]>;

  // Auction operations
  createAuction(auction: InsertAuction): Promise<Auction>;
  getAuction(id: string): Promise<Auction | undefined>;
  getAuctions(filters?: { status?: string; createdBy?: string }): Promise<Auction[]>;
  getAuctionsForVendor(vendorUserId: string): Promise<Auction[]>;
  updateAuction(id: string, updates: Partial<InsertAuction>): Promise<Auction>;
  updateAuctionStatus(id: string, status: string): Promise<Auction>;
  updateAuctionCurrentBid(id: string, amount: string): Promise<void>;

  createAuctionParticipant(participant: InsertAuctionParticipant): Promise<AuctionParticipant>;
  getAuctionParticipants(auctionId: string): Promise<AuctionParticipant[]>;

  createBid(bid: InsertBid): Promise<Bid>;
  getBids(filters?: { auctionId?: string; vendorId?: string }): Promise<Bid[]>;
  getAuctionBids(auctionId: string): Promise<Bid[]>;
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

  // Dashboard operations
  getDashboardStats(userId: string): Promise<any>;

  // Terms & Conditions operations
  recordTermsAcceptance(acceptance: InsertTermsAcceptance): Promise<TermsAcceptance>;
  checkTermsAcceptance(vendorId: string, entityType: string, entityId: string): Promise<TermsAcceptance | undefined>;
  getTermsAcceptance(userId: string, entityType: string, entityId: string): Promise<TermsAcceptance | undefined>;
  getTermsAcceptances(vendorId: string): Promise<TermsAcceptance[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
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

  async getVendorByUserId(userId: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.userId, userId));
    return vendor;
  }

  async getVendors(filters?: { status?: string; category?: string; search?: string }): Promise<Vendor[]> {
    let query = db.select().from(vendors);

    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(vendors.status, filters.status as any));
    }

    if (filters?.category) {
      conditions.push(like(vendors.categories, `%${filters.category}%`));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(vendors.companyName, `%${filters.search}%`),
          like(vendors.contactPerson, `%${filters.search}%`),
          like(vendors.email, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(vendors.createdAt));
  }

  async updateVendor(id: string, updates: Partial<InsertVendor>): Promise<Vendor> {
    const [updatedVendor] = await db
      .update(vendors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return updatedVendor;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const result = await db.delete(vendors).where(eq(vendors.id, id));
    return result.rowCount > 0;
  }

  // Product Category operations
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    // Generate hierarchical code automatically
    let hierarchicalCode: string;

    if (category.parentId) {
      // Get parent category to build hierarchical code
      const [parent] = await db.select().from(productCategories).where(eq(productCategories.id, category.parentId));
      if (!parent) {
        throw new Error('Parent category not found');
      }

      // Get sibling count to determine next number
      const siblings = await db.select().from(productCategories).where(eq(productCategories.parentId, category.parentId));
      const nextSiblingNumber = siblings.length + 1;

      hierarchicalCode = `${parent.code}.${nextSiblingNumber}`;
    } else {
      // Root category - get count of root categories
      const rootCategories = await db.select().from(productCategories).where(isNull(productCategories.parentId));
      const nextRootNumber = rootCategories.length + 1;

      hierarchicalCode = nextRootNumber.toString();
    }

    const categoryWithCode = {
      ...category,
      code: hierarchicalCode
    };

    const [newCategory] = await db.insert(productCategories).values(categoryWithCode).returning();
    return newCategory;
  }

  async getProductCategory(id: string): Promise<ProductCategory | undefined> {
    const [category] = await db.select().from(productCategories).where(eq(productCategories.id, id));
    return category;
  }

  async getProductCategories(filters?: { parentId?: string; level?: number; isActive?: boolean }): Promise<ProductCategory[]> {
    let query = db.select().from(productCategories);

    const conditions = [];

    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(isNull(productCategories.parentId));
      } else {
        conditions.push(eq(productCategories.parentId, filters.parentId));
      }
    }

    if (filters?.level !== undefined) {
      conditions.push(eq(productCategories.level, filters.level));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(productCategories.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(asc(productCategories.name));
  }

  async updateProductCategory(id: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory> {
    const [updatedCategory] = await db
      .update(productCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteProductCategory(id: string): Promise<void> {
    await db.delete(productCategories).where(eq(productCategories.id, id));
  }

  async getProductCategoryHierarchy(): Promise<any[]> {
    const allCategories = await db.select().from(productCategories).orderBy(asc(productCategories.name));

    const rootCategories: any[] = [];
    const categoryMap = new Map();

    allCategories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    allCategories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    return rootCategories;
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

  async getProducts(filters?: { category?: string; categoryId?: string; search?: string; isActive?: boolean }): Promise<Product[]> {
    let query = db.select().from(products);

    const conditions = [];

    if (filters?.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`),
          like(products.sku, `%${filters.search}%`)
        )
      );
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(products.createdAt));
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
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
    let query = db.select().from(boms);

    if (createdBy) {
      query = query.where(eq(boms.createdBy, createdBy));
    }

    return await query.orderBy(desc(boms.createdAt));
  }

  async checkBomExists(name: string, version: string): Promise<boolean> {
    const [existingBom] = await db
      .select()
      .from(boms)
      .where(and(eq(boms.name, name), eq(boms.version, version)))
      .limit(1);
    return !!existingBom;
  }

  async copyBom(bomId: string, newName: string, newVersion: string, createdBy: string): Promise<Bom> {
    const originalBom = await this.getBom(bomId);
    if (!originalBom) {
      throw new Error("Original BOM not found");
    }

    const newBom = await this.createBom({
      name: newName,
      version: newVersion,
      description: originalBom.description,
      category: originalBom.category,
      createdBy: createdBy,
    });

    const bomItems = await this.getBomItems(bomId);
    for (const item of bomItems) {
      await this.createBomItem({
        bomId: newBom.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    return newBom;
  }

  async createBomItem(bomItem: InsertBomItem): Promise<BomItem> {
    const [newBomItem] = await db.insert(bomItems).values(bomItem).returning();
    return newBomItem;
  }

  async getBomItems(bomId: string): Promise<BomItem[]> {
    return await db.select().from(bomItems).where(eq(bomItems.bomId, bomId));
  }

  async deleteBomItems(bomId: string): Promise<void> {
    await db.delete(bomItems).where(eq(bomItems.bomId, bomId));
  }

  async updateBom(id: string, updates: Partial<InsertBom>): Promise<Bom> {
    const [updatedBom] = await db
      .update(boms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(boms.id, id))
      .returning();
    return updatedBom;
  }

  async deleteBom(id: string): Promise<void> {
    // Delete BOM items first due to foreign key constraint
    await this.deleteBomItems(id);
    // Delete the BOM
    await db.delete(boms).where(eq(boms.id, id));
  }

  async searchVendors(query: string, filters?: { location?: string; category?: string; certifications?: string[] }): Promise<Vendor[]> {
    let dbQuery = db.select().from(vendors);

    const conditions = [];

    // Search in company name, contact person, or email
    conditions.push(
      or(
        like(vendors.companyName, `%${query}%`),
        like(vendors.contactPerson, `%${query}%`),
        like(vendors.email, `%${query}%`)
      )
    );

    if (filters?.location) {
      conditions.push(like(vendors.address, `%${filters.location}%`));
    }

    if (filters?.category) {
      conditions.push(like(vendors.categories, `%${filters.category}%`));
    }

    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions));
    }

    return await dbQuery.orderBy(desc(vendors.createdAt));
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
    let query = db.select().from(rfxEvents);

    if (filters) {
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(rfxEvents.status, filters.status as any));
      }

      if (filters.type) {
        conditions.push(eq(rfxEvents.type, filters.type as any));
      }

      if (filters.createdBy) {
        conditions.push(eq(rfxEvents.createdBy, filters.createdBy));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    return await query.orderBy(desc(rfxEvents.createdAt));
  }

  async updateRfxEvent(id: string, updates: Partial<InsertRfxEvent>): Promise<RfxEvent> {
    const [rfx] = await db
      .update(rfxEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rfxEvents.id, id))
      .returning();
    return rfx;
  }

  async updateRfxEventStatus(id: string, status: string): Promise<RfxEvent> {
    const [updatedRfx] = await db
      .update(rfxEvents)
      .set({
        status: status as any,
        updatedAt: new Date()
      })
      .where(eq(rfxEvents.id, id))
      .returning();
    return updatedRfx;
  }

  async createRfxInvitation(invitation: InsertRfxInvitation): Promise<RfxInvitation> {
    const [newInvitation] = await db.insert(rfxInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getRfxInvitations(rfxId: string): Promise<RfxInvitation[]> {
    return await db.select().from(rfxInvitations).where(eq(rfxInvitations.rfxId, rfxId));
  }

  async getRfxInvitation(rfxId: string, vendorId: string): Promise<RfxInvitation | undefined> {
    const [invitation] = await db.select().from(rfxInvitations)
      .where(and(eq(rfxInvitations.rfxId, rfxId), eq(rfxInvitations.vendorId, vendorId)));
    return invitation;
  }

  async getRfxInvitationsByVendor(vendorId: string): Promise<any[]> {
    const invitations = await db.select({
      rfxId: rfxInvitations.rfxId,
      vendorId: rfxInvitations.vendorId,
      status: rfxInvitations.status,
      invitedAt: rfxInvitations.invitedAt,
      respondedAt: rfxInvitations.respondedAt,
      rfx: {
        id: rfxEvents.id,
        title: rfxEvents.title,
        type: rfxEvents.type,
        scope: rfxEvents.scope,
        dueDate: rfxEvents.dueDate,
        status: rfxEvents.status,
        budget: rfxEvents.budget,
        termsAndConditionsPath: rfxEvents.termsAndConditionsPath,
        criteria: rfxEvents.criteria,
        evaluationParameters: rfxEvents.evaluationParameters,
      }
    })
    .from(rfxInvitations)
    .innerJoin(rfxEvents, eq(rfxInvitations.rfxId, rfxEvents.id))
    .where(eq(rfxInvitations.vendorId, vendorId))
    .orderBy(desc(rfxInvitations.invitedAt));

    return invitations;
  }

  async updateRfxInvitationStatus(rfxId: string, vendorId: string, status: string): Promise<void> {
    await db.update(rfxInvitations)
      .set({
        status: status as any,
        respondedAt: status === 'responded' ? new Date() : null
      })
      .where(and(eq(rfxInvitations.rfxId, rfxId), eq(rfxInvitations.vendorId, vendorId)));
  }

  async createRfxResponse(response: InsertRfxResponse): Promise<RfxResponse> {
    const [newResponse] = await db.insert(rfxResponses).values(response).returning();
    return newResponse;
  }

  async getRfxResponses(filters?: { rfxId?: string; vendorId?: string }): Promise<RfxResponse[]> {
    const conditions = [];

    if (filters?.rfxId) {
      conditions.push(eq(rfxResponses.rfxId, filters.rfxId));
    }

    if (filters?.vendorId) {
      conditions.push(eq(rfxResponses.vendorId, filters.vendorId));
    }

    return await db
      .select()
      .from(rfxResponses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(rfxResponses.submittedAt));
  }

  async getRfxResponsesByVendor(vendorId: string): Promise<RfxResponse[]> {
    return await db
      .select()
      .from(rfxResponses)
      .where(eq(rfxResponses.vendorId, vendorId))
      .orderBy(desc(rfxResponses.submittedAt));
  }

  async getChildRfxEvents(parentRfxId: string): Promise<RfxEvent[]> {
    return await db
      .select()
      .from(rfxEvents)
      .where(eq(rfxEvents.parentRfxId, parentRfxId))
      .orderBy(rfxEvents.createdAt);
  }

  // Auction operations
  async createAuction(auction: InsertAuction): Promise<Auction> {
    const [newAuction] = await db.insert(auctions).values(auction).returning();
    return newAuction;
  }

  async getAuction(id: string): Promise<Auction | undefined> {
    const [auction] = await db.select().from(auctions).where(eq(auctions.id, id));

    if (auction) {
      // Get the latest bid to update current bid information
      const latestBid = await this.getLatestBid(id);
      if (latestBid) {
        // Update the auction's current bid with the latest bid amount
        auction.currentBid = latestBid.amount;
        auction.leadingVendorId = latestBid.vendorId;
      }
    }

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

    const auctionList = await db
      .select()
      .from(auctions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auctions.createdAt));

    // Update each auction with latest bid information
    for (const auction of auctionList) {
      const latestBid = await this.getLatestBid(auction.id);
      if (latestBid) {
        auction.currentBid = latestBid.amount;
        auction.leadingVendorId = latestBid.vendorId;
      }
    }

    return auctionList;
  }

  async getAuctionsForVendor(vendorUserId: string): Promise<Auction[]> {
    // For now, return all live and scheduled auctions for vendor role users
    // In production, this would be filtered by proper vendor invitation/assignment
    const auctionList = await db
      .select()
      .from(auctions)
      .where(or(eq(auctions.status, 'live'), eq(auctions.status, 'scheduled')))
      .orderBy(desc(auctions.createdAt));

    // Update each auction with latest bid information
    for (const auction of auctionList) {
      const latestBid = await this.getLatestBid(auction.id);
      if (latestBid) {
        auction.currentBid = latestBid.amount;
        auction.leadingVendorId = latestBid.vendorId;
      }
    }

    return auctionList;
  }

  async getRfxEventsForVendor(vendorId: string): Promise<RfxEvent[]> {
    // Get RFx events where the vendor is invited to participate
    const results = await db
      .select({
        id: rfxEvents.id,
        title: rfxEvents.title,
        referenceNo: rfxEvents.referenceNo,
        type: rfxEvents.type,
        status: rfxEvents.status,
        scope: rfxEvents.scope,
        criteria: rfxEvents.criteria,
        dueDate: rfxEvents.dueDate,
        budget: rfxEvents.budget,
        contactPerson: rfxEvents.contactPerson,
        bomId: rfxEvents.bomId,
        parentRfxId: rfxEvents.parentRfxId,
        termsAndConditionsPath: rfxEvents.termsAndConditionsPath,
        termsAndConditionsRequired: rfxEvents.termsAndConditionsRequired,
        evaluationParameters: rfxEvents.evaluationParameters,
        attachments: rfxEvents.attachments,
        createdBy: rfxEvents.createdBy,
        createdAt: rfxEvents.createdAt,
        updatedAt: rfxEvents.updatedAt,
      })
      .from(rfxEvents)
      .innerJoin(rfxInvitations, eq(rfxEvents.id, rfxInvitations.rfxId))
      .where(eq(rfxInvitations.vendorId, vendorId))
      .orderBy(desc(rfxEvents.createdAt));

    return results;
  }

  async getRfxResponsesByVendor(vendorId: string): Promise<RfxResponse[]> {
    return await db
      .select()
      .from(rfxResponses)
      .where(eq(rfxResponses.vendorId, vendorId))
      .orderBy(desc(rfxResponses.submittedAt));
  }

  async updateAuction(id: string, updates: Partial<InsertAuction>): Promise<Auction> {
    const [result] = await db.update(auctions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(auctions.id, id))
      .returning();
    return result;
  }

  async updateAuctionStatus(id: string, status: string): Promise<Auction> {
    const [result] = await db.update(auctions)
      .set({ status, updatedAt: new Date() })
      .where(eq(auctions.id, id))
      .returning();
    return result;
  }

  async updateAuctionCurrentBid(id: string, amount: string): Promise<void> {
    await db.update(auctions)
      .set({ currentBid: amount, updatedAt: new Date() })
      .where(eq(auctions.id, id));
  }

  async createAuctionParticipant(participant: InsertAuctionParticipant): Promise<AuctionParticipant> {
    const [newParticipant] = await db.insert(auctionParticipants).values(participant).returning();
    return newParticipant;
  }

  async getAuctionParticipants(auctionId: string): Promise<AuctionParticipant[]> {
    return await db.select().from(auctionParticipants).where(eq(auctionParticipants.auctionId, auctionId));
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const [newBid] = await db.insert(bids).values(bid).returning();
    return newBid;
  }

  async getBids(filters?: { auctionId?: string; vendorId?: string }): Promise<Bid[]> {
    const conditions = [];

    if (filters?.auctionId) {
      conditions.push(eq(bids.auctionId, filters.auctionId));
    }

    if (filters?.vendorId) {
      conditions.push(eq(bids.vendorId, filters.vendorId));
    }

    return await db
      .select()
      .from(bids)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bids.timestamp));
  }

  async getAuctionBids(auctionId: string): Promise<Bid[]> {
    console.log(`DEBUG: Getting bids for auction ${auctionId}`);
    const bidResults = await db.select().from(bids).where(eq(bids.auctionId, auctionId)).orderBy(desc(bids.timestamp));
    console.log(`DEBUG: Raw bid results from DB:`, bidResults);
    return bidResults;
  }

  async getLatestBid(auctionId: string): Promise<Bid | undefined> {
    const [latestBid] = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.timestamp))
      .limit(1);
    return latestBid;
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
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    // Delete line items first (due to foreign key constraint)
    await db.delete(poLineItems).where(eq(poLineItems.poId, id));
    // Delete the purchase order
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  // Direct Procurement operations
  async createDirectProcurementOrder(order: InsertDirectProcurementOrder): Promise<DirectProcurementOrder> {
    const [created] = await db.insert(directProcurementOrders).values(order).returning();
    return created;
  }

  async getDirectProcurementOrders(userId?: string): Promise<any[]> {
    let query = db.select({
      id: directProcurementOrders.id,
      referenceNo: directProcurementOrders.referenceNo,
      bomId: directProcurementOrders.bomId,
      vendorId: directProcurementOrders.vendorId,
      bomItems: directProcurementOrders.bomItems,
      totalAmount: directProcurementOrders.totalAmount,
      status: directProcurementOrders.status,
      priority: directProcurementOrders.priority,
      deliveryDate: directProcurementOrders.deliveryDate,
      paymentTerms: directProcurementOrders.paymentTerms,
      notes: directProcurementOrders.notes,
      createdBy: directProcurementOrders.createdBy,
      createdAt: directProcurementOrders.createdAt,
      updatedAt: directProcurementOrders.updatedAt,
      vendorName: vendors.companyName,
      bomName: boms.name,
    })
    .from(directProcurementOrders)
    .leftJoin(vendors, eq(directProcurementOrders.vendorId, vendors.id))
    .leftJoin(boms, eq(directProcurementOrders.bomId, boms.id))
    .orderBy(desc(directProcurementOrders.createdAt));

    if (userId) {
      query = query.where(eq(directProcurementOrders.createdBy, userId));
    }

    const orders = await query;

    return orders.map(order => ({
      ...order,
      itemCount: Array.isArray(order.bomItems) ? order.bomItems.length : 0,
      totalValue: order.totalAmount,
    })) as any[];
  }

  async getDirectProcurementOrderById(id: string): Promise<DirectProcurementOrder | undefined> {
    const [order] = await db.select({
      id: directProcurementOrders.id,
      referenceNo: directProcurementOrders.referenceNo,
      bomId: directProcurementOrders.bomId,
      vendorId: directProcurementOrders.vendorId,
      bomItems: directProcurementOrders.bomItems,
      totalAmount: directProcurementOrders.totalAmount,
      status: directProcurementOrders.status,
      priority: directProcurementOrders.priority,
      deliveryDate: directProcurementOrders.deliveryDate,
      paymentTerms: directProcurementOrders.paymentTerms,
      notes: directProcurementOrders.notes,
      createdBy: directProcurementOrders.createdBy,
      createdAt: directProcurementOrders.createdAt,
      updatedAt: directProcurementOrders.updatedAt,
      vendorName: vendors.companyName,
      bomName: boms.name,
    })
    .from(directProcurementOrders)
    .leftJoin(vendors, eq(directProcurementOrders.vendorId, vendors.id))
    .leftJoin(boms, eq(directProcurementOrders.bomId, boms.id))
    .where(eq(directProcurementOrders.id, id));

    return order;
  }

  async updateDirectProcurementOrderStatus(id: string, status: string): Promise<DirectProcurementOrder> {
    const [updated] = await db.update(directProcurementOrders)
      .set({
        status: status as any,
        updatedAt: new Date()
      })
      .where(eq(directProcurementOrders.id, id))
      .returning();
    return updated;
  }

  async deleteDirectProcurementOrder(id: string): Promise<void> {
    await db.delete(directProcurementOrders).where(eq(directProcurementOrders.id, id));
  }

  // Dashboard operations
  async getDashboardStats(userId: string): Promise<any> {
    try {
      // Get user to determine role-based stats
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Basic stats for all users
      const stats = {
        totalVendors: 0,
        totalProducts: 0,
        totalBoms: 0,
        totalRfx: 0,
        totalAuctions: 0,
        totalPurchaseOrders: 0,
        pendingApprovals: 0,
        recentActivity: []
      };

      // Get counts based on user role
      if (user.role === 'vendor') {
        // For vendors, show stats relevant to them
        const vendor = await this.getVendorByUserId(userId);
        if (vendor) {
          stats.totalProducts = (await this.getProducts({ isActive: true })).filter(p => p.createdBy === userId).length;
          stats.totalRfx = (await this.getRfxInvitationsByVendor(vendor.id)).length;
          stats.totalAuctions = (await this.getAuctionsForVendor(userId)).length;
        }
      } else {
        // For buyers/admins, show system-wide stats
        stats.totalVendors = (await this.getVendors()).length;
        stats.totalProducts = (await this.getProducts({ isActive: true })).length;
        stats.totalBoms = (await this.getBoms(userId)).length;
        stats.totalRfx = (await this.getRfxEvents({ createdBy: userId })).length;
        stats.totalAuctions = (await this.getAuctions({ createdBy: userId })).length;
        stats.totalPurchaseOrders = (await this.getPurchaseOrders({ createdBy: userId })).length;
        stats.pendingApprovals = (await this.getApprovals(userId)).length;
      }

      return stats;
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      // Return default stats on error
      return {
        totalVendors: 0,
        totalProducts: 0,
        totalBoms: 0,
        totalRfx: 0,
        totalAuctions: 0,
        totalPurchaseOrders: 0,
        pendingApprovals: 0,
        recentActivity: []
      };
    }
  }

  // Terms & Conditions operations
  async recordTermsAcceptance(acceptance: InsertTermsAcceptance): Promise<TermsAcceptance> {
    const [newAcceptance] = await db
      .insert(termsAcceptance)
      .values(acceptance)
      .onConflictDoUpdate({
        target: [termsAcceptance.vendorId, termsAcceptance.entityType, termsAcceptance.entityId],
        set: {
          acceptedAt: new Date(),
          ipAddress: acceptance.ipAddress,
          userAgent: acceptance.userAgent,
        },
      })
      .returning();
    return newAcceptance;
  }

  async checkTermsAcceptance(vendorId: string, entityType: string, entityId: string): Promise<TermsAcceptance | undefined> {
    const [acceptance] = await db
      .select()
      .from(termsAcceptance)
      .where(
        and(
          eq(termsAcceptance.vendorId, vendorId),
          eq(termsAcceptance.entityType, entityType as any),
          eq(termsAcceptance.entityId, entityId)
        )
      );
    return acceptance;
  }

  async getTermsAcceptance(userId: string, entityType: string, entityId: string): Promise<TermsAcceptance | undefined> {
    const [acceptance] = await db
      .select()
      .from(termsAcceptance)
      .where(
        and(
          eq(termsAcceptance.vendorId, userId),
          eq(termsAcceptance.entityType, entityType as any),
          eq(termsAcceptance.entityId, entityId)
        )
      );
    return acceptance;
  }

  async getTermsAcceptances(vendorId: string): Promise<TermsAcceptance[]> {
    return await db
      .select()
      .from(termsAcceptance)
      .where(eq(termsAcceptance.vendorId, vendorId))
      .orderBy(desc(termsAcceptance.acceptedAt));
  }
}

export const storage = new DatabaseStorage();