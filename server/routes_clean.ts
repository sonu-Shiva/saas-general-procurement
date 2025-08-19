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
    role: 'sourcing_manager'  // Changed to sourcing_manager to test method approval functionality
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
        department: 'IT',  // Add department for admin user
      });
      console.log('Development user created successfully');
    } else {
      console.log('Development user already exists in database');
    }
  } catch (error) {
    console.error('Error ensuring development user exists:', error);
  }

  // Ensure sample departments exist in database
  try {
    const existingDepartments = await storage.getDepartments();
    if (existingDepartments.length === 0) {
      console.log('Creating sample departments...');
      const sampleDepartments = [
        { name: 'Information Technology', code: 'IT', description: 'IT Services and Technology' },
        { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
        { name: 'Finance & Accounting', code: 'FIN', description: 'Financial Operations' },
        { name: 'Operations', code: 'OPS', description: 'Operations and Production' },
        { name: 'Marketing', code: 'MKT', description: 'Marketing and Sales' },
        { name: 'Research & Development', code: 'R&D', description: 'Research and Development' },
        { name: 'Procurement', code: 'PROC', description: 'Procurement and Supply Chain' },
        { name: 'Quality Assurance', code: 'QA', description: 'Quality Control and Assurance' }
      ];

      for (const dept of sampleDepartments) {
        await storage.createDepartment({
          id: nanoid(),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      console.log('Sample departments created successfully');
    } else {
      console.log('Departments already exist in database');
    }
  } catch (error) {
    console.error('Error ensuring sample departments exist:', error);
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
    const validRoles = ['admin', 'department_requester', 'dept_approver', 'sourcing_exec', 'sourcing_manager', 'buyer_admin', 'vendor'];

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

          // CRITICAL: Update the vendor profile's userId to match the current user
          // This ensures vendor lookup by userId works correctly
          try {
            const allVendors = await storage.getVendors();
            const existingVendorProfile = allVendors.find(v => v.email === vendorProfile.email);
            if (existingVendorProfile && existingVendorProfile.userId !== vendorProfile.id) {
              console.log(`Updating vendor profile userId from ${existingVendorProfile.userId} to ${vendorProfile.id}`);

              // First ensure the user exists in the users table (foreign key requirement)
              try {
                await storage.upsertUser({
                  id: vendorProfile.id,
                  email: vendorProfile.email,
                  firstName: vendorProfile.firstName,
                  lastName: vendorProfile.lastName,
                  role: vendorProfile.role as any,
                });
                console.log(`Ensured user exists in users table: ${vendorProfile.id}`);
              } catch (userError: any) {
                // If it's a duplicate email error, just continue - user already exists
                if (userError.code !== '23505') {
                  throw userError;
                }
                console.log('User already exists in users table');
              }

              // Now update the vendor profile with the correct userId
              await storage.updateVendor(existingVendorProfile.id, {
                userId: vendorProfile.id
              });
              console.log(`Vendor profile userId updated successfully`);
            }
          } catch (vendorUpdateError) {
            console.error('Error updating vendor profile userId:', vendorUpdateError);
          }

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
          role: role,
          department: role === 'requester' ? 'IT' : undefined  // Add department for requesters
        };

        // Update user in database with new role
        try {
          await storage.upsertUser({
            id: originalDevUser.id,
            email: originalDevUser.email,
            firstName: originalDevUser.firstName,
            lastName: originalDevUser.lastName,
            role: originalDevUser.role as any,
            department: originalDevUser.department,
          });
        } catch (dbError) {
          console.error('Error updating user role in database:', dbError);
        }

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
  const authMiddleware = (req: any, res: any, next: any) => {
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

  // Role-based authorization middleware
  const requireRole = (...allowedRoles: string[]) => {
    return async (req: any, res: any, next: any) => {
      try {
        const userId = req.user?.claims?.sub || req.user?.id || 'dev-user-123';
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ 
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${user.role}` 
          });
        }

        req.user = { ...req.user, role: user.role, userData: user };
        next();
      } catch (error) {
        console.error('Role authorization error:', error);
        res.status(500).json({ message: 'Authorization error' });
      }
    };
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
