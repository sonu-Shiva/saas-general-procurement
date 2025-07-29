import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
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

  // Removed duplicate - vendor creation is handled above with proper validation

  app.post("/api/vendors/discover", isAuthenticated, async (req, res) => {
    try {
      const { query, location, category } = req.body;
      
      // Comprehensive vendor database for testing - will be replaced with Perplexity API later
      const testVendors = [
        // Electronics & Technology
        {
          name: "TechFlow Electronics",
          category: "Electronics",
          email: "sales@techflow.co.in",
          phone: "+91-9876543210",
          location: "Mumbai, Maharashtra",
          website: "www.techflow.co.in",
          description: "Leading supplier of semiconductors, PCBs, and electronic components with ISO 9001 certification.",
        },
        {
          name: "Digital Components Hub",
          category: "Electronics",
          email: "info@digitalcomponents.in",
          phone: "+91-8765432109",
          location: "Bangalore, Karnataka",
          website: "www.digitalcomponents.in",
          description: "Specialized in microcontrollers, sensors, and IoT components for industrial applications.",
        },
        // Manufacturing & Industrial
        {
          name: "Precision Manufacturing Ltd",
          category: "Manufacturing",
          email: "orders@precisionmfg.com",
          phone: "+91-9123456789",
          location: "Chennai, Tamil Nadu",
          website: "www.precisionmfg.com",
          description: "Automotive parts manufacturer with TS 16949 certification and 20+ years experience.",
        },
        {
          name: "Industrial Systems Co",
          category: "Manufacturing",
          email: "contact@industrialsystems.in",
          phone: "+91-7654321098",
          location: "Pune, Maharashtra",
          website: "www.industrialsystems.in",
          description: "Heavy machinery and industrial equipment supplier for construction and mining sectors.",
        },
        // Services & Consulting
        {
          name: "Business Solutions Inc",
          category: "Services",
          email: "hello@businesssolutions.co.in",
          phone: "+91-6543210987",
          location: "Delhi, NCR",
          website: "www.businesssolutions.co.in",
          description: "IT consulting, digital transformation, and business process outsourcing services.",
        },
        {
          name: "Professional Services Group",
          category: "Services",
          email: "info@proservices.in",
          phone: "+91-5432109876",
          location: "Hyderabad, Telangana",
          website: "www.proservices.in",
          description: "Financial consulting, legal services, and compliance management for enterprises.",
        },
        // Additional categories
        {
          name: "Green Energy Solutions",
          category: "Energy",
          email: "sales@greenenergy.co.in",
          phone: "+91-4321098765",
          location: "Ahmedabad, Gujarat",
          website: "www.greenenergy.co.in",
          description: "Solar panels, wind energy systems, and renewable energy solutions provider.",
        },
        {
          name: "LogiTech Supply Chain",
          category: "Logistics",
          email: "operations@logitechsc.com",
          phone: "+91-3210987654",
          location: "Kolkata, West Bengal",
          website: "www.logitechsc.com",
          description: "End-to-end supply chain management, warehousing, and transportation services.",
        }
      ];

      // Filter results based on query - more flexible matching
      let filteredVendors = testVendors;
      
      console.log("=== VENDOR DISCOVERY DEBUG ===");
      console.log("Query:", query);
      console.log("Location:", location);
      console.log("Category:", category);
      console.log("Total vendors:", testVendors.length);
      
      if (query && query.trim() !== "") {
        const searchTerm = query.toLowerCase().trim();
        console.log("Searching for:", searchTerm);
        filteredVendors = filteredVendors.filter(vendor => 
          vendor.name.toLowerCase().includes(searchTerm) ||
          vendor.category.toLowerCase().includes(searchTerm) ||
          vendor.description.toLowerCase().includes(searchTerm) ||
          vendor.location.toLowerCase().includes(searchTerm)
        );
        console.log("After query filter:", filteredVendors.length);
      }
      
      if (location && location !== "all" && location.trim() !== "") {
        console.log("Filtering by location:", location);
        filteredVendors = filteredVendors.filter(vendor => 
          vendor.location.toLowerCase().includes(location.toLowerCase())
        );
        console.log("After location filter:", filteredVendors.length);
      }
      
      if (category && category !== "all" && category.trim() !== "") {
        console.log("Filtering by category:", category);
        filteredVendors = filteredVendors.filter(vendor => 
          vendor.category.toLowerCase().includes(category.toLowerCase())
        );
        console.log("After category filter:", filteredVendors.length);
      }
      
      console.log("Final results:", filteredVendors.length);
      console.log("=== END DEBUG ===");

      res.json(filteredVendors);
    } catch (error) {
      console.error("Error discovering vendors:", error);
      res.status(500).json({ message: "Failed to discover vendors" });
    }
  });

  // Product routes - Only vendors can create products
  app.post('/api/products', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      console.log("=== PRODUCT CREATION ===");
      console.log("User ID:", req.user.claims.sub);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const userId = req.user.claims.sub;
      const validatedData = insertProductSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const product = await storage.createProduct(validatedData);
      console.log("Product created successfully:", product.id);
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
      
      // Check if user is the creator of the product or is a vendor
      const user = await storage.getUser(userId);
      const isVendor = user?.role === 'vendor';
      const isOwner = existingProduct.createdBy === userId;
      
      console.log("User role:", user?.role);
      console.log("Is vendor:", isVendor);
      console.log("Is owner:", isOwner);
      
      if (!isVendor && !isOwner) {
        console.log("Permission denied - user cannot delete this product");
        return res.status(403).json({ message: "You can only delete products you created" });
      }
      
      await storage.deleteProduct(productId);
      console.log("Product deleted successfully");
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(400).json({ message: `Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}` });
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
      const childRfxEvents = await storage.getChildRfxEvents(req.params.id);
      const parentRfx = rfx.parentRfxId ? await storage.getRfxEvent(rfx.parentRfxId) : null;
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
