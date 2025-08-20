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
  challengePrices,
  counterPrices,
  auctionExtensions,
  purchaseOrders,
  poLineItems,
  directProcurementOrders,
  approvals,
  notifications,
  organizations,
  termsAcceptance,
  procurementRequests,
  sourcingEvents,
  approvalConfigurations,
  approvalHistory,
  departments,
  dropdownConfigurations,
  dropdownOptions,
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
  type ChallengePrice,
  type InsertChallengePrice,
  type CounterPrice,
  type InsertCounterPrice,
  type AuctionExtension,
  type InsertAuctionExtension,
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
  type ProcurementRequest,
  type InsertProcurementRequest,
  type SourcingEvent,
  type InsertSourcingEvent,
  type ApprovalConfiguration,
  type InsertApprovalConfiguration,
  type ApprovalHistory,
  type InsertApprovalHistory,
  type Department,
  type InsertDepartment,
  type DropdownConfiguration,
  type InsertDropdownConfiguration,
  type DropdownOption,
  type InsertDropdownOption,
} from "@shared/schema";
import { db } from "./db";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from 'uuid';
import { desc, eq, like, asc, and, sql, inArray, isNull, or } from "drizzle-orm";

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
  deleteBomItems(bomId: string): Promise<void>;
  updateBom(id: string, updates: Partial<InsertBom>): Promise<Bom>;
  deleteBom(id: string): Promise<void>;
  updateBomItem(id: string, updates: Partial<InsertBomItem>): Promise<BomItem>;
  deleteBomItem(id: string): Promise<void>;
  searchVendors(query: string, filters?: { location?: string; category?: string; certifications?: string[] }): Promise<Vendor[]>;

  // RFx operations
  createRfxEvent(rfx: InsertRfxEvent): Promise<RfxEvent>;
  getRfxEvent(id: string): Promise<RfxEvent | undefined>;
  getRfxEvents(filters?: { status?: string; type?: string; createdBy?: string }): Promise<RfxEvent[]>;
  getRfxEventsForVendor(vendorId: string): Promise<RfxEvent[]>;
  updateRfxEvent(id: string, updates: Partial<InsertRfxEvent>): Promise<RfxEvent>;
  updateRfxEventStatus(id: string, status: string): Promise<RfxEvent>;

  createRfxInvitation(invitation: InsertRfxInvitation): Promise<RfxInvitation>;
  getRfxInvitations(rfxId: string): Promise<RfxInvitation[]>;
  getRfxInvitation(rfxId: string, vendorId: string): Promise<RfxInvitation | undefined>;
  getRfxInvitationsByVendor(vendorId: string): Promise<any[]>;
  getRfxInvitationsForVendor(vendorId: string): Promise<any[]>;
  updateRfxInvitationStatus(rfxId: string, vendorId: string, status: string): Promise<void>;

  createRfxResponse(data: any): Promise<RfxResponse>;
  getRfxResponses(filters?: { rfxId?: string; vendorId?: string }): Promise<RfxResponse[]>;
  getRfxResponsesByVendor(vendorId: string): Promise<RfxResponse[]>;
  getChildRfxEvents(parentRfxId: string): Promise<RfxEvent[]>;

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
  getAuctionItems(auctionId: string): Promise<any[]>;

  // Challenge Price operations
  createChallengePrice(challengePrice: InsertChallengePrice): Promise<ChallengePrice>;
  getChallengePrice(id: string): Promise<ChallengePrice | undefined>;
  getChallengePrices(filters?: { auctionId?: string; vendorId?: string; status?: string }): Promise<ChallengePrice[]>;
  updateChallengePrice(id: string, updates: Partial<InsertChallengePrice>): Promise<ChallengePrice>;
  respondToChallengePrice(id: string, status: 'accepted' | 'rejected', vendorResponse?: string): Promise<ChallengePrice>;

  // Counter Price operations
  createCounterPrice(counterPrice: InsertCounterPrice): Promise<CounterPrice>;
  getCounterPrice(id: string): Promise<CounterPrice | undefined>;
  getCounterPrices(filters?: { challengePriceId?: string; auctionId?: string; vendorId?: string; status?: string }): Promise<CounterPrice[]>;
  updateCounterPrice(id: string, updates: Partial<InsertCounterPrice>): Promise<CounterPrice>;
  respondToCounterPrice(id: string, status: 'accepted' | 'rejected', sourcingResponse?: string): Promise<CounterPrice>;

  // Auction Extension operations
  createAuctionExtension(extension: InsertAuctionExtension): Promise<AuctionExtension>;
  getAuctionExtensions(auctionId: string): Promise<AuctionExtension[]>;
  extendAuction(auctionId: string, durationMinutes: number, reason: string, extendedBy: string): Promise<{ auction: Auction; extension: AuctionExtension }>;

  // Purchase Order operations
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrder(id: string): Promise<any | undefined>;
  getPurchaseOrders(filters?: { status?: string; vendorId?: string; createdBy?: string }): Promise<any[]>;
  updatePurchaseOrder(id: string, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;

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

  // Direct Procurement operations
  createDirectProcurementOrder(order: InsertDirectProcurementOrder): Promise<DirectProcurementOrder>;
  getDirectProcurementOrders(userId?: string): Promise<any[]>;
  getDirectProcurementOrderById(id: string): Promise<DirectProcurementOrder | undefined>;
  updateDirectProcurementOrderStatus(id: string, status: string): Promise<DirectProcurementOrder>;
  deleteDirectProcurementOrder(id: string): Promise<void>;

  // Dashboard operations
  getDashboardStats(userId: string): Promise<any>;

  // Procurement Request operations
  createProcurementRequest(request: InsertProcurementRequest): Promise<ProcurementRequest>;
  getProcurementRequests(filters?: { requestedBy?: string; department?: string; status?: string }): Promise<ProcurementRequest[]>;
  getProcurementRequest(id: string): Promise<ProcurementRequest | undefined>;
  updateProcurementRequest(id: string, updates: Partial<ProcurementRequest>): Promise<ProcurementRequest>;
  deleteProcurementRequest(id: string): Promise<void>; // Removed userId parameter as it's not used in the DB implementation

  // Approval Configuration operations
  createApprovalConfiguration(config: InsertApprovalConfiguration): Promise<ApprovalConfiguration>;
  getApprovalConfigurations(filters?: { approvalType?: string; department?: string }): Promise<ApprovalConfiguration[]>;
  getApprovalConfiguration(id: string): Promise<ApprovalConfiguration | undefined>;
  updateApprovalConfiguration(id: string, updates: Partial<ApprovalConfiguration>): Promise<ApprovalConfiguration>;
  deleteApprovalConfiguration(id: string): Promise<void>;

  // Approval History operations
  createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory>;
  getApprovalHistory(filters?: { entityId?: string; approverId?: string; status?: string }): Promise<ApprovalHistory[]>;
  updateApprovalHistory(id: string, updates: Partial<ApprovalHistory>): Promise<ApprovalHistory>;

  // Terms & Conditions operations
  recordTermsAcceptance(acceptance: InsertTermsAcceptance): Promise<TermsAcceptance>;
  checkTermsAcceptance(vendorId: string, entityType: string, entityId: string): Promise<TermsAcceptance | undefined>;
  getTermsAcceptance(userId: string, entityType: string, entityId: string): Promise<TermsAcceptance | undefined>;
  getTermsAcceptances(vendorId: string): Promise<TermsAcceptance[]>;

  // Departments operations
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | null>;
  createDepartment(data: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, data: Partial<Department>): Promise<Department | null>;
  deleteDepartment(id: string): Promise<boolean>;

  // Sourcing Event operations
  createSourcingEvent(data: InsertSourcingEvent): Promise<SourcingEvent>;
  getSourcingEvent(id: string): Promise<SourcingEvent | undefined>;
  getSourcingEvents(filters?: { status?: string; createdBy?: string }): Promise<SourcingEvent[]>;
  getSourcingEventsByStatus(statuses: string[]): Promise<SourcingEvent[]>;
  updateSourcingEvent(id: string, updates: Partial<SourcingEvent>): Promise<SourcingEvent>;
  getProcurementRequestsByStatus(statuses: string[]): Promise<ProcurementRequest[]>;

  // Dropdown Configuration operations
  createDropdownConfiguration(config: InsertDropdownConfiguration): Promise<DropdownConfiguration>;
  getDropdownConfiguration(id: string): Promise<DropdownConfiguration | undefined>;
  getDropdownConfigurations(filters?: { screen?: string; category?: string; isActive?: boolean }): Promise<DropdownConfiguration[]>;
  updateDropdownConfiguration(id: string, updates: Partial<InsertDropdownConfiguration>): Promise<DropdownConfiguration>;
  deleteDropdownConfiguration(id: string): Promise<boolean>;

  // Dropdown Option operations
  createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption>;
  getDropdownOption(id: string): Promise<DropdownOption | undefined>;
  getDropdownOptions(configurationId: string): Promise<DropdownOption[]>;
  getDropdownOptionsByScreen(screen: string): Promise<{ [key: string]: DropdownOption[] }>;
  updateDropdownOption(id: string, updates: Partial<InsertDropdownOption>): Promise<DropdownOption>;
  deleteDropdownOption(id: string): Promise<boolean>;
  bulkUpdateDropdownOptions(configurationId: string, options: InsertDropdownOption[]): Promise<DropdownOption[]>;
}

