import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertVendorSchema,
  insertProductSchema,
  insertBomSchema,
  insertBomItemSchema,
  insertRfxEventSchema,
  insertRfxInvitationSchema,
  insertRfxResponseSchema,
  insertAuctionSchema,
  insertBidSchema,
  insertPurchaseOrderSchema,
  insertPoLineItemSchema,
  insertApprovalSchema,
  insertNotificationSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Vendor routes
  app.post('/api/vendors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertVendorSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const vendor = await storage.createVendor(validatedData);
      res.json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(400).json({ message: "Failed to create vendor" });
    }
  });

  // Vendor search/discovery routes (must be before parameterized routes)
  app.get('/api/vendors/search', isAuthenticated, async (req, res) => {
    try {
      const { q, location, category, certifications } = req.query;
      
      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const vendors = await storage.searchVendors(
        q as string,
        {
          location: location as string,
          category: category as string,
          certifications: certifications ? (certifications as string).split(',') : undefined,
        }
      );
      res.json(vendors);
    } catch (error) {
      console.error("Error searching vendors:", error);
      res.status(500).json({ message: "Failed to search vendors" });
    }
  });

  app.get('/api/vendors', isAuthenticated, async (req, res) => {
    try {
      const { status, category, search } = req.query;
      const vendors = await storage.getVendors({
        status: status as string,
        category: category as string,
        search: search as string,
      });
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.patch('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, updates);
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(400).json({ message: "Failed to update vendor" });
    }
  });

  // Product routes
  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertProductSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const product = await storage.createProduct(validatedData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: "Failed to create product" });
    }
  });

  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const { category, search, isActive } = req.query;
      const products = await storage.getProducts({
        category: category as string,
        search: search as string,
        isActive: isActive === 'true',
      });
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // BOM routes
  app.post('/api/boms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertBomSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const bom = await storage.createBom(validatedData);
      res.json(bom);
    } catch (error) {
      console.error("Error creating BOM:", error);
      res.status(400).json({ message: "Failed to create BOM" });
    }
  });

  app.get('/api/boms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const boms = await storage.getBoms(userId);
      res.json(boms);
    } catch (error) {
      console.error("Error fetching BOMs:", error);
      res.status(500).json({ message: "Failed to fetch BOMs" });
    }
  });

  app.get('/api/boms/:id', isAuthenticated, async (req, res) => {
    try {
      const bom = await storage.getBom(req.params.id);
      if (!bom) {
        return res.status(404).json({ message: "BOM not found" });
      }
      const items = await storage.getBomItems(req.params.id);
      res.json({ ...bom, items });
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ message: "Failed to fetch BOM" });
    }
  });

  app.post('/api/boms/:id/items', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBomItemSchema.parse({
        ...req.body,
        bomId: req.params.id,
      });
      const bomItem = await storage.createBomItem(validatedData);
      res.json(bomItem);
    } catch (error) {
      console.error("Error creating BOM item:", error);
      res.status(400).json({ message: "Failed to create BOM item" });
    }
  });

  // RFx routes
  app.post('/api/rfx', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertRfxEventSchema.parse({
        ...req.body,
        createdBy: userId,
        referenceNo: `RFX-${Date.now()}`,
      });
      const rfx = await storage.createRfxEvent(validatedData);
      res.json(rfx);
    } catch (error) {
      console.error("Error creating RFx:", error);
      res.status(400).json({ message: "Failed to create RFx" });
    }
  });

  app.get('/api/rfx', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, type } = req.query;
      const rfxEvents = await storage.getRfxEvents({
        status: status as string,
        type: type as string,
        createdBy: userId,
      });
      res.json(rfxEvents);
    } catch (error) {
      console.error("Error fetching RFx events:", error);
      res.status(500).json({ message: "Failed to fetch RFx events" });
    }
  });

  app.get('/api/rfx/:id', isAuthenticated, async (req, res) => {
    try {
      const rfx = await storage.getRfxEvent(req.params.id);
      if (!rfx) {
        return res.status(404).json({ message: "RFx not found" });
      }
      const invitations = await storage.getRfxInvitations(req.params.id);
      const responses = await storage.getRfxResponses(req.params.id);
      res.json({ ...rfx, invitations, responses });
    } catch (error) {
      console.error("Error fetching RFx:", error);
      res.status(500).json({ message: "Failed to fetch RFx" });
    }
  });

  app.post('/api/rfx/:id/invitations', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRfxInvitationSchema.parse({
        ...req.body,
        rfxId: req.params.id,
      });
      const invitation = await storage.createRfxInvitation(validatedData);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating RFx invitation:", error);
      res.status(400).json({ message: "Failed to create RFx invitation" });
    }
  });

  app.post('/api/rfx/:id/responses', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRfxResponseSchema.parse({
        ...req.body,
        rfxId: req.params.id,
      });
      const response = await storage.createRfxResponse(validatedData);
      res.json(response);
    } catch (error) {
      console.error("Error creating RFx response:", error);
      res.status(400).json({ message: "Failed to create RFx response" });
    }
  });

  // Auction routes
  app.post('/api/auctions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertAuctionSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const auction = await storage.createAuction(validatedData);
      res.json(auction);
    } catch (error) {
      console.error("Error creating auction:", error);
      res.status(400).json({ message: "Failed to create auction" });
    }
  });

  app.get('/api/auctions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.query;
      const auctions = await storage.getAuctions({
        status: status as string,
        createdBy: userId,
      });
      res.json(auctions);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  app.get('/api/auctions/:id', isAuthenticated, async (req, res) => {
    try {
      const auction = await storage.getAuction(req.params.id);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      const participants = await storage.getAuctionParticipants(req.params.id);
      const bids = await storage.getBids(req.params.id);
      res.json({ ...auction, participants, bids });
    } catch (error) {
      console.error("Error fetching auction:", error);
      res.status(500).json({ message: "Failed to fetch auction" });
    }
  });

  app.post('/api/auctions/:id/participants', isAuthenticated, async (req, res) => {
    try {
      const participant = await storage.addAuctionParticipant({
        auctionId: req.params.id,
        vendorId: req.body.vendorId,
      });
      res.json(participant);
    } catch (error) {
      console.error("Error adding auction participant:", error);
      res.status(400).json({ message: "Failed to add auction participant" });
    }
  });

  // Purchase Order routes
  app.post('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPurchaseOrderSchema.parse({
        ...req.body,
        createdBy: userId,
        poNumber: `PO-${Date.now()}`,
      });
      const po = await storage.createPurchaseOrder(validatedData);
      res.json(po);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(400).json({ message: "Failed to create purchase order" });
    }
  });

  app.get('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, vendorId } = req.query;
      const pos = await storage.getPurchaseOrders({
        status: status as string,
        vendorId: vendorId as string,
        createdBy: userId,
      });
      res.json(pos);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      const lineItems = await storage.getPoLineItems(req.params.id);
      res.json({ ...po, lineItems });
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.patch('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = insertPurchaseOrderSchema.partial().parse(req.body);
      const po = await storage.updatePurchaseOrder(req.params.id, updates);
      res.json(po);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(400).json({ message: "Failed to update purchase order" });
    }
  });

  // Approval routes
  app.get('/api/approvals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const approvals = await storage.getApprovals(userId);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching approvals:", error);
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  app.patch('/api/approvals/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = insertApprovalSchema.partial().parse(req.body);
      const approval = await storage.updateApproval(req.params.id, updates);
      res.json(approval);
    } catch (error) {
      console.error("Error updating approval:", error);
      res.status(400).json({ message: "Failed to update approval" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time auction functionality
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join_auction') {
          // Join auction room
          (ws as any).auctionId = data.auctionId;
          ws.send(JSON.stringify({ type: 'joined_auction', auctionId: data.auctionId }));
        }
        
        if (data.type === 'place_bid') {
          // Place bid in auction
          const { auctionId, vendorId, amount } = data;
          
          // Validate bid
          const auction = await storage.getAuction(auctionId);
          if (!auction || auction.status !== 'live') {
            ws.send(JSON.stringify({ type: 'bid_error', message: 'Auction not available' }));
            return;
          }
          
          const currentBid = await storage.getLatestBid(auctionId);
          if (currentBid && amount >= currentBid.amount) {
            ws.send(JSON.stringify({ type: 'bid_error', message: 'Bid must be lower than current bid' }));
            return;
          }
          
          // Create bid
          const bid = await storage.createBid({
            auctionId,
            vendorId,
            amount: amount.toString(),
          });
          
          // Broadcast to all clients in auction
          const bidUpdate = {
            type: 'bid_update',
            auctionId,
            bid: {
              id: bid.id,
              vendorId: bid.vendorId,
              amount: bid.amount,
              timestamp: bid.timestamp,
            },
          };
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && (client as any).auctionId === auctionId) {
              client.send(JSON.stringify(bidUpdate));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
