import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from 'uuid';
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import {
  users,
  vendors,
  vendors as vendorsTable,
  products,
  productCategories,
  bomItems,
  boms,
  rfxEvents,
  rfxResponses,
  auctions,

  purchaseOrders,
  poLineItems,
  directProcurementOrders,
  bids,
  notifications
} from "@shared/schema";
import {
  insertVendorSchema,
  insertProductSchema,
  insertProductCategorySchema,
  insertBomSchema,
  insertBomItemSchema,
  insertRfxEventSchema,
  insertRfxInvitationSchema,
  insertRfxResponseSchema,
  insertAuctionSchema,
  insertAuctionParticipantSchema,
  insertBidSchema,
  insertChallengePriceSchema,
  insertCounterPriceSchema,
  insertAuctionExtensionSchema,
  insertPurchaseOrderSchema,
  insertPoLineItemSchema,
  insertApprovalSchema,
  insertNotificationSchema,
  insertTermsAcceptanceSchema,
} from "@shared/schema";
import { z } from "zod";

// Mock authentication check - replace with actual auth middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  // For development, we assume the user is authenticated if a user ID is present in the JWT claims
  // In a real application, you'd verify the JWT here.
  if (req.user?.claims?.sub) {
    // Ensure the user exists in our mock storage
    try {
      await storage.getUser(req.user.claims.sub);
      next();
    } catch (error) {
      console.error("User not found in storage:", error);
      res.status(401).json({ message: "Unauthorized: User not found" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized: No user ID found in token" });
  }
};


export async function registerRoutes(app: Express): Promise<Server> {
  // Define test vendor profiles for development - using actual vendor IDs from bids
  const testVendorProfiles = {
    'vendor-1': {
      id: 'a5a10f14-4d2a-4309-a09f-0352278c4a53', // Matches Tech Solutions bid
      email: 'vendor1@sclen.com',
      firstName: 'Tech',
      lastName: 'Solutions',
      role: 'vendor',
      companyName: 'Tech Solutions Pvt Ltd',
      phone: '+91-80-2550-2001',
      gstNumber: 'TECH123456789',
      address: 'Tech Park, Bangalore, Karnataka, India - 560001'
    },
    'vendor-2': {
      id: '26a8a0d0-3b8d-477a-9f7d-a4a93af67dc0', // Matches Green Industries bid
      email: 'vendor2@sclen.com',
      firstName: 'Green',
      lastName: 'Industries',
      role: 'vendor',
      companyName: 'Green Industries Ltd',
      phone: '+91-22-4567-8901',
      gstNumber: 'GREEN987654321',
      address: 'Industrial Estate, Mumbai, Maharashtra, India - 400001'
    },
    'vendor-3': {
      id: '89b9bba9-7ca4-4dc0-bf9b-ddb5cd26a46a', // Matches Smart Manufacturing bid
      email: 'vendor3@sclen.com', 
      firstName: 'Smart',
      lastName: 'Manufacturing',
      role: 'vendor',
      companyName: 'Smart Manufacturing Corp',
      phone: '+91-44-7890-1234',