export class DatabaseStorage implements IStorage {
  private db = db; // Assuming db is initialized and exported from ./db

  // Temporary in-memory storage for sourcing events (replace with actual DB operations)
  private sourcingEvents: any[] = [
    {
      id: 'sourcing-event-001',
      procurementRequestId: 'pr-001',
      type: 'RFQ',
      justification: 'Multiple vendors required for competitive pricing',
      estimatedValue: 150000,
      selectedVendorIds: ['vendor-001', 'vendor-002', 'vendor-003'],
      status: 'PENDING_SM_APPROVAL',
      createdBy: 'sourcing-exec-001',
      createdAt: new Date('2025-01-13T09:00:00Z'),
      updatedAt: new Date('2025-01-13T09:00:00Z'),
      submittedAt: new Date('2025-01-13T09:00:00Z'),
    }
  ];
  // Temporary in-memory storage for vendors (replace with actual DB operations)
  private vendors: Vendor[] = [];
  // Temporary in-memory storage for procurement requests (replace with actual DB operations)
  private procurementRequests: ProcurementRequest[] = [
    {
      id: 'pr-001',
      userId: 'dev-user-123',
      bomId: 'bom-001',
      department: 'engineering',
      description: 'Procurement of electronic components for Q1 production',
      priority: 'high',
      urgency: 'normal',
      estimatedBudget: 150000,
      status: 'approved',
      bomItems: [],
      createdAt: new Date('2025-01-12T10:00:00Z'),
      updatedAt: new Date('2025-01-12T10:00:00Z'),
    } as ProcurementRequest
  ];

  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
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
    const [newOrg] = await this.db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  // Vendor operations
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await this.db.insert(vendors).values(vendor).returning();
    this.vendors.push(newVendor); // Add to in-memory store
    return newVendor;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await this.db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getVendorByUserId(userId: string): Promise<Vendor | undefined> {
    const [vendor] = await this.db.select().from(vendors).where(eq(vendors.userId, userId));
    return vendor;
  }

  async getVendors(filters?: { status?: string; category?: string; search?: string }): Promise<Vendor[]> {
    let query = this.db.select().from(vendors);

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
    const [updatedVendor] = await this.db
      .update(vendors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    // Update in-memory store
    if (updatedVendor) {
      const index = this.vendors.findIndex(v => v.id === id);
      if (index !== -1) {
        this.vendors[index] = updatedVendor;
      }
    }
    return updatedVendor;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const result = await this.db.delete(vendors).where(eq(vendors.id, id));
    // Remove from in-memory store
    this.vendors = this.vendors.filter(v => v.id !== id);
    return result.rowCount > 0;
  }

  // Product Category operations
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    // Generate hierarchical code automatically
    let hierarchicalCode: string;

    if (category.parentId) {
      // Get parent category to build hierarchical code
      const [parent] = await this.db.select().from(productCategories).where(eq(productCategories.id, category.parentId));
      if (!parent) {
        throw new Error('Parent category not found');
      }

      // Get sibling count to determine next number
      const siblings = await this.db.select().from(productCategories).where(eq(productCategories.parentId, category.parentId));
      const nextSiblingNumber = siblings.length + 1;

      hierarchicalCode = `${parent.code}.${nextSiblingNumber}`;
    } else {
      // Root category - get count of root categories
      const rootCategories = await this.db.select().from(productCategories).where(isNull(productCategories.parentId));
      const nextRootNumber = rootCategories.length + 1;

      hierarchicalCode = nextRootNumber.toString();
    }

    const categoryWithCode = {
      ...category,
      code: hierarchicalCode
    };

    const [newCategory] = await this.db.insert(productCategories).values(categoryWithCode).returning();
    return newCategory;
  }

  async getProductCategory(id: string): Promise<ProductCategory | undefined> {
    const [category] = await this.db.select().from(productCategories).where(eq(productCategories.id, id));
    return category;
  }

