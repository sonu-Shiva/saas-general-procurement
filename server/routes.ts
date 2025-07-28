import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isVendor, isBuyer } from "./replitAuth";
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

  // Update user role - only for first-time setup or admin use
  app.patch('/api/auth/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!['buyer_admin', 'buyer_user', 'sourcing_manager', 'vendor'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user role
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: role,
        organizationId: user.organizationId,
        isActive: user.isActive,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
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

  // Product routes - Only vendors can create products
  app.post('/api/products', isAuthenticated, isVendor, async (req: any, res) => {
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
      const filters: any = {};
      
      if (category && category !== 'all') {
        filters.category = category as string;
      }
      
      if (search) {
        filters.search = search as string;
      }
      
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      
      const products = await storage.getProducts(filters);
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

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const productId = req.params.id;
      
      // Get the existing product to check ownership
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user is the creator of the product or is a vendor
      const user = await storage.getUser(userId);
      const isVendor = user?.role === 'vendor';
      const isOwner = existingProduct.createdBy === userId;
      
      if (!isVendor && !isOwner) {
        return res.status(403).json({ message: "You can only edit products you created" });
      }
      
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(productId, updates);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(400).json({ message: "Failed to update product" });
    }
  });

  // Product Category routes - Both vendors and buyers can create/manage categories
  app.post('/api/product-categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertProductCategorySchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      // Generate code if not provided
      if (!validatedData.code) {
        const siblings = await storage.getProductCategories({
          parentId: validatedData.parentId || undefined,
          isActive: true,
        });
        const maxCode = siblings.length > 0 
          ? Math.max(...siblings.map(s => parseInt(s.code.split('.').pop() || '0'))) 
          : 0;
        const nextNumber = maxCode + 1;
        
        if (validatedData.parentId) {
          const parent = await storage.getProductCategory(validatedData.parentId);
          validatedData.code = `${parent?.code}.${nextNumber}`;
          validatedData.level = (parent?.level || 0) + 1;
        } else {
          validatedData.code = nextNumber.toString();
          validatedData.level = 1;
        }
      }
      
      const category = await storage.createProductCategory(validatedData);
      res.json(category);
    } catch (error) {
      console.error("Error creating product category:", error);
      res.status(400).json({ message: "Failed to create product category" });
    }
  });

  app.get('/api/product-categories', isAuthenticated, async (req, res) => {
    try {
      const { parentId, level, isActive } = req.query;
      const categories = await storage.getProductCategories({
        parentId: parentId as string,
        level: level ? parseInt(level as string) : undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  app.get('/api/product-categories/hierarchy', isAuthenticated, async (req, res) => {
    try {
      const hierarchy = await storage.getProductCategoryHierarchy();
      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching category hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch category hierarchy" });
    }
  });

  app.get('/api/product-categories/:id', isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getProductCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching product category:", error);
      res.status(500).json({ message: "Failed to fetch product category" });
    }
  });

  app.put('/api/product-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if category exists and user has permission to edit it
      const existingCategory = await storage.getProductCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (existingCategory.createdBy !== userId) {
        return res.status(403).json({ message: "You can only edit categories you created" });
      }
      
      const updates = insertProductCategorySchema.partial().parse(req.body);
      const category = await storage.updateProductCategory(categoryId, updates);
      res.json(category);
    } catch (error) {
      console.error("Error updating product category:", error);
      res.status(400).json({ message: "Failed to update product category" });
    }
  });

  app.delete('/api/product-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if category exists and user has permission to delete it
      const existingCategory = await storage.getProductCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (existingCategory.createdBy !== userId) {
        return res.status(403).json({ message: "You can only delete categories you created" });
      }
      
      // Check if category has children or products
      const children = await storage.getProductCategories({ parentId: categoryId });
      if (children.length > 0) {
        return res.status(400).json({ message: "Cannot delete category with subcategories" });
      }
      
      await storage.deleteProductCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting product category:", error);
      res.status(400).json({ message: "Failed to delete product category" });
    }
  });

  // BOM routes - Only buyers can create BOMs
  app.post('/api/boms', isAuthenticated, isBuyer, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Creating BOM for user:", userId);
      console.log("Request body:", req.body);
      
      const validatedData = insertBomSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      console.log("Validated BOM data:", validatedData);
      const bom = await storage.createBom(validatedData);
      console.log("BOM created successfully:", bom);
      res.json(bom);
    } catch (error) {
      console.error("Error creating BOM:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: `Failed to create BOM: ${error.message}` });
      } else {
        res.status(400).json({ message: "Failed to create BOM" });
      }
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
      console.log("Fetching BOM with ID:", req.params.id);
      const bom = await storage.getBom(req.params.id);
      if (!bom) {
        console.log("BOM not found:", req.params.id);
        return res.status(404).json({ message: "BOM not found" });
      }
      console.log("BOM found:", bom);
      
      const items = await storage.getBomItems(req.params.id);
      console.log("BOM items found:", items);
      console.log("Items count:", items.length);
      
      const response = { ...bom, items };
      console.log("Sending BOM response:", response);
      res.json(response);
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ message: "Failed to fetch BOM" });
    }
  });

  app.put('/api/boms/:id', isAuthenticated, isBuyer, async (req: any, res) => {
    try {
      const bomId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if BOM exists and user has permission to edit it
      const existingBom = await storage.getBom(bomId);
      if (!existingBom) {
        return res.status(404).json({ message: "BOM not found" });
      }
      
      if (existingBom.createdBy !== userId) {
        return res.status(403).json({ message: "You can only edit BOMs you created" });
      }
      
      const updates = insertBomSchema.partial().parse(req.body);
      const bom = await storage.updateBom(bomId, updates);
      res.json(bom);
    } catch (error) {
      console.error("Error updating BOM:", error);
      res.status(400).json({ message: "Failed to update BOM" });
    }
  });

  app.post('/api/boms/:id/items', isAuthenticated, async (req, res) => {
    try {
      console.log("Creating BOM item for BOM:", req.params.id);
      console.log("BOM item data:", req.body);
      
      const validatedData = insertBomItemSchema.parse({
        ...req.body,
        bomId: req.params.id,
      });
      
      console.log("Validated BOM item data:", validatedData);
      console.log("ProductId in validated data:", validatedData.productId);
      const bomItem = await storage.createBomItem(validatedData);
      console.log("BOM item created successfully:", bomItem);
      res.json(bomItem);
    } catch (error) {
      console.error("Error creating BOM item:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: `Failed to create BOM item: ${error.message}` });
      } else {
        res.status(400).json({ message: "Failed to create BOM item" });
      }
    }
  });

  app.delete('/api/boms/:id/items', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBomItems(req.params.id);
      res.json({ message: "BOM items deleted successfully" });
    } catch (error) {
      console.error("Error deleting BOM items:", error);
      res.status(400).json({ message: "Failed to delete BOM items" });
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
