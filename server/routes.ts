import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from 'uuid';
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
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
      gstNumber: 'SMART567890123',
      address: 'Manufacturing Hub, Chennai, Tamil Nadu, India - 600001'
    }
  };

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

  // Ensure development user exists in database
  try {
    const existingUser = await storage.getUser(currentDevUser.id);
    if (!existingUser) {
      console.log('Creating development user in database...');
      await storage.upsertUser({
        id: currentDevUser.id,
        email: currentDevUser.email,
        firstName: currentDevUser.firstName,
        lastName: currentDevUser.lastName,
        role: currentDevUser.role as any,
      });
      console.log('Development user created successfully');
    } else {
      console.log('Development user already exists in database');
    }
  } catch (error) {
    console.error('Error ensuring development user exists:', error);
  }

  // Create test vendor users and their vendor profiles
  for (const [key, vendorProfile] of Object.entries(testVendorProfiles)) {
    try {
      const existingVendorUser = await storage.getUser(vendorProfile.id);
      if (!existingVendorUser) {
        console.log(`Creating test vendor user: ${vendorProfile.companyName}`);
        await storage.upsertUser({
          id: vendorProfile.id,
          email: vendorProfile.email,
          firstName: vendorProfile.firstName,
          lastName: vendorProfile.lastName,
          role: vendorProfile.role as any,
        });

        // Create corresponding vendor profile
        const existingVendorProfile = await storage.getVendorByUserId(vendorProfile.id);
        if (!existingVendorProfile) {
          await storage.createVendor({
            companyName: vendorProfile.companyName,
            email: vendorProfile.email,
            contactPerson: `${vendorProfile.firstName} ${vendorProfile.lastName}`,
            phone: vendorProfile.phone,
            address: vendorProfile.address,
            gstNumber: vendorProfile.gstNumber,
            userId: vendorProfile.id,
          });
          console.log(`Created vendor profile for: ${vendorProfile.companyName}`);
        }
      }
    } catch (error) {
      console.error(`Error creating test vendor ${key}:`, error);
    }
  }

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

  app.post('/api/auth/login', async (req, res) => {
    console.log('Login requested');
    try {
      // Restore login state
      isLoggedIn = true;

      // Ensure the user exists in the database
      const existingUser = await storage.getUser(currentDevUser.id);
      if (!existingUser) {
        console.log('User not found in database, creating...');
        await storage.upsertUser({
          id: currentDevUser.id,
          email: currentDevUser.email,
          firstName: currentDevUser.firstName,
          lastName: currentDevUser.lastName,
          role: currentDevUser.role as any,
        });
      }

      console.log('Login successful for user:', currentDevUser.email);
      res.json(currentDevUser);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.patch('/api/auth/user/role', async (req, res) => {
    console.log('Role change requested to:', req.body.role, 'vendorId:', req.body.vendorId);
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { role, vendorId } = req.body;
    const validRoles = ['buyer_admin', 'buyer_user', 'sourcing_manager', 'vendor'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    try {
      // If switching to vendor role and a vendorId is provided, switch to that vendor profile
      if (role === 'vendor' && vendorId) {
        const vendorProfile = Object.values(testVendorProfiles).find(v => v.id === vendorId);
        if (vendorProfile) {
          console.log(`Switching to vendor profile: ${vendorProfile.companyName}`);
          
          // Check if vendor user already exists
          let existingVendor;
          try {
            existingVendor = await storage.getUser(vendorProfile.id);
          } catch (error) {
            // User doesn't exist, we'll create them
          }
          
          // Only create/update if user doesn't exist or needs updating
          if (!existingVendor) {
            try {
              await storage.upsertUser({
                id: vendorProfile.id,
                email: vendorProfile.email,
                firstName: vendorProfile.firstName,
                lastName: vendorProfile.lastName,
                role: vendorProfile.role as any,
              });
            } catch (error: any) {
              // If it's a duplicate email error, just continue - the user exists with different ID
              if (error.code !== '23505') {
                throw error;
              }
              console.log('Vendor user already exists with this email, continuing...');
            }
          }

          // Update current user to the selected vendor profile
          currentDevUser = {
            id: vendorProfile.id,
            email: vendorProfile.email,
            firstName: vendorProfile.firstName,
            lastName: vendorProfile.lastName,
            role: vendorProfile.role
          } as any;
          // Add vendorId for frontend matching
          (currentDevUser as any).vendorId = vendorProfile.id;
          console.log(`Switched to vendor: ${vendorProfile.companyName}`);
        } else {
          return res.status(400).json({ message: 'Invalid vendor ID' });
        }
      } else {
        // Regular role switch for non-vendor roles - switch back to dev user
        const originalDevUser = {
          id: 'dev-user-123',
          email: 'dev@sclen.com',
          firstName: 'Development',
          lastName: 'User',
          role: role
        };

        // Switch back to original dev user for non-vendor roles
        currentDevUser = originalDevUser as any;
        console.log('Switched back to dev user with role:', role);
      }

      res.json(currentDevUser);
    } catch (error) {
      console.error('Failed to update role in database:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  // Add endpoint to get available test vendor profiles
  app.get('/api/auth/test-vendors', (req, res) => {
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const vendorList = Object.entries(testVendorProfiles).map(([key, profile]) => ({
      id: profile.id,
      companyName: profile.companyName,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    }));
    
    res.json(vendorList);
  });

  // Auth middleware for protected routes
  const authMiddleware = (req: any, res: next, next: any) => {
    try {
      // Skip auth check for auth routes, vendor discovery, and auction bids (temporarily)
      if (req.path.startsWith('/auth/') || 
          req.path === '/vendors/discover' || 
          req.path.includes('/auctions/') && req.path.endsWith('/bids')) {
        return next();
      }

      console.log('Auth middleware - isLoggedIn:', isLoggedIn, 'path:', req.path);
      if (!isLoggedIn) {
        console.log('Auth middleware - User not logged in, returning 401');
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Add mock user to request
      req.user = { claims: { sub: currentDevUser.id } };
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Authentication error' });
    }
  };

  // Get auction bids - register BEFORE authentication middleware to avoid 500 error
  app.get("/api/auctions/:id/bids", async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log('Backend: Fetching bids for auction:', id);

      // Check if auction exists first
      const auction = await storage.getAuction(id);
      if (!auction) {
        console.log('Backend: Auction not found:', id);
        return res.status(404).json({ error: "Auction not found" });
      }

      console.log('Backend: Auction found:', auction.name);

      // Use storage interface instead of direct drizzle queries
      const bids = await storage.getAuctionBids(id);

      console.log('Backend: Found bids:', bids.length);
      if (bids.length > 0) {
        console.log('Backend: First bid details:', bids[0]);
      }

      res.json(bids);
    } catch (error) {
      console.error("Error fetching auction bids:", error);
      console.error("Error stack:", (error as any).stack);
      res.status(500).json({ error: "Failed to fetch auction bids", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Apply auth middleware to all /api routes except auth routes
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) {
      return next();
    }
    return authMiddleware(req, res, next);
  });

  // Object storage routes for file uploads
  app.post('/api/objects/upload', async (req, res) => {
    try {
      const { fileName, entityType = 'general', entityId } = req.body;
      const objectStorageService = new ObjectStorageService();

      let filePath = fileName;
      if (entityType === 'rfx-response' && entityId) {
        filePath = `rfx-responses/${entityId}/${fileName}`;
      } else if (entityType === 'terms') {
        filePath = `terms/${fileName}`;
      } else if (fileName) {
        filePath = `general/${fileName}`;
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL(filePath);
      res.json({
        uploadURL,
        filePath: `/objects/${filePath}`,
        method: 'PUT'
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Terms acceptance endpoint
  app.post('/api/terms/accept', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { entityType, entityId, termsAndConditionsPath } = req.body;

      console.log(`Terms accepted by user ${userId} for ${entityType} ${entityId}`);

      // In a full implementation, you'd store this in a terms_acceptances table
      // For now, we'll just return success
      res.json({
        success: true,
        message: "Terms and conditions accepted successfully"
      });
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });

  // Check terms acceptance status
  app.get('/api/terms/check', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { entityType, entityId } = req.query;

      // For development, we'll return that terms are not accepted by default
      // In a full implementation, you'd check the terms_acceptances table
      res.json({
        accepted: false,
        entityType,
        entityId,
        userId
      });
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
      res.status(500).json({ message: "Failed to check terms acceptance" });
    }
  });



  app.get('/api/vendor/rfx-responses', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      const responses = await storage.getRfxResponsesByVendor(vendor.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching vendor responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.post('/api/vendor/rfx-responses', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      const responseData = {
        ...req.body,
        vendorId: vendor.id,
      };

      console.log('Creating vendor response:', responseData);

      const response = await storage.createRfxResponse(responseData);

      // Update invitation status to 'responded'
      await storage.updateRfxInvitationStatus(
        req.body.rfxId,
        vendor.id,
        'responded'
      );

      res.json(response);
    } catch (error) {
      console.error("Error creating RFx response:", error);
      res.status(500).json({ message: "Failed to create response" });
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

  // Test data creation endpoint
  app.post('/api/debug/create-test-bom', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user-123';

      console.log("Creating test BOM with items...");

      // Create a test BOM
      const testBom = await storage.createBom({
        name: "Test BOM for Auction",
        version: "1.0",
        description: "Test BOM with sample items for auction testing",
        category: "Electronics",
        createdBy: userId,
      });

      console.log("Created test BOM:", testBom.id);

      // Add some test items to the BOM
      const testItems = [
        {
          bomId: testBom.id,
          itemName: "Resistor 10K",
          itemCode: "RES-10K-001",
          description: "10K Ohm resistor, 1/4W",
          category: "Electronics",
          quantity: "100.000",
          uom: "pieces",
          unitPrice: "0.50",
          totalPrice: "50.00",
          specifications: "10K Ohm, ±5%, 1/4W"
        },
        {
          bomId: testBom.id,
          itemName: "Capacitor 100uF",
          itemCode: "CAP-100UF-001",
          description: "100uF electrolytic capacitor",
          category: "Electronics",
          quantity: "50.000",
          uom: "pieces",
          unitPrice: "1.20",
          totalPrice: "60.00",
          specifications: "100uF, 25V, Electrolytic"
        },
        {
          bomId: testBom.id,
          itemName: "LED Red 5mm",
          itemCode: "LED-RED-5MM",
          description: "5mm red LED",
          category: "Electronics",
          quantity: "25.000",
          uom: "pieces",
          unitPrice: "0.25",
          totalPrice: "6.25",
          specifications: "5mm, Red, 20mA, 2V forward voltage"
        }
      ];

      const createdItems = [];
      for (const item of testItems) {
        const createdItem = await storage.createBomItem(item);
        createdItems.push(createdItem);
        console.log("Created BOM item:", createdItem.id, createdItem.itemName);
      }

      console.log("Test BOM created successfully with", createdItems.length, "items");

      res.json({
        message: "Test BOM created successfully",
        bom: testBom,
        items: createdItems,
        itemCount: createdItems.length
      });
    } catch (error) {
      console.error("Error creating test BOM:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Debug endpoint to check BOM data
  app.get('/api/debug/boms', async (req, res) => {
    try {
      console.log("=== DEBUG: Checking BOM data ===");

      const allBoms = await storage.getBoms();
      console.log("Total BOMs in database:", allBoms.length);

      const bomWithItemCounts = [];
      for (const bom of allBoms) {
        const items = await storage.getBomItems(bom.id);
        bomWithItemCounts.push({
          id: bom.id,
          name: bom.name,
          version: bom.version,
          itemCount: items.length,
          items: items.slice(0, 2) // Show first 2 items as sample
        });
      }

      console.log("BOMs with item counts:", bomWithItemCounts);

      res.json({
        totalBoms: allBoms.length,
        bomsWithItems: bomWithItemCounts.filter(b => b.itemCount > 0).length,
        bomDetails: bomWithItemCounts
      });
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
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

  app.patch('/api/vendors/:id', async (req, res) => {
    try {
      const vendorId = req.params.id;

      // Check if vendor exists first
      const existingVendor = await storage.getVendor(vendorId);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const vendor = await storage.updateVendor(vendorId, req.body);
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete('/api/vendors/:id', async (req, res) => {
    try {
      const vendorId = req.params.id;

      // Check if vendor exists first
      const existingVendor = await storage.getVendor(vendorId);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const result = await storage.deleteVendor(vendorId);
      if (!result) {
        return res.status(500).json({ message: "Failed to delete vendor" });
      }
      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
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

      // Construct search prompt
      let searchPrompt = `Find professional vendors and suppliers specializing in ${query}`;
      if (location && location !== 'all') {
        searchPrompt += ` in ${location}`;
      }
      searchPrompt += ' in India. Please format the response as follows for each vendor:\n**[Company Name]**\n- Contact Email: [email address]  \n- Phone Number: [phone number]\n- Address: [full address]\n- Website: [website URL]\n- Logo URL: [company logo URL if available]\n- Description: [brief description of services/products]\nFocus on established businesses with verifiable contact information from business directories, company websites, and public listings.';

      console.log('Perplexity search prompt:', searchPrompt);

      // Make request to Perplexity API
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that finds real vendors and suppliers. Always provide accurate, up-to-date information with real contact details.'
            },
            {
              role: 'user',
              content: searchPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2,
          return_citations: true,
          return_images: false,
          return_related_questions: false,
        }),
      });

      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text();
        console.error('Perplexity API error details:', errorText);
        throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
      }

      const perplexityData = await perplexityResponse.json();
      console.log('Raw Perplexity response:', JSON.stringify(perplexityData).substring(0, 500) + '...');

      const aiResponse = perplexityData.choices[0]?.message?.content || '';
      console.log('AI Response:', aiResponse);

      // Parse the AI response to extract vendor information
      console.log('Parsing AI response...');
      const vendors = parseVendorResponse(aiResponse);
      console.log(`Found ${vendors.length} vendors from AI discovery`);
      if (vendors.length > 0) {
        console.log('Sample vendor:', vendors[0].name, '-', vendors[0].phone || 'No phone', '-', vendors[0].email || 'No email');
      }

      res.json(vendors);
    } catch (error) {
      console.error('Error in vendor discovery:', error);
      res.status(500).json({ error: 'Failed to discover vendors' });
    }
  });

  // Enhanced vendor parsing function to handle multiple response formats
  function parseVendorResponse(response: string) {
    const vendors: any[] = [];

    // First, try to find vendor blocks by looking for company name patterns
    // Use regex to find standalone company names followed by contact details
    const vendorPattern = /^([A-Za-z][A-Za-z\s&().,'-]+(?:Ltd|Pvt Ltd|Company|Enterprises|Corp|Corporation|Inc|Chemicals|Industries|Impex|Private Limited)?)\s*\n((?:- [^\n]+\n?)+)/gm;
    
    let match;
    let found = false;
    
    while ((match = vendorPattern.exec(response)) !== null) {
      found = true;
      const companyName = match[1].trim();
      const details = match[2].trim();
      
      const vendor: any = {
        name: companyName,
        email: extractField(details, 'Contact Email:') || extractField(details, 'Email:'),
        phone: extractField(details, 'Phone Number:') || extractField(details, 'Phone:'),
        address: extractField(details, 'Address:'),
        website: extractField(details, 'Website:'),
        logoUrl: extractField(details, 'Logo URL:'),
        description: extractField(details, 'Description:'),
      };

      // Only add vendors with at least a name and some contact info
      if (vendor.name && (vendor.email || vendor.phone || vendor.address)) {
        vendors.push(vendor);
      }
    }

    // If regex approach didn't work, fall back to ** splitting approach
    if (!found || vendors.length === 0) {
      const sections = response.split('**').filter(section => section.trim().length > 0);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        
        // Skip sections that are just descriptions or headers
        if (section.toLowerCase().includes('here are') || section.toLowerCase().includes('suppliers in') || section.length < 10) {
          continue;
        }

        // Check if this looks like a company name (not just details)
        const firstLine = section.split('\n')[0].trim();
        
        // Look for company indicators
        const companyIndicators = ['Ltd', 'Pvt', 'Company', 'Enterprises', 'Corp', 'Corporation', 'Inc', 'Chemicals', 'Industries', 'Impex', 'Private Limited'];
        const isCompanyName = companyIndicators.some(indicator => firstLine.includes(indicator)) || 
                             (firstLine.length < 100 && !firstLine.includes('-') && !firstLine.includes('Contact'));

        if (isCompanyName) {
          const companyName = firstLine;
          
          // Look for details in the next section or same section after first line
          let details = '';
          const restOfSection = section.substring(firstLine.length).trim();
          
          if (restOfSection.length > 20) {
            details = restOfSection;
          } else if (i + 1 < sections.length) {
            details = sections[i + 1].trim();
          }
          
          if (details.length > 20) {
            const vendor: any = {
              name: companyName,
              email: extractField(details, 'Contact Email:') || extractField(details, 'Email:'),
              phone: extractField(details, 'Phone Number:') || extractField(details, 'Phone:'),
              address: extractField(details, 'Address:'),
              website: extractField(details, 'Website:'),
              logoUrl: extractField(details, 'Logo URL:'),
              description: extractField(details, 'Description:'),
            };

            // Only add vendors with at least a name and some contact info
            if (vendor.name && (vendor.email || vendor.phone || vendor.address)) {
              vendors.push(vendor);
            }
          }
        }
      }
    }

    return vendors;
  }

  function extractField(text: string, fieldName: string): string | null {
    // Try multiple patterns to extract field values
    const patterns = [
      new RegExp(`-\\s*${fieldName}\\s*([^\\n]+)`, 'i'),
      new RegExp(`${fieldName}\\s*([^\\n]+)`, 'i'),
      new RegExp(`${fieldName}:?\\s*([^\\n]+)`, 'i')
    ];

    for (const regex of patterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        let value = match[1].trim();

        // Clean up the value
        value = value.replace(/^[-:\s]+/, '').trim();
        value = value.replace(/[.\s]+$/, '');

        // Filter out placeholder values
        const invalidValues = [
          'Not publicly listed',
          'Not available',
          'Not listed in search results',
          'Contact via platform',
          'N/A',
          '[Not publicly available]',
          '[No official website found]'
        ];

        // Check for invalid values
        if (invalidValues.some(invalid => value.toLowerCase().includes(invalid.toLowerCase()))) {
          continue;
        }

        // Special validation for email
        if (fieldName.toLowerCase().includes('email')) {
          if (!value.includes('@') || value.length < 5) {
            continue;
          }
          return value;
        }

        // Special validation for phone - accept any phone number with digits
        if (fieldName.toLowerCase().includes('phone')) {
          // Remove spaces and check if it contains digits
          const cleanPhone = value.replace(/\s/g, '');
          if (cleanPhone.match(/\d/) && cleanPhone.length >= 8) {
            return value;
          }
          continue;
        }

        // Ensure we have meaningful content
        if (value.length > 3) {
          return value;
        }
      }
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

  app.post('/api/rfx', async (req: any, res) => {
    try {
      console.log("RFx creation request received:", req.body);
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { selectedVendors, ...rfxFields } = req.body;

      const rfxData = {
        ...rfxFields,
        createdBy: userId,
        referenceNo: `RFX-${Date.now()}`,
        status: req.body.status || "active",
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      };

      console.log("Creating RFx with data:", rfxData);
      const rfx = await storage.createRfxEvent(rfxData);
      console.log("RFx created successfully:", rfx);

      // Create invitations for selected vendors only
      if (selectedVendors && selectedVendors.length > 0) {
        console.log(`Creating invitations for ${selectedVendors.length} selected vendors`);
        const invitations = [];

        for (const vendorId of selectedVendors) {
          try {
            const invitation = await storage.createRfxInvitation({
              rfxId: rfx.id,
              vendorId: vendorId,
              status: 'invited'
            });
            invitations.push(invitation);
            console.log(`Created invitation for vendor ${vendorId} to RFx ${rfx.id}`);
          } catch (error) {
            console.error(`Failed to create invitation for vendor ${vendorId}:`, error);
          }
        }

        console.log(`Successfully created ${invitations.length} invitations`);
        res.json({
          rfx,
          invitationsCreated: invitations.length,
          selectedVendors: selectedVendors.length
        });
      } else {
        console.log("No vendors selected for invitation");
        res.json(rfx);
      }
    } catch (error) {
      console.error("Error creating RFx:", error);
      res.status(500).json({ message: "Failed to create RFx", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/rfx/invitations', async (req: any, res) => {
    try {
      console.log("RFx invitation request:", req.body);
      const invitation = await storage.createRfxInvitation(req.body);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating RFx invitation:", error);
      res.status(500).json({ message: "Failed to create RFx invitation" });
    }
  });

  // Get RFx responses for buyers
  app.get('/api/rfx/:id/responses', async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching responses for RFx ${id}...`);
      
      const responses = await storage.getRfxResponses({ rfxId: id });
      console.log(`Found ${responses.length} responses for RFx ${id}`);
      
      res.json(responses);
    } catch (error) {
      console.error("Error fetching RFx responses:", error);
      res.status(500).json({ message: "Failed to fetch RFx responses" });
    }
  });

  // Vendor RFx invitations route
  app.get('/api/vendor/rfx-invitations', async (req: any, res) => {
    try {
      console.log('Vendor RFx invitations - User ID:', req.user?.claims?.sub);

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check user role from database
      // Get fresh user data from database to ensure role changes are reflected
      const user = await storage.getUser(userId);
      console.log('Vendor RFx invitations - User role:', user?.role);
      console.log('Vendor RFx invitations - Current session role:', currentDevUser.role);

      if (!user || user.role !== 'vendor') {
        console.log('User role check failed. User found:', !!user, 'Role:', user?.role);
        return res.json([]);
      }

      // For development, let's find vendor by userId or create a mock vendor
      let vendor = await storage.getVendorByUserId(userId);
      console.log("Found vendor:", vendor ? vendor.id : 'No vendor found');

      if (!vendor) {
        // For development, let's get all vendors and see if we can match by email
        const allVendors = await storage.getVendors();
        console.log("All vendors:", allVendors.map(v => ({ id: v.id, email: v.email, userId: v.userId })));

        // Try to find by email
        vendor = allVendors.find(v => v.email === currentDevUser.email);
        console.log("Found vendor by email:", vendor ? vendor.id : 'No vendor found by email');

        if (!vendor) {
          // For development, create a temporary vendor profile
          console.log("Creating temporary vendor profile for development");
          vendor = await storage.createVendor({
            companyName: `${currentDevUser.firstName} ${currentDevUser.lastName} Company`,
            email: currentDevUser.email,
            contactPerson: `${currentDevUser.firstName} ${currentDevUser.lastName}`,
            phone: '1234567890',
            address: 'Development Address, Dev City, Dev State, India - 123456',
            gstNumber: 'DEV123456',
            userId: userId,
          });
          console.log("Created vendor:", vendor.id);

          // Automatically create invitations for this new vendor to all existing RFx events
          console.log("Creating invitations for new vendor to existing RFx events...");
          const existingRfxEvents = await storage.getRfxEvents();
          for (const rfx of existingRfxEvents) {
            try {
              await storage.createRfxInvitation({
                rfxId: rfx.id,
                vendorId: vendor.id,
                status: 'invited'
              });
              console.log(`Created invitation for new vendor ${vendor.id} to RFx ${rfx.id}`);
            } catch (error) {
              console.log(`Invitation may already exist for vendor ${vendor.id} to RFx ${rfx.id}`);
            }
          }
        }
      }

      // Get RFx invitations for this vendor
      const invitations = await storage.getRfxInvitationsForVendor(vendor.id);
      console.log(`Found ${invitations.length} invitations for vendor ${vendor.id}`);

      // Format the response to match the expected structure
      const formattedInvitations = invitations.map(inv => ({
        id: `${inv.rfxId}-${inv.vendorId}`,
        rfxId: inv.rfxId,
        vendorId: inv.vendorId,
        status: inv.status || 'invited',
        invitedAt: inv.invitedAt,
        respondedAt: inv.respondedAt,
        rfx: {
          id: inv.rfxId,
          title: inv.rfxTitle,
          referenceNo: inv.rfxReferenceNo,
          type: inv.rfxType,
          scope: inv.rfxScope,
          dueDate: inv.rfxDueDate,
          status: inv.rfxStatus,
          budget: inv.rfxBudget,
          contactPerson: inv.rfxContactPerson,
          termsAndConditionsPath: inv.rfxTermsAndConditionsPath,
          criteria: inv.rfxCriteria,
          evaluationParameters: inv.rfxEvaluationParameters,
          attachments: inv.rfxAttachments,
        }
      }));

      console.log("Formatted invitations:", formattedInvitations.length);
      res.json(formattedInvitations);
    } catch (error) {
      console.error("Error fetching vendor RFx invitations:", error);
      res.status(500).json({ message: "Failed to fetch RFx invitations" });
    }
  });

  // Vendor RFx responses route
  app.get('/api/vendor/rfx-responses', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.json([]);
      }

      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.json([]);
      }

      const responses = await storage.getRfxResponsesByVendor(vendor.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching vendor RFx responses:", error);
      res.status(500).json({ message: "Failed to fetch RFx responses" });
    }
  });

  // Submit RFx response
  app.post('/api/vendor/rfx-responses', async (req: any, res) => {
    try {
      console.log('RFx response submission request:', req.body);

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Access denied. Vendors only." });
      }

      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      if (!req.body.rfxId) {
        return res.status(400).json({ message: "RFx ID is required" });
      }

      const { attachments = [], ...otherData } = req.body;

      // Ensure attachments is an array of strings (file paths)
      const processedAttachments = Array.isArray(attachments)
        ? attachments.filter(att => typeof att === 'string' && att.trim().length > 0)
        : [];

      const responseData = {
        ...otherData,
        vendorId: vendor.id,
        attachments: processedAttachments,
      };

      console.log('Creating RFx response with data:', responseData);
      const response = await storage.createRfxResponse(responseData);
      console.log('RFx response created successfully:', response.id);

      // Update invitation status to 'responded'
      try {
        await storage.updateRfxInvitationStatus(req.body.rfxId, vendor.id, 'responded');
        console.log('Updated invitation status to responded');
      } catch (invitationError) {
        console.error('Failed to update invitation status:', invitationError);
        // Don't fail the entire request if invitation update fails
      }

      res.json(response);
    } catch (error) {
      console.error("Error creating RFx response:", error);
      res.status(500).json({
        message: "Failed to create RFx response",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Development helper: Invite current development vendor to a specific RFx
  app.post('/api/dev/invite-to-rfx/:rfxId', async (req: any, res) => {
    try {
      const rfxId = req.params.rfxId;
      console.log(`Creating invitation for development vendor to RFx ${rfxId}...`);

      // Ensure the current development user has a vendor profile if in vendor role
      if (currentDevUser.role === 'vendor') {
        let devVendor = await storage.getVendorByUserId(currentDevUser.id);
        if (!devVendor) {
          console.log("Creating development vendor profile...");
          devVendor = await storage.createVendor({
            companyName: `${currentDevUser.firstName} ${currentDevUser.lastName} Company`,
            email: currentDevUser.email,
            contactPerson: `${currentDevUser.firstName} ${currentDevUser.lastName}`,
            phone: '1234567890',
            address: 'Development Address, Dev City, Dev State, India - 123456',
            gstNumber: 'DEV123456',
            userId: currentDevUser.id,
          });
          console.log("Created development vendor:", devVendor.id);
        }

        try {
          const invitation = await storage.createRfxInvitation({
            rfxId: rfxId,
            vendorId: devVendor.id,
            status: 'invited'
          });
          console.log(`Created invitation for development vendor ${devVendor.id} to RFx ${rfxId}`);

          res.json({
            message: `Development vendor invited to RFx`,
            rfxId: rfxId,
            vendorId: devVendor.id,
            invitation: invitation
          });
        } catch (error) {
          if ((error as any).message?.includes('duplicate') || (error as any).code === '23505') {
            res.json({
              message: `Development vendor already invited to this RFx`,
              rfxId: rfxId,
              vendorId: devVendor.id
            });
          } else {
            throw error;
          }
        }
      } else {
        res.status(400).json({ message: "User must be in vendor role to create vendor invitations" });
      }
    } catch (error) {
      console.error("Error inviting development vendor:", error);
      res.status(500).json({ message: "Failed to invite development vendor" });
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

  // Get auction results
  // Get single auction by ID
  app.get('/api/auctions/:id', authMiddleware, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      console.log(`Fetching auction with ID: ${id}`);

      const auction = await storage.getAuction(id);
      if (!auction) {
        console.log(`Auction not found: ${id}`);
        return res.status(404).json({ error: 'Auction not found' });
      }

      console.log(`Auction found: ${auction.name}`);
      res.json(auction);
    } catch (error) {
      console.error('Error getting auction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/auctions/:id/results', authMiddleware, async (req: any, res: any) => {
    try {
      const { id } = req.params;

      // Get auction details
      const auction = await storage.getAuction(id); // Using storage instead of direct db query

      if (!auction) {
        return res.status(404).json({ error: 'Auction not found' });
      }

      // Get all bids for this auction with vendor details
      const bids = await storage.getAuctionBids(id); // Using storage instead of direct db query

      // Mark the winning bid (lowest amount for reverse auction)
      const results = bids.map((bid, index) => ({
        ...bid,
        rank: index + 1,
        isWinner: index === 0,
        vendorName: bid.vendorCompanyName || `Vendor ${bid.vendorId.substring(0, 8)}`,
        companyName: bid.vendorCompanyName // Explicitly include companyName as vendorName
      }));

      res.json({
        auction,
        results
      });
    } catch (error) {
      console.error('Error getting auction results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Place bid in auction
  app.post("/api/auctions/:auctionId/bid", async (req: any, res) => {
    try {
      const { auctionId } = req.params;
      const { amount } = req.body;
      const userId = req.user?.claims?.sub;

      console.log('Bid request received:', { auctionId, amount, userId });

      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get user and ensure they are a vendor
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can place bids" });
      }

      // Get vendor profile
      let vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        // For development, create vendor profile if it doesn't exist
        console.log("Creating vendor profile for development user");
        vendor = await storage.createVendor({
          companyName: `${user.firstName} ${user.lastName} Company`,
          email: user.email,
          contactPerson: `${user.firstName} ${user.lastName}`,
          phone: '1234567890',
          address: 'Development Address, Dev City, Dev State, India - 123456',
          gstNumber: 'DEV123456',
          userId: userId,
        });
      }

      // Get auction and validate
      const auction = await storage.getAuction(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      if (auction.status !== 'live') {
        return res.status(400).json({ message: "Auction is not live" });
      }

      // Validate bid amount
      const bidAmount = parseFloat(amount);
      if (isNaN(bidAmount) || bidAmount <= 0) {
        return res.status(400).json({ message: "Invalid bid amount" });
      }

      // For reverse auction, bid should be below ceiling price
      if (auction.reservePrice && bidAmount >= parseFloat(auction.reservePrice)) {
        return res.status(400).json({ message: "Bid must be below ceiling price" });
      }

      // Create the bid
      const bid = await storage.createBid({
        auctionId: auctionId,
        vendorId: vendor.id,
        amount: bidAmount.toString(),
        status: 'active' as const,
      });

      console.log('Bid created successfully:', bid);

      // Update auction current bid if this is the lowest bid
      const allBids = await storage.getAuctionBids(auctionId);
      const lowestBid = allBids.reduce((lowest: any, current: any) => 
        parseFloat(current.amount) < parseFloat(lowest.amount) ? current : lowest, bid);

      if (lowestBid.id === bid.id) {
        await storage.updateAuction(auctionId, {
          currentBid: bidAmount.toString(),
          leadingVendorId: vendor.id
        });
      }

      res.json({
        success: true,
        bid: bid,
        message: "Bid placed successfully"
      });
    } catch (error: any) {
      console.error("Error placing bid:", error);
      res.status(500).json({ 
        message: "Failed to place bid", 
        error: error.message 
      });
    }
  });

  app.post('/api/auctions', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Creating auction with data:", JSON.stringify(req.body, null, 2));

      const { 
        name, 
        description, 
        bomId, 
        selectedBomItems = [], 
        selectedVendors = [], 
        reservePrice, 
        startTime, 
        endTime, 
        status = 'scheduled',
        termsUrl 
      } = req.body;

      // Validate required fields
      if (!name || !description) {
        return res.status(400).json({ message: "Name and description are required" });
      }

      if (!startTime || !endTime) {
        return res.status(400).json({ message: "Start time and end time are required" });
      }

      if (!termsUrl) {
        return res.status(400).json({ message: "Terms and conditions are required" });
      }

      // Validate that end time is after start time
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      if (endDate <= startDate) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      // Generate a unique auction ID using UUID format
      const auctionId = uuidv4();

      const auctionData = {
        id: auctionId,
        name: name.trim(),
        description: description.trim(),
        bomId: bomId || null,
        selectedBomItems: Array.isArray(selectedBomItems) ? selectedBomItems : [],
        selectedVendors: Array.isArray(selectedVendors) ? selectedVendors : [],
        reservePrice: reservePrice ? parseFloat(reservePrice).toString() : null,
        startTime: startDate,
        endTime: endDate,
        status: status as any,
        termsAndConditionsPath: termsUrl,
        currentBid: null,
        leadingVendorId: null,
        winnerId: null,
        winningBid: null,
        createdBy: userId,
      };

      console.log("Processed auction data:", JSON.stringify(auctionData, null, 2));

      const auction = await storage.createAuction(auctionData);
      console.log("Auction created successfully:", auction.id);

      // Create auction participants for selected vendors
      if (selectedVendors && selectedVendors.length > 0) {
        console.log(`Creating auction participants for ${selectedVendors.length} vendors`);
        for (const vendorId of selectedVendors) {
          try {
            await storage.createAuctionParticipant({
              auctionId: auction.id,
              vendorId: vendorId,
            });
            console.log(`Added vendor ${vendorId} as participant to auction ${auction.id}`);
          } catch (error) {
            console.error(`Failed to add vendor ${vendorId} as participant:`, error);
          }
        }
      }

      res.json(auction);
    } catch (error: any) {
      console.error("Error creating auction:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create auction", 
        error: error.message || "Unknown error" 
      });
    }
  });

  // Purchase Order routes
  app.get('/api/purchase-orders', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      let purchaseOrders;
      
      if (user?.role === 'vendor') {
        // For vendors, only show their POs in 'issued' or 'acknowledged' status
        const vendor = await storage.getVendorByUserId(userId);
        if (!vendor) {
          return res.status(404).json({ message: "Vendor profile not found" });
        }
        
        // Use filter to get only issued and acknowledged POs for this vendor
        purchaseOrders = await storage.getPurchaseOrders({ vendorId: vendor.id });
        // Client-side filtering will handle status filtering since getPurchaseOrders doesn't support status array filtering yet
        purchaseOrders = purchaseOrders.filter((po: any) => ['issued', 'acknowledged'].includes(po.status));
      } else {
        // For buyers/sourcing managers, show all POs
        purchaseOrders = await storage.getPurchaseOrders();
      }

      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  // Purchase Order approval endpoint
  app.patch('/api/purchase-orders/:id/approve', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { comments } = req.body;
      const po = await storage.updatePurchaseOrder(req.params.id, {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        approvalComments: comments || 'Approved'
      });
      res.json(po);
    } catch (error) {
      console.error("Error approving purchase order:", error);
      res.status(500).json({ message: "Failed to approve purchase order" });
    }
  });

  // Purchase Order rejection endpoint
  app.patch('/api/purchase-orders/:id/reject', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { comments } = req.body;

      if (!comments || comments.trim() === '') {
        return res.status(400).json({ message: "Comments are required for rejection" });
      }

      const po = await storage.updatePurchaseOrder(req.params.id, {
        status: 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        approvalComments: comments
      });
      res.json(po);
    } catch (error) {
      console.error("Error rejecting purchase order:", error);
      res.status(500).json({ message: "Failed to reject purchase order" });
    }
  });

  // Purchase Order issue endpoint (for moving from approved to issued)
  app.patch('/api/purchase-orders/:id/issue', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { comments } = req.body;
      const po = await storage.updatePurchaseOrder(req.params.id, {
        status: 'issued',
        approvalComments: comments || 'Purchase Order issued to vendor'
      });
      res.json(po);
    } catch (error) {
      console.error("Error issuing purchase order:", error);
      res.status(500).json({ message: "Failed to issue purchase order" });
    }
  });

  // Purchase Order acknowledge endpoint (for vendors to acknowledge issued POs)
  app.patch('/api/purchase-orders/:id/acknowledge', async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is a vendor
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can acknowledge POs" });
      }

      // Get vendor profile
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      // Get PO and verify it belongs to this vendor
      const po = await storage.getPurchaseOrder(id);
      if (!po) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      if (po.vendorId !== vendor.id) {
        return res.status(403).json({ message: "You can only acknowledge your own POs" });
      }

      if (po.status !== 'issued') {
        return res.status(400).json({ message: "Only issued POs can be acknowledged" });
      }

      // Update PO status to acknowledged
      const updatedPO = await storage.updatePurchaseOrder(id, { 
        status: 'acknowledged',
        acknowledgedAt: new Date()
      });

      res.json(updatedPO);
    } catch (error) {
      console.error("Error acknowledging PO:", error);
      res.status(500).json({ message: "Failed to acknowledge purchase order" });
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

  app.delete('/api/products/:id', async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      console.error("Error code:", error?.code);
      console.error("Error constraint:", error?.constraint);

      // Handle foreign key constraint violations with user-friendly messages
      if (error?.code === '23503') {
        const constraintName = error?.constraint || '';
        if (constraintName.includes('bom_items')) {
          return res.status(400).json({
            message: "Cannot delete product: It is currently used in one or more BOMs. Please remove it from all BOMs first."
          });
        }
        // Handle other potential foreign key constraints
        return res.status(400).json({
          message: "Cannot delete product: It is currently referenced by other records. Please remove all references first."
        });
      }

      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product category routes
  app.get('/api/product-categories/hierarchy', async (req, res) => {
    try {
      const categories = await storage.getProductCategoryHierarchy();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  app.post('/api/product-categories', async (req, res) => {
    try {
      const categoryData = insertProductCategorySchema.parse(req.body);
      const newCategory = await storage.createProductCategory(categoryData);
      res.json(newCategory);
    } catch (error) {
      console.error("Error creating product category:", error);
      res.status(500).json({ message: "Failed to create product category" });
    }
  });

  app.put('/api/product-categories/:id', async (req, res) => {
    try {
      const categoryData = insertProductCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateProductCategory(req.params.id, categoryData);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating product category:", error);
      res.status(500).json({ message: "Failed to update product category" });
    }
  });

  app.delete('/api/product-categories/:id', async (req, res) => {
    try {
      await storage.deleteProductCategory(req.params.id);
      res.json({ success: true, message: 'Product category deleted successfully' });
    } catch (error) {
      console.error("Error deleting product category:", error);
      res.status(500).json({ message: "Failed to delete product category" });
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

  app.post('/api/boms', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Creating BOM for user:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      // Validate required fields
      const { name, version, description, category } = req.body;

      if (!name || !version) {
        return res.status(400).json({ 
          message: "Name and version are required fields" 
        });
      }

      // Clean the data to ensure no invalid JSON strings
      const bomData = {
        name: String(name).trim(),
        version: String(version).trim(),
        description: description ? String(description).trim() : null,
        category: category ? String(category).trim() : null,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : null,
        validTo: req.body.validTo ? new Date(req.body.validTo) : null,
        tags: req.body.tags || null,
        createdBy: userId,
      };

      console.log("Creating BOM with cleaned data:", JSON.stringify(bomData, null, 2));
      const bom = await storage.createBom(bomData);
      console.log("BOM created successfully:", bom);

      res.json(bom);
    } catch (error) {
      console.error("Error creating BOM:", error);
      console.error("Error details:", error);
      res.status(500).json({ 
        message: "Failed to create BOM", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.put('/api/boms/:id', async (req: any, res) => {
    try {
      const bomId = req.params.id;
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Updating BOM:", bomId, "for user:", userId);
      console.log("Update data:", req.body);

      const updatedBom = await storage.updateBom(bomId, req.body);
      console.log("BOM updated successfully:", updatedBom);

      res.json(updatedBom);
    } catch (error) {
      console.error("Error updating BOM:", error);
      res.status(500).json({ 
        message: "Failed to update BOM", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.delete('/api/boms/:id', async (req: any, res) => {
    try {
      const bomId = req.params.id;
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Deleting BOM:", bomId, "for user:", userId);

      // Check if BOM exists and belongs to user
      const existingBom = await storage.getBom(bomId);
      if (!existingBom) {
        return res.status(404).json({ message: "BOM not found" });
      }

      await storage.deleteBom(bomId);
      console.log("BOM deleted successfully:", bomId);

      res.json({ message: "BOM deleted successfully" });
    } catch (error) {
      console.error("Error deleting BOM:", error);
      res.status(500).json({ 
        message: "Failed to delete BOM", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post('/api/boms/:id/copy', async (req: any, res) => {
    try {
      const bomId = req.params.id;
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { name, version } = req.body;
      if (!name || !version) {
        return res.status(400).json({ message: "Both name and version are required for copying BOM" });
      }

      console.log("Copying BOM:", bomId, "with new name:", name, "version:", version);

      // Check if BOM with same name/version exists
      const existingBoms = await storage.getBoms();
      const duplicate = existingBoms.find(bom => bom.name === name && bom.version === version);
      if (duplicate) {
        return res.status(400).json({ message: "BOM with this name and version already exists" });
      }

      // Get original BOM
      const originalBom = await storage.getBom(bomId);
      if (!originalBom) {
        return res.status(404).json({ message: "Original BOM not found" });
      }

      // Create copy
      const newBomData = {
        name,
        version,
        description: `Copy of ${originalBom.name} v${originalBom.version}`,
        category: originalBom.category,
        validFrom: originalBom.validFrom,
        validTo: originalBom.validTo,
        tags: originalBom.tags,
        createdBy: userId,
      };

      const newBom = await storage.createBom(newBomData);
      console.log("BOM copy created:", newBom.id);

      // Copy BOM items
      const originalItems = await storage.getBomItems(bomId);
      for (const item of originalItems) {
        const itemData = {
          bomId: newBom.id,
          productId: item.productId,
          itemName: item.itemName,
          itemCode: item.itemCode,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          uom: item.uom,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          specifications: item.specifications,
        };
        await storage.createBomItem(itemData);
      }

      console.log("BOM copied successfully with", originalItems.length, "items");
      res.json(newBom);
    } catch (error) {
      console.error("Error copying BOM:", error);
      res.status(500).json({ 
        message: "Failed to copy BOM", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/boms/:id', async (req, res) => {
    try {
      const bomId = req.params.id;
      console.log("Getting BOM with ID:", bomId);

      const bom = await storage.getBom(bomId);
      if (!bom) {
        return res.status(404).json({ message: "BOM not found" });
      }

      console.log("Found BOM:", bom.name);

      // Get BOM items
      const items = await storage.getBomItems(bomId);
      console.log("Found BOM items:", items.length);

      // Return BOM with items
      res.json({
        ...bom,
        items: items
      });
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ message: "Failed to fetch BOM" });
    }
  });

  // BOM items endpoint for auction form compatibility
  app.get('/api/bom-items/:bomId', async (req: any, res) => {
    try {
      const { bomId } = req.params;
      console.log("=== FETCHING BOM ITEMS FOR AUCTION ===");
      console.log("BOM ID:", bomId);
      console.log("User ID:", req.user?.claims?.sub);
      console.log("Request headers:", req.headers);
      console.log("Request method:", req.method);

      // First check if BOM exists
      const bom = await storage.getBom(bomId);
      console.log("BOM exists:", !!bom);
      if (bom) {
        console.log("BOM details:", { id: bom.id, name: bom.name, version: bom.version });
      }

      const items = await storage.getBomItems(bomId);
      console.log("Found BOM items:", items.length);
      console.log("Items sample:", items.slice(0, 2));
      console.log("Full items response:", JSON.stringify(items, null, 2));

      res.json(items);
    } catch (error) {
      console.error("Error fetching BOM items for auction:", error);
      console.error("Error stack:", (error as any).stack);
      res.status(500).json({ message: "Failed to fetch BOM items", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Alternative endpoint that matches the BOM structure
  app.get('/api/boms/:bomId/items', async (req: any, res) => {
    try {
      const { bomId } = req.params;
      console.log("=== FETCHING BOM ITEMS VIA BOM ENDPOINT ===");
      console.log("BOM ID:", bomId);
      console.log("Request URL:", req.url);
      console.log("Request path:", req.path);

      // First check if BOM exists
      const bom = await storage.getBom(bomId);
      console.log("BOM exists:", !!bom);
      if (bom) {
        console.log("BOM details:", { id: bom.id, name: bom.name, version: bom.version });
      }

      const items = await storage.getBomItems(bomId);
      console.log("Found BOM items via BOM endpoint:", items.length);
      console.log("Items sample:", items.slice(0, 2));

      res.json(items);
    } catch (error) {
      console.error("Error fetching BOM items via BOM endpoint:", error);
      console.error("Error stack:", (error as any).stack);
      res.status(500).json({ message: "Failed to fetch BOM items", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/boms/:bomId/items', async (req: any, res) => {
    try {
      const { bomId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Adding item to BOM:", bomId);
      console.log("Item data:", req.body);

      const itemData = {
        bomId,
        ...req.body,
      };

      const newItem = await storage.createBomItem(itemData);
      console.log("BOM item created successfully:", newItem);

      res.json(newItem);
    } catch (error) {
      console.error("Error adding BOM item:", error);
      res.status(500).json({ 
        message: "Failed to add BOM item", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.put('/api/boms/:bomId/items/:itemId', async (req: any, res) => {
    try {
      const { bomId, itemId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Updating BOM item:", itemId, "in BOM:", bomId);
      console.log("Update data:", req.body);

      const updatedItem = await storage.updateBomItem(itemId, req.body);
      console.log("BOM item updated successfully:", updatedItem);

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating BOM item:", error);
      res.status(500).json({ 
        message: "Failed to update BOM item", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.delete('/api/boms/:bomId/items/:itemId', async (req: any, res) => {
    try {
      const { bomId, itemId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Deleting BOM item:", itemId, "from BOM:", bomId);

      await storage.deleteBomItem(itemId);
      console.log("BOM item deleted successfully:", itemId);

      res.json({ message: "BOM item deleted successfully" });
    } catch (error) {
      console.error("Error deleting BOM item:", error);
      res.status(500).json({ 
        message: "Failed to delete BOM item", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
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

  app.post('/api/direct-procurement', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("=== CREATING DIRECT PROCUREMENT ORDER ===");
      console.log("User ID:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const { bomId, vendorId, bomItems, deliveryDate, paymentTerms, priority, notes } = req.body;

      // Validate required fields
      if (!bomId) {
        console.error("Missing bomId");
        return res.status(400).json({ message: "BOM ID is required" });
      }
      if (!vendorId) {
        console.error("Missing vendorId");
        return res.status(400).json({ message: "Vendor ID is required" });
      }
      if (!bomItems || !Array.isArray(bomItems) || bomItems.length === 0) {
        console.error("Missing or invalid bomItems");
        return res.status(400).json({ message: "At least one BOM item is required" });
      }
      if (!deliveryDate) {
        console.error("Missing deliveryDate");
        return res.status(400).json({ message: "Delivery date is required" });
      }

      // Calculate total amount from BOM items
      const totalAmount = bomItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      console.log("Calculated total amount:", totalAmount);

      // Generate reference number
      const referenceNo = `DPO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      console.log("Generated reference number:", referenceNo);

      const orderData = {
        referenceNo,
        bomId,
        vendorId,
        bomItems,
        totalAmount: totalAmount.toString(),
        status: "pending_approval" as const,
        priority: (priority || "medium"),
        deliveryDate: new Date(deliveryDate),
        paymentTerms,
        notes: notes || null,
        createdBy: userId,
      };

      console.log("Order data to insert:", JSON.stringify(orderData, null, 2));

      const order = await storage.createDirectProcurementOrder(orderData);
      console.log("Created order:", JSON.stringify(order, null, 2));

      // Create corresponding Purchase Order for approval workflow
      try {
        console.log("=== CREATING PURCHASE ORDER FROM DIRECT PROCUREMENT ===");
        const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const poData = {
          id: uuidv4(),
          poNumber,
          vendorId,
          totalAmount: totalAmount.toString(),
          status: "pending_approval" as const,
          termsAndConditions: notes || "Purchase Order created from Direct Procurement Order",
          paymentTerms: paymentTerms || "Net 30",
          createdBy: userId,
        };

        console.log("Creating PO with data:", poData);
        const purchaseOrder = await storage.createPurchaseOrder(poData);
        console.log("Purchase Order created successfully:", purchaseOrder.id);

        // Create line items from BOM items
        if (bomItems && Array.isArray(bomItems)) {
          for (let index = 0; index < bomItems.length; index++) {
            const item = bomItems[index];
            await storage.createPoLineItem({
              poId: purchaseOrder.id,
              slNo: index + 1,
              itemName: item.productName || "Item",
              quantity: item.requestedQuantity?.toString() || "1",
              unitPrice: item.unitPrice?.toString() || "0",
              totalPrice: item.totalPrice?.toString() || "0",
              taxableValue: item.totalPrice?.toString() || "0",
              uom: "NOS",
              hsnCode: "9999",
              specifications: item.specifications || "",
            });
          }
        }

        console.log("Purchase Order and line items created successfully");

        res.json({
          directProcurementOrder: order,
          purchaseOrder: {
            id: purchaseOrder.id,
            poNumber: purchaseOrder.poNumber,
            status: purchaseOrder.status,
            totalAmount: purchaseOrder.totalAmount
          }
        });
      } catch (poError) {
        console.error("Error creating Purchase Order from Direct Procurement:", poError);
        console.error("PO Error details:", poError.message);
        console.error("PO Error stack:", poError.stack);
        // Still return the DPO even if PO creation fails
        res.json(order);
      }
    } catch (error: any) {
      console.error("Error creating direct procurement order:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to create direct procurement order", error: error.message });
    }
  });

  app.get('/api/direct-procurement/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getDirectProcurementOrderById(id);

      if (!order) {
        return res.status(404).json({ message: "Direct procurement order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching direct procurement order:", error);
      res.status(500).json({ message: "Failed to fetch direct procurement order" });
    }
  });

  app.patch('/api/direct-procurement/:id/status', async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await storage.updateDirectProcurementOrderStatus(id, status);
      res.json(order);
    } catch (error) {
      console.error("Error updating direct procurement order status:", error);
      res.status(500).json({ message: "Failed to update direct procurement order status" });
    }
  });

  app.delete('/api/direct-procurement/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;

      // Check if order exists and user has permission to delete
      const order = await storage.getDirectProcurementOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Direct procurement order not found" });
      }

      // Only allow deletion of draft or pending_approval orders
      if (!['draft', 'pending_approval'].includes(order.status)) {
        return res.status(400).json({ message: "Cannot delete orders that are not in draft or pending approval status" });
      }

      // Only allow creator or admin to delete
      if (order.createdBy !== userId) {
        return res.status(403).json({ message: "You can only delete orders you created" });
      }

      await storage.deleteDirectProcurementOrder(id);
      res.json({ message: "Direct procurement order deleted successfully" });
    } catch (error) {
      console.error("Error deleting direct procurement order:", error);
      res.status(500).json({ message: "Failed to delete direct procurement order" });
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

  // Route to create Purchase Order from Auction
  app.post('/api/auctions/:id/create-po', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const auctionId = req.params.id;
      const { vendorId, bidAmount, paymentTerms, deliverySchedule, notes } = req.body;

      console.log("Creating PO from auction:", auctionId, "for vendor:", vendorId, "with data:", req.body);

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate required fields
      if (!vendorId) {
        return res.status(400).json({ message: "Vendor ID is required" });
      }

      if (!bidAmount) {
        return res.status(400).json({ message: "Bid amount is required" });
      }

      // Verify auction exists and user has permission
      const auction = await storage.getAuction(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      if (auction.createdBy !== userId) {
        return res.status(403).json({ message: "You can only create POs for your own auctions" });
      }

      // Get vendor details
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Get bids for this vendor
      const bids = await storage.getBids({ auctionId, vendorId });
      console.log("Found bids for vendor:", bids.length);

      if (bids.length === 0) {
        return res.status(400).json({ message: "No bids found for this vendor in this auction" });
      }

      const winningBid = bids.sort((a: any, b: any) => Number(a.amount) - Number(b.amount))[0];
      console.log("Using winning bid:", winningBid);

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      console.log("Generated PO number:", poNumber);

      // Prepare PO data
      const poData = {
        id: uuidv4(),
        poNumber,
        vendorId,
        auctionId,
        totalAmount: bidAmount.toString(),
        status: "pending_approval" as const,
        termsAndConditions: notes || `Purchase Order created from Auction: ${auction.name}`,
        paymentTerms: paymentTerms || "Net 30",
        createdBy: userId,
      };

      console.log("Creating PO with data:", poData);

      // Create Purchase Order
      const purchaseOrder = await storage.createPurchaseOrder(poData);
      console.log("Purchase Order created successfully:", purchaseOrder.id);

      // Get auction items to create line items
      const auctionItems = await storage.getAuctionItems(auctionId);

      // Create line items from auction items
      if (auctionItems && Array.isArray(auctionItems)) {
        for (let index = 0; index < auctionItems.length; index++) {
          const item = auctionItems[index];
          const totalPrice = parseFloat(item.quantity) * parseFloat(item.unitPrice);
          await storage.createPoLineItem({
            poId: purchaseOrder.id,
            slNo: index + 1,
            itemName: item.itemName,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            totalPrice: totalPrice.toString(),
            taxableValue: totalPrice.toString(),
            uom: item.uom || "NOS",
            hsnCode: item.hsnCode || "9999",
            specifications: item.specifications || "",
          });
        }
      }

      // Update auction winner information
      await storage.updateAuction(auctionId, {
        winnerId: vendorId,
        winningBid: bidAmount.toString(),
        status: 'completed'
      });
      console.log("Updated auction status to completed");

      res.json({
        success: true,
        purchaseOrder: {
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          vendorId: purchaseOrder.vendorId,
          totalAmount: purchaseOrder.totalAmount,
          status: purchaseOrder.status,
          createdAt: purchaseOrder.createdAt
        },
        message: `Purchase Order ${purchaseOrder.poNumber} created successfully`
      });
    } catch (error: any) {
      console.error("Error creating PO from auction:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create purchase order from auction",
        error: error.message || "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}