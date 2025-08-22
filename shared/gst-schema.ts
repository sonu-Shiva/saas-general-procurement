import { pgTable, text, decimal, date, timestamp, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const gstMasters = pgTable("gst_masters", {
  id: serial("id").primaryKey(),
  hsnCode: text("hsn_code").notNull(),
  hsnDescription: text("hsn_description").notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).notNull(),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).notNull(),
  igstRate: decimal("igst_rate", { precision: 5, scale: 2 }).notNull(),
  cessRate: decimal("cess_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  uom: text("uom").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  status: text("status", { enum: ["active", "inactive", "draft"] }).default("active").notNull(),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by").default("system").notNull(),
  updatedBy: text("updated_by").default("system").notNull(),
});

// Create insert schema for GST Master
export const insertGSTMasterSchema = createInsertSchema(gstMasters, {
  hsnCode: z.string().min(1, "HSN Code is required").max(20, "HSN Code must be 20 characters or less"),
  hsnDescription: z.string().min(1, "HSN Description is required"),
  gstRate: z.string().transform(val => parseFloat(val)).pipe(
    z.number().min(0, "GST Rate must be 0 or greater").max(100, "GST Rate must be 100 or less")
  ),
  cgstRate: z.string().transform(val => parseFloat(val)).pipe(
    z.number().min(0, "CGST Rate must be 0 or greater").max(50, "CGST Rate must be 50 or less")
  ),
  sgstRate: z.string().transform(val => parseFloat(val)).pipe(
    z.number().min(0, "SGST Rate must be 0 or greater").max(50, "SGST Rate must be 50 or less")
  ),
  igstRate: z.string().transform(val => parseFloat(val)).pipe(
    z.number().min(0, "IGST Rate must be 0 or greater").max(100, "IGST Rate must be 100 or less")
  ),
  cessRate: z.string().transform(val => parseFloat(val)).pipe(
    z.number().min(0, "Cess Rate must be 0 or greater").max(100, "Cess Rate must be 100 or less")
  ).optional(),
  uom: z.string().min(1, "UOM is required").max(20, "UOM must be 20 characters or less"),
  effectiveFrom: z.string().min(1, "Effective From date is required"),
  effectiveTo: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
  notes: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => {
  // Validate that CGST + SGST = GST Rate
  const cgst = typeof data.cgstRate === 'string' ? parseFloat(data.cgstRate) : data.cgstRate;
  const sgst = typeof data.sgstRate === 'string' ? parseFloat(data.sgstRate) : data.sgstRate;
  const gst = typeof data.gstRate === 'string' ? parseFloat(data.gstRate) : data.gstRate;
  return Math.abs((cgst + sgst) - gst) < 0.01; // Allow for floating point precision
}, {
  message: "CGST + SGST must equal GST Rate",
  path: ["cgstRate"]
}).refine((data) => {
  // Validate that IGST = GST Rate
  const igst = typeof data.igstRate === 'string' ? parseFloat(data.igstRate) : data.igstRate;
  const gst = typeof data.gstRate === 'string' ? parseFloat(data.gstRate) : data.gstRate;
  return Math.abs(igst - gst) < 0.01; // Allow for floating point precision
}, {
  message: "IGST Rate must equal GST Rate",
  path: ["igstRate"]
}).refine((data) => {
  // Validate effective dates
  if (data.effectiveTo && data.effectiveFrom) {
    return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
  }
  return true;
}, {
  message: "Effective To date must be after Effective From date",
  path: ["effectiveTo"]
});

// Tax calculation input schema
export const taxCalculationSchema = z.object({
  hsnCode: z.string().min(1, "HSN Code is required"),
  amount: z.number().min(0, "Amount must be 0 or greater"),
  isInterstate: z.boolean().default(false),
  effectiveDate: z.string().optional(),
});

// Tax calculation response type
export const taxCalculationResponseSchema = z.object({
  hsnCode: z.string(),
  hsnDescription: z.string(),
  baseAmount: z.number(),
  cgstRate: z.number(),
  sgstRate: z.number(),
  igstRate: z.number(),
  cessRate: z.number(),
  cgstAmount: z.number(),
  sgstAmount: z.number(),
  igstAmount: z.number(),
  cessAmount: z.number(),
  totalTax: z.number(),
  totalAmount: z.number(),
  uom: z.string(),
  transactionType: z.enum(["domestic", "interstate"]),
});

// Type exports
export type InsertGSTMaster = z.infer<typeof insertGSTMasterSchema>;
export type GSTMaster = typeof gstMasters.$inferSelect;
export type TaxCalculationInput = z.infer<typeof taxCalculationSchema>;
export type TaxCalculationResponse = z.infer<typeof taxCalculationResponseSchema>;