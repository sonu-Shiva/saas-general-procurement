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

  app.patch('/api/auth/user/role', async (req, res) => {
    console.log('Role change requested to:', req.body.role);
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { role } = req.body;
    const validRoles = ['buyer_admin', 'buyer_user', 'sourcing_manager', 'vendor'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    try {
      // Update the user in the database first
      await storage.upsertUser({
        id: currentDevUser.id,
        email: currentDevUser.email,
        firstName: currentDevUser.firstName,
        lastName: currentDevUser.lastName,
        role: role as any,
      });

      // Update in-memory only after database update succeeds
      currentDevUser.role = role;
      console.log('Role updated in database and memory to:', role);

      res.json(currentDevUser);
    } catch (error) {
      console.error('Failed to update role in database:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
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

  // Vendor RFx Response endpoints
  app.get('/api/vendor/rfx-invitations', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get vendor profile for current user
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      const invitations = await storage.getRfxInvitationsForVendor(vendor.id);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching vendor RFx invitations:", error);
      res.status(500).json({ message: "Failed to fetch RFx invitations" });
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
          quantity: 100,
          uom: "pieces",
          unitPrice: 0.50,
          totalPrice: 50.00,
          specifications: "10K Ohm, ±5%, 1/4W"
        },
        {
          bomId: testBom.id,
          itemName: "Capacitor 100uF",
          itemCode: "CAP-100UF-001",
          description: "100uF electrolytic capacitor",
          category: "Electronics",
          quantity: 50,
          uom: "pieces",
          unitPrice: 1.20,
          totalPrice: 60.00,
          specifications: "100uF, 25V, Electrolytic"
        },
        {
          bomId: testBom.id,
          itemName: "LED Red 5mm",
          itemCode: "LED-RED-5MM",
          description: "5mm red LED",
          category: "Electronics",
          quantity: 25,
          uom: "pieces",
          unitPrice: 0.25,
          totalPrice: 6.25,
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
      res.status(500).json({ error: error.message });
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
      res.status(500).json({ error: error.message });
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
      console.log(`Parsed ${vendors.length} valid vendors`);
      if (vendors.length > 0) {
        console.log('Sample parsed vendor:', JSON.stringify(vendors[0], null, 2));
      }
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
      res.status(500).json({ message: "Failed to create RFx", error: error.message });
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
            address: 'Development Address',
            city: 'Dev City',
            state: 'Dev State',
            country: 'India',
            pincode: '123456',
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
        error: error.message
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
            address: 'Development Address',
            city: 'Dev City',
            state: 'Dev State',
            country: 'India',
            pincode: '123456',
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
          if (error.message?.includes('duplicate') || error.code === '23505') {
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
  app.get('/api/bom-items/:bomId', isAuthenticated, async (req: any, res) => {
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
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to fetch BOM items", error: error.message });
    }
  });

  // Alternative endpoint that matches the BOM structure
  app.get('/api/boms/:bomId/items', isAuthenticated, async (req: any, res) => {
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
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to fetch BOM items", error: error.message });
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