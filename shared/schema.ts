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
  role: varchar("role", { enum: ["admin", "requester", "dept_approver", "buyer", "procurement_approver", "sourcing_manager", "sourcing_exec", "vendor"] }).notNull().default("requester"),
  organizationId: varchar("organization_id"),
  department: varchar("department", { length: 100 }), // For requesters - which department they belong to
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

// Admin configurable departments table
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(), // Short code like "IT", "HR", "FIN"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
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

// Admin Configuration System for Dropdown Values
export const dropdownConfigurations = pgTable("dropdown_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  screen: varchar("screen", { length: 255 }).notNull(), // e.g., "rfx-management", "vendor-portal", "analytics"
  category: varchar("category", { length: 100 }).notNull(), // e.g., "status", "type", "priority", "location"
  fieldName: varchar("field_name", { length: 100 }).notNull(), // e.g., "rfx_status", "rfx_type", "priority_level"
  displayName: varchar("display_name", { length: 255 }).notNull(), // Human-readable name
  description: text("description"), // Description of what this configuration is for
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dropdownOptions = pgTable("dropdown_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  configurationId: uuid("configuration_id").references(() => dropdownConfigurations.id, { onDelete: "cascade" }).notNull(),
  value: varchar("value", { length: 255 }).notNull(), // The actual value used in code
  label: varchar("label", { length: 255 }).notNull(), // Display label for users
  description: text("description"), // Optional description
  color: varchar("color", { length: 50 }), // Optional color for UI (e.g., for status indicators)
  icon: varchar("icon", { length: 100 }), // Optional icon name from lucide-react
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata"), // Additional configuration data
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  termsAndConditionsPath: varchar("terms_and_conditions_path", { length: 500 }), // Path to T&C PDF
  termsAndConditionsRequired: boolean("terms_and_conditions_required").default(false),
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
  attachments: text("attachments").array().default([]),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const auctions = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  items: jsonb("items"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  originalEndTime: timestamp("original_end_time").notNull(), // Track original end time
  extensionCount: integer("extension_count").default(0), // Track number of extensions
  maxExtensions: integer("max_extensions").default(3), // Max allowed extensions
  extensionDurationMinutes: integer("extension_duration_minutes").default(30), // Default extension duration
  reservePrice: decimal("reserve_price", { precision: 12, scale: 2 }),
  currentBid: decimal("current_bid", { precision: 12, scale: 2 }),
  bidRules: jsonb("bid_rules"),
  status: varchar("status", { enum: ["scheduled", "live", "completed", "cancelled", "closed"] }).default("scheduled"),
  winnerId: uuid("winner_id").references(() => vendors.id),
  winningBid: decimal("winning_bid", { precision: 12, scale: 2 }),
  termsAndConditionsPath: varchar("terms_and_conditions_path", { length: 500 }), // Path to T&C PDF
  termsAndConditionsRequired: boolean("terms_and_conditions_required").default(false),
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

// Challenge Price System
export const challengePrices = pgTable("challenge_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").references(() => auctions.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  bidId: uuid("bid_id").references(() => bids.id).notNull(), // Reference to the bid being challenged
  challengeAmount: decimal("challenge_amount", { precision: 12, scale: 2 }).notNull(),
  challengedBy: varchar("challenged_by").references(() => users.id).notNull(), // Sourcing Executive
  status: varchar("status", { enum: ["pending", "accepted", "rejected"] }).default("pending"),
  vendorResponse: text("vendor_response"), // Optional response text from vendor
  respondedAt: timestamp("responded_at"),
  notes: text("notes"), // Notes from sourcing executive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Counter Price System
export const counterPrices = pgTable("counter_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengePriceId: uuid("challenge_price_id").references(() => challengePrices.id, { onDelete: "cascade" }).notNull(),
  auctionId: uuid("auction_id").references(() => auctions.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  counterAmount: decimal("counter_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "accepted", "rejected"] }).default("pending"),
  sourcingResponse: text("sourcing_response"), // Response from sourcing team
  respondedAt: timestamp("responded_at"),
  notes: text("notes"), // Notes from vendor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auction Extensions Log
export const auctionExtensions = pgTable("auction_extensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").references(() => auctions.id, { onDelete: "cascade" }).notNull(),
  originalEndTime: timestamp("original_end_time").notNull(),
  newEndTime: timestamp("new_end_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  reason: text("reason"), // Reason for extension
  extendedBy: varchar("extended_by").references(() => users.id).notNull(), // Sourcing Executive
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  poNumber: varchar("po_number", { length: 100 }).unique().notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  rfxId: uuid("rfx_id").references(() => rfxEvents.id),
  auctionId: uuid("auction_id").references(() => auctions.id),
  
  // Buyer Information
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerBranchName: varchar("buyer_branch_name", { length: 255 }),
  buyerAddress: text("buyer_address"),
  buyerGstin: varchar("buyer_gstin", { length: 50 }),
  
  // Vendor Information (duplicated for PO format)
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorAddress: text("vendor_address"),
  vendorGstin: varchar("vendor_gstin", { length: 50 }),
  
  // Delivery Information
  deliveryToAddress: text("delivery_to_address"),
  deliveryGstin: varchar("delivery_gstin", { length: 50 }),
  
  // PO Details
  poDate: timestamp("po_date").defaultNow(),
  quotationRef: varchar("quotation_ref", { length: 255 }),
  deliveryDate: timestamp("delivery_date"),
  
  // Financial Information
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmountInWords: text("total_amount_in_words"),
  
  // Terms and Conditions
  paymentTerms: text("payment_terms"),
  incoterms: varchar("incoterms", { length: 100 }),
  termsAndConditions: text("terms_and_conditions"),
  termsAndConditionsPath: varchar("terms_and_conditions_path", { length: 500 }),
  
  // Status and Workflow
  status: varchar("status", { enum: ["draft", "pending_approval", "approved", "rejected", "issued", "acknowledged", "shipped", "delivered", "invoiced", "paid", "cancelled"] }).default("pending_approval"),
  deliverySchedule: jsonb("delivery_schedule"),
  attachments: text("attachments").array(),
  acknowledgedAt: timestamp("acknowledged_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalComments: text("approval_comments"),
  authorizedSignatory: varchar("authorized_signatory", { length: 255 }),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const poLineItems = pgTable("po_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  poId: uuid("po_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  slNo: integer("sl_no").notNull(), // Serial Number
  productId: uuid("product_id").references(() => products.id), // Allow null for BOM-based orders
  itemName: varchar("item_name", { length: 255 }).notNull(),
  uom: varchar("uom", { length: 50 }), // Unit of Measurement
  hsnCode: varchar("hsn_code", { length: 50 }), // HSN Code for tax purposes
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxableValue: decimal("taxable_value", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  deliveryDate: timestamp("delivery_date"),
  status: varchar("status", { enum: ["pending", "shipped", "delivered"] }).default("pending"),
  specifications: text("specifications"),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { enum: ["vendor", "rfx", "po", "budget", "procurement_request"] }).notNull(),
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
  termsAndConditionsPath: varchar("terms_and_conditions_path", { length: 500 }), // Path to T&C PDF
  approvalWorkflow: jsonb("approval_workflow"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Terms & Conditions Acceptance Tracking
export const termsAcceptance = pgTable("terms_acceptance", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  entityType: varchar("entity_type", { enum: ["rfx", "auction", "purchase_order", "direct_procurement"] }).notNull(),
  entityId: uuid("entity_id").notNull(),
  termsAndConditionsPath: varchar("terms_and_conditions_path", { length: 500 }).notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
}, (table) => ({
  uniqueAcceptance: unique("unique_vendor_entity_acceptance").on(table.vendorId, table.entityType, table.entityId),
}));

// Procurement Requests - New table for requester-initiated procurement requests
export const procurementRequests = pgTable("procurement_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestNumber: varchar("request_number", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  department: varchar("department", { length: 100 }).notNull(),
  bomId: uuid("bom_id").references(() => boms.id).notNull(),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  requestedDeliveryDate: timestamp("requested_delivery_date").notNull(),
  justification: text("justification"), // Business justification for the procurement
  estimatedBudget: decimal("estimated_budget", { precision: 12, scale: 2 }),
  
  // Request Approval Stage
  requestApprovalStatus: varchar("request_approval_status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  currentRequestApprover: varchar("current_request_approver").references(() => users.id),
  requestApprovalHistory: jsonb("request_approval_history"), // Track multi-level approvals
  
  // Procurement Method Stage (after request approval)
  procurementMethod: varchar("procurement_method", { enum: ["rfx", "auction", "direct"] }),
  procurementMethodStatus: varchar("procurement_method_status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  currentProcurementApprover: varchar("current_procurement_approver").references(() => users.id),
  procurementApprovalHistory: jsonb("procurement_approval_history"), // Track multi-level procurement approvals
  
  // Overall Status
  overallStatus: varchar("overall_status", { enum: ["draft", "request_approval_pending", "request_approved", "procurement_method_pending", "procurement_approved", "in_procurement", "completed", "rejected"] }).default("request_approval_pending"),
  
  // Linked Entities (created after approvals)
  rfxId: uuid("rfx_id").references(() => rfxEvents.id),
  auctionId: uuid("auction_id").references(() => auctions.id),
  directProcurementId: uuid("direct_procurement_id").references(() => directProcurementOrders.id),
  sourcingEventId: uuid("sourcing_event_id").references(() => sourcingEvents.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sourcing Events - Created by SOURCING_EXEC after procurement method selection
export const sourcingEvents = pgTable("sourcing_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventNumber: varchar("event_number", { length: 100 }).unique().notNull(),
  procurementRequestId: uuid("procurement_request_id").references(() => procurementRequests.id).notNull(),
  type: varchar("type", { enum: ["RFI", "RFP", "RFQ", "AUCTION", "DIRECT_PO"] }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  spendEstimate: decimal("spend_estimate", { precision: 12, scale: 2 }),
  justification: text("justification"), // Required for DIRECT_PO
  
  // Vendor Selection
  selectedVendorIds: jsonb("selected_vendor_ids").notNull(), // Array of vendor IDs
  
  // Status and Approval
  status: varchar("status", { enum: ["PENDING_SM_APPROVAL", "SM_APPROVED", "SM_REJECTED", "CHANGES_REQUESTED", "ACTIVE", "COMPLETED", "CANCELLED"] }).default("PENDING_SM_APPROVAL"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  changeRequestComments: text("change_request_comments"),
  submittedAt: timestamp("submitted_at"),
  
  // Execution Details (filled after SM approval)
  rfxId: uuid("rfx_id").references(() => rfxEvents.id),
  auctionId: uuid("auction_id").references(() => auctions.id),
  
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval Configuration - Admin configurable multi-level approvals
export const approvalConfigurations = pgTable("approval_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  approvalType: varchar("approval_type", { enum: ["request_approval", "procurement_approval"] }).notNull(),
  department: varchar("department", { length: 100 }), // Department-specific configurations
  budgetRange: varchar("budget_range", { length: 50 }), // e.g., "0-10000", "10000-50000", "50000+"
  
  // Multi-level approval chain
  approvalLevels: jsonb("approval_levels").notNull(), // Array of {level: 1, approverRole: "request_approver", approverIds: ["user1", "user2"], requireAll: false}
  
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval History - Track all approvals with detailed history
export const approvalHistory = pgTable("approval_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { enum: ["procurement_request", "rfx", "auction", "direct_procurement", "purchase_order"] }).notNull(),
  entityId: uuid("entity_id").notNull(),
  approvalType: varchar("approval_type", { enum: ["request_approval", "procurement_approval", "po_approval"] }).notNull(),
  level: integer("level").notNull(), // Approval level (1, 2, 3, etc.)
  approverId: varchar("approver_id").references(() => users.id).notNull(),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  comments: text("comments"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  createdDropdownConfigurations: many(dropdownConfigurations),
  createdDropdownOptions: many(dropdownOptions),
}));

// Dropdown Configuration Relations
export const dropdownConfigurationsRelations = relations(dropdownConfigurations, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [dropdownConfigurations.createdBy],
    references: [users.id],
  }),
  options: many(dropdownOptions),
}));

export const dropdownOptionsRelations = relations(dropdownOptions, ({ one }) => ({
  configuration: one(dropdownConfigurations, {
    fields: [dropdownOptions.configurationId],
    references: [dropdownConfigurations.id],
  }),
  createdBy: one(users, {
    fields: [dropdownOptions.createdBy],
    references: [users.id],
  }),
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
  sourcingEvents: many(sourcingEvents),
}));

// Sourcing Events Relations
export const sourcingEventsRelations = relations(sourcingEvents, ({ one }) => ({
  procurementRequest: one(procurementRequests, {
    fields: [sourcingEvents.procurementRequestId],
    references: [procurementRequests.id],
  }),
  createdBy: one(users, {
    fields: [sourcingEvents.createdBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [sourcingEvents.approvedBy],
    references: [users.id],
  }),
  rfxEvent: one(rfxEvents, {
    fields: [sourcingEvents.rfxId],
    references: [rfxEvents.id],
  }),
  auction: one(auctions, {
    fields: [sourcingEvents.auctionId],
    references: [auctions.id],
  }),
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
  challengePrices: many(challengePrices),
  counterPrices: many(counterPrices),
  extensions: many(auctionExtensions),
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

export const bidsRelations = relations(bids, ({ one, many }) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  vendor: one(vendors, {
    fields: [bids.vendorId],
    references: [vendors.id],
  }),
  challengePrices: many(challengePrices),
}));

export const challengePricesRelations = relations(challengePrices, ({ one, many }) => ({
  auction: one(auctions, {
    fields: [challengePrices.auctionId],
    references: [auctions.id],
  }),
  vendor: one(vendors, {
    fields: [challengePrices.vendorId],
    references: [vendors.id],
  }),
  bid: one(bids, {
    fields: [challengePrices.bidId],
    references: [bids.id],
  }),
  challengedBy: one(users, {
    fields: [challengePrices.challengedBy],
    references: [users.id],
  }),
  counterPrices: many(counterPrices),
}));

export const counterPricesRelations = relations(counterPrices, ({ one }) => ({
  challengePrice: one(challengePrices, {
    fields: [counterPrices.challengePriceId],
    references: [challengePrices.id],
  }),
  auction: one(auctions, {
    fields: [counterPrices.auctionId],
    references: [auctions.id],
  }),
  vendor: one(vendors, {
    fields: [counterPrices.vendorId],
    references: [vendors.id],
  }),
}));

export const auctionExtensionsRelations = relations(auctionExtensions, ({ one }) => ({
  auction: one(auctions, {
    fields: [auctionExtensions.auctionId],
    references: [auctions.id],
  }),
  extendedBy: one(users, {
    fields: [auctionExtensions.extendedBy],
    references: [users.id],
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
  ceilingPrice: z.union([z.string(), z.number()]).optional().transform((val) =>
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
  originalEndTime: z.union([z.string(), z.date()]).optional().transform((val) =>
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
  bomId: z.string().nullable().optional(),
  selectedBomItems: z.array(z.string()).optional(),
  selectedVendors: z.array(z.string()).optional(),
  termsUrl: z.string().optional(),
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

export const insertTermsAcceptanceSchema = createInsertSchema(termsAcceptance).omit({
  id: true,
  acceptedAt: true,
});

export const insertProcurementRequestSchema = createInsertSchema(procurementRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  requestedDeliveryDate: z.union([z.string(), z.date()]).transform((val) =>
    typeof val === 'string' ? new Date(val) : val
  ),
  estimatedBudget: z.union([z.string(), z.number()]).optional().transform((val) =>
    val ? String(val) : undefined
  ),
});

export const insertApprovalConfigurationSchema = createInsertSchema(approvalConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalHistorySchema = createInsertSchema(approvalHistory).omit({
  id: true,
  createdAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

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
export type TermsAcceptance = typeof termsAcceptance.$inferSelect;
export type InsertTermsAcceptance = z.infer<typeof insertTermsAcceptanceSchema>;

export type ProcurementRequest = typeof procurementRequests.$inferSelect;
export type InsertProcurementRequest = z.infer<typeof insertProcurementRequestSchema>;

export type ApprovalConfiguration = typeof approvalConfigurations.$inferSelect;
export type InsertApprovalConfiguration = z.infer<typeof insertApprovalConfigurationSchema>;

export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;

// Sourcing Events
export const insertSourcingEventSchema = createInsertSchema(sourcingEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SourcingEvent = typeof sourcingEvents.$inferSelect;
export type InsertSourcingEvent = z.infer<typeof insertSourcingEventSchema>;

// Challenge Price schemas
export const insertChallengePriceSchema = createInsertSchema(challengePrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  challengeAmount: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export type ChallengePrice = typeof challengePrices.$inferSelect;
export type InsertChallengePrice = z.infer<typeof insertChallengePriceSchema>;

// Counter Price schemas
export const insertCounterPriceSchema = createInsertSchema(counterPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  counterAmount: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export type CounterPrice = typeof counterPrices.$inferSelect;
export type InsertCounterPrice = z.infer<typeof insertCounterPriceSchema>;

// Auction Extension schemas
export const insertAuctionExtensionSchema = createInsertSchema(auctionExtensions).omit({
  id: true,
  createdAt: true,
}).extend({
  originalEndTime: z.union([z.string(), z.date()]).transform((val) =>
    typeof val === 'string' ? new Date(val) : val
  ),
  newEndTime: z.union([z.string(), z.date()]).transform((val) =>
    typeof val === 'string' ? new Date(val) : val
  ),
});

export type AuctionExtension = typeof auctionExtensions.$inferSelect;
export type InsertAuctionExtension = z.infer<typeof insertAuctionExtensionSchema>;

// Dropdown Configuration schemas
export const insertDropdownConfigurationSchema = createInsertSchema(dropdownConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDropdownOptionSchema = createInsertSchema(dropdownOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DropdownConfiguration = typeof dropdownConfigurations.$inferSelect;
export type InsertDropdownConfiguration = z.infer<typeof insertDropdownConfigurationSchema>;

export type DropdownOption = typeof dropdownOptions.$inferSelect;
export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;

