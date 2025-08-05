import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import {
  users, 
  vendors,
  vendors as vendorsTable,
  products,
  categories,
  bomItems,
  boms,
  rfxEvents,
  rfxResponses,
  auctions,
  auctionBids,
  purchaseOrders,
  purchaseOrderItems,
  directProcurementOrders,
  directProcurementOrderItems,
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
  insertPurchaseOrderSchema,
  insertPoLineItemSchema,
  insertApprovalSchema,
  insertNotificationSchema,
  insertTermsAcceptanceSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple development authentication system
  let currentDevUser = {
    id: 'dev-user-123',
    email: 'dev@sclen.com',
    firstName: 'Developer',
    lastName: 'User',
    role: 'buyer_admin'
  };
  let isLoggedIn = true;

  console.log('DEVELOPMENT MODE: Setting up simple auth system');

  // Auth routes
  app.get('/api/auth/user', (req, res) => {
    console.log('Auth check - isLoggedIn:', isLoggedIn);
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json(currentDevUser);
  });

  app.post('/api/auth/logout', (req, res) => {
    console.log('Logout requested');
    isLoggedIn = false;
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/login', (req, res) => {
    console.log('Login requested');
    isLoggedIn = true;
    res.json(currentDevUser);
  });

  app.patch('/api/auth/user/role', (req, res) => {
    console.log('Role change requested to:', req.body.role);
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { role } = req.body;
    const validRoles = ['buyer_admin', 'buyer_user', 'sourcing_manager', 'vendor'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    currentDevUser.role = role;
    console.log('Role updated to:', role);
    res.json(currentDevUser);
  });

  // Auth middleware for protected routes
  const authMiddleware = (req: any, res: any, next: any) => {
    // Skip auth check for auth routes and vendor discovery
    if (req.path.startsWith('/auth/') || req.path === '/vendors/discover') {
      return next();
    }

    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Add mock user to request
    req.user = { claims: { sub: currentDevUser.id } };
    next();
  };

  // Apply auth middleware to all /api routes except auth routes
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) {
      return next();
    }
    return authMiddleware(req, res, next);
  });

  // Object storage routes for Terms & Conditions upload
  app.post('/api/objects/upload', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get('/objects/:objectPath(*)', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // For development, return mock stats since user might not exist in DB
      const mockStats = {
        totalVendors: 5,
        totalProducts: 25,
        totalRfx: 3,
        totalPurchaseOrders: 8,
        totalAuctions: 2,
        recentActivity: []
      };
      res.json(mockStats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Vendor routes
  app.get('/api/vendors', async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.post('/api/vendors', async (req, res) => {
    try {
      const vendor = await storage.createVendor(req.body);
      res.json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  // Vendor discovery route
  app.post('/api/vendors/discover', async (req, res) => {
    try {
      console.log('=== AI VENDOR DISCOVERY REQUEST ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Query:', req.body.query);
      console.log('Location:', req.body.location);
      console.log('Category:', req.body.category);
      console.log('User authenticated:', isLoggedIn);
      console.log('Session ID:', req.sessionID);

      const { query, location, category } = req.body;

      if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Construct comprehensive search prompt
      let searchPrompt = `I need complete contact information for professional suppliers of ${query}`;
      if (location && location !== 'all') {
        searchPrompt += ` in ${location}`;
      }
      searchPrompt += ` in India. Search company websites, IndiaMART, JustDial, business directories, and company contact pages to find REAL contact details.

MANDATORY: Only include suppliers with VERIFIED contact information:
- Full phone numbers (like +91-80-22334455 or +91-9876543210)
- Real email addresses (like info@company.com or sales@company.com)
- Complete business addresses

Format each supplier exactly as:

**[Company Name]**
- Contact Email: [verified email from company website/directory]
- Phone Number: [complete phone number with area code]
- Address: [full street address with city and state]
- Website: [company website URL]
- Logo URL: [logo URL if available]
- Description: [company services and products]

CRITICAL: Search each company's actual website and business listings to get real contact details. Do not include companies with missing phone numbers or email addresses. I need actionable contact information that I can actually use to reach these suppliers.`;

      console.log('Enhanced Perplexity search prompt:', searchPrompt);

      console.log('Perplexity search prompt:', searchPrompt);

      // Make request to Perplexity API
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a business intelligence assistant that finds verified supplier contact information. Search company websites, business directories like IndiaMART, JustDial, and official contact pages to provide complete, actionable contact details. Always prioritize real phone numbers and email addresses that businesses can actually use to contact suppliers.'
            },
            {
              role: 'user',
              content: searchPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.1,
          return_citations: true,
          return_images: false,
          return_related_questions: false,
          search_recency_filter: "month",
        }),
      });

      if (!perplexityResponse.ok) {
        throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
      }

      const perplexityData = await perplexityResponse.json();
      console.log('Raw Perplexity response:', JSON.stringify(perplexityData).substring(0, 500) + '...');

      const aiResponse = perplexityData.choices[0]?.message?.content || '';
      console.log('AI Response:', aiResponse);

      // Parse the AI response to extract vendor information
      console.log('Parsing AI response...');
      const vendors = parseVendorResponse(aiResponse);
      console.log(`Parsed ${vendors.length} valid vendors`);
      console.log(`Found ${vendors.length} vendors from AI discovery`);

      res.json(vendors);
    } catch (error) {
      console.error('Error in vendor discovery:', error);
      res.status(500).json({ error: 'Failed to discover vendors' });
    }
  });

  // Simple vendor parsing function
  function parseVendorResponse(response: string) {
    const vendors: any[] = [];
    const vendorBlocks = response.split('**').filter(block => block.trim().length > 0);

    for (let i = 0; i < vendorBlocks.length; i += 2) {
      if (i + 1 < vendorBlocks.length) {
        const nameBlock = vendorBlocks[i].trim();
        const detailsBlock = vendorBlocks[i + 1].trim();

        if (nameBlock.length > 0 && detailsBlock.length > 0) {
          const vendor: any = {
            name: nameBlock.replace(/\*\*/g, '').trim(),
            email: extractField(detailsBlock, 'Contact Email:') || extractField(detailsBlock, 'Email:'),
            phone: extractField(detailsBlock, 'Phone Number:') || extractField(detailsBlock, 'Phone:'),
            address: extractField(detailsBlock, 'Address:'),
            website: extractField(detailsBlock, 'Website:'),
            logoUrl: extractField(detailsBlock, 'Logo URL:'),
            description: extractField(detailsBlock, 'Description:'),
          };

          // Only add vendors with at least a name and some contact info
          if (vendor.name && (vendor.email || vendor.phone || vendor.address)) {
            vendors.push(vendor);
          }
        }
      }
    }

    return vendors;
  }

  function extractField(text: string, fieldName: string): string | null {
    const regex = new RegExp(`${fieldName}\\s*([^\\n-]+)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const value = match[1].trim().replace(/^[-\s]+/, '').trim();
      
      // Filter out common placeholder values
      const invalidValues = [
        'Not publicly listed',
        'Not available',
        'Not listed',
        'Contact via platform',
        'N/A',
        '+91',
        'info@',
        '[email',
        'contact@'
      ];
      
      if (invalidValues.some(invalid => value.includes(invalid))) {
        return null;
      }
      
      return value;
    }
    return null;
  }

  // RFx routes
  app.get('/api/rfx', async (req, res) => {
    try {
      const rfxEvents = await storage.getRfxEvents();
      res.json(rfxEvents);
    } catch (error) {
      console.error("Error fetching RFx events:", error);
      res.status(500).json({ message: "Failed to fetch RFx events" });
    }
  });

  // Auction routes
  app.get('/api/auctions', async (req, res) => {
    try {
      const auctions = await storage.getAuctions();
      res.json(auctions);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  // Purchase Order routes
  app.get('/api/purchase-orders', async (req, res) => {
    try {
      const pos = await storage.getPurchaseOrders();
      res.json(pos);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Product category routes
  app.get('/api/product-categories/hierarchy', async (req, res) => {
    try {
      const categories = await storage.getProductCategoriesHierarchy();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  // BOM routes
  app.get('/api/boms', async (req, res) => {
    try {
      const boms = await storage.getBoms();
      res.json(boms);
    } catch (error) {
      console.error("Error fetching BOMs:", error);
      res.status(500).json({ message: "Failed to fetch BOMs" });
    }
  });

  // Direct procurement routes
  app.get('/api/direct-procurement', async (req, res) => {
    try {
      const orders = await storage.getDirectProcurementOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching direct procurement orders:", error);
      res.status(500).json({ message: "Failed to fetch direct procurement orders" });
    }
  });

  // Approval routes
  app.get('/api/approvals', async (req, res) => {
    try {
      // For development, return empty array since user might not exist in DB
      res.json([]);
    } catch (error) {
      console.error("Error fetching approvals:", error);
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}