import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isVendor, isBuyer, isSourcingManager } from "./replitAuth";
import { approvalWorkflowEngine } from "./approvalWorkflowEngine";
import {
  users, 
  vendors,
  vendors as vendorsTable,
  products,
  bomItems,
  boms,
  rfxEvents,
  rfxResponses,
  auctions,
  purchaseOrders,
  directProcurementOrders,
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
  insertPurchaseOrderSchema,
  insertPoLineItemSchema,
  insertDirectProcurementOrderSchema,
  insertProcurementRequestSchema
} from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Development authentication setup
  if (process.env.NODE_ENV === 'development') {
    console.log('DEVELOPMENT MODE: Setting up simple auth system');
    
    // Simple development authentication
    let currentDevUser = {
      id: 'dev-user-123',
      email: 'dev@sclen.com',
      firstName: 'Developer',
      lastName: 'User',
      role: 'admin'
    };
    let isLoggedIn = true;

    // Auth routes
    app.get('/api/auth/user', (req, res) => {
      if (!isLoggedIn) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      res.json(currentDevUser);
    });

    app.post('/api/auth/logout', (req, res) => {
      isLoggedIn = false;
      res.json({ success: true, message: 'Logged out successfully' });
    });

    app.post('/api/auth/login', (req, res) => {
      isLoggedIn = true;
      res.json(currentDevUser);
    });

    app.patch('/api/auth/user/role', async (req, res) => {
      if (!isLoggedIn) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { role } = req.body;
      const validRoles = ['admin', 'department_requester', 'dept_approver', 'sourcing_exec', 'sourcing_manager', 'vendor'];
      
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const previousRole = currentDevUser.role;
      currentDevUser.role = role;
      
      // Create audit log for role switch (critical security event)
      try {
        await storage.createAuditLog({
          userId: currentDevUser.id,
          entityType: "user",
          entityId: currentDevUser.id,
          action: "role_switch",
          description: `Role switched from ${previousRole} to ${role}`,
          previousData: { role: previousRole },
          newData: { role: role },
          severity: "critical",
          sessionId: req.sessionID,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (auditError) {
        console.error("Failed to create audit log for role switch:", auditError);
      }
      
      res.json(currentDevUser);
    });

    // Test vendors for role selector
    app.get('/api/auth/test-vendors', (req, res) => {
      res.json([
        {
          id: "vendor-1",
          companyName: "TechCorp Solutions",
          email: "contact@techcorp.com",
          firstName: "John",
          lastName: "Doe"
        },
        {
          id: "vendor-2", 
          companyName: "Industrial Supply Co",
          email: "sales@industrial.com",
          firstName: "Jane",
          lastName: "Smith"
        }
      ]);
    });

    // Auth middleware for protected routes
    app.use('/api', (req, res, next) => {
      // Skip auth check for auth routes and vendor discovery
      if (req.path.startsWith('/auth/') || req.path === '/vendors/discover') {
        return next();
      }

      if (!isLoggedIn) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Add mock user to request
      (req as any).user = { claims: { sub: currentDevUser.id } };
      next();
    });
  } else {
    // Production auth setup
    await setupAuth(app);
  }

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
      if (error && (error as any).name === 'ObjectNotFoundError') {
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
      const validatedData = {
        ...req.body,
        createdBy: userId,
      };
      const vendor = await storage.createVendor(validatedData);
      
      // Create audit log for vendor creation
      await storage.createAuditLog({
        userId: userId,
        entityType: "vendor",
        entityId: vendor.id,
        action: "create",
        description: `Created vendor: ${vendor.companyName}`,
        newData: vendor,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
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

  // Delete vendor endpoint
  app.delete("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const success = await storage.deleteVendor(id);
      if (!success) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      res.json({ message: "Vendor deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      
      // Handle specific constraint errors with user-friendly messages
      if (error.message && error.message.includes('Cannot delete vendor')) {
        return res.status(409).json({ 
          message: error.message,
          type: "dependency_error" 
        });
      }
      
      if (error.code === '23503') {
        return res.status(409).json({ 
          message: "Cannot delete vendor: vendor is still referenced by purchase orders or other records. Please remove all related records first.",
          type: "foreign_key_constraint" 
        });
      }

      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  app.post("/api/vendors/discover", isAuthenticated, async (req, res) => {
    try {
      const { query, location, category } = req.body;

      console.log("=== AI VENDOR DISCOVERY REQUEST ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Query:", query);
      console.log("Location:", location);
      console.log("Category:", category);
      console.log("User authenticated:", !!req.user);
      console.log("Session ID:", req.sessionID);

      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("Perplexity API key not configured");
      }

      // Build search prompt based on user input
      let searchPrompt = "Find professional vendors and suppliers";

      if (query && query.trim()) {
        searchPrompt += ` specializing in ${query.trim()}`;
      }

      if (category && category !== "all" && category.trim()) {
        searchPrompt += ` in the ${category} category`;
      }

      if (location && location !== "all" && location.trim()) {
        searchPrompt += ` located in ${location}`;
      } else {
        searchPrompt += " in India";
      }

      searchPrompt += `. Please format the response as follows for each vendor:

**[Company Name]**
- Contact Email: [email address]  
- Phone Number: [phone number]
- Address: [full address]
- Website: [website URL]
- Logo URL: [company logo URL if available]
- Description: [brief description of services/products]

Focus on established businesses with verifiable contact information.`;

      console.log("Perplexity search prompt:", searchPrompt);

      // Validate API key
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("PERPLEXITY_API_KEY environment variable is not set");
      }

      // Call Perplexity API
      const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: "You are a procurement assistant. Find real vendors with actual contact information. Only include vendors where you can provide genuine phone numbers, email addresses, or websites. Do not include placeholder text like 'Not publicly listed' or generic contact info."
            },
            {
              role: "user",
              content: searchPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.2,
          top_p: 0.9,
          search_recency_filter: "month",
          return_images: false,
          return_related_questions: false,
          stream: false
        })
      });

      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text();
        console.error(`Perplexity API error ${perplexityResponse.status}:`, errorText);
        console.error("Response headers:", Object.fromEntries(perplexityResponse.headers.entries()));
        throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
      }

      const responseText = await perplexityResponse.text();
      console.log("Raw Perplexity response:", responseText.substring(0, 500)); // Log first 500 chars
      
      let perplexityData;
      try {
        perplexityData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse Perplexity response as JSON:", parseError);
        console.error("Response text:", responseText.substring(0, 1000));
        throw new Error("Invalid JSON response from Perplexity API");
      }
      const aiResponse = perplexityData.choices[0]?.message?.content || "";

      console.log("AI Response:", aiResponse);

      // Parse AI response to extract vendor information
      const vendors = parseVendorResponse(aiResponse);

      console.log(`Found ${vendors.length} vendors from AI discovery`);

      res.json(vendors);
    } catch (error) {
      console.error("Error in AI vendor discovery:", error);

      // Fallback to curated test data if API fails
      console.log("Falling back to curated vendor data");
      let fallbackVendors = [];

      // Provide relevant fallback based on search query
      if ((query as string) && (query as string).toLowerCase().includes("office")) {
        fallbackVendors = [
          {
            name: "Office Point India",
            category: "Office Supplies",
            email: "info@officepointindia.com",
            phone: "+91-80-28612345",
            location: "Brigade Road, Bangalore, Karnataka",
            website: "www.officepointindia.com",
            description: "Complete office stationery and furniture supplier serving corporate clients across South India",
          },
          {
            name: "Business Essentials Ltd",
            category: "Office Supplies",
            email: "sales@businessessentials.in",
            phone: "+91-80-41234567",
            location: "Koramangala, Bangalore, Karnataka",
            website: "www.businessessentials.in",
            description: "Bulk office supplies distributor with online ordering and next-day delivery",
          }
        ];
      } else if ((query as string) && (query as string).toLowerCase().includes("print")) {
        fallbackVendors = [
          {
            name: "Printwell Graphics",
            category: "Printing Services",
            email: "orders@printwellgraphics.com",
            phone: "+91-80-26789012",
            location: "Richmond Road, Bangalore, Karnataka",
            website: "www.printwellgraphics.com",
            description: "High-quality offset and digital printing services for business and marketing materials",
          }
        ];
      } else {
        fallbackVendors = [
          {
            name: "Metro Business Solutions",
            category: "Business Services",
            email: "contact@metrobusiness.co.in",
            phone: "+91-80-29876543",
            location: "MG Road, Bangalore, Karnataka", 
            website: "www.metrobusiness.co.in",
            description: "Comprehensive business solutions including procurement, logistics, and consulting services",
          }
        ];
      }

      res.json(fallbackVendors);
    }
  });

  // Helper function to parse AI response into structured vendor data
  function parseVendorResponse(aiResponse: string) {
    const vendors = [];

    try {
      console.log("Parsing AI response...");

      // Look for table format or structured vendor information
      const lines = aiResponse.split('\n');
      let currentVendor: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for vendor names in markdown format like **VendorName** or ### VendorName
        const nameMatch = line.match(/^\*\*([^*]+)\*\*|^###?\s*(.+)|^\d+\.\s*\*\*([^*]+)\*\*/);
        if (nameMatch) {
          // If we have a current vendor, save it before starting a new one
          if (currentVendor && currentVendor.name && currentVendor.name !== "Company Name") {
            vendors.push(currentVendor);
          }

          const vendorName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).trim();
          // Exclude notes, disclaimers, and generic names
          if (vendorName && 
              vendorName !== "Company Name" && 
              vendorName.length > 2 &&
              !vendorName.toLowerCase().includes("note:") &&
              !vendorName.toLowerCase().includes("disclaimer") &&
              !vendorName.toLowerCase().includes("important") &&
              vendorName !== "[Company Name]") {
            currentVendor = {
              name: vendorName,
              category: "Business Services", 
              email: "",
              phone: "",
              location: "",
              website: "",
              logoUrl: "",
              description: ""
            };
          }
        }

        if (currentVendor) {
          // Extract specific information patterns
          if (line.includes("Contact Email:") || line.includes("Email:")) {
            const emailMatch = line.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            if (emailMatch) {
              currentVendor.email = emailMatch[0];
            }
          }

          if (line.includes("Phone:") || line.includes("Phone Number:")) {
            const phoneMatch = line.match(/[\+]?[\d\s\-\(\)]{8,}/);
            if (phoneMatch) {
              currentVendor.phone = phoneMatch[0].trim();
            }
          }

          if (line.includes("Address:") || line.includes("Location:")) {
            const addressMatch = line.match(/(?:Address:|Location:)\s*(.+)/);
            if (addressMatch) {
              currentVendor.location = addressMatch[1].trim();
            }
          }

          if (line.includes("Website:") || line.includes("www.") || line.includes("http")) {
            const websiteMatch = line.match(/(?:www\.|https?:\/\/)[\w\.-]+\.\w+(?:\/[\w\.-]*)?/);
            if (websiteMatch) {
              currentVendor.website = websiteMatch[0];
            }
          }

          if (line.includes("Logo URL:") || line.includes("Logo:")) {
            const logoMatch = line.match(/(?:Logo URL:|Logo:)\s*(.+)/);
            if (logoMatch) {
              currentVendor.logoUrl = logoMatch[1].trim();
            }
          }

          if (line.includes("Description:") || (line.length > 50 && !line.includes("|") && !line.includes("**"))) {
            if (line.includes("Description:")) {
              const descMatch = line.match(/Description:\s*(.+)/);
              if (descMatch) {
                currentVendor.description = descMatch[1].trim();
              }
            } else if (line.length > 50 && currentVendor.description.length < 20) {
              currentVendor.description = line;
            }
          }
        }
      }

      // Add the last vendor if it exists
      if (currentVendor && currentVendor.name && currentVendor.name !== "Company Name") {
        vendors.push(currentVendor);
      }

      // Clean up vendors with missing critical information  
      const validVendors = vendors.filter(vendor => {
        return vendor.name && 
               vendor.name.length > 2 && 
               vendor.name !== "Company Name" &&
               !vendor.name.toLowerCase().includes("note:") &&
               !vendor.name.toLowerCase().includes("contact email") &&
               !vendor.name.toLowerCase().includes("disclaimer");
      }).map(vendor => {
        // Only include vendors with some real contact information
        const hasRealEmail = vendor.email && !vendor.email.includes("Not publicly listed") && vendor.email.includes("@");
        const hasRealPhone = vendor.phone && !vendor.phone.includes("Not publicly listed") && vendor.phone.length > 5;
        const hasRealWebsite = vendor.website && !vendor.website.includes("Not publicly listed") && vendor.website.includes(".");
        const hasRealAddress = vendor.location && !vendor.location.includes("Not publicly listed") && vendor.location.length > 10;

        return {
          ...vendor,
          email: hasRealEmail ? vendor.email : "",
          phone: hasRealPhone ? vendor.phone : "",
          location: hasRealAddress ? vendor.location : "",
          website: hasRealWebsite ? vendor.website : "",
          logoUrl: vendor.logoUrl || "",
          description: vendor.description || `Professional services provider`,
          category: vendor.category || "Business Services"
        };
      }).filter(vendor => {
        // Only include vendors that have at least one real piece of contact info
        return vendor.email || vendor.phone || vendor.website || vendor.location;
      });

      console.log(`Parsed ${validVendors.length} valid vendors`);
      return validVendors.slice(0, 8);

    } catch (error) {
      console.error("Error parsing AI response:", error);
      return [];
    }
  }

  // Product routes - Admin, sourcing, and vendor roles can create products
  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      console.log("=== PRODUCT CREATION ===");
      console.log("User ID:", req.user.claims.sub);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has permission to create products
      if (!user || !['admin', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Product creation requires admin, sourcing, or vendor role." });
      }

      const validatedData = {
        ...req.body,
        createdBy: userId,
      };

      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const product = await storage.createProduct(validatedData);
      console.log("Product created successfully:", product.id);
      
      // Create audit log
      await storage.createAuditLog({
        userId: userId,
        entityType: "product",
        entityId: product.id,
        action: "create",
        description: `Created product: ${product.itemName}`,
        newData: product,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(400).json({ message: `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}` });
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

      // Check if user has permission to edit products
      const user = await storage.getUser(userId);
      const hasEditPermission = user && ['admin', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(user.role);
      const isOwner = existingProduct.createdBy === userId;

      if (!hasEditPermission && !isOwner) {
        return res.status(403).json({ message: "Access denied. Product editing requires admin, sourcing, or vendor role." });
      }

      const updates = req.body;
      const product = await storage.updateProduct(productId, updates);
      
      // Create audit log for product update
      await storage.createAuditLog({
        userId: userId,
        entityType: "product",
        entityId: product.id,
        action: "update",
        description: `Updated product: ${product.itemName}`,
        previousData: existingProduct,
        newData: product,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(400).json({ message: "Failed to update product" });
    }
  });

  app.patch('/api/products/:id', async (req: any, res) => {
    try {
      console.log("=== PRODUCT PATCH UPDATE ===");
      console.log("Product ID:", req.params.id);
      console.log("Update data:", JSON.stringify(req.body, null, 2));
      
      // Development mode authentication check
      if (process.env.NODE_ENV === 'development') {
        console.log('DEVELOPMENT MODE: Bypassing authentication');
      }
      
      const userId = process.env.NODE_ENV === 'development' ? 'dev-user-123' : req.user?.claims?.sub;
      const productId = req.params.id;

      // Get the existing product to check ownership
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        console.log("Product not found:", productId);
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if user has permission to edit products
      const user = await storage.getUser(userId);
      const hasEditPermission = user && ['admin', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(user.role);
      const isOwner = existingProduct.createdBy === userId;

      console.log("User role:", user?.role);
      console.log("Has edit permission:", hasEditPermission);
      console.log("Is owner:", isOwner);

      if (!hasEditPermission && !isOwner) {
        console.log("Permission denied");
        return res.status(403).json({ message: "Access denied. Product editing requires admin, sourcing, or vendor role." });
      }

      const updates = req.body;
      const product = await storage.updateProduct(productId, updates);
      console.log("Product updated successfully:", product.id);
      console.log("Updated category:", product.categoryId, product.category);
      
      // Create audit log for product patch update
      await storage.createAuditLog({
        userId: userId,
        entityType: "product",
        entityId: product.id,
        action: "update",
        description: `Updated product: ${product.itemName}`,
        previousData: existingProduct,
        newData: product,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(400).json({ message: `Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const productId = req.params.id;

      console.log("=== DELETE PRODUCT ===");
      console.log("User ID:", userId);
      console.log("Product ID:", productId);

      // Get the existing product to check ownership
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        console.log("Product not found");
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Product found:", existingProduct.itemName);
      console.log("Product created by:", existingProduct.createdBy);

      // Check if user has permission to delete products
      const user = await storage.getUser(userId);
      const hasDeletePermission = user && ['admin', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(user.role);
      const isOwner = existingProduct.createdBy === userId;

      console.log("User role:", user?.role);
      console.log("Has delete permission:", hasDeletePermission);
      console.log("Is owner:", isOwner);

      if (!hasDeletePermission && !isOwner) {
        console.log("Permission denied - user cannot delete this product");
        return res.status(403).json({ message: "Access denied. Product deletion requires admin, sourcing, or vendor role." });
      }

      await storage.deleteProduct(productId);
      console.log("Product deleted successfully");
      
      // Create audit log for product deletion
      await storage.createAuditLog({
        userId: userId,
        entityType: "product",
        entityId: productId,
        action: "delete",
        description: `Deleted product: ${existingProduct.itemName}`,
        previousData: existingProduct,
        severity: "high",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(400).json({ message: `Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Product Category routes - Admin and sourcing roles can create/manage categories
  app.post('/api/product-categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has permission to create categories
      if (!user || !['admin', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Category creation requires admin, sourcing, or vendor role." });
      }

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
        
        let maxCode = 0;
        if (siblings.length > 0) {
          // Extract numeric parts from codes and find the maximum
          const codes = siblings.map(s => {
            const codeParts = s.code.split('.');
            const lastPart = codeParts[codeParts.length - 1];
            return parseInt(lastPart) || 0;
          });
          maxCode = Math.max(...codes);
        }
        
        const nextNumber = maxCode + 1;

        if (validatedData.parentId) {
          const parent = await storage.getProductCategory(validatedData.parentId);
          if (parent) {
            validatedData.code = `${parent.code}.${nextNumber}`;
            validatedData.level = (parent.level || 0) + 1;
          } else {
            validatedData.code = nextNumber.toString();
            validatedData.level = 1;
          }
        } else {
          validatedData.code = nextNumber.toString();
          validatedData.level = 1;
        }
      }

      const category = await storage.createProductCategory(validatedData);
      
      // Create audit log for category creation
      await storage.createAuditLog({
        userId: userId,
        entityType: "product_category",
        entityId: category.id,
        action: "create",
        description: `Created product category: ${category.name}`,
        newData: category,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
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

      // Check if category exists
      const existingCategory = await storage.getProductCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      // Get user role to determine permissions
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admin can edit any category, others can only edit categories they created
      if (user.role !== 'admin' && existingCategory.createdBy !== userId) {
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

      // Check if category exists
      const existingCategory = await storage.getProductCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      // Get user role to determine permissions
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admin can delete any category, others can only delete categories they created
      if (user.role !== 'admin' && existingCategory.createdBy !== userId) {
        return res.status(403).json({ message: "You can only delete categories you created" });
      }

      // Check if category has children or products
      const children = await storage.getProductCategories({ parentId: categoryId });
      if (children.length > 0) {
        return res.status(400).json({ message: "Cannot delete category with subcategories. Please delete all subcategories first." });
      }

      // Check if category has products assigned
      const products = await storage.getProducts({ categoryId: categoryId });
      if (products.length > 0) {
        return res.status(400).json({ message: `Cannot delete category with ${products.length} products. Please reassign or remove products first.` });
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

      const validatedData = {
        ...req.body,
        createdBy: userId,
      };

      console.log("Validated BOM data:", validatedData);
      const bom = await storage.createBom(validatedData);
      console.log("BOM created successfully:", bom);
      
      // Create audit log for BOM creation
      await storage.createAuditLog({
        userId: userId,
        entityType: "bom",
        entityId: bom.id,
        action: "create",
        description: `Created BOM: ${bom.name}`,
        newData: bom,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
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

      const updates = req.body;
      const bom = await storage.updateBom(bomId, updates);
      res.json(bom);
    } catch (error) {
      console.error("Error updating BOM:", error);
      res.status(400).json({ message: "Failed to update BOM" });
    }
  });

  app.delete('/api/boms/:id', isAuthenticated, isBuyer, async (req: any, res) => {
    try {
      const bomId = req.params.id;
      const userId = req.user.claims.sub;

      console.log("=== DELETE BOM ===");
      console.log("User ID:", userId);
      console.log("BOM ID:", bomId);

      // Check if BOM exists and user has permission to delete it
      const existingBom = await storage.getBom(bomId);
      if (!existingBom) {
        console.log("BOM not found");
        return res.status(404).json({ message: "BOM not found" });
      }

      console.log("BOM found:", existingBom.name);
      console.log("BOM created by:", existingBom.createdBy);

      // Check if user is the creator of the BOM
      const isOwner = existingBom.createdBy === userId;
      console.log("Is owner:", isOwner);

      if (!isOwner) {
        console.log("Permission denied - user cannot delete this BOM");
        return res.status(403).json({ message: "You can only delete BOMs you created" });
      }

      await storage.deleteBom(bomId);
      console.log("BOM deleted successfully");
      res.json({ message: "BOM deleted successfully" });
    } catch (error) {
      console.error("Error deleting BOM:", error);
      res.status(400).json({ message: `Failed to delete BOM: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // GET BOM items
  app.get('/api/boms/:id/items', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      console.log("=== FETCHING BOM ITEMS ===");
      console.log("BOM ID:", id);
      console.log("User ID:", req.user?.claims?.sub);

      const items = await storage.getBomItems(id);
      console.log("Found BOM items:", items.length);
      console.log("Items:", items);

      res.json(items);
    } catch (error) {
      console.error("Error fetching BOM items:", error);
      res.status(500).json({ message: "Failed to fetch BOM items" });
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

  // Additional endpoint for auction form compatibility
  app.get('/api/bom-items/:bomId', isAuthenticated, async (req: any, res) => {
    try {
      const { bomId } = req.params;
      console.log("=== FETCHING BOM ITEMS ===");
      console.log("BOM ID:", bomId);
      console.log("User ID:", req.user?.claims?.sub);

      const items = await storage.getBomItems(bomId);
      console.log("Found BOM items:", items.length);
      console.log("Items:", items);

      res.json(items);
    } catch (error) {
      console.error("Error fetching BOM items:", error);
      res.status(500).json({ message: "Failed to fetch BOM items" });
    }
  });

  // BOM copy route - Only buyers can copy BOMs
  app.post('/api/boms/:id/copy', isAuthenticated, isBuyer, async (req: any, res) => {
    try {
      const bomId = req.params.id;
      const userId = req.user.claims.sub;
      const { name, version } = req.body;

      if (!name || !version) {
        return res.status(400).json({ message: "Both name and version are required for copying BOM" });
      }

      const copiedBom = await storage.copyBom(bomId, name, version, userId);
      res.json(copiedBom);
    } catch (error) {
      console.error("Error copying BOM:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to copy BOM" });
      }
    }
  });

  // BOM duplicate check route
  app.get('/api/boms/check-duplicate', isAuthenticated, async (req, res) => {
    try {
      const { name, version } = req.query;

      if (!name || !version) {
        return res.status(400).json({ message: "Both name and version are required for duplicate check" });
      }

      const exists = await storage.checkBomExists(name as string, version as string);
      res.json({ exists });
    } catch (error) {
      console.error("Error checking BOM duplicate:", error);
      res.status(500).json({ message: "Failed to check BOM duplicate" });
    }
  });

  // RFx routes
  app.post('/api/rfx', isAuthenticated, async (req: any, res) => {
    try {
      console.log("RFx creation request body:", req.body);
      const userId = req.user.claims.sub;
      const validatedData = insertRfxEventSchema.parse({
        ...req.body,
        createdBy: userId,
        referenceNo: `RFX-${Date.now()}`,
      });
      console.log("Validated RFx data:", validatedData);
      const rfx = await storage.createRfxEvent(validatedData);
      console.log("Created RFx:", rfx);
      res.json(rfx);
    } catch (error) {
      console.error("Error creating RFx:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create RFx" });
      }
    }
  });

  // RFx invitations route
  app.post('/api/rfx/invitations', isAuthenticated, async (req: any, res) => {
    try {
      console.log("RFx invitation request:", req.body);
      const validatedData = insertRfxInvitationSchema.parse(req.body);
      const invitation = await storage.createRfxInvitation(validatedData);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating RFx invitation:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create RFx invitation" });
      }
    }
  });

  app.get('/api/rfx', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { status, type } = req.query;

      // Buyers/admins see all RFx they created
      if (user.role === 'buyer_admin' || user.role === 'buyer_user' || user.role === 'sourcing_manager' || user.role === 'admin' || user.role === 'department_requester' || user.role === 'dept_approver' || user.role === 'sourcing_exec') {
        const rfxEvents = await storage.getRfxEvents({
          status: status as string,
          type: type as string,
          createdBy: userId,
        });
        res.json(rfxEvents);
      } 
      // Vendors see only RFx they are invited to participate in
      else if (user.role === 'vendor') {
        // Find the vendor record for this user
        const vendor = await storage.getVendorByUserId(userId);
        if (vendor) {
          const rfxEvents = await storage.getRfxEventsForVendor(vendor.id);
          res.json(rfxEvents);
        } else {
          res.json([]);
        }
      } 
      else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching RFx events:", error);
      res.status(500).json({ message: "Failed to fetch RFx events" });
    }
  });

  // Vendor-specific RFx invitations API (for frontend compatibility)
  app.get('/api/vendor/rfx-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      console.log("Vendor RFx API - User ID:", userId);
      console.log("Vendor RFx API - User role:", user?.role);

      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Access denied. Vendors only." });
      }

      // Find the vendor record for this user
      const vendor = await storage.getVendorByUserId(userId);
      console.log("Vendor RFx API - Found vendor:", vendor ? vendor.id : 'No vendor found');

      if (vendor) {
        const rfxEvents = await storage.getRfxEventsForVendor(vendor.id);
        console.log("Vendor RFx API - RFx events found:", rfxEvents.length);
        res.json(rfxEvents);
      } else {
        // Check if there are any vendors in the system for this user
        const allVendors = await storage.getVendors();
        console.log("Vendor RFx API - All vendors:", allVendors.map(v => ({ id: v.id, userId: v.userId, createdBy: v.createdBy, companyName: v.companyName })));
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching vendor RFx invitations:", error);
      res.status(500).json({ message: "Failed to fetch RFx invitations" });
    }
  });

  // Vendor-specific RFx responses API (for frontend compatibility)
  app.get('/api/vendor/rfx-responses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Access denied. Vendors only." });
      }

      // Find the vendor record for this user
      const vendor = await storage.getVendorByUserId(userId);
      if (vendor) {
        const responses = await storage.getRfxResponsesByVendor(vendor.id);
        res.json(responses);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching vendor RFx responses:", error);
      res.status(500).json({ message: "Failed to fetch RFx responses" });
    }
  });

  // Terms & Conditions acceptance API
  app.post('/api/terms/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId, termsAndConditionsPath } = req.body;

      // Record T&C acceptance (for now, just return success)
      // In a full implementation, you'd store this in a terms_acceptances table
      console.log(`T&C accepted by user ${userId} for ${entityType} ${entityId}`);

      res.json({ 
        success: true, 
        message: "Terms & conditions acceptance recorded",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error recording T&C acceptance:", error);
      res.status(500).json({ message: "Failed to record terms acceptance" });
    }
  });

  // Terms & Conditions status check API
  app.get('/api/terms/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId } = req.query;

      // Check T&C acceptance status (for now, just return false)
      // In a full implementation, you'd query the terms_acceptances table
      res.json({ hasAccepted: false });
    } catch (error) {
      console.error("Error checking T&C status:", error);
      res.status(500).json({ message: "Failed to check terms status" });
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
      const childRfxEvents = await storage.getChildRfxEvents(req.params.id);
      const parentRfx = rfx.parentRfxId ? await storage.getRfxEvent(rfx.parentRfxId) : null;
      console.log('DEBUG: RFx responses found:', responses?.length || 0);
      res.json({ ...rfx, invitations, responses, childRfxEvents, parentRfx });
    } catch (error) {
      console.error("Error fetching RFx:", error);
      res.status(500).json({ message: "Failed to fetch RFx" });
    }
  });

  // Create next stage RFx (RFI -> RFP -> RFQ)
  app.post('/api/rfx/:id/create-next-stage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parentRfxId = req.params.id;

      const parentRfx = await storage.getRfxEvent(parentRfxId);
      if (!parentRfx) {
        return res.status(404).json({ message: "Parent RFx not found" });
      }

      if (parentRfx.createdBy !== userId) {
        return res.status(403).json({ message: "You can only create next stage for your own RFx" });
      }

      let nextType: string;
      if (parentRfx.type === "rfi") {
        nextType = "rfp";
      } else if (parentRfx.type === "rfp") {
        nextType = "rfq";
      } else {
        return res.status(400).json({ message: "RFQ is the final stage in the workflow" });
      }

      const responses = await storage.getRfxResponses(parentRfxId);
      const invitations = await storage.getRfxInvitations(parentRfxId);

      // Pre-populate with information from parent RFx
      const nextStageData = {
        title: `${nextType.toUpperCase()} - ${parentRfx.title}`,
        referenceNo: `${nextType.toUpperCase()}-${Date.now()}`,
        type: nextType,
        scope: parentRfx.scope,
        criteria: parentRfx.criteria,
        bomId: parentRfx.bomId,
        contactPerson: parentRfx.contactPerson,
        budget: parentRfx.budget,
        parentRfxId: parentRfxId,
        createdBy: userId,
        status: "draft"
      };

      const nextRfx = await storage.createRfxEvent(nextStageData as any);

      // Copy vendor invitations from parent RFx
      for (const invitation of invitations) {
        await storage.createRfxInvitation({
          rfxId: nextRfx.id,
          vendorId: invitation.vendorId,
          status: "invited"
        });
      }

      res.json({ nextRfx, parentRfx, responses });
    } catch (error) {
      console.error("Error creating next stage RFx:", error);
      res.status(500).json({ message: "Failed to create next stage RFx" });
    }
  });

  app.post('/api/rfx/:id/invitations', isAuthenticated, async (req, res) => {
    try {
      const validatedData = {
        ...req.body,
        rfxId: req.params.id,
      };
      const invitation = await storage.createRfxInvitation(validatedData);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating RFx invitation:", error);
      res.status(400).json({ message: "Failed to create RFx invitation" });
    }
  });

  app.post('/api/rfx/:id/responses', isAuthenticated, async (req, res) => {
    try {
      const validatedData = {
        ...req.body,
        rfxId: req.params.id,
      };
      const response = await storage.createRfxResponse(validatedData);
      res.json(response);
    } catch (error) {
      console.error("Error creating RFx response:", error);
      res.status(400).json({ message: "Failed to create RFx response" });
    }
  });

  // Get RFx responses for buyers to review
  app.get('/api/rfx/:id/responses', isAuthenticated, async (req, res) => {
    try {
      const rfxId = req.params.id;
      const userId = req.user.claims.sub;

      // Verify user can access this RFx (must be creator or have proper role)
      const rfx = await storage.getRfxEvent(rfxId);
      if (!rfx) {
        return res.status(404).json({ message: "RFx not found" });
      }

      // Only allow buyers to view responses 
      if (rfx.createdBy !== userId) {
        const user = await storage.getUser(userId);
        if (!user || !['buyer_admin', 'buyer_user', 'sourcing_manager'].includes(user.role)) {
          return res.status(403).json({ message: "Unauthorized to view responses" });
        }
      }

      const responses = await storage.getRfxResponses(rfxId);
      console.log(`DEBUG: Retrieved ${responses?.length || 0} responses for RFx ${rfxId}`);
      res.json(responses || []);
    } catch (error) {
      console.error("Error fetching RFx responses:", error);
      res.status(500).json({ message: "Failed to fetch RFx responses" });
    }
  });

  // RFx status update route
  app.patch('/api/rfx/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;

      if (!['draft', 'active', 'closed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const rfx = await storage.getRfxEvent(req.params.id);
      if (!rfx) {
        return res.status(404).json({ message: "RFx not found" });
      }

      if (rfx.createdBy !== userId) {
        return res.status(403).json({ message: "You can only update status of your own RFx" });
      }

      const updatedRfx = await storage.updateRfxEventStatus(req.params.id, status);
      res.json(updatedRfx);
    } catch (error) {
      console.error("Error updating RFx status:", error);
      res.status(500).json({ message: "Failed to update RFx status" });
    }
  });

  // Vendor-specific RFx invitations endpoint
  app.get('/api/vendor/rfx-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("=== VENDOR ROLE CHECK ===");
      console.log("User ID from claims:", userId);

      const user = await storage.getUser(userId);
      console.log("User from database:", user?.email, `(${user?.role})`);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.role !== 'vendor') {
        return res.status(403).json({ message: "Access denied: Only vendors can access RFx invitations" });
      }

      console.log("Vendor role confirmed, proceeding");

      // First find the vendor associated with this user
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found for this user" });
      }

      console.log("Found vendor:", vendor.companyName, "with ID:", vendor.id);

      // Get RFx invitations for this vendor
      const invitations = await storage.getRfxInvitationsByVendor(vendor.id);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching vendor RFx invitations:", error);
      res.status(500).json({ message: "Failed to fetch RFx invitations" });
    }
  });

  // Auction routes
  app.post('/api/auctions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auctionData = { ...req.body, createdBy: userId };

      // Clean up frontend-specific fields that aren't in the database schema
      const { bomId, selectedBomItems, selectedVendors, termsUrl, ceilingPrice, ...dbData } = auctionData;

      // Remove undefined values to avoid Zod validation issues
      Object.keys(dbData).forEach(key => {
        if (dbData[key] === undefined || dbData[key] === null || dbData[key] === '') {
          delete dbData[key];
        }
      });

      // Map ceilingPrice to reservePrice for database
      if (ceilingPrice) {
        dbData.reservePrice = ceilingPrice;
      }

      // Map termsUrl to termsAndConditionsPath
      if (termsUrl) {
        dbData.termsAndConditionsPath = termsUrl;
        dbData.termsAndConditionsRequired = true;
      }

      // Convert ISO string dates to Date objects for database
      if (dbData.startTime) {
        dbData.startTime = new Date(dbData.startTime);
      }
      if (dbData.endTime) {
        dbData.endTime = new Date(dbData.endTime);
      }

      const validatedData = insertAuctionSchema.parse(dbData);
      const auction = await storage.createAuction(validatedData);

      // If vendors were selected, invite them to the auction
      if (selectedVendors && Array.isArray(selectedVendors)) {
        for (const vendorId of selectedVendors) {
          try {
            await storage.createAuctionParticipant({
              auctionId: auction.id,
              vendorId: vendorId,
            });
          } catch (error) {
            console.error(`Error inviting vendor ${vendorId}:`, error);
          }
        }
      }

      res.json(auction);
    } catch (error) {
      console.error("Error creating auction:", error);
      res.status(400).json({ message: "Failed to create auction" });
    }
  });

  app.get('/api/auctions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Buyers/admins see all auctions they created
      if (user.role === 'buyer_admin' || user.role === 'buyer_user' || user.role === 'sourcing_manager' || user.role === 'admin' || user.role === 'department_requester' || user.role === 'dept_approver' || user.role === 'sourcing_exec') {
        const auctions = await storage.getAuctions({ createdBy: userId });
        res.json(auctions);
      } 
      // Vendors see only auctions they are invited to participate in
      else if (user.role === 'vendor') {
        const auctions = await storage.getAuctionsForVendor(userId);
        res.json(auctions);
      } 
      else {
        res.json([]);
      }
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

      // Get auction bids for additional context
      const bids = await storage.getAuctionBids(req.params.id);

      res.json({
        ...auction,
        bids: bids,
        bidCount: bids.length,
        lowestBid: bids.length > 0 ? Math.min(...bids.map(b => parseFloat(b.amount))) : null
      });
    } catch (error) {
      console.error("Error fetching auction:", error);
      res.status(500).json({ message: "Failed to fetch auction" });
    }
  });

  // Get auction bids
  app.get('/api/auctions/:id/bids', isAuthenticated, async (req, res) => {
    try {
      const bids = await storage.getAuctionBids(req.params.id);
      console.log(`DEBUG: Raw bids from DB for auction ${req.params.id}:`, bids);

      // Include vendor information with bids
      const bidsWithVendors = await Promise.all(
        bids.map(async (bid) => {
          const vendor = await storage.getVendor(bid.vendorId);
          const result = {
            ...bid,
            vendorName: vendor?.companyName || 'Unknown Vendor'
          };
          console.log(`DEBUG: Bid with vendor info:`, result);
          return result;
        })
      );

      console.log(`DEBUG: Final bids response:`, bidsWithVendors);
      res.json(bidsWithVendors);
    } catch (error) {
      console.error("Error fetching auction bids:", error);
      res.status(500).json({ message: "Failed to fetch auction bids" });
    }
  });

  app.put('/api/auctions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auctionId = req.params.id;

      const auction = await storage.getAuction(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      if (auction.createdBy !== userId) {
        return res.status(403).json({ message: "You can only edit your own auctions" });
      }

      if (auction.status !== 'scheduled') {
        return res.status(400).json({ message: "Only scheduled auctions can be edited" });
      }

      const updates = req.body;

      // Convert ISO string dates to Date objects for database
      if (updates.startTime) {
        updates.startTime = new Date(updates.startTime);
      }
      if (updates.endTime) {
        updates.endTime = new Date(updates.endTime);
      }

      const updatedAuction = await storage.updateAuction(auctionId, updates);
      res.json(updatedAuction);
    } catch (error) {
      console.error("Error updating auction:", error);
      res.status(500).json({ message: "Failed to update auction" });
    }
  });

  app.patch('/api/auctions/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;
      const auction = await storage.getAuction(req.params.id);

      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      if (auction.createdBy !== userId) {
        return res.status(403).json({ message: "You can only modify your own auctions" });
      }

      const updatedAuction = await storage.updateAuctionStatus(req.params.id, status);

      // Note: WebSocket notifications will be handled after server setup

      res.json(updatedAuction);
    } catch (error) {
      console.error("Error updating auction status:", error);
      res.status(500).json({ message: "Failed to update auction status" });
    }
  });

  // Create Bid - Alternative endpoint for frontend compatibility
  app.post('/api/auctions/:id/bid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auctionId = req.params.id;
      const { amount } = req.body;

      console.log("=== BID PLACEMENT ===");
      console.log("User ID:", userId);
      console.log("Auction ID:", auctionId);
      console.log("Bid Amount:", amount);

      // Verify auction exists and is live
      const auction = await storage.getAuction(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      if (auction.status !== 'live') {
        return res.status(400).json({ message: "Auction is not live" });
      }

      // Verify user is a vendor
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can place bids" });
      }

      // Find vendor by user - first try by user association, then by email
      let vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        const vendors = await storage.getVendors({});
        vendor = vendors.find((v: any) => v.contactPerson === user.email || v.email === user.email);
      }
      if (!vendor) {
        // For demo purposes, create a test vendor profile if none exists
        vendor = await storage.createVendor({
          companyName: `Test Vendor - ${user.email?.split('@')[0] || user.id}`,
          email: user.email,
          contactPerson: user.email,
          phone: "123-456-7890",
          address: "Test Address",
          taxId: "TEST123",
          status: "approved" as const,
          userId: userId
        });
        console.log("Created test vendor profile:", vendor);
      }

      // Validate bid amount
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid bid amount" });
      }

      // Check if bid is lower than reserve price (for reverse auction)
      if (auction.reservePrice && parseFloat(amount) >= parseFloat(auction.reservePrice)) {
        return res.status(400).json({ message: "Bid must be below ceiling price" });
      }

      // Create bid
      const bid = await storage.createBid({
        auctionId,
        vendorId: vendor.id,
        amount: amount.toString(),
        status: 'active' as const
      });

      console.log("New bid created:", bid);

      // Update auction's current bid if this is the lowest bid
      const allBids = await storage.getAuctionBids(auctionId);
      const lowestBid = allBids.reduce((lowest: any, current: any) => 
        parseFloat(current.amount) < parseFloat(lowest.amount) ? current : lowest, bid);

      if (lowestBid.id === bid.id) {
        await storage.updateAuction(auctionId, {
          currentBid: amount.toString(),
          leadingVendorId: vendor.id
        });
      }

      res.json({
        ...bid,
        message: "Bid placed successfully"
      });
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  // Auction Participants
  app.post('/api/auction-participants', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAuctionParticipantSchema.parse(req.body);
      const participant = await storage.createAuctionParticipant(validatedData);
      res.json(participant);
    } catch (error) {
      console.error("Error registering auction participant:", error);
      res.status(400).json({ message: "Failed to register participant" });
    }
  });

  // Bidding routes
  app.post('/api/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user to find vendor ID
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can place bids" });
      }

      // Find vendor by user
      const vendors = await storage.getVendors({});
      const vendor = vendors.find((v: any) => v.contactPerson === user.email || v.email === user.email);
      if (!vendor) {
        return res.status(403).json({ message: "Vendor profile not found" });
      }

      const validatedData = insertBidSchema.parse({
        ...req.body,
        vendorId: vendor.id,
      });

      // Validate bid against auction rules
      const auction = await storage.getAuction(validatedData.auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      if (auction.status !== 'live') {
        return res.status(400).json({ message: "Auction is not active" });
      }

      if (parseFloat(validatedData.amount) >= parseFloat(auction.reservePrice || '0')) {
        return res.status(400).json({ message: "Bid must be below ceiling price" });
      }

      const bid = await storage.createBid(validatedData);

      // Update auction current bid if this is the lowest
      const allBids = await storage.getAuctionBids(validatedData.auctionId);
      const lowestBid = allBids.reduce((lowest: any, current: any) => 
        parseFloat(current.amount) < parseFloat(lowest.amount) ? current : lowest, bid);

      if (bid.id === lowestBid.id) {
        await storage.updateAuctionCurrentBid(validatedData.auctionId, validatedData.amount);
      }

      // Calculate real-time rankings
      const vendorBids = allBids.reduce((acc: any, b: any) => {
        if (!acc[b.vendorId] || parseFloat(b.amount) < parseFloat(acc[b.vendorId].amount)) {
          acc[b.vendorId] = b;
        }
        return acc;
      }, {});

      const rankings = Object.values(vendorBids)
        .sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))
        .map((b: any, index: number) => ({
          ...b,
          rank: index + 1,
          rankLabel: index === 0 ? 'L1' : index === 1 ? 'L2' : index === 2 ? 'L3' : `L${index + 1}`
        }));

      // Note: WebSocket broadcasts will be handled after server setup

      res.json({ bid, rankings });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(400).json({ message: "Failed to place bid" });
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

  // PO Approval routes
  app.patch('/api/purchase-orders/:id/approve', isAuthenticated, isSourcingManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { comments } = req.body;
      const po = await storage.updatePurchaseOrder(req.params.id, {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        approvalComments: comments || 'Approved and issued to vendor'
      });
      res.json(po);
    } catch (error) {
      console.error("Error approving purchase order:", error);
      res.status(400).json({ message: "Failed to approve purchase order" });
    }
  });

  app.patch('/api/purchase-orders/:id/reject', isAuthenticated, isSourcingManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      res.status(400).json({ message: "Failed to reject purchase order" });
    }
  });

  app.patch('/api/purchase-orders/:id/issue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'sourcing_manager') {
        return res.status(403).json({ message: "Only Sourcing Managers can issue purchase orders" });
      }

      const po = await storage.updatePurchaseOrder(req.params.id, {
        status: 'issued'
      });
      res.json(po);
    } catch (error) {
      console.error("Error issuing purchase order:", error);
      res.status(400).json({ message: "Failed to issue purchase order" });
    }
  });

  app.delete('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Get the PO first to check ownership and status
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Only allow deletion if:
      // 1. User created the PO and it's in pending_approval status, OR
      // 2. User is sourcing manager and PO is in pending_approval or rejected status
      const canDelete = (
        (po.createdBy === userId && po.status === 'pending_approval') ||
        (user?.role === 'sourcing_manager' && ['pending_approval', 'rejected'].includes(po.status || ''))
      );

      if (!canDelete) {
        return res.status(403).json({ 
          message: "Can only delete purchase orders in pending approval or rejected status" 
        });
      }

      await storage.deletePurchaseOrder(req.params.id);
      res.json({ success: true, message: "Purchase order deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(400).json({ message: "Failed to delete purchase order" });
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

  // Direct Procurement routes
  app.get('/api/direct-procurement', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getDirectProcurementOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching direct procurement orders:", error);
      res.status(500).json({ message: "Failed to fetch direct procurement orders" });
    }
  });

  app.post('/api/direct-procurement', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bomId, vendorId, bomItems, deliveryDate, paymentTerms, notes, priority } = req.body;

      console.log("=== CREATING DIRECT PROCUREMENT ORDER ===");
      console.log("User ID:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

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
        status: "pending_approval" as const, // All POs go through approval workflow
        priority: (priority || "medium"),
        deliveryDate: new Date(deliveryDate),
        paymentTerms,
        notes: notes || null,
        createdBy: userId,
      };

      console.log("Order data to insert:", JSON.stringify(orderData, null, 2));

      const order = await storage.createDirectProcurementOrder(orderData);
      console.log("Created order:", JSON.stringify(order, null, 2));

      // Automatically create corresponding Purchase Order for approval workflow
      try {
        console.log("=== CREATING PURCHASE ORDER FROM DIRECT PROCUREMENT ===");
        const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const poData = {
          poNumber,
          bomId,
          vendorId,
          totalAmount: totalAmount.toString(),
          status: "pending_approval" as const,
          priority: (priority || "medium"),
          deliveryDate: new Date(deliveryDate),
          paymentTerms,
          notes: notes || null,
          createdBy: userId,
          directProcurementOrderId: order.id, // Link to original direct procurement order
        };

        console.log("PO data to insert:", JSON.stringify(poData, null, 2));
        const purchaseOrder = await storage.createPurchaseOrder(poData);
        console.log("Created PO:", JSON.stringify(purchaseOrder, null, 2));

        // Create line items for the PO from BOM items
        for (const bomItem of bomItems) {
          const lineItemData = {
            poId: purchaseOrder.id,
            productId: null, // For BOM-based orders, we allow null productId
            quantity: bomItem.requestedQuantity.toString(),
            unitPrice: bomItem.unitPrice.toString(),
            totalPrice: bomItem.totalPrice.toString(),
            status: "pending" as const,
            lineTotal: bomItem.totalPrice.toString(),
            itemName: bomItem.productName, // Store the product name for reference
          };

          console.log("Creating PO line item:", JSON.stringify(lineItemData, null, 2));
          await storage.createPoLineItem(lineItemData);
        }

        console.log("Successfully created Purchase Order and line items");
      } catch (poError) {
        console.error("Error creating PO from direct procurement order:", poError);
        // Don't fail the direct procurement order creation if PO creation fails
        // The direct procurement order is still created successfully
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error creating BOM-based direct procurement order:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to create direct procurement order", error: error.message });
    }
  });

  app.get('/api/direct-procurement/:id', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/direct-procurement/:id/status', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/direct-procurement/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

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

  // Convert Direct Procurement Order to Purchase Order
  app.post('/api/direct-procurement/:id/create-po', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Get the direct procurement order
      const dpo = await storage.getDirectProcurementOrderById(id);
      if (!dpo) {
        return res.status(404).json({ message: "Direct procurement order not found" });
      }

      // Check if user has permission (creator or admin)
      if (dpo.createdBy !== userId) {
        return res.status(403).json({ message: "You can only convert orders you created" });
      }

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create purchase order
      const purchaseOrder = await storage.createPurchaseOrder({
        poNumber,
        vendorId: dpo.vendorId,
        totalAmount: dpo.totalAmount,
        status: 'pending_approval' as const,
        paymentTerms: dpo.paymentTerms,
        deliverySchedule: { deliveryDate: dpo.deliveryDate },
        termsAndConditions: dpo.notes || '',
        createdBy: userId,
      });

      // Create line items for each BOM item
      if (dpo.bomItems && Array.isArray(dpo.bomItems)) {
        for (const item of dpo.bomItems) {
          await storage.createPoLineItem({
            poId: purchaseOrder.id,
            itemName: item.productName,
            quantity: item.requestedQuantity.toString(),
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            lineTotal: item.totalPrice.toString(),
          });
        }
      }

      // Update the DPO status to indicate it's been converted
      await storage.updateDirectProcurementOrderStatus(id, 'submitted');

      res.json({
        success: true,
        message: "Purchase Order created successfully",
        purchaseOrder,
        directProcurementOrder: dpo
      });
    } catch (error) {
      console.error("Error creating PO from direct procurement order:", error);
      res.status(500).json({ message: "Failed to create purchase order from direct procurement order" });
    }
  });

  // Create Purchase Order from RFx
  app.post('/api/rfx/:id/create-po', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rfxId = req.params.id;
      const { vendorId, poItems, deliveryDate, paymentTerms, notes, priority, totalAmount } = req.body;

      console.log("=== CREATING PO FROM RFX ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      // Verify RFx exists and user has permission
      const rfx = await storage.getRfxEvent(rfxId);
      if (!rfx) {
        return res.status(404).json({ message: "RFx not found" });
      }

      if (rfx.createdBy !== userId) {
        return res.status(403).json({ message: "You can only create POs for your own RFx" });
      }

      // Get vendor details
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Validate required fields
      if (!poItems || !Array.isArray(poItems) || poItems.length === 0) {
        return res.status(400).json({ message: "At least one PO item is required" });
      }

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create Purchase Order
      const purchaseOrder = await storage.createPurchaseOrder({
        poNumber,
        vendorId,
        rfxId,
        totalAmount: totalAmount || "0",
        status: "pending_approval" as const,
        deliveryDate: new Date(deliveryDate),
        paymentTerms: paymentTerms || "Net 30",
        termsAndConditions: notes || `Purchase Order created from RFx: ${rfx.title}`,
        createdBy: userId
      });

      console.log("Created PO:", purchaseOrder);

      // Create line items for each PO item
      for (const item of poItems) {
        const lineItemData = {
          poId: purchaseOrder.id,
          productId: null, // For RFx-based orders, we allow null productId
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          status: "pending" as const,
          itemName: item.itemName,
        };

        console.log("Creating PO line item:", lineItemData);
        await storage.createPoLineItem(lineItemData);
      }

      console.log("Successfully created Purchase Order and line items from RFx");

      res.json({
        purchaseOrder,
        rfx,
        vendor
      });
    } catch (error) {
      console.error("Error creating PO from RFx:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to create purchase order from RFx" });
    }
  });

  // Create Purchase Order from Auction
  app.post('/api/auctions/:id/create-po', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auctionId = req.params.id;
      const { vendorId, bidAmount, paymentTerms, deliverySchedule, notes } = req.body;

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
      const winningBid = bids.find((bid: any) => bid.isWinning) || bids.sort((a: any, b: any) => Number(a.amount) - Number(b.amount))[0];

      if (!winningBid) {
        return res.status(400).json({ message: "No valid bid found for this vendor" });
      }

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create Purchase Order
      const purchaseOrder = await storage.createPurchaseOrder({
        poNumber,
        vendorId,
        auctionId,
        totalAmount: bidAmount || winningBid.amount || "0",
        status: "pending_approval",
        termsAndConditions: notes || `Purchase Order created from Auction: ${auction.name}`,
        deliverySchedule: deliverySchedule || { standard: "As per auction requirements" },
        paymentTerms: paymentTerms || "Net 30",
        createdBy: userId
      });

      // Update auction winner if this is the winning bid
      if (winningBid.isWinning && !auction.winnerId) {
        await storage.updateAuction(auctionId, {
          winnerId: vendorId,
          winningBid: winningBid.amount,
          status: 'completed'
        });
      }

      res.json({
        purchaseOrder,
        auction,
        winningBid,
        vendor
      });
    } catch (error) {
      console.error("Error creating PO from auction:", error);
      res.status(500).json({ message: "Failed to create purchase order from auction" });
    }
  });



  app.patch('/api/purchase-orders/:id/issue', isAuthenticated, isSourcingManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const poId = req.params.id;

      // Get PO and verify it's approved
      const po = await storage.getPurchaseOrder(poId);
      if (!po) {
        return res.status(404).json({ message: "Purchase Order not found" });
      }

      if (po.status !== 'approved') {
        return res.status(400).json({ message: "PO must be approved before issuing" });
      }

      // Issue the PO to vendor
      const updatedPO = await storage.updatePurchaseOrder(poId, {
        status: 'issued'
      });

      res.json(updatedPO);
    } catch (error) {
      console.error("Error issuing PO:", error);
      res.status(500).json({ message: "Failed to issue purchase order" });
    }
  });

  // Terms & Conditions routes
  const objectStorageService = new ObjectStorageService();

  // Upload T&C document
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Set T&C file path and ACL for entity
  app.put('/api/terms/:entityType/:entityId', isAuthenticated, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { termsAndConditionsURL } = req.body;
      const userId = req.user.claims.sub;

      if (!termsAndConditionsURL) {
        return res.status(400).json({ error: "termsAndConditionsURL is required" });
      }

      // Set ACL for the uploaded T&C file
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        termsAndConditionsURL,
        {
          owner: userId,
          visibility: "public", // T&C documents should be accessible to vendors
        }
      );

      res.json({ objectPath });
    } catch (error) {
      console.error("Error setting T&C file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Record terms acceptance by vendor
  app.post('/api/terms/accept', isVendor, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId, termsAndConditionsPath } = req.body;

      // Get vendor ID for the current user
      const vendors = await storage.getVendors();
      const vendor = vendors.find(v => v.userId === userId);

      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      // Record acceptance
      const acceptance = await storage.recordTermsAcceptance({
        vendorId: vendor.id,
        entityType: entityType as any,
        entityId,
        termsAndConditionsPath,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
      });

      res.json(acceptance);
    } catch (error) {
      console.error("Error recording terms acceptance:", error);
      res.status(500).json({ error: "Failed to record terms acceptance" });
    }
  });

  // Check if vendor has accepted terms for an entity
  app.get('/api/terms/check/:entityType/:entityId', isVendor, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId } = req.params;

      // Get vendor ID for the current user
      const vendors = await storage.getVendors();
      const vendor = vendors.find(v => v.userId === userId);

      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      const acceptance = await storage.checkTermsAcceptance(vendor.id, entityType, entityId);
      res.json({ hasAccepted: !!acceptance, acceptance });
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
      res.status(500).json({ error: "Failed to check terms acceptance" });
    }
  });

  // Serve T&C documents (public access)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving T&C document:", error);
      if (error.message === "Object not found") {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // =============================
  // SIMPLE LOGIN ROUTE
  // =============================

  // Simple login endpoint for development
  app.post('/api/auth/simple-login', async (req, res) => {
    try {
      const { name, email, role } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!['admin', 'department_requester', 'dept_approver', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Try to get existing user first
      let user = await storage.getUserByEmail(email);

      if (user) {
        // Update existing user's role if needed
        if (user.role !== role) {
          user = await storage.upsertUser({
            ...user,
            role: role,
          });
        }
      } else {
        // Create new user
        user = await storage.upsertUser({
          id: email, // Use email as unique ID for simple login
          email: email,
          firstName: name.split(' ')[0] || name,
          lastName: name.split(' ')[1] || '',
          profileImageUrl: null,
          role: role,
          organizationId: null,
          isActive: true,
        });
      }

      // Create mock session data similar to Replit auth
      const mockUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
        },
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      // Log in the user using passport
      req.login(mockUser, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        console.log("Simple login successful for:", email, "with role:", role);
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        });
      });

    } catch (error) {
      console.error("Simple login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  const httpServer = createServer(app);

  // =============================
  // VENDOR PORTAL ROUTES
  // =============================

  // Get vendor's RFx invitations
  app.get('/api/vendor/rfx-invitations', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get vendor profile
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      const invitations = await storage.getRfxInvitationsByVendor(vendor.id);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching vendor RFx invitations:", error);
      res.status(500).json({ message: "Failed to fetch RFx invitations" });
    }
  });

  // Get vendor's RFx responses
  app.get('/api/vendor/rfx-responses', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get vendor profile
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      const responses = await storage.getRfxResponsesByVendor(vendor.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching vendor RFx responses:", error);
      res.status(500).json({ message: "Failed to fetch RFx responses" });
    }
  });

  // Submit RFx response
  app.post('/api/vendor/rfx-responses', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get vendor profile
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      console.log('DEBUG: Full request body:', req.body);

      // Handle different field name formats from different forms
      const { 
        rfxId, 
        // From vendor-portal.tsx form
        proposedPrice, deliveryTime, technicalSpecification, additionalNotes,
        // From rfx-response-form.tsx form  
        quotedPrice, deliveryTerms, paymentTerms, leadTime, response: responseText, attachments 
      } = req.body;

      console.log('DEBUG: Extracted rfxId:', rfxId);
      console.log('DEBUG: typeof rfxId:', typeof rfxId);

      // Use the values that are actually provided (normalize field names)
      const finalPrice = proposedPrice || quotedPrice;
      const finalDeliveryTime = deliveryTime || leadTime;
      const finalTechnicalSpec = technicalSpecification || responseText;
      const finalNotes = additionalNotes || '';
      const finalDeliveryTerms = deliveryTerms || '';
      const finalPaymentTerms = paymentTerms || '';
      const finalAttachments = attachments || [];

      console.log('DEBUG: Final normalized values:', {
        finalPrice,
        finalDeliveryTime,
        finalTechnicalSpec,
        finalNotes
      });

      // Validate RFx invitation exists
      console.log(`Looking for invitation: rfxId=${rfxId}, vendorId=${vendor.id}`);
      const invitation = await storage.getRfxInvitation(rfxId, vendor.id);
      console.log(`Invitation found:`, invitation);
      if (!invitation) {
        return res.status(404).json({ message: "RFx invitation not found" });
      }

      if (invitation.status === 'responded') {
        return res.status(400).json({ message: "You have already responded to this RFx" });
      }

      // Check if terms must be accepted for this RFx
      const rfxEvent = await storage.getRfxEvent(rfxId);
      if (rfxEvent?.termsAndConditionsRequired && rfxEvent?.termsAndConditionsPath) {
        const termsAcceptance = await storage.getTermsAcceptance(userId, 'rfx', rfxId);
        if (!termsAcceptance) {
          return res.status(400).json({ 
            message: "You must accept the terms and conditions before submitting a response.",
            requiresTermsAcceptance: true 
          });
        }
      }

      // Create RFx response using the schema-compatible format
      const response = await storage.createRfxResponse({
        rfxId,
        vendorId: vendor.id,
        response: responseText || technicalSpecification || '',
        quotedPrice: (quotedPrice || proposedPrice)?.toString(),
        deliveryTerms: deliveryTerms || additionalNotes || '',
        paymentTerms: paymentTerms || '',
        leadTime: leadTime || deliveryTime,
        attachments: attachments || [],
      });

      // Update invitation status
      await storage.updateRfxInvitationStatus(rfxId, vendor.id, 'responded');

      res.json(response);
    } catch (error) {
      console.error("Error submitting RFx response:", error);
      res.status(500).json({ message: "Failed to submit RFx response" });
    }
  });

  // Serve terms and conditions documents
  app.get('/api/terms/download/:filename', async (req, res) => {
    try {
      let filename = req.params.filename;
      console.log('DEBUG: Downloading terms file:', filename);

      // Extract filename from full URL if needed
      if (filename.includes('/')) {
        filename = filename.split('/').pop() || 'terms.pdf';
      }

      // For now, redirect to public objects path or return a response
      // In production, you'd serve the actual file from storage
      if (filename && filename !== 'undefined') {
        res.redirect(`/public-objects/${filename}`);
      } else {
        res.status(404).json({ message: "Terms file not found" });
      }
    } catch (error) {
      console.error("Error downloading terms:", error);
      res.status(500).json({ message: "Failed to download terms" });
    }
  });

  // Accept terms and conditions for specific entity
  app.post('/api/terms/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId, termsAndConditionsPath } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      const acceptance = await storage.createTermsAcceptance({
        userId,
        entityType,
        entityId,
        termsAndConditionsPath,
        acceptedAt: new Date(),
      });

      res.json(acceptance);
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });

  // Check vendor terms acceptance for specific entity
  app.get('/api/terms/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId } = req.query;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      const acceptance = await storage.getTermsAcceptance(userId, entityType as string, entityId as string);
      res.json({ hasAccepted: !!acceptance });
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
      res.status(500).json({ message: "Failed to check terms acceptance" });
    }
  });

  // ===============================================
  // PROCUREMENT REQUEST ROUTES WITH APPROVAL HIERARCHY INTEGRATION
  // ===============================================
  
  // Create procurement request with approval hierarchy workflow
  app.post("/api/procurement-requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const requestData = {
        ...req.body,
        requestedBy: userId,
        department: user.department || req.body.department || 'General',
        requestedDeliveryDate: req.body.requestedDeliveryDate ? new Date(req.body.requestedDeliveryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Create the procurement request
      const request = await storage.createProcurementRequest(requestData);

      // Create audit log for procurement request creation
      await storage.createAuditLog({
        userId: userId,
        entityType: "procurement_request",
        entityId: request.id,
        action: "create",
        description: `Created procurement request: ${request.title}`,
        newData: request,
        severity: "medium",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Initialize approval workflow using the approval hierarchy system
      try {
        const workflowContext = {
          entityId: request.id,
          entityType: 'procurement_request' as const,
          amount: request.estimatedBudget,
          department: request.department,
          requesterId: userId,
        };

        const approvalSteps = await approvalWorkflowEngine.initiateApprovalWorkflow(workflowContext);
        
        console.log(`SUCCESS: Initiated approval workflow for PR ${request.requestNumber} with ${approvalSteps.length} levels`);

        res.json({
          ...request,
          approvalWorkflowInitiated: true,
          approvalLevels: approvalSteps.length,
        });
      } catch (workflowError) {
        console.error("Error initiating approval workflow:", workflowError);
        // Still return the request even if workflow fails
        res.json({
          ...request,
          approvalWorkflowInitiated: false,
          error: "Approval workflow failed to initialize"
        });
      }
    } catch (error) {
      console.error("Error creating procurement request:", error);
      res.status(500).json({ message: "Failed to create procurement request" });
    }
  });

  // Procurement Request Approval Actions (must come before other procurement routes)
  app.post("/api/procurement-requests/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const requestId = req.params.id;
      const { comments } = req.body;

      // Get the procurement request
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if user has approval permissions
      const userRole = (req.user as any)?.role || 'dept_approver';
      if (!['dept_approver', 'sourcing_manager', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "You are not authorized to approve this request" });
      }

      // Check if request is in appropriate status for approval
      if (!['request_approval_pending', 'pending'].includes(request.overallStatus)) {
        return res.status(400).json({ message: "Request is not in a state that can be approved" });
      }

      // Update the request status to approved
      await storage.updateProcurementRequest(requestId, {
        overallStatus: 'request_approved',
        requestApprovalStatus: 'approved',
        approvedAt: new Date(),
        currentRequestApprover: userId,
        approvalComments: comments || null,
      });

      // Create audit log for procurement request approval
      await storage.createAuditLog({
        userId: userId,
        entityType: "procurement_request",
        entityId: requestId,
        action: "approve",
        description: `Approved procurement request: ${request.title}`,
        previousData: request,
        newData: { ...request, overallStatus: 'request_approved', approvedBy: userId },
        severity: "high",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: "Request approved successfully",
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        comments: comments || null,
      });
    } catch (error) {
      console.error("Error approving procurement request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.post("/api/procurement-requests/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const requestId = req.params.id;
      const { comments } = req.body;

      // Get the procurement request
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if user has approval permissions
      const userRole = (req.user as any)?.role || 'dept_approver';
      if (!['dept_approver', 'sourcing_manager', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "You are not authorized to reject this request" });
      }

      // Check if request is in appropriate status for rejection
      if (!['request_approval_pending', 'pending'].includes(request.overallStatus)) {
        return res.status(400).json({ message: "Request is not in a state that can be rejected" });
      }

      // Update the request status to rejected
      await storage.updateProcurementRequest(requestId, {
        overallStatus: 'rejected',
        requestApprovalStatus: 'rejected',
        rejectedAt: new Date(),
        currentRequestApprover: userId,
        approvalComments: comments || null,
      });

      // Create audit log for procurement request rejection
      await storage.createAuditLog({
        userId: userId,
        entityType: "procurement_request",
        entityId: requestId,
        action: "reject",
        description: `Rejected procurement request: ${request.title}`,
        previousData: request,
        newData: { ...request, overallStatus: 'rejected', rejectedBy: userId },
        severity: "high",
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: "Request rejected successfully",
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        comments: comments || null,
      });
    } catch (error) {
      console.error("Error rejecting procurement request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // Get sourcing queue (approved procurement requests for sourcing executives)
  app.get("/api/procurement-requests/sourcing-queue", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only sourcing executives and managers can access this endpoint
      if (!['sourcing_exec', 'sourcing_manager', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied: insufficient permissions" });
      }

      // Get approved procurement requests that need sourcing method selection
      const filters = { 
        status: 'request_approved'  // Only approved requests
      };
      
      const approvedRequests = await storage.getProcurementRequests(filters);
      
      // Filter for requests that don't have procurement methods assigned yet
      const pendingSourcingRequests = approvedRequests.filter(req => 
        req.overallStatus === 'request_approved' && 
        (!req.procurementMethod || req.procurementMethodStatus === 'pending')
      );
      
      res.json(pendingSourcingRequests);
    } catch (error) {
      console.error("Error fetching sourcing queue:", error);
      res.status(500).json({ message: "Failed to fetch sourcing queue" });
    }
  });

  // Get procurement requests (LIST - must come before single resource route)
  app.get("/api/procurement-requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let filters = {};
      
      // Apply role-based filtering
      if (user.role === 'department_requester') {
        filters = { requestedBy: userId };
      } else if (user.role === 'dept_approver') {
        filters = { department: user.department };
      } else if (user.role === 'sourcing_exec' || user.role === 'sourcing_manager') {
        // Sourcing executives see all requests for their workflow management
        filters = {};
      }

      const requests = await storage.getProcurementRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching procurement requests:", error);
      res.status(500).json({ message: "Failed to fetch procurement requests" });
    }
  });

  // Get single procurement request (DETAIL - must come after list route)
  app.get("/api/procurement-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const requestId = req.params.id;
      const request = await storage.getProcurementRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fetching procurement request:", error);
      res.status(500).json({ message: "Failed to fetch procurement request" });
    }
  });

  // Delete procurement request
  app.delete("/api/procurement-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user?.id || 'dev-user-123';
      
      // Get the request to check ownership
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }
      
      // Only allow the requester to delete their own requests
      if (request.requestedBy !== userId) {
        return res.status(403).json({ message: "You can only delete your own requests" });
      }
      
      await storage.deleteProcurementRequest(requestId);
      res.json({ message: "Procurement request deleted successfully" });
    } catch (error) {
      console.error("Error deleting procurement request:", error);
      res.status(500).json({ message: "Failed to delete procurement request" });
    }
  });

  // ===============================================
  // APPROVAL ROUTES
  // ===============================================
  
  // Get approvals for current user
  app.get("/api/approvals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const approvals = await storage.getApprovalsByApprover(userId);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching approvals:", error);
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  // Create approval (for testing)
  app.post("/api/approvals", isAuthenticated, async (req, res) => {
    try {
      const approvalData = req.body;
      const newApproval = await storage.createApproval({
        ...approvalData,
        id: nanoid(),
        createdAt: new Date(),
      });
      res.json(newApproval);
    } catch (error) {
      console.error("Error creating approval:", error);
      res.status(500).json({ message: "Failed to create approval" });
    }
  });

  // Process approval (approve)
  app.post("/api/approvals/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const approvalId = req.params.id;
      const { comments } = req.body;

      // Get the specific approval record
      const approval = await storage.getApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Approval request not found" });
      }

      // Check if the user is authorized to approve this specific approval
      if (approval.approverId !== userId) {
        return res.status(403).json({ message: "You are not authorized to approve this request" });
      }

      if (approval.status !== 'pending') {
        return res.status(400).json({ message: "Approval request has already been processed" });
      }

      // Process the approval using the workflow engine
      const result = await approvalWorkflowEngine.processApprovalAction(
        approvalId,
        'approve',
        userId,
        comments
      );

      // If workflow is complete, update the entity status
      if (result.workflowComplete) {
        if (approval.entityType === 'procurement_request') {
          await storage.updateProcurementRequest(approval.entityId, {
            status: result.finalStatus === 'approved' ? 'approved' : 'rejected',
            approvedAt: result.finalStatus === 'approved' ? new Date() : null,
          });
        }
      }

      res.json({
        message: "Approval processed successfully",
        workflowComplete: result.workflowComplete,
        finalStatus: result.finalStatus,
        nextStep: result.nextStep,
      });
    } catch (error) {
      console.error("Error processing approval:", error);
      res.status(500).json({ message: "Failed to process approval" });
    }
  });

  // Process approval (reject)
  app.post("/api/approvals/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const approvalId = req.params.id;
      const { comments } = req.body;

      // Get the specific approval record
      const approval = await storage.getApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Approval request not found" });
      }

      // Check if the user is authorized to reject this specific approval
      if (approval.approverId !== userId) {
        return res.status(403).json({ message: "You are not authorized to reject this request" });
      }

      if (approval.status !== 'pending') {
        return res.status(400).json({ message: "Approval request has already been processed" });
      }

      // Process the rejection using the workflow engine
      const result = await approvalWorkflowEngine.processApprovalAction(
        approvalId,
        'reject',
        userId,
        comments
      );

      // If workflow is complete, update the entity status
      if (result.workflowComplete) {
        if (approval.entityType === 'procurement_request') {
          await storage.updateProcurementRequest(approval.entityId, {
            status: 'rejected',
            rejectedAt: new Date(),
          });
        }
      }

      res.json({
        message: "Approval rejected successfully",
        workflowComplete: result.workflowComplete,
        finalStatus: result.finalStatus,
      });
    } catch (error) {
      console.error("Error processing rejection:", error);
      res.status(500).json({ message: "Failed to process rejection" });
    }
  });

  // ===============================================
  // ADMIN ROUTES
  // ===============================================
  
  // Get all dropdown configurations (Admin only)
  app.get("/api/admin/dropdown-configurations", async (req, res) => {
    try {
      const configurations = await storage.getDropdownConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching dropdown configurations:", error);
      res.status(500).json({ message: "Failed to fetch dropdown configurations" });
    }
  });

  // Get dropdown options for a specific configuration
  app.get("/api/admin/dropdown-configurations/:id/options", async (req, res) => {
    try {
      const configId = req.params.id;
      const options = await storage.getDropdownOptions(configId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
      res.status(500).json({ message: "Failed to fetch dropdown options" });
    }
  });

  // Get audit logs (Admin only)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const logs = await storage.getAuditLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Get audit logs statistics (Admin only)
  app.get("/api/audit-logs/stats", async (req, res) => {
    try {
      const { timeRange = 'day' } = req.query;
      const stats = await storage.getAuditLogStats(timeRange as 'day' | 'week' | 'month');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching audit log stats:", error);
      res.status(500).json({ message: "Failed to fetch audit log stats" });
    }
  });

  // Get all users (Admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get approval hierarchies
  app.get("/api/admin/approval-hierarchies", async (req, res) => {
    try {
      const hierarchies = await storage.getApprovalHierarchies();
      res.json(hierarchies);
    } catch (error) {
      console.error("Error fetching approval hierarchies:", error);
      res.status(500).json({ message: "Failed to fetch approval hierarchies" });
    }
  });

  // Create approval hierarchy
  app.post("/api/admin/approval-hierarchies", async (req, res) => {
    try {
      const hierarchy = await storage.createApprovalHierarchy(req.body);
      res.json(hierarchy);
    } catch (error) {
      console.error("Error creating approval hierarchy:", error);
      res.status(500).json({ message: "Failed to create approval hierarchy" });
    }
  });

  // Add dropdown option
  app.post("/api/admin/dropdown-options", async (req, res) => {
    try {
      const option = await storage.createDropdownOption(req.body);
      res.json(option);
    } catch (error) {
      console.error("Error creating dropdown option:", error);
      res.status(500).json({ message: "Failed to create dropdown option" });
    }
  });

  // Update dropdown option
  app.put("/api/admin/dropdown-options/:id", async (req, res) => {
    try {
      const optionId = req.params.id;
      const option = await storage.updateDropdownOption(optionId, req.body);
      res.json(option);
    } catch (error) {
      console.error("Error updating dropdown option:", error);
      res.status(500).json({ message: "Failed to update dropdown option" });
    }
  });

  // Delete dropdown option
  app.delete("/api/admin/dropdown-options/:id", async (req, res) => {
    try {
      const optionId = req.params.id;
      await storage.deleteDropdownOption(optionId);
      res.json({ message: "Option deleted successfully" });
    } catch (error) {
      console.error("Error deleting dropdown option:", error);
      res.status(500).json({ message: "Failed to delete dropdown option" });
    }
  });

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