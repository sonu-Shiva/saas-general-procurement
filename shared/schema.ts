import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["buyer_admin", "buyer_user", "sourcing_manager", "vendor"] }).notNull().default("buyer_user"),
  organizationId: varchar("organization_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  gstNumber: varchar("gst_number", { length: 50 }),
  panNumber: varchar("pan_number", { length: 50 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  panNumber: varchar("pan_number", { length: 50 }),
  gstNumber: varchar("gst_number", { length: 50 }),
  tanNumber: varchar("tan_number", { length: 50 }),
  bankDetails: jsonb("bank_details"),
  address: text("address"),
  logoUrl: varchar("logo_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  categories: text("categories").array(),
  certifications: text("certifications").array(),
  yearsOfExperience: integer("years_of_experience"),
  officeLocations: text("office_locations").array(),
  status: varchar("status", { enum: ["pending", "approved", "rejected", "suspended", "inactive"] }).default("pending"),
  tags: text("tags").array(),
  performanceScore: decimal("performance_score", { precision: 3, scale: 2 }),
  userId: varchar("user_id").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Categories - Hierarchical category system
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).unique().notNull(), // e.g., "1.1.1", "1.2", etc.
  description: text("description"),
  parentId: uuid("parent_id"),
  level: integer("level").notNull().default(1), // 1 = top level, 2 = second level, etc.
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  internalCode: varchar("internal_code", { length: 100 }),
  externalCode: varchar("external_code", { length: 100 }),
  description: text("description"),
  categoryId: uuid("category_id").references(() => productCategories.id),
  category: varchar("category", { length: 255 }), // Legacy field, keep for backward compatibility
  subCategory: varchar("sub_category", { length: 255 }), // Legacy field
  uom: varchar("uom", { length: 50 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  specifications: jsonb("specifications"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const boms = pgTable("boms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).default("1.0"),
  description: text("description"),
  category: varchar("category", { length: 255 }),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueNameVersion: unique("unique_bom_name_version").on(table.name, table.version),
}));

export const bomItems = pgTable("bom_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bomId: uuid("bom_id").references(() => boms.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  itemCode: varchar("item_code", { length: 100 }),
  description: text("description"),
  category: varchar("category", { length: 255 }),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  uom: varchar("uom", { length: 50 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  specifications: jsonb("specifications"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rfxEvents = pgTable("rfx_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  referenceNo: varchar("reference_no", { length: 100 }).unique(),
  type: varchar("type", { enum: ["rfi", "rfp", "rfq"] }).notNull(),
  scope: text("scope"),
  criteria: text("criteria"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { enum: ["draft", "published", "active", "closed", "cancelled"] }).default("draft"),
  evaluationParameters: jsonb("evaluation_parameters"),
  attachments: text("attachments").array(),
  bomId: uuid("bom_id").references(() => boms.id),
  contactPerson: varchar("contact_person", { length: 255 }),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  parentRfxId: uuid("parent_rfx_id"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rfxInvitations = pgTable("rfx_invitations", {
  rfxId: uuid("rfx_id").references(() => rfxEvents.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  status: varchar("status", { enum: ["invited", "viewed", "responded", "declined"] }).default("invited"),
  invitedAt: timestamp("invited_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => ({
  pk: primaryKey({ columns: [table.rfxId, table.vendorId] }),
}));

export const rfxResponses = pgTable("rfx_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  rfxId: uuid("rfx_id").references(() => rfxEvents.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  response: jsonb("response"),
  quotedPrice: decimal("quoted_price", { precision: 12, scale: 2 }),
  deliveryTerms: text("delivery_terms"),
  paymentTerms: text("payment_terms"),
  leadTime: integer("lead_time"),
  attachments: text("attachments").array(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const auctions = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  items: jsonb("items"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  reservePrice: decimal("reserve_price", { precision: 12, scale: 2 }),
  currentBid: decimal("current_bid", { precision: 12, scale: 2 }),
  bidRules: jsonb("bid_rules"),
  status: varchar("status", { enum: ["scheduled", "live", "completed", "cancelled"] }).default("scheduled"),
  winnerId: uuid("winner_id").references(() => vendors.id),
  winningBid: decimal("winning_bid", { precision: 12, scale: 2 }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auctionParticipants = pgTable("auction_participants", {
  auctionId: uuid("auction_id").references(() => auctions.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.auctionId, table.vendorId] }),
}));

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").references(() => auctions.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  isWinning: boolean("is_winning").default(false),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  poNumber: varchar("po_number", { length: 100 }).unique().notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  rfxId: uuid("rfx_id").references(() => rfxEvents.id),
  auctionId: uuid("auction_id").references(() => auctions.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["draft", "pending_approval", "approved", "rejected", "issued", "acknowledged", "shipped", "delivered", "invoiced", "paid", "cancelled"] }).default("pending_approval"),
  termsAndConditions: text("terms_and_conditions"),
  deliverySchedule: jsonb("delivery_schedule"),
  paymentTerms: text("payment_terms"),
  attachments: text("attachments").array(),
  acknowledgedAt: timestamp("acknowledged_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalComments: text("approval_comments"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const poLineItems = pgTable("po_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  poId: uuid("po_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id), // Allow null for BOM-based orders
  itemName: varchar("item_name", { length: 255 }), // For BOM-based orders where productId is null
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  deliveryDate: timestamp("delivery_date"),
  status: varchar("status", { enum: ["pending", "shipped", "delivered"] }).default("pending"),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { enum: ["vendor", "rfx", "po", "budget"] }).notNull(),
  entityId: uuid("entity_id").notNull(),
  approverId: varchar("approver_id").references(() => users.id).notNull(),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  type: varchar("type", { enum: ["info", "warning", "success", "error"] }).default("info"),
  isRead: boolean("is_read").default(false),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: uuid("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Direct Procurement Orders Table (BOM-based)
export const directProcurementOrders = pgTable("direct_procurement_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceNo: varchar("reference_no", { length: 100 }).unique(),
  bomId: uuid("bom_id").references(() => boms.id).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  bomItems: jsonb("bom_items").notNull(), // Array of BOM items with pricing: bomItemId, productName, requestedQuantity, unitPrice, totalPrice, specifications
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["draft", "pending_approval", "submitted", "approved", "rejected", "delivered", "cancelled"] }).default("pending_approval"),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  deliveryDate: timestamp("delivery_date").notNull(),
  paymentTerms: varchar("payment_terms", { length: 100 }).notNull(),
  notes: text("notes"),
  approvalWorkflow: jsonb("approval_workflow"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  vendorProfile: one(vendors, {
    fields: [users.id],
    references: [vendors.userId],
  }),
  createdVendors: many(vendors, { relationName: "createdVendors" }),
  createdProducts: many(products, { relationName: "createdProducts" }),
  approvedProducts: many(products, { relationName: "approvedProducts" }),
  createdBoms: many(boms),
  createdRfxEvents: many(rfxEvents),
  createdAuctions: many(auctions),
  createdPurchaseOrders: many(purchaseOrders),
  createdDirectProcurementOrders: many(directProcurementOrders),
  approvals: many(approvals),
  notifications: many(notifications),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [vendors.createdBy],
    references: [users.id],
    relationName: "createdVendors",
  }),
  rfxInvitations: many(rfxInvitations),
  rfxResponses: many(rfxResponses),
  auctionParticipants: many(auctionParticipants),
  bids: many(bids),
  purchaseOrders: many(purchaseOrders),
  directProcurementOrders: many(directProcurementOrders),
}));

// Direct Procurement Orders Relations
export const directProcurementOrdersRelations = relations(directProcurementOrders, ({ one }) => ({
  bom: one(boms, {
    fields: [directProcurementOrders.bomId],
    references: [boms.id],
  }),
  vendor: one(vendors, {
    fields: [directProcurementOrders.vendorId],
    references: [vendors.id],
  }),
  createdBy: one(users, {
    fields: [directProcurementOrders.createdBy],
    references: [users.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: "categoryParent",
  }),
  children: many(productCategories, { relationName: "categoryParent" }),
  products: many(products),
  createdBy: one(users, {
    fields: [productCategories.createdBy],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  createdBy: one(users, {
    fields: [products.createdBy],
    references: [users.id],
    relationName: "createdProducts",
  }),
  approvedBy: one(users, {
    fields: [products.approvedBy],
    references: [users.id],
    relationName: "approvedProducts",
  }),
  bomItems: many(bomItems),
  poLineItems: many(poLineItems),
}));

export const bomsRelations = relations(boms, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [boms.createdBy],
    references: [users.id],
  }),
  bomItems: many(bomItems),
  rfxEvents: many(rfxEvents),

}));

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
  bom: one(boms, {
    fields: [bomItems.bomId],
    references: [boms.id],
  }),
  product: one(products, {
    fields: [bomItems.productId],
    references: [products.id],
  }),
}));

export const rfxEventsRelations = relations(rfxEvents, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [rfxEvents.createdBy],
    references: [users.id],
  }),
  bom: one(boms, {
    fields: [rfxEvents.bomId],
    references: [boms.id],
  }),
  parent: one(rfxEvents, {
    fields: [rfxEvents.parentRfxId],
    references: [rfxEvents.id],
    relationName: "parentChild"
  }),
  children: many(rfxEvents, { relationName: "parentChild" }),
  invitations: many(rfxInvitations),
  responses: many(rfxResponses),
  purchaseOrders: many(purchaseOrders),
}));

export const rfxInvitationsRelations = relations(rfxInvitations, ({ one }) => ({
  rfxEvent: one(rfxEvents, {
    fields: [rfxInvitations.rfxId],
    references: [rfxEvents.id],
  }),
  vendor: one(vendors, {
    fields: [rfxInvitations.vendorId],
    references: [vendors.id],
  }),
}));

export const rfxResponsesRelations = relations(rfxResponses, ({ one }) => ({
  rfxEvent: one(rfxEvents, {
    fields: [rfxResponses.rfxId],
    references: [rfxEvents.id],
  }),
  vendor: one(vendors, {
    fields: [rfxResponses.vendorId],
    references: [vendors.id],
  }),
}));

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [auctions.createdBy],
    references: [users.id],
  }),
  winner: one(vendors, {
    fields: [auctions.winnerId],
    references: [vendors.id],
  }),
  participants: many(auctionParticipants),
  bids: many(bids),
  purchaseOrders: many(purchaseOrders),
}));

export const auctionParticipantsRelations = relations(auctionParticipants, ({ one }) => ({
  auction: one(auctions, {
    fields: [auctionParticipants.auctionId],
    references: [auctions.id],
  }),
  vendor: one(vendors, {
    fields: [auctionParticipants.vendorId],
    references: [vendors.id],
  }),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  vendor: one(vendors, {
    fields: [bids.vendorId],
    references: [vendors.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  rfxEvent: one(rfxEvents, {
    fields: [purchaseOrders.rfxId],
    references: [rfxEvents.id],
  }),
  auction: one(auctions, {
    fields: [purchaseOrders.auctionId],
    references: [auctions.id],
  }),
  createdBy: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
    relationName: "createdPurchaseOrders",
  }),
  approvedBy: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id],
    relationName: "approvedPurchaseOrders",
  }),
  lineItems: many(poLineItems),
}));

export const poLineItemsRelations = relations(poLineItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [poLineItems.poId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [poLineItems.productId],
    references: [products.id],
  }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  approver: one(users, {
    fields: [approvals.approverId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  performanceScore: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  code: true,  // Make code optional since it's auto-generated
  level: true, // Make level optional since it's auto-generated
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  itemName: z.string().min(1, "Item name is required"),
  basePrice: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
});

export const insertBomSchema = createInsertSchema(boms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validFrom: z.union([z.string(), z.date()]).optional().transform((val) => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
  validTo: z.union([z.string(), z.date()]).optional().transform((val) => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
});

export const insertBomItemSchema = createInsertSchema(bomItems).omit({
  id: true,
  createdAt: true,
}).extend({
  quantity: z.union([z.string(), z.number()]).transform((val) => String(val)),
  unitPrice: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
  totalPrice: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
  productId: z.string().uuid().optional(),
  itemName: z.string().min(1, "Item name is required"),
});

export const insertRfxEventSchema = createInsertSchema(rfxEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  budget: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
  dueDate: z.union([z.string(), z.date()]).optional().transform((val) => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
});

export const insertRfxInvitationSchema = createInsertSchema(rfxInvitations).omit({
  invitedAt: true,
});

export const insertRfxResponseSchema = createInsertSchema(rfxResponses).omit({
  id: true,
  submittedAt: true,
});

export const insertAuctionSchema = createInsertSchema(auctions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startingPrice: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
  reservePrice: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
  currentBid: z.union([z.string(), z.number()]).optional().transform((val) => 
    val ? String(val) : undefined
  ),
  startTime: z.union([z.string(), z.date()]).optional().transform((val) => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
  endTime: z.union([z.string(), z.date()]).optional().transform((val) => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
});

export const insertAuctionParticipantSchema = createInsertSchema(auctionParticipants).omit({
  registeredAt: true,
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  timestamp: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalAmount: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export const insertPoLineItemSchema = createInsertSchema(poLineItems).omit({
  id: true,
}).extend({
  quantity: z.union([z.string(), z.number()]).transform((val) => String(val)),
  unitPrice: z.union([z.string(), z.number()]).transform((val) => String(val)),
  lineTotal: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Direct Procurement Order Types
export type DirectProcurementOrder = typeof directProcurementOrders.$inferSelect;
export type InsertDirectProcurementOrder = typeof directProcurementOrders.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Bom = typeof boms.$inferSelect;
export type InsertBom = z.infer<typeof insertBomSchema>;
export type BomItem = typeof bomItems.$inferSelect;
export type InsertBomItem = z.infer<typeof insertBomItemSchema>;
export type RfxEvent = typeof rfxEvents.$inferSelect;
export type InsertRfxEvent = z.infer<typeof insertRfxEventSchema>;
export type RfxInvitation = typeof rfxInvitations.$inferSelect;
export type InsertRfxInvitation = z.infer<typeof insertRfxInvitationSchema>;
export type RfxResponse = typeof rfxResponses.$inferSelect;
export type InsertRfxResponse = z.infer<typeof insertRfxResponseSchema>;
export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type AuctionParticipant = typeof auctionParticipants.$inferSelect;
export type InsertAuctionParticipant = z.infer<typeof insertAuctionParticipantSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PoLineItem = typeof poLineItems.$inferSelect;
export type InsertPoLineItem = z.infer<typeof insertPoLineItemSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