  async getProductCategories(filters?: { parentId?: string; level?: number; isActive?: boolean }): Promise<ProductCategory[]> {
    let query = this.db.select().from(productCategories);

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
    const [updatedCategory] = await this.db
      .update(productCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteProductCategory(id: string): Promise<void> {
    await this.db.delete(productCategories).where(eq(productCategories.id, id));
  }

  async getProductCategoryHierarchy(): Promise<any[]> {
    const allCategories = await this.db.select().from(productCategories).orderBy(asc(productCategories.name));

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
    const [newProduct] = await this.db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(filters?: { category?: string; categoryId?: string; search?: string; isActive?: boolean }): Promise<Product[]> {
    let query = this.db.select().from(products);

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
    const [updatedProduct] = await this.db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  // BOM operations
  async createBom(bom: InsertBom): Promise<Bom> {
    try {
      console.log("Storage - Creating BOM with data:", JSON.stringify(bom, null, 2));

      // Ensure all required fields are present and valid
      const bomData = {
        id: bom.id || undefined, // Let DB generate if not provided
        name: bom.name,
        version: bom.version,
        description: bom.description || null,
        category: bom.category || null,
        validFrom: bom.validFrom || null,
        validTo: bom.validTo || null,
        tags: bom.tags || null,
        createdBy: bom.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("Storage - Inserting BOM data:", JSON.stringify(bomData, null, 2));
      const [newBom] = await this.db.insert(boms).values(bomData).returning();
      console.log("Storage - BOM created successfully:", newBom);
      return newBom;
    } catch (error) {
      console.error("Storage - Error creating BOM:", error);
      throw error;
    }
  }

  async getBom(id: string): Promise<Bom | undefined> {
    const [bom] = await this.db.select().from(boms).where(eq(boms.id, id));
    return bom;
  }

  async getBoms(createdBy?: string): Promise<Bom[]> {
    let query = this.db.select().from(boms);

    if (createdBy) {
      query = query.where(eq(boms.createdBy, createdBy));
    }

    return await query.orderBy(desc(boms.createdAt));
  }

  async checkBomExists(name: string, version: string): Promise<boolean> {
    const [existingBom] = await this.db
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
    const [newBomItem] = await this.db.insert(bomItems).values(bomItem).returning();
    return newBomItem;
  }

  async getBomItems(bomId: string): Promise<any[]> {
    try {
      console.log("Storage - Getting BOM items for BOM ID:", bomId);

      // First check if BOM exists
      const bom = await this.db
        .select()
        .from(boms)
        .where(eq(boms.id, bomId))
        .limit(1);

      if (bom.length === 0) {
        console.log("Storage - BOM not found:", bomId);
        return [];
      }

      console.log("Storage - BOM found:", bom[0].name);

      const items = await this.db
        .select()
        .from(bomItems)
        .where(eq(bomItems.bomId, bomId))
        .orderBy(bomItems.createdAt);

      console.log("Storage - Found BOM items:", items.length);
      if (items.length > 0) {
        console.log("Storage - First BOM item sample:", JSON.stringify(items[0], null, 2));
        console.log("Storage - All items:", items.map(item => ({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })));
      } else {
        console.log("Storage - No BOM items found for BOM:", bomId);

        // Check if there are any BOM items at all
        const allItems = await this.db.select().from(bomItems).limit(5);
        console.log("Storage - Total BOM items in database:", allItems.length);
        if (allItems.length > 0) {
          console.log("Storage - Sample items from other BOMs:", allItems.map(item => ({
            bomId: item.bomId,
            itemName: item.itemName
          })));
        }
      }

      return items;
    } catch (error) {
      console.error("Error fetching BOM items from storage:", error);
      throw error;
    }
  }

  async deleteBomItems(bomId: string): Promise<void> {
    await this.db.delete(bomItems).where(eq(bomItems.bomId, bomId));
  }

  async updateBom(id: string, updates: Partial<InsertBom>): Promise<Bom> {
    const [updatedBom] = await this.db
      .update(boms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(boms.id, id))
      .returning();
    return updatedBom;
  }

  async deleteBom(id: string): Promise<void> {
    try {
      console.log("Storage - Deleting BOM:", id);

      // First delete all BOM items
      await this.db.delete(bomItems).where(eq(bomItems.bomId, id));
      console.log("Storage - Deleted BOM items for BOM:", id);

      // Then delete the BOM
      await this.db.delete(boms).where(eq(boms.id, id));
      console.log("Storage - Deleted BOM:", id);
    } catch (error) {
      console.error("Storage - Error deleting BOM:", error);
      throw error;
    }
  }

  async updateBomItem(id: string, updates: Partial<InsertBomItem>): Promise<BomItem> {
    const [updatedItem] = await this.db
      .update(bomItems)
      .set(updates)
      .where(eq(bomItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteBomItem(id: string): Promise<void> {
    await this.db.delete(bomItems).where(eq(bomItems.id, id));
  }

  async searchVendors(query: string, filters?: { location?: string; category?: string; certifications?: string[] }): Promise<Vendor[]> {
    let dbQuery = this.db.select().from(vendors);

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
    const [newRfx] = await this.db.insert(rfxEvents).values(rfx).returning();
    return newRfx;
  }

  async getRfxEvent(id: string): Promise<RfxEvent | undefined> {
    const [rfx] = await this.db.select().from(rfxEvents).where(eq(rfxEvents.id, id));
    return rfx;
  }

  async getRfxEvents(filters?: { status?: string; type?: string; createdBy?: string }): Promise<RfxEvent[]> {
    let query = this.db.select().from(rfxEvents);

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
    const [rfx] = await this.db
      .update(rfxEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rfxEvents.id, id))
      .returning();
    return rfx;
  }

  async updateRfxEventStatus(id: string, status: string): Promise<RfxEvent> {
    const [updatedRfx] = await this.db
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
    const [newInvitation] = await this.db.insert(rfxInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getRfxInvitations(rfxId: string): Promise<RfxInvitation[]> {
    return await this.db.select().from(rfxInvitations).where(eq(rfxInvitations.rfxId, rfxId));
  }

  async getRfxInvitation(rfxId: string, vendorId: string): Promise<RfxInvitation | undefined> {
    const [invitation] = await this.db.select().from(rfxInvitations)
      .where(and(eq(rfxInvitations.rfxId, rfxId), eq(rfxInvitations.vendorId, vendorId)));
    return invitation;
  }

  async getRfxInvitationsByVendor(vendorId: string): Promise<any[]> {
    const invitations = await this.db.select({
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

  async getRfxInvitationsForVendor(vendorId: string): Promise<any[]> {
    // Get RFx invitations with full RFx details for vendor portal
    const results = await this.db
      .select({
        rfxId: rfxInvitations.rfxId,
        vendorId: rfxInvitations.vendorId,
        status: rfxInvitations.status,
        invitedAt: rfxInvitations.invitedAt,
        respondedAt: rfxInvitations.respondedAt,
        rfxTitle: rfxEvents.title,
        rfxReferenceNo: rfxEvents.referenceNo,
        rfxType: rfxEvents.type,
        rfxScope: rfxEvents.scope,
        rfxDueDate: rfxEvents.dueDate,
        rfxStatus: rfxEvents.status,
        rfxBudget: rfxEvents.budget,
        rfxContactPerson: rfxEvents.contactPerson,
        rfxTermsAndConditionsPath: rfxEvents.termsAndConditionsPath,
        rfxCriteria: rfxEvents.criteria,
        rfxEvaluationParameters: rfxEvents.evaluationParameters,
        rfxAttachments: rfxEvents.attachments,
      })
      .from(rfxInvitations)
      .innerJoin(rfxEvents, eq(rfxInvitations.rfxId, rfxEvents.id))
      .where(eq(rfxInvitations.vendorId, vendorId))
      .orderBy(desc(rfxEvents.createdAt));

    return results;
  }

  async updateRfxInvitationStatus(rfxId: string, vendorId: string, status: string): Promise<void> {
    await this.db
      .update(rfxInvitations)
      .set({
        status: status as any,
        respondedAt: status === 'responded' ? new Date() : undefined
      })
      .where(
        and(
          eq(rfxInvitations.rfxId, rfxId),
          eq(rfxInvitations.vendorId, vendorId)
        )
      );
  }

  async createRfxResponse(data: {
    rfxId: string;
    vendorId: string;
    response?: any;
    quotedPrice?: number;
    deliveryTerms?: string;
    paymentTerms?: string;
    leadTime?: number;
    attachments?: string[];
    termsAccepted?: boolean;
    companyName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  }): Promise<RfxResponse> {
    const id = uuidv4();
    const now = new Date();

    console.log('Creating RFx response with data:', data);

    const responseData = {
      companyDetails: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone
      },
      responseDetails: data.response || {},
      termsAccepted: data.termsAccepted || false
    };

    // Ensure attachments is properly formatted for PostgreSQL array field
    const attachmentsArray = Array.isArray(data.attachments) ? data.attachments : [];

    const [response] = await this.db
      .insert(rfxResponses)
      .values({
        id,
        rfxId: data.rfxId,
        vendorId: data.vendorId,
        response: responseData,
        quotedPrice: data.quotedPrice ? data.quotedPrice.toString() : null,
        deliveryTerms: data.deliveryTerms,
        paymentTerms: data.paymentTerms,
        leadTime: data.leadTime,
        attachments: attachmentsArray, // PostgreSQL array of text
        submittedAt: now,
      })
      .returning();

    console.log('RFx response created successfully:', response);
    return response;
  }

  async getRfxResponses(filters?: { rfxId?: string; vendorId?: string }): Promise<any[]> {
    const conditions = [];

    if (filters?.rfxId) {
      conditions.push(eq(rfxResponses.rfxId, filters.rfxId));
    }

    if (filters?.vendorId) {
      conditions.push(eq(rfxResponses.vendorId, filters.vendorId));
    }

    // Join with vendors table to get vendor information
    const responsesWithVendors = await this.db
      .select({
        id: rfxResponses.id,
        rfxId: rfxResponses.rfxId,
        vendorId: rfxResponses.vendorId,
        response: rfxResponses.response,
        quotedPrice: rfxResponses.quotedPrice,
        deliveryTerms: rfxResponses.deliveryTerms,
        paymentTerms: rfxResponses.paymentTerms,
        leadTime: rfxResponses.leadTime,
        attachments: rfxResponses.attachments,
        submittedAt: rfxResponses.submittedAt,
        vendor: {
          id: vendors.id,
          companyName: vendors.companyName,
          email: vendors.email,
          contactPerson: vendors.contactPerson,
          phone: vendors.phone,
          address: vendors.address,
        }
      })
      .from(rfxResponses)
      .leftJoin(vendors, eq(rfxResponses.vendorId, vendors.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(rfxResponses.submittedAt));

    return responsesWithVendors;
  }

  async getRfxResponsesByVendor(vendorId: string): Promise<RfxResponse[]> {
    return await this.db
      .select()
      .from(rfxResponses)
      .where(eq(rfxResponses.vendorId, vendorId))
      .orderBy(desc(rfxResponses.submittedAt));
  }

  async getChildRfxEvents(parentRfxId: string): Promise<RfxEvent[]> {
    return await this.db
      .select()
      .from(rfxEvents)
      .where(eq(rfxEvents.parentRfxId, parentRfxId))
      .orderBy(rfxEvents.createdAt);
  }

  // Auction operations
  async createAuction(auction: InsertAuction): Promise<Auction> {
    try {
      console.log("Storage - Creating auction with data:", JSON.stringify(auction, null, 2));

      // Ensure all required fields are present and properly formatted
      const auctionData = {
        id: auction.id || uuidv4(),
        name: auction.name,
        description: auction.description,
        bomId: auction.bomId || null,
        selectedBomItems: auction.selectedBomItems || [],
        selectedVendors: auction.selectedVendors || [],
        reservePrice: auction.reservePrice,
        startTime: auction.startTime,
        endTime: auction.endTime,
        status: auction.status || 'scheduled',
        termsAndConditionsPath: auction.termsAndConditionsPath || null,
        currentBid: auction.currentBid || null,
        leadingVendorId: auction.leadingVendorId || null,
        winnerId: auction.winnerId || null,
        winningBid: auction.winningBid || null,
        createdBy: auction.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("Storage - Inserting auction data:", JSON.stringify(auctionData, null, 2));
      const [newAuction] = await this.db.insert(auctions).values(auctionData).returning();
      console.log("Storage - Auction created successfully:", newAuction.id);
      return newAuction;
    } catch (error) {
      console.error("Storage - Error creating auction:", error);
      throw error;
    }
  }

  async getAuction(id: string): Promise<Auction | undefined> {
    const [auction] = await this.db.select().from(auctions).where(eq(auctions.id, id));

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

    const auctionList = await this.db
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
    const auctionList = await this.db
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
    const results = await this.db
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
    return await this.db
      .select()
      .from(rfxResponses)
      .where(eq(rfxResponses.vendorId, vendorId))
      .orderBy(desc(rfxResponses.submittedAt));
  }

  async updateAuction(id: string, updates: Partial<InsertAuction>): Promise<Auction> {
    const [result] = await this.db.update(auctions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(auctions.id, id))
      .returning();
    return result;
  }

  async updateAuctionStatus(id: string, status: string): Promise<Auction> {
    const [result] = await this.db.update(auctions)
      .set({ status, updatedAt: new Date() })
      .where(eq(auctions.id, id))
      .returning();
    return result;
  }

  async updateAuctionCurrentBid(id: string, amount: string): Promise<void> {
    await this.db.update(auctions)
      .set({ currentBid: amount, updatedAt: new Date() })
      .where(eq(auctions.id, id));
  }

  async createAuctionParticipant(participant: InsertAuctionParticipant): Promise<AuctionParticipant> {
    const [newParticipant] = await this.db.insert(auctionParticipants).values(participant).returning();
    return newParticipant;
  }

  async getAuctionParticipants(auctionId: string): Promise<AuctionParticipant[]> {
    return await this.db.select().from(auctionParticipants).where(eq(auctionParticipants.auctionId, auctionId));
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const bidData = {
      id: bid.id || uuidv4(),
      auctionId: bid.auctionId,
      vendorId: bid.vendorId,
      amount: bid.amount,
      status: bid.status || 'active',
      timestamp: new Date(),
    };
    const [newBid] = await this.db.insert(bids).values(bidData).returning();
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

    return await this.db
      .select()
      .from(bids)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bids.timestamp));
  }

  async getAuctionBids(auctionId: string): Promise<any[]> {
    console.log(`DEBUG: Getting bids for auction ${auctionId}`);
    const bidResults = await this.db
      .select({
        id: bids.id,
        auctionId: bids.auctionId,
        vendorId: bids.vendorId,
        amount: bids.amount,
        timestamp: bids.timestamp,
        isWinning: bids.isWinning,
        vendorCompanyName: vendors.companyName,
        vendorEmail: vendors.email,
        vendorContactPerson: vendors.contactPerson
      })
      .from(bids)
      .leftJoin(vendors, eq(bids.vendorId, vendors.id))
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.timestamp));

    console.log(`DEBUG: Raw bid results from DB with vendor info:`, bidResults);
    return bidResults;
  }

  async getLatestBid(auctionId: string): Promise<Bid | undefined> {
    const [latestBid] = await this.db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.timestamp))
      .limit(1);
    return latestBid;
  }

  async getAuctionItems(auctionId: string): Promise<any[]> {
    // Get auction details to find BOM items
    const auction = await this.getAuction(auctionId);
    if (!auction || !auction.bomId) {
      return [];
    }

    // Get BOM items for the auction
    const bomItems = await this.getBomItems(auction.bomId);
    return bomItems;
  }

  // Challenge Price operations
  async createChallengePrice(challengePrice: InsertChallengePrice): Promise<ChallengePrice> {
    const challengeData = {
      ...challengePrice,
      id: challengePrice.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newChallengePrice] = await this.db.insert(challengePrices).values(challengeData).returning();
    return newChallengePrice;
  }

  async getChallengePrice(id: string): Promise<ChallengePrice | undefined> {
    const [challengePrice] = await this.db.select().from(challengePrices).where(eq(challengePrices.id, id));
    return challengePrice;
  }

  async getChallengePrices(filters?: { auctionId?: string; vendorId?: string; status?: string }): Promise<ChallengePrice[]> {
    const conditions = [];

    if (filters?.auctionId) {
      conditions.push(eq(challengePrices.auctionId, filters.auctionId));
    }
    if (filters?.vendorId) {
      conditions.push(eq(challengePrices.vendorId, filters.vendorId));
    }
    if (filters?.status) {
      conditions.push(eq(challengePrices.status, filters.status as any));
    }

    // Get basic challenge prices first
    const basicChallengePrices = await this.db
      .select()
      .from(challengePrices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(challengePrices.createdAt));

    // Enrich with vendor and bid information
    const enrichedChallengePrices = [];
    for (const challenge of basicChallengePrices) {
      // Get vendor details
      const [vendor] = await this.db
        .select({ companyName: vendors.companyName })
        .from(vendors)
        .where(eq(vendors.id, challenge.vendorId));

      // Get bid details
      const [bid] = await this.db
        .select({ amount: bids.amount })
        .from(bids)
        .where(eq(bids.id, challenge.bidId));

      enrichedChallengePrices.push({
        ...challenge,
        vendorCompanyName: vendor?.companyName || 'Unknown Vendor',
        originalBidAmount: bid?.amount || '0',
      });
    }

    return enrichedChallengePrices;
  }

  async updateChallengePrice(id: string, updates: Partial<InsertChallengePrice>): Promise<ChallengePrice> {
    const [challengePrice] = await this.db
      .update(challengePrices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(challengePrices.id, id))
      .returning();
    return challengePrice;
  }

  async respondToChallengePrice(id: string, status: 'accepted' | 'rejected', vendorResponse?: string): Promise<ChallengePrice> {
    const [challengePrice] = await this.db
      .update(challengePrices)
      .set({
        status,
        vendorResponse,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(challengePrices.id, id))
      .returning();
    return challengePrice;
  }

  // Counter Price operations
  async createCounterPrice(counterPrice: InsertCounterPrice): Promise<CounterPrice> {
    const counterData = {
      ...counterPrice,
      id: counterPrice.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newCounterPrice] = await this.db.insert(counterPrices).values(counterData).returning();
    return newCounterPrice;
  }

  async getCounterPrice(id: string): Promise<CounterPrice | undefined> {
    const [counterPrice] = await this.db.select().from(counterPrices).where(eq(counterPrices.id, id));
    return counterPrice;
  }

  async getCounterPrices(filters?: { challengePriceId?: string; auctionId?: string; vendorId?: string; status?: string }): Promise<CounterPrice[]> {
    const conditions = [];

    if (filters?.challengePriceId) {
      conditions.push(eq(counterPrices.challengePriceId, filters.challengePriceId));
    }
    if (filters?.auctionId) {
      conditions.push(eq(counterPrices.auctionId, filters.auctionId));
    }
    if (filters?.vendorId) {
      conditions.push(eq(counterPrices.vendorId, filters.vendorId));
    }
    if (filters?.status) {
      conditions.push(eq(counterPrices.status, filters.status as any));
    }

    return await this.db
      .select()
      .from(counterPrices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(counterPrices.createdAt));
  }

  async updateCounterPrice(id: string, updates: Partial<InsertCounterPrice>): Promise<CounterPrice> {
    const [counterPrice] = await this.db
      .update(counterPrices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(counterPrices.id, id))
      .returning();
    return counterPrice;
  }

  async respondToCounterPrice(id: string, status: 'accepted' | 'rejected', sourcingResponse?: string): Promise<CounterPrice> {
    const [counterPrice] = await this.db
      .update(counterPrices)
      .set({
        status,
        sourcingResponse,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(counterPrices.id, id))
      .returning();
    return counterPrice;
  }

  // Auction Extension operations
  async createAuctionExtension(extension: InsertAuctionExtension): Promise<AuctionExtension> {
    const extensionData = {
      ...extension,
      id: extension.id || uuidv4(),
      createdAt: new Date(),
    };
    const [newExtension] = await this.db.insert(auctionExtensions).values(extensionData).returning();
    return newExtension;
  }

  async getAuctionExtensions(auctionId: string): Promise<AuctionExtension[]> {
    return await this.db
      .select()
      .from(auctionExtensions)
      .where(eq(auctionExtensions.auctionId, auctionId))
      .orderBy(desc(auctionExtensions.createdAt));
  }

  async extendAuction(auctionId: string, durationMinutes: number, reason: string, extendedBy: string): Promise<{ auction: Auction; extension: AuctionExtension }> {
    // Get current auction
    const auction = await this.getAuction(auctionId);
    if (!auction) {
      throw new Error('Auction not found');
    }

    // Check if auction can be extended
    if (auction.extensionCount >= auction.maxExtensions) {
      throw new Error('Maximum extensions reached');
    }

    // Calculate new end time
    const currentEndTime = new Date(auction.endTime);
    const newEndTime = new Date(currentEndTime.getTime() + durationMinutes * 60 * 1000);

    // Update auction
    const updatedAuction = await this.updateAuction(auctionId, {
      endTime: newEndTime,
      extensionCount: auction.extensionCount + 1,
    });

    // Create extension record
    const extension = await this.createAuctionExtension({
      auctionId,
      originalEndTime: currentEndTime,
      newEndTime,
      durationMinutes,
      reason,
      extendedBy,
    });

    return { auction: updatedAuction, extension };
  }

  // Purchase Order operations
  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // Get vendor details to populate PO format fields
    let vendorDetails = null;
    if (po.vendorId) {
      vendorDetails = await this.getVendor(po.vendorId);
    }

    // Get buyer organization details
    const buyerUser = await this.getUser(po.createdBy);
    let buyerOrg = null;
    if (buyerUser?.organizationId) {
      buyerOrg = await this.getOrganization(buyerUser.organizationId);
    }

    // Enhance PO data with required format fields
    const enhancedPo = {
      ...po,
      // Buyer Information
      buyerName: buyerOrg?.name || "SCLEN Procurement",
      buyerBranchName: buyerOrg?.name || "Head Office",
      buyerAddress: buyerOrg?.address || "",
      buyerGstin: buyerOrg?.gstNumber || "",

      // Vendor Information
      vendorName: vendorDetails?.companyName || "",
      vendorAddress: vendorDetails?.address || "",
      vendorGstin: vendorDetails?.gstNumber || "",

      // PO Details
      poDate: new Date(),
      taxAmount: po.taxAmount || "0",
      authorizedSignatory: buyerUser?.firstName && buyerUser?.lastName
        ? `${buyerUser.firstName} ${buyerUser.lastName}`
        : "Authorized Signatory",
    };

    const [newPo] = await this.db.insert(purchaseOrders).values(enhancedPo).returning();
    return newPo;
  }

  async getPurchaseOrder(id: string): Promise<any | undefined> {
    const [po] = await this.db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorId: purchaseOrders.vendorId,
        rfxId: purchaseOrders.rfxId,
        auctionId: purchaseOrders.auctionId,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        termsAndConditions: purchaseOrders.termsAndConditions,
        termsAndConditionsPath: purchaseOrders.termsAndConditionsPath,
        deliverySchedule: purchaseOrders.deliverySchedule,
        paymentTerms: purchaseOrders.paymentTerms,
        attachments: purchaseOrders.attachments,
        acknowledgedAt: purchaseOrders.acknowledgedAt,
        approvedBy: purchaseOrders.approvedBy,
        approvedAt: purchaseOrders.approvedAt,
        approvalComments: purchaseOrders.approvalComments,
        createdBy: purchaseOrders.createdBy,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        vendorName: vendors.companyName,
        vendorEmail: vendors.email,
        vendorContactPerson: vendors.contactPerson,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, id));
    return po;
  }

  async getPurchaseOrders(filters?: { status?: string; vendorId?: string; createdBy?: string }): Promise<any[]> {
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

    const results = await this.db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorId: purchaseOrders.vendorId,
        rfxId: purchaseOrders.rfxId,
        auctionId: purchaseOrders.auctionId,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        termsAndConditions: purchaseOrders.termsAndConditions,
        termsAndConditionsPath: purchaseOrders.termsAndConditionsPath,
        deliverySchedule: purchaseOrders.deliverySchedule,
        paymentTerms: purchaseOrders.paymentTerms,
        attachments: purchaseOrders.attachments,
        acknowledgedAt: purchaseOrders.acknowledgedAt,
        approvedBy: purchaseOrders.approvedBy,
        approvedAt: purchaseOrders.approvedAt,
        approvalComments: purchaseOrders.approvalComments,
        createdBy: purchaseOrders.createdBy,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        vendorName: vendors.companyName,
        vendorEmail: vendors.email,
        vendorContactPerson: vendors.contactPerson,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchaseOrders.createdAt));

    return results;
  }

  async updatePurchaseOrder(id: string, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    // For acknowledge operation, only update specific fields to avoid column mismatch
    if (updates.status === 'acknowledged') {
      const [po] = await this.db
        .update(purchaseOrders)
        .set({
          status: 'acknowledged',
          acknowledgedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, id))
        .returning();
      return po;
    }

    // For other operations, handle normally
    const updateData: any = {
      updatedAt: new Date(),
      ...updates
    };

    // If status is being updated to approved, set approvedAt if not already set
    if (updates.status === 'approved' && !updates.approvedAt) {
      updateData.approvedAt = new Date();
    }

    const [po] = await this.db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po;
  }

  async createPoLineItem(lineItem: InsertPoLineItem): Promise<PoLineItem> {
    // Calculate taxable value if not provided
    const quantity = parseFloat(lineItem.quantity);
    const unitPrice = parseFloat(lineItem.unitPrice);
    const taxableValue = lineItem.taxableValue || (quantity * unitPrice).toString();

    const enhancedLineItem = {
      ...lineItem,
      taxableValue,
      // Set HSN code if not provided (default for general goods)
      hsnCode: lineItem.hsnCode || "9999",
      // Set UOM if not provided
      uom: lineItem.uom || "NOS",
    };

    const [newLineItem] = await this.db.insert(poLineItems).values(enhancedLineItem).returning();
    return newLineItem;
  }

  async getPoLineItems(poId: string): Promise<PoLineItem[]> {
    return await this.db.select().from(poLineItems).where(eq(poLineItems.poId, poId));
  }

  // Approval operations
  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [newApproval] = await this.db.insert(approvals).values(approval).returning();
    return newApproval;
  }

  async getApprovals(approverId: string): Promise<Approval[]> {
    return await this.db.select().from(approvals).where(eq(approvals.approverId, approverId)).orderBy(desc(approvals.createdAt));
  }

  async updateApproval(id: string, updates: Partial<InsertApproval>): Promise<Approval> {
    const [approval] = await this.db
      .update(approvals)
      .set({ ...updates, approvedAt: updates.status === 'approved' ? new Date() : undefined })
      .where(eq(approvals.id, id))
      .returning();
    return approval;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await this.db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    // Delete line items first (due to foreign key constraint)
    await this.db.delete(poLineItems).where(eq(poLineItems.poId, id));
    // Delete the purchase order
    await this.db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  // Direct Procurement operations
  async createDirectProcurementOrder(order: InsertDirectProcurementOrder): Promise<DirectProcurementOrder> {
    const [created] = await this.db.insert(directProcurementOrders).values(order).returning();
    return created;
  }

  async getDirectProcurementOrders(userId?: string): Promise<any[]> {
    let query = this.db.select({
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
    const [order] = await this.db.select({
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
    const [updated] = await this.db.update(directProcurementOrders)
      .set({
        status: status as any,
        updatedAt: new Date()
      })
      .where(eq(directProcurementOrders.id, id))
      .returning();
    return updated;
  }

  async deleteDirectProcurementOrder(id: string): Promise<void> {
    await this.db.delete(directProcurementOrders).where(eq(directProcurementOrders.id, id));
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
    const [newAcceptance] = await this.db
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
    const [acceptance] = await this.db
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
    const [acceptance] = await this.db
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
    return await this.db
      .select()
      .from(termsAcceptance)
      .where(eq(termsAcceptance.vendorId, vendorId))
      .orderBy(desc(termsAcceptance.acceptedAt));
  }

  // Procurement Request operations
  async createProcurementRequest(request: InsertProcurementRequest): Promise<ProcurementRequest> {
    const requestNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const requestData = {
      ...request,
      requestNumber,
    };
    const [created] = await this.db.insert(procurementRequests).values(requestData).returning();
    this.procurementRequests.push(created); // Add to in-memory store
    return created;
  }

  async getProcurementRequests(filters?: { requestedBy?: string; department?: string; status?: string }): Promise<ProcurementRequest[]> {
    const conditions = [];

    if (filters?.requestedBy) {
      conditions.push(eq(procurementRequests.requestedBy, filters.requestedBy));
    }

    if (filters?.department) {
      conditions.push(eq(procurementRequests.department, filters.department));
    }

    if (filters?.status) {
      conditions.push(eq(procurementRequests.overallStatus, filters.status as any));
    }

    // Fetch from DB and return
    return await this.db
      .select()
      .from(procurementRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(procurementRequests.createdAt));
  }

  async getProcurementRequest(id: string): Promise<ProcurementRequest | undefined> {
    const [request] = await this.db
      .select()
      .from(procurementRequests)
      .where(eq(procurementRequests.id, id));
    return request;
  }

  async updateProcurementRequest(id: string, updates: Partial<ProcurementRequest>): Promise<ProcurementRequest> {
    const [updated] = await this.db
      .update(procurementRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(procurementRequests.id, id))
      .returning();
    // Update in-memory store
    if (updated) {
      const index = this.procurementRequests.findIndex(pr => pr.id === id);
      if (index !== -1) {
        this.procurementRequests[index] = updated;
      }
    }
    return updated;
  }

  async deleteProcurementRequest(id: string): Promise<void> {
    // Delete from DB
    await this.db.delete(procurementRequests).where(eq(procurementRequests.id, id));
    // Remove from in-memory store
    this.procurementRequests = this.procurementRequests.filter(pr => pr.id !== id);
  }

  // Approval Configuration operations
  async createApprovalConfiguration(config: InsertApprovalConfiguration): Promise<ApprovalConfiguration> {
    const [created] = await this.db.insert(approvalConfigurations).values(config).returning();
    return created;
  }

  async getApprovalConfigurations(filters?: { approvalType?: string; department?: string }): Promise<ApprovalConfiguration[]> {
    const conditions = [eq(approvalConfigurations.isActive, true)];

    if (filters?.approvalType) {
      conditions.push(eq(approvalConfigurations.approvalType, filters.approvalType as any));
    }

    if (filters?.department) {
      conditions.push(eq(approvalConfigurations.department, filters.department));
    }

    return await this.db
      .select()
      .from(approvalConfigurations)
      .where(and(...conditions))
      .orderBy(desc(approvalConfigurations.createdAt));
  }

  async getApprovalConfiguration(id: string): Promise<ApprovalConfiguration | undefined> {
    const [config] = await this.db
      .select()
      .from(approvalConfigurations)
      .where(eq(approvalConfigurations.id, id));
    return config;
  }

  async updateApprovalConfiguration(id: string, updates: Partial<ApprovalConfiguration>): Promise<ApprovalConfiguration> {
    const [updated] = await this.db
      .update(approvalConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(approvalConfigurations.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalConfiguration(id: string): Promise<void> {
    await this.db.delete(approvalConfigurations).where(eq(approvalConfigurations.id, id));
  }

  // Approval History operations
  async createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory> {
    const [created] = await this.db.insert(approvalHistory).values(history).returning();
    return created;
  }

  async getApprovalHistory(filters?: { entityId?: string; approverId?: string; status?: string }): Promise<ApprovalHistory[]> {
    const conditions = [];

    if (filters?.entityId) {
      conditions.push(eq(approvalHistory.entityId, filters.entityId));
    }

    if (filters?.approverId) {
      conditions.push(eq(approvalHistory.approverId, filters.approverId));
    }

    if (filters?.status) {
      conditions.push(eq(approvalHistory.status, filters.status as any));
    }

    return await this.db
      .select()
      .from(approvalHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(approvalHistory.createdAt));
  }

  async updateApprovalHistory(id: string, updates: Partial<ApprovalHistory>): Promise<ApprovalHistory> {
    const [updated] = await this.db
      .update(approvalHistory)
      .set({ ...updates, processedAt: updates.processedAt || new Date() })
      .where(eq(approvalHistory.id, id))
      .returning();
    return updated;
  }

  // ===== DEPARTMENTS OPERATIONS =====

  async getDepartments(): Promise<Department[]> {
    return await this.db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));
  }

  async getDepartment(id: string): Promise<Department | null> {
    const [department] = await this.db
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    return department || null;
  }

  async createDepartment(data: InsertDepartment): Promise<Department> {
    const [created] = await this.db
      .insert(departments)
      .values(data)
      .returning();
    return created;
  }

  async updateDepartment(id: string, data: Partial<Department>): Promise<Department | null> {
    const [updated] = await this.db
      .update(departments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated || null;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const result = await this.db
      .delete(departments)
      .where(eq(departments.id, id));
    return result.rowCount > 0;
  }

  // Sourcing Intake operations
  async createSourcingEvent(data: InsertSourcingEvent): Promise<SourcingEvent> {
    try {
      const eventNumber = `SE-${Date.now()}`;
      const sourcingEventData = {
        ...data,
        id: nanoid(),
        eventNumber,
        status: 'PENDING_SM_APPROVAL' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [sourcingEvent] = await this.db
        .insert(sourcingEvents)
        .values(sourcingEventData)
        .returning();

      return sourcingEvent;
    } catch (error) {
      console.error("Error creating sourcing event:", error);
      throw error;
    }
  }

  async getSourcingEvents(filters: { status?: string; createdBy?: string } = {}): Promise<SourcingEvent[]> {
    try {
      let query = this.db.select().from(sourcingEvents);
      
      if (filters.status) {
        query = query.where(eq(sourcingEvents.status, filters.status));
      }
      if (filters.createdBy) {
        query = query.where(eq(sourcingEvents.createdBy, filters.createdBy));
      }

      const events = await query.orderBy(desc(sourcingEvents.createdAt));
      return events;
    } catch (error) {
      console.error("Error fetching sourcing events:", error);
      throw error;
    }
  }

  async getSourcingEventsByStatus(statuses: string[]): Promise<SourcingEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(sourcingEvents)
        .where(inArray(sourcingEvents.status, statuses))
        .orderBy(desc(sourcingEvents.createdAt));
      
      return events;
    } catch (error) {
      console.error("Error fetching sourcing events by status:", error);
      throw error;
    }
  }

  async getSourcingEvent(id: string): Promise<SourcingEvent | undefined> {
    try {
      const [event] = await this.db
        .select()
        .from(sourcingEvents)
        .where(eq(sourcingEvents.id, id))
        .limit(1);
      
      return event;
    } catch (error) {
      console.error("Error fetching sourcing event:", error);
      throw error;
    }
  }

  async updateSourcingEvent(id: string, updates: Partial<SourcingEvent>): Promise<SourcingEvent> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const [updatedEvent] = await this.db
        .update(sourcingEvents)
        .set(updateData)
        .where(eq(sourcingEvents.id, id))
        .returning();

      return updatedEvent;
    } catch (error) {
      console.error("Error updating sourcing event:", error);
      throw error;
    }
  }

  async getProcurementRequestsByStatus(statuses: string[]): Promise<ProcurementRequest[]> {
    try {
      const requests = await this.db
        .select()
        .from(procurementRequests)
        .where(inArray(procurementRequests.requestApprovalStatus, statuses))
        .orderBy(desc(procurementRequests.createdAt));
      
      return requests;
    } catch (error) {
      console.error("Error fetching procurement requests by status:", error);
      throw error;
    }
  }

  // Dropdown Configuration operations
  async createDropdownConfiguration(config: InsertDropdownConfiguration): Promise<DropdownConfiguration> {
    try {
      const [newConfig] = await this.db
        .insert(dropdownConfigurations)
        .values(config)
        .returning();
      return newConfig;
    } catch (error) {
      console.error("Error creating dropdown configuration:", error);
      throw error;
    }
  }

  async getDropdownConfiguration(id: string): Promise<DropdownConfiguration | undefined> {
    try {
      const [config] = await this.db
        .select()
        .from(dropdownConfigurations)
        .where(eq(dropdownConfigurations.id, id))
        .limit(1);
      return config;
    } catch (error) {
      console.error("Error fetching dropdown configuration:", error);
      throw error;
    }
  }

  async getDropdownConfigurations(filters?: { screen?: string; category?: string; isActive?: boolean }): Promise<DropdownConfiguration[]> {
    try {
      let query = this.db.select().from(dropdownConfigurations);
      const conditions = [];

      if (filters?.screen) {
        conditions.push(eq(dropdownConfigurations.screen, filters.screen));
      }

      if (filters?.category) {
        conditions.push(eq(dropdownConfigurations.category, filters.category));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(dropdownConfigurations.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(asc(dropdownConfigurations.sortOrder), asc(dropdownConfigurations.displayName));
    } catch (error) {
      console.error("Error fetching dropdown configurations:", error);
      throw error;
    }
  }

  async updateDropdownConfiguration(id: string, updates: Partial<InsertDropdownConfiguration>): Promise<DropdownConfiguration> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const [updatedConfig] = await this.db
        .update(dropdownConfigurations)
        .set(updateData)
        .where(eq(dropdownConfigurations.id, id))
        .returning();

      return updatedConfig;
    } catch (error) {
      console.error("Error updating dropdown configuration:", error);
      throw error;
    }
  }

  async deleteDropdownConfiguration(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(dropdownConfigurations)
        .where(eq(dropdownConfigurations.id, id));
      
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error("Error deleting dropdown configuration:", error);
      throw error;
    }
  }

  // Dropdown Option operations
  async createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption> {
    try {
      const [newOption] = await this.db
        .insert(dropdownOptions)
        .values(option)
        .returning();
      return newOption;
    } catch (error) {
      console.error("Error creating dropdown option:", error);
      throw error;
    }
  }

  async getDropdownOption(id: string): Promise<DropdownOption | undefined> {
    try {
      const [option] = await this.db
        .select()
        .from(dropdownOptions)
        .where(eq(dropdownOptions.id, id))
        .limit(1);
      return option;
    } catch (error) {
      console.error("Error fetching dropdown option:", error);
      throw error;
    }
  }

  async getDropdownOptions(configurationId: string): Promise<DropdownOption[]> {
    try {
      const options = await this.db
        .select()
        .from(dropdownOptions)
        .where(and(
          eq(dropdownOptions.configurationId, configurationId),
          eq(dropdownOptions.isActive, true)
        ))
        .orderBy(asc(dropdownOptions.sortOrder), asc(dropdownOptions.label));
      
      return options;
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
      throw error;
    }
  }

  async getDropdownOptionsByScreen(screen: string): Promise<{ [key: string]: DropdownOption[] }> {
    try {
      const result = await this.db
        .select({
          config: dropdownConfigurations,
          option: dropdownOptions
        })
        .from(dropdownConfigurations)
        .innerJoin(dropdownOptions, eq(dropdownOptions.configurationId, dropdownConfigurations.id))
        .where(and(
          eq(dropdownConfigurations.screen, screen),
          eq(dropdownConfigurations.isActive, true),
          eq(dropdownOptions.isActive, true)
        ))
        .orderBy(
          asc(dropdownConfigurations.sortOrder),
          asc(dropdownOptions.sortOrder),
          asc(dropdownOptions.label)
        );

      // Group options by field name
      const grouped: { [key: string]: DropdownOption[] } = {};
      
      for (const row of result) {
        const fieldName = row.config.fieldName;
        if (!grouped[fieldName]) {
          grouped[fieldName] = [];
        }
        grouped[fieldName].push(row.option);
      }

      return grouped;
    } catch (error) {
      console.error("Error fetching dropdown options by screen:", error);
      throw error;
    }
  }

  async updateDropdownOption(id: string, updates: Partial<InsertDropdownOption>): Promise<DropdownOption> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const [updatedOption] = await this.db
        .update(dropdownOptions)
        .set(updateData)
        .where(eq(dropdownOptions.id, id))
        .returning();

      return updatedOption;
    } catch (error) {
      console.error("Error updating dropdown option:", error);
      throw error;
    }
  }

  async deleteDropdownOption(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(dropdownOptions)
        .where(eq(dropdownOptions.id, id));
      
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error("Error deleting dropdown option:", error);
      throw error;
    }
  }

  async bulkUpdateDropdownOptions(configurationId: string, options: InsertDropdownOption[]): Promise<DropdownOption[]> {
    try {
      // First, delete existing options
      await this.db
        .delete(dropdownOptions)
        .where(eq(dropdownOptions.configurationId, configurationId));

      // Then insert new options
      if (options.length === 0) {
        return [];
      }

      const newOptions = await this.db
        .insert(dropdownOptions)
        .values(options.map(option => ({ ...option, configurationId })))
        .returning();

      return newOptions;
    } catch (error) {
      console.error("Error bulk updating dropdown options:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();