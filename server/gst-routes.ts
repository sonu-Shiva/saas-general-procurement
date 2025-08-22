import { Router } from "express";
import { db } from "./db";
import { gstMasters, insertGSTMasterSchema, taxCalculationSchema } from "@shared/schema";
import { eq, desc, and, or, lte, gte, isNull } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Middleware to check if user is admin
const requireAdmin = (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all GST masters with filtering
router.get("/gst-masters", async (req, res) => {
  try {
    const { hsnCode, status, effectiveDate } = req.query;
    
    let query = db.select().from(gstMasters);
    const conditions = [];
    
    if (hsnCode) {
      conditions.push(eq(gstMasters.hsnCode, hsnCode as string));
    }
    
    if (status) {
      conditions.push(eq(gstMasters.status, status as string));
    }
    
    if (effectiveDate) {
      const date = new Date(effectiveDate as string);
      conditions.push(
        and(
          lte(gstMasters.effectiveFrom, date),
          or(
            isNull(gstMasters.effectiveTo),
            gte(gstMasters.effectiveTo, date)
          )
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query.orderBy(gstMasters.hsnCode, desc(gstMasters.effectiveFrom));
    res.json(result);
  } catch (error) {
    console.error('Error fetching GST masters:', error);
    res.status(500).json({ error: 'Failed to fetch GST masters' });
  }
});

// Get GST master by ID
router.get("/gst-masters/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(gstMasters).where(eq(gstMasters.id, id));
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'GST master not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching GST master:', error);
    res.status(500).json({ error: 'Failed to fetch GST master' });
  }
});

// Create new GST master (Admin only)
router.post("/gst-masters", requireAdmin, async (req, res) => {
  try {
    const validatedData = insertGSTMasterSchema.parse(req.body);
    const user = req.user;
    
    const newGSTMaster = await db.insert(gstMasters).values({
      ...validatedData,
      createdBy: user?.email || 'admin',
      updatedBy: user?.email || 'admin',
      effectiveFrom: new Date(validatedData.effectiveFrom),
      effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
    }).returning();
    
    res.status(201).json(newGSTMaster[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    console.error('Error creating GST master:', error);
    res.status(500).json({ error: 'Failed to create GST master' });
  }
});

// Update GST master (Admin only)
router.put("/gst-masters/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertGSTMasterSchema.parse(req.body);
    const user = req.user;
    
    const updatedGSTMaster = await db.update(gstMasters)
      .set({
        ...validatedData,
        updatedBy: user?.email || 'admin',
        updatedAt: new Date(),
        effectiveFrom: new Date(validatedData.effectiveFrom),
        effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
      })
      .where(eq(gstMasters.id, id))
      .returning();
    
    if (updatedGSTMaster.length === 0) {
      return res.status(404).json({ error: 'GST master not found' });
    }
    
    res.json(updatedGSTMaster[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    console.error('Error updating GST master:', error);
    res.status(500).json({ error: 'Failed to update GST master' });
  }
});

// Delete GST master (Admin only)
router.delete("/gst-masters/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const deletedGSTMaster = await db.delete(gstMasters)
      .where(eq(gstMasters.id, id))
      .returning();
    
    if (deletedGSTMaster.length === 0) {
      return res.status(404).json({ error: 'GST master not found' });
    }
    
    res.json({ message: 'GST master deleted successfully' });
  } catch (error) {
    console.error('Error deleting GST master:', error);
    res.status(500).json({ error: 'Failed to delete GST master' });
  }
});

// Calculate tax for given amount and HSN code
router.post("/gst-calculate", async (req, res) => {
  try {
    const { hsnCode, amount, isInterstate = false, effectiveDate } = taxCalculationSchema.parse(req.body);
    
    // Find active GST configuration for the HSN code
    const searchDate = effectiveDate ? new Date(effectiveDate) : new Date();
    
    const gstConfig = await db.select().from(gstMasters)
      .where(
        and(
          eq(gstMasters.hsnCode, hsnCode),
          eq(gstMasters.status, 'active'),
          lte(gstMasters.effectiveFrom, searchDate),
          or(
            isNull(gstMasters.effectiveTo),
            gte(gstMasters.effectiveTo, searchDate)
          )
        )
      )
      .orderBy(desc(gstMasters.effectiveFrom))
      .limit(1);
    
    if (gstConfig.length === 0) {
      return res.status(404).json({ 
        error: `No active GST configuration found for HSN code: ${hsnCode}` 
      });
    }
    
    const config = gstConfig[0];
    
    // Calculate tax breakdown
    const baseAmount = amount;
    let taxCalculation;
    
    if (isInterstate) {
      // Interstate transaction - use IGST
      const igstAmount = (baseAmount * parseFloat(config.igstRate)) / 100;
      const cessAmount = (baseAmount * parseFloat(config.cessRate)) / 100;
      const totalTax = igstAmount + cessAmount;
      
      taxCalculation = {
        hsnCode: config.hsnCode,
        hsnDescription: config.hsnDescription,
        baseAmount,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: parseFloat(config.igstRate),
        cessRate: parseFloat(config.cessRate),
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount,
        cessAmount,
        totalTax,
        totalAmount: baseAmount + totalTax,
        uom: config.uom,
        transactionType: 'interstate' as const,
      };
    } else {
      // Domestic transaction - use CGST + SGST
      const cgstAmount = (baseAmount * parseFloat(config.cgstRate)) / 100;
      const sgstAmount = (baseAmount * parseFloat(config.sgstRate)) / 100;
      const cessAmount = (baseAmount * parseFloat(config.cessRate)) / 100;
      const totalTax = cgstAmount + sgstAmount + cessAmount;
      
      taxCalculation = {
        hsnCode: config.hsnCode,
        hsnDescription: config.hsnDescription,
        baseAmount,
        cgstRate: parseFloat(config.cgstRate),
        sgstRate: parseFloat(config.sgstRate),
        igstRate: 0,
        cessRate: parseFloat(config.cessRate),
        cgstAmount,
        sgstAmount,
        igstAmount: 0,
        cessAmount,
        totalTax,
        totalAmount: baseAmount + totalTax,
        uom: config.uom,
        transactionType: 'domestic' as const,
      };
    }
    
    res.json(taxCalculation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    console.error('Error calculating tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

// Get HSN codes for autocomplete
router.get("/gst-hsn-codes", async (req, res) => {
  try {
    const hsnCodes = await db.selectDistinct({ hsnCode: gstMasters.hsnCode })
      .from(gstMasters)
      .where(eq(gstMasters.status, 'active'))
      .orderBy(gstMasters.hsnCode);
    
    res.json(hsnCodes.map(item => item.hsnCode));
  } catch (error) {
    console.error('Error fetching HSN codes:', error);
    res.status(500).json({ error: 'Failed to fetch HSN codes' });
  }
});

// Lookup GST configuration by HSN code
router.post("/gst-lookup", async (req, res) => {
  try {
    const { hsnCode, effectiveDate } = req.body;
    
    if (!hsnCode) {
      return res.status(400).json({ error: 'HSN code is required' });
    }
    
    const searchDate = effectiveDate ? new Date(effectiveDate) : new Date();
    
    const gstConfig = await db.select().from(gstMasters)
      .where(
        and(
          eq(gstMasters.hsnCode, hsnCode),
          eq(gstMasters.status, 'active'),
          lte(gstMasters.effectiveFrom, searchDate),
          or(
            isNull(gstMasters.effectiveTo),
            gte(gstMasters.effectiveTo, searchDate)
          )
        )
      )
      .orderBy(desc(gstMasters.effectiveFrom))
      .limit(1);
    
    if (gstConfig.length === 0) {
      return res.status(404).json({ 
        error: `No active GST configuration found for HSN code: ${hsnCode}` 
      });
    }
    
    res.json(gstConfig[0]);
  } catch (error) {
    console.error('Error looking up GST configuration:', error);
    res.status(500).json({ error: 'Failed to lookup GST configuration' });
  }
});

export default router;