import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, ne, sql } from "drizzle-orm";
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
  notifications,
  dropdownOptions
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
    const validRoles = ['admin', 'department_requester', 'dept_approver', 'sourcing_exec', 'sourcing_manager', 'vendor'];

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

  // Terms download endpoint - handles both RFx and auction downloads
  app.get('/api/terms/download/:entityId', authMiddleware, async (req: any, res) => {
    try {
      const { entityId } = req.params;
      
      // Try to get RFx first, then auction
      let termsPath: string | null = null;
      let entityType = '';
      let entity: any = null;
      
      // Try as RFx first
      try {
        console.log(`Trying to fetch RFx with ID: ${entityId}`);
        const rfx = await storage.getRfxEvent(entityId);
        console.log(`RFx found:`, rfx);
        if (rfx) {
          entity = rfx;
          entityType = 'rfx';
          termsPath = rfx.termsAndConditionsPath;
          console.log(`RFx terms path:`, termsPath);
        }
      } catch (error) {
        console.log(`Error fetching RFx:`, error);
        // Not an RFx, try auction
      }
      
      // If not found as RFx, try as auction
      if (!entity) {
        try {
          console.log(`Trying to fetch auction with ID: ${entityId}`);
          const auction = await storage.getAuction(entityId);
          console.log(`Auction found:`, auction);
          if (auction) {
            entity = auction;
            entityType = 'auction';
            termsPath = auction.termsAndConditionsPath;
            console.log(`Auction terms path:`, termsPath);
          }
        } catch (error) {
          console.log(`Error fetching auction:`, error);
          // Not found as auction either
        }
      }
      
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }
      
      if (!termsPath) {
        // No terms document uploaded, generate a simple text document with terms
        console.log(`No terms document found for ${entityType} ${entityId}, generating default terms document`);
        
        const defaultTermsContent = `TERMS AND CONDITIONS

${entity.type?.toUpperCase() || 'PROCUREMENT'} - ${entity.title || 'Untitled'}
Reference: ${entity.referenceNo || entity.id}
Budget: ${entity.budget ? '₹' + parseFloat(entity.budget).toLocaleString() : 'Not specified'}

GENERAL TERMS:
1. This procurement is conducted under the terms and conditions specified herein.
2. All submitted proposals must be valid for a minimum of 30 days from the due date.
3. The buyer reserves the right to reject any or all proposals without stating reasons.
4. Payment terms shall be as mutually agreed upon contract execution.
5. Delivery terms and conditions will be specified in the purchase order.

COMPLIANCE REQUIREMENTS:
1. All vendors must comply with applicable local and national regulations.
2. Quality standards must meet or exceed industry specifications.
3. All submissions must be complete and accurate.

EVALUATION CRITERIA:
${entity.criteria || 'Standard evaluation criteria apply including price, quality, delivery terms, and vendor capability.'}

SCOPE OF WORK:
${entity.scope || 'As detailed in the procurement specifications.'}

Due Date: ${entity.dueDate ? new Date(entity.dueDate).toLocaleDateString() : 'Not specified'}
Contact: ${entity.contactPerson || 'Procurement Team'}

---
Document generated on: ${new Date().toLocaleString()}
For queries, please contact the procurement team.
0 -40 Td
(Standard procurement terms and conditions apply.) Tj
0 -20 Td
(By participating, you agree to comply with all requirements.) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000198 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
500
%%EOF`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="terms-and-conditions-${entity.type}-${entity.referenceNo || entity.id}.txt"`);
        res.send(defaultTermsContent);
        return;
      }
      
      try {
        // Use object storage service to retrieve the actual file
        console.log("Downloading actual uploaded file from:", termsPath);
        const objectStorageService = new ObjectStorageService();
        
        // Check if it's a full Google Cloud Storage URL
        if (termsPath.startsWith('https://storage.googleapis.com/')) {
          console.log("Processing Google Cloud Storage URL");
          // Extract bucket and object path from the full URL
          const url = new URL(termsPath);
          const pathParts = url.pathname.split('/');
          const bucketName = pathParts[1];
          const objectName = pathParts.slice(2).join('/');
          
          console.log("Bucket:", bucketName, "Object:", objectName);
          
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          // Check if file exists
          const [exists] = await file.exists();
          if (!exists) {
            throw new Error("File not found in storage");
          }
          
          // Get file metadata to determine content type
          const [metadata] = await file.getMetadata();
          const contentType = metadata.contentType || 'application/pdf';
          
          // Set proper headers for download
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="terms-and-conditions-${entity.type}-${entity.referenceNo || entity.title}.${contentType.includes('pdf') ? 'pdf' : 'txt'}"`);
          
          // Stream the file to response
          const stream = file.createReadStream();
          stream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error streaming file' });
            }
          });
          
          stream.pipe(res);
          return;
        } else {
          // Handle relative path (old format)
          const objectFile = await objectStorageService.getObjectEntityFile(termsPath);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="terms-and-conditions-${entity.type}-${entity.referenceNo || entity.title}.pdf"`);
          objectStorageService.downloadObject(objectFile, res);
          return;
        }
        
      } catch (storageError) {
        console.error("Error accessing terms file from storage:", storageError);
        
        // Fallback: create a proper terms document with entity details
        const termsContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 300
>>
stream
BT
/F1 16 Tf
72 720 Td
(TERMS AND CONDITIONS ERROR) Tj
0 -40 Td
/F1 12 Tf
(Unable to retrieve uploaded terms document.) Tj
0 -20 Td
(Error: ${storageError.message}) Tj
0 -40 Td
(RFx Details:) Tj
0 -20 Td
(${entity.type?.toUpperCase() || 'PROCUREMENT'} - ${entity.title || 'Untitled'}) Tj
0 -20 Td
(Reference: ${entity.referenceNo || entity.id}) Tj
0 -40 Td
(Please contact support for assistance.) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000198 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
450
%%EOF`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="terms-and-conditions-${entity.type}-${entity.referenceNo || entity.title}.pdf"`);
        res.send(termsContent);
      }
    } catch (error) {
      console.error("Error downloading terms:", error);
      res.status(500).json({ error: "Failed to download terms document" });
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

  // =====  DEPARTMENTS API ROUTES =====

  // Get all departments
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Create new department
  app.post('/api/departments', async (req, res) => {
    try {
      const { name, code, description } = req.body;
      const department = await storage.createDepartment({
        id: nanoid(),
        name,
        code,
        description,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      res.json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Update department
  app.put('/api/departments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const department = await storage.updateDepartment(id, updates);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  // Delete department
  app.delete('/api/departments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDepartment(id);
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // BOM template download endpoint
  app.get('/api/bom/template', async (req, res) => {
    try {
      const csvContent = `item_code,item_desc,uom,qty,specs
ITEM-001,Sample Item 1,PCS,10,Sample specifications
ITEM-002,Sample Item 2,KG,5.5,Another sample item
ITEM-003,Sample Item 3,METER,25,Length measurement item`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bom_template.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating BOM template:", error);
      res.status(500).json({ message: "Failed to generate template" });
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
  app.get('/api/vendors', authMiddleware, requireRole('admin', 'sourcing_exec', 'sourcing_manager'), async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.post('/api/vendors', authMiddleware, requireRole('admin', 'sourcing_exec', 'sourcing_manager'), async (req, res) => {
    try {
      const vendor = await storage.createVendor(req.body);
      res.json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch('/api/vendors/:id', authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
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

  app.delete('/api/vendors/:id', authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
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
  app.get('/api/rfx', authMiddleware, requireRole('admin', 'sourcing_exec', 'sourcing_manager', 'vendor'), async (req, res) => {
    try {
      const rfxEvents = await storage.getRfxEvents();
      res.json(rfxEvents);
    } catch (error) {
      console.error("Error fetching RFx events:", error);
      res.status(500).json({ message: "Failed to fetch RFx events" });
    }
  });

  // Get single RFx by ID
  app.get('/api/rfx/:id', authMiddleware, requireRole('admin', 'sourcing_exec', 'sourcing_manager', 'vendor'), async (req, res) => {
    try {
      const { id } = req.params;
      const rfx = await storage.getRfxEvent(id);
      if (!rfx) {
        return res.status(404).json({ message: "RFx not found" });
      }
      res.json(rfx);
    } catch (error) {
      console.error("Error fetching RFx:", error);
      res.status(500).json({ message: "Failed to fetch RFx" });
    }
  });

  app.post('/api/rfx', authMiddleware, requireRole('admin', 'sourcing_exec', 'sourcing_manager'), async (req: any, res) => {
    try {
      console.log("RFx creation request received:", req.body);
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { selectedVendors, ...rfxFields } = req.body;
      
      // selectedVendors should already be an array when sent as JSON
      const parsedSelectedVendors = Array.isArray(selectedVendors) ? selectedVendors : [];

      // For now, skip file upload until object storage is properly configured
      // The terms file upload will be implemented when multipart parsing is added
      let termsAndConditionsPath = null;
      if (rfxFields.termsFileUploaded) {
        // Generate a placeholder path for now
        termsAndConditionsPath = `/terms/rfx-${Date.now()}-terms.txt`;
        console.log("Terms file placeholder created:", termsAndConditionsPath);
      }

      const rfxData = {
        ...rfxFields,
        createdBy: userId,
        referenceNo: `RFX-${Date.now()}`,
        status: rfxFields.status || "draft",
        dueDate: rfxFields.dueDate ? new Date(rfxFields.dueDate) : null,
        termsAndConditionsPath,
        termsAndConditionsRequired: !!termsAndConditionsPath,
      };

      console.log("Creating RFx with data:", rfxData);
      const rfx = await storage.createRfxEvent(rfxData);
      console.log("RFx created successfully:", rfx);

      // Create invitations for selected vendors only
      if (parsedSelectedVendors && parsedSelectedVendors.length > 0) {
        console.log(`Creating invitations for ${parsedSelectedVendors.length} selected vendors`);
        const invitations = [];

        for (const vendorId of parsedSelectedVendors) {
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
          selectedVendors: parsedSelectedVendors.length
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
      console.log('Vendor RFx invitations - Current user ID:', currentDevUser.id);
      console.log('Vendor RFx invitations - Current user role:', currentDevUser.role);

      // In development mode, use currentDevUser instead of req.user
      const userId = currentDevUser.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // For development, check if current user is in vendor role
      if (currentDevUser.role !== 'vendor') {
        console.log('User role check failed. Current role:', currentDevUser.role);
        return res.json([]);
      }

      // Find vendor by userId - the current user ID should match a vendor profile
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

  // Get specific RFx details for vendor
  app.get('/api/vendor/rfx/:id', async (req: any, res) => {
    try {
      const { id: rfxId } = req.params;
      console.log('Vendor RFx details - RFx ID:', rfxId);
      console.log('Vendor RFx details - Current user ID:', currentDevUser.id);
      console.log('Vendor RFx details - Current user role:', currentDevUser.role);

      // In development mode, use currentDevUser instead of req.user
      const userId = currentDevUser.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // For development, check if current user is in vendor role
      if (currentDevUser.role !== 'vendor') {
        console.log('User role check failed for RFx details. Current role:', currentDevUser.role);
        return res.status(403).json({ message: "Access denied. Vendors only." });
      }

      // Find vendor profile
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        console.log("No vendor profile found for user:", userId);
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      // Check if vendor has been invited to this RFx
      const invitation = await storage.getRfxInvitation(rfxId, vendor.id);
      if (!invitation) {
        console.log("Vendor not invited to this RFx:", rfxId, vendor.id);
        return res.status(403).json({ message: "You are not invited to this RFx" });
      }

      // Get the RFx details
      const rfx = await storage.getRfxEvent(rfxId);
      if (!rfx) {
        return res.status(404).json({ message: "RFx not found" });
      }

      console.log("Retrieved RFx details for vendor:", rfx.title);
      res.json(rfx);
    } catch (error) {
      console.error("Error fetching vendor RFx details:", error);
      res.status(500).json({ message: "Failed to fetch RFx details" });
    }
  });

  // Vendor RFx responses route
  app.get('/api/vendor/rfx-responses', async (req: any, res) => {
    try {
      console.log('Vendor RFx responses - Current user ID:', currentDevUser.id);
      console.log('Vendor RFx responses - Current user role:', currentDevUser.role);

      // In development mode, use currentDevUser instead of req.user
      const userId = currentDevUser.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // For development, check if current user is in vendor role
      if (currentDevUser.role !== 'vendor') {
        console.log('User role check failed for responses. Current role:', currentDevUser.role);
        return res.json([]);
      }

      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        console.log("No vendor profile found for user:", userId);
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
  app.post('/api/vendor/rfx-responses', async (req: any, res) => {
    try {
      console.log('RFx response submission request:', req.body);
      console.log('RFx response submission - Current user ID:', currentDevUser.id);
      console.log('RFx response submission - Current user role:', currentDevUser.role);

      // In development mode, use currentDevUser instead of req.user
      const userId = currentDevUser.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // For development, check if current user is in vendor role
      if (currentDevUser.role !== 'vendor') {
        return res.status(403).json({ message: "Access denied. Vendors only." });
      }

      // Find vendor by userId - try direct lookup first, then by email as fallback
      let vendor = await storage.getVendorByUserId(userId);
      console.log("Direct vendor lookup result:", vendor ? vendor.id : 'No vendor found');

      if (!vendor) {
        // Fallback: find vendor by email matching current user email
        const allVendors = await storage.getVendors();
        vendor = allVendors.find(v => v.email === currentDevUser.email);
        console.log("Fallback vendor lookup by email result:", vendor ? vendor.id : 'No vendor found by email');
      }

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
  app.get('/api/purchase-orders', authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'vendor', 'admin'), async (req: any, res) => {
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
        // For sourcing execs/managers, show all POs
        purchaseOrders = await storage.getPurchaseOrders();
      }

      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  // Purchase Order approval endpoint
  app.patch('/api/purchase-orders/:id/approve', authMiddleware, requireRole('sourcing_manager', 'admin'), async (req: any, res) => {
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
  app.get('/api/boms', authMiddleware, requireRole('department_requester', 'sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const boms = await storage.getBoms();
      res.json(boms);
    } catch (error) {
      console.error("Error fetching BOMs:", error);
      res.status(500).json({ message: "Failed to fetch BOMs" });
    }
  });

  app.post('/api/boms', authMiddleware, requireRole('department_requester', 'sourcing_exec', 'admin'), async (req: any, res) => {
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

  app.put('/api/boms/:id', authMiddleware, requireRole('department_requester', 'sourcing_exec', 'admin'), async (req: any, res) => {
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

  app.delete('/api/boms/:id', authMiddleware, requireRole('department_requester', 'sourcing_exec', 'admin'), async (req: any, res) => {
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
          status: "issued" as const, // Direct procurement orders should be issued immediately
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
              itemName: item.productName || "Item",
              quantity: item.requestedQuantity?.toString() || "1",
              unitPrice: item.unitPrice?.toString() || "0",
              totalPrice: item.totalPrice?.toString() || "0",
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

  // ===== CHALLENGE PRICING, COUNTER PRICING & AUCTION EXTENSION ROUTES =====

  // Create challenge price
  app.post('/api/auctions/:auctionId/challenge-price', authMiddleware, async (req: any, res: any) => {
    try {
      const { auctionId } = req.params;
      const { bidId, vendorId, challengeAmount, notes } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate user role (only sourcing executives can create challenges)
      const user = await storage.getUser(userId);
      if (!user || !['sourcing_exec', 'sourcing_manager', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only sourcing executives can create challenge prices" });
      }

      // Validate required fields
      if (!bidId || !vendorId || !challengeAmount) {
        return res.status(400).json({ message: "Bid ID, vendor ID, and challenge amount are required" });
      }

      // Verify auction exists
      const auction = await storage.getAuction(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      // Create challenge price
      const challengePrice = await storage.createChallengePrice({
        auctionId,
        vendorId,
        bidId,
        challengeAmount: challengeAmount.toString(),
        challengedBy: userId,
        notes,
      });

      res.json({ success: true, challengePrice });
    } catch (error: any) {
      console.error("Error creating challenge price:", error);
      res.status(500).json({ message: "Failed to create challenge price", error: error.message });
    }
  });

  // Get challenge prices for auction
  app.get('/api/auctions/:auctionId/challenge-prices', authMiddleware, async (req: any, res: any) => {
    try {
      const { auctionId } = req.params;
      const { vendorId, status } = req.query;

      const challengePrices = await storage.getChallengePrices({
        auctionId,
        vendorId: vendorId as string,
        status: status as string,
      });

      res.json(challengePrices);
    } catch (error: any) {
      console.error("Error fetching challenge prices:", error);
      res.status(500).json({ message: "Failed to fetch challenge prices", error: error.message });
    }
  });

  // Vendor-specific endpoint to get challenges for a vendor
  app.get('/api/vendor/auctions/:auctionId/challenges', authMiddleware, async (req: any, res: any) => {
    try {
      const { auctionId } = req.params;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get vendor profile for this user
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      // Get challenge prices for this vendor
      const challengePrices = await storage.getChallengePrices({
        auctionId,
        vendorId: vendor.id,
      });

      res.json(challengePrices);
    } catch (error: any) {
      console.error("Error fetching vendor challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges", error: error.message });
    }
  });

  // Vendor response to challenge price
  app.post('/api/vendor/challenges/:challengeId/respond', authMiddleware, async (req: any, res: any) => {
    try {
      const { challengeId } = req.params;
      const { action, counterAmount, notes } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get vendor profile for this user
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor profile not found" });
      }

      // Validate action
      if (!['accept', 'reject', 'counter'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'accept', 'reject', or 'counter'" });
      }

      // For counter action, validate counterAmount
      if (action === 'counter' && (!counterAmount || isNaN(parseFloat(counterAmount)))) {
        return res.status(400).json({ message: "Counter amount is required for counter action" });
      }

      // Get the challenge to verify ownership
      const challenge = await storage.getChallengePrice(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge price not found" });
      }

      if (challenge.vendorId !== vendor.id) {
        return res.status(403).json({ message: "You can only respond to your own challenges" });
      }

      if (challenge.status !== 'pending') {
        return res.status(400).json({ message: "Challenge has already been responded to" });
      }

      // Update challenge status
      await storage.updateChallengePrice(challengeId, {
        status: action === 'counter' ? 'rejected' : action, // Set to rejected first for counter
        respondedAt: new Date(),
      });

      // If counter, create counter price
      if (action === 'counter') {
        await storage.createCounterPrice({
          challengePriceId: challengeId,
          auctionId: challenge.auctionId,
          vendorId: vendor.id,
          counterAmount: counterAmount.toString(),
          notes,
        });

        // Update challenge status to countered (but this is not in the valid enum)
        // Actually we need to use 'rejected' status as per schema
        await storage.updateChallengePrice(challengeId, { status: 'rejected' });
      }

      res.json({ success: true, action, challengeId });
    } catch (error: any) {
      console.error("Error responding to challenge:", error);
      res.status(500).json({ message: "Failed to respond to challenge", error: error.message });
    }
  });

  // Respond to challenge price (vendor action)
  app.post('/api/challenge-prices/:challengeId/respond', authMiddleware, async (req: any, res: any) => {
    try {
      const { challengeId } = req.params;
      const { status, vendorResponse } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate status
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be either 'accepted' or 'rejected'" });
      }

      // Get challenge price to verify vendor
      const challengePrice = await storage.getChallengePrice(challengeId);
      if (!challengePrice) {
        return res.status(404).json({ message: "Challenge price not found" });
      }

      // Verify user is the vendor for this challenge
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor || vendor.id !== challengePrice.vendorId) {
        return res.status(403).json({ message: "You can only respond to your own challenge prices" });
      }

      // Update challenge price
      const updatedChallengePrice = await storage.respondToChallengePrice(challengeId, status, vendorResponse);

      res.json({ success: true, challengePrice: updatedChallengePrice });
    } catch (error: any) {
      console.error("Error responding to challenge price:", error);
      res.status(500).json({ message: "Failed to respond to challenge price", error: error.message });
    }
  });

  // Create counter price (vendor action after rejecting challenge)
  app.post('/api/challenge-prices/:challengeId/counter-price', authMiddleware, async (req: any, res: any) => {
    try {
      const { challengeId } = req.params;
      const { counterAmount, notes } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate required fields
      if (!counterAmount) {
        return res.status(400).json({ message: "Counter amount is required" });
      }

      // Get challenge price
      const challengePrice = await storage.getChallengePrice(challengeId);
      if (!challengePrice) {
        return res.status(404).json({ message: "Challenge price not found" });
      }

      // Verify vendor can create counter price
      const vendor = await storage.getVendorByUserId(userId);
      if (!vendor || vendor.id !== challengePrice.vendorId) {
        return res.status(403).json({ message: "You can only create counter prices for your own challenges" });
      }

      // Verify challenge was rejected
      if (challengePrice.status !== 'rejected') {
        return res.status(400).json({ message: "Counter price can only be created for rejected challenges" });
      }

      // Create counter price
      const counterPrice = await storage.createCounterPrice({
        challengePriceId: challengeId,
        auctionId: challengePrice.auctionId,
        vendorId: challengePrice.vendorId,
        counterAmount: counterAmount.toString(),
        notes,
      });

      res.json({ success: true, counterPrice });
    } catch (error: any) {
      console.error("Error creating counter price:", error);
      res.status(500).json({ message: "Failed to create counter price", error: error.message });
    }
  });

  // Get counter prices
  app.get('/api/challenge-prices/:challengeId/counter-prices', authMiddleware, async (req: any, res: any) => {
    try {
      const { challengeId } = req.params;

      const counterPrices = await storage.getCounterPrices({
        challengePriceId: challengeId,
      });

      res.json(counterPrices);
    } catch (error: any) {
      console.error("Error fetching counter prices:", error);
      res.status(500).json({ message: "Failed to fetch counter prices", error: error.message });
    }
  });

  // Respond to counter price (sourcing team action)
  app.post('/api/counter-prices/:counterId/respond', authMiddleware, async (req: any, res: any) => {
    try {
      const { counterId } = req.params;
      const { status, sourcingResponse } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate user role
      const user = await storage.getUser(userId);
      if (!user || !['sourcing_exec', 'sourcing_manager', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only sourcing team can respond to counter prices" });
      }

      // Validate status
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be either 'accepted' or 'rejected'" });
      }

      // Update counter price
      const updatedCounterPrice = await storage.respondToCounterPrice(counterId, status, sourcingResponse);

      res.json({ success: true, counterPrice: updatedCounterPrice });
    } catch (error: any) {
      console.error("Error responding to counter price:", error);
      res.status(500).json({ message: "Failed to respond to counter price", error: error.message });
    }
  });

  // Extend auction
  app.post('/api/auctions/:auctionId/extend', authMiddleware, async (req: any, res: any) => {
    try {
      const { auctionId } = req.params;
      const { durationMinutes, reason } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate user role (only sourcing executives can extend auctions)
      const user = await storage.getUser(userId);
      if (!user || !['sourcing_exec', 'sourcing_manager', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only sourcing executives can extend auctions" });
      }

      // Validate required fields
      if (!durationMinutes || durationMinutes <= 0) {
        return res.status(400).json({ message: "Valid duration in minutes is required" });
      }

      // Extend auction
      const result = await storage.extendAuction(auctionId, durationMinutes, reason || "Manual extension", userId);

      res.json({ 
        success: true, 
        auction: result.auction, 
        extension: result.extension,
        message: "Auction extended successfully" 
      });
    } catch (error: any) {
      console.error("Error extending auction:", error);
      res.status(500).json({ message: "Failed to extend auction", error: error.message });
    }
  });

  // Get auction extensions
  app.get('/api/auctions/:auctionId/extensions', authMiddleware, async (req: any, res: any) => {
    try {
      const { auctionId } = req.params;

      const extensions = await storage.getAuctionExtensions(auctionId);

      res.json(extensions);
    } catch (error: any) {
      console.error("Error fetching auction extensions:", error);
      res.status(500).json({ message: "Failed to fetch auction extensions", error: error.message });
    }
  });

  // ===== NEW MULTI-ROLE APPROVAL WORKFLOW ROUTES =====

  // Enhanced Procurement Request creation route (new PR endpoint)
  app.post("/api/pr", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Parse JSON data
      const data = req.body;

      let bomId;

      if (data.selectedBomId) {
        // Use the selected existing BOM
        bomId = data.selectedBomId;

        // Verify the BOM exists
        const existingBom = await storage.getBom(bomId);
        if (!existingBom) {
          return res.status(400).json({ message: "Selected BOM not found" });
        }
      } else {
        // Create new BOM with manual line items
        const bomData = {
          name: `BOM for ${data.title}`,
          description: `Auto-generated BOM for procurement request: ${data.title}`,
          category: data.department,
          createdBy: userId,
        };

        const bom = await storage.createBom(bomData);
        bomId = bom.id;

        // Create BOM items for manual entry
        if (data.bomLineItems && data.bomLineItems.length > 0) {
          for (const item of data.bomLineItems) {
            await storage.createBomItem({
              bomId: bom.id,
              productId: item.productId || null,
              itemName: item.itemName,
              itemCode: item.itemCode || null,
              description: item.description || null,
              quantity: item.quantity.toString(),
              uom: item.uom,
              specifications: item.specifications ? JSON.stringify({ specs: item.specifications }) : null,
            });
          }
        }
      }

      // Generate request number
      const requestNumber = `PR-${Date.now().toString().slice(-6)}`;

      // Create procurement request
      const requestData = {
        requestNumber,
        title: data.title,
        description: data.notes || null,
        department: data.department,
        bomId: bomId,
        priority: data.urgency || 'medium',
        requestedBy: userId,
        requestedDeliveryDate: new Date(data.needByDate),
        justification: data.notes || null,
        estimatedBudget: null,
        overallStatus: 'request_approval_pending',
      };

      const request = await storage.createProcurementRequest(requestData);

      res.json({ 
        success: true,
        prId: request.id,
        requestNumber: requestNumber,
        bomId: bomId,
        status: 'SUBMITTED',
        message: `Procurement request ${requestNumber} created successfully`
      });
    } catch (error) {
      console.error("Error creating enhanced procurement request:", error);
      res.status(500).json({ message: "Failed to create procurement request" });
    }
  });

  // BOM validation endpoint
  app.post("/api/bom/validate", authMiddleware, async (req, res) => {
    try {
      const { lineItems } = req.body;

      if (!lineItems || !Array.isArray(lineItems)) {
        return res.status(400).json({ message: "Invalid line items provided" });
      }

      // Get all products for mapping
      const products = await storage.getProducts();

      const mappedItems: number[] = [];
      const mappedProducts: any[] = [];
      let mappedCount = 0;

      // Try to map each line item to existing products
      lineItems.forEach((item, index) => {
        // Simple matching logic - can be enhanced
        const matchedProduct = products.find(product => 
          (item.itemCode && product.internalCode && product.internalCode.toLowerCase() === item.itemCode.toLowerCase()) ||
          (item.itemCode && product.externalCode && product.externalCode.toLowerCase() === item.itemCode.toLowerCase()) ||
          (item.itemName && product.itemName.toLowerCase().includes(item.itemName.toLowerCase()))
        );

        if (matchedProduct) {
          mappedItems.push(index);
          mappedProducts.push(matchedProduct);
          mappedCount++;
        } else {
          mappedProducts.push(null);
        }
      });

      res.json({
        mappedItems,
        mappedProducts,
        mappedCount,
        totalItems: lineItems.length,
        unmappedCount: lineItems.length - mappedCount,
      });
    } catch (error) {
      console.error("Error validating BOM items:", error);
      res.status(500).json({ message: "Failed to validate BOM items" });
    }
  });

  // Original Procurement Request routes
  app.post("/api/procurement-requests", authMiddleware, async (req, res) => {
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
      };

      const request = await storage.createProcurementRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Error creating procurement request:", error);
      res.status(500).json({ message: "Failed to create procurement request" });
    }
  });

  app.get("/api/procurement-requests", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let filters: any = {};

      // Role-based filtering
      switch (user.role) {
        case 'requester':
          filters.requestedBy = userId;
          break;
        case 'request_approver':
        case 'procurement_approver':
          // Approvers can see requests for their department or any if they're senior
          if (user.department) {
            filters.department = user.department;
          }
          break;
        case 'admin':
          // Admin can see all requests
          break;
        default:
          // Other roles can see all requests
          break;
      }

      const requests = await storage.getProcurementRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching procurement requests:", error);
      res.status(500).json({ message: "Failed to fetch procurement requests" });
    }
  });

  // Sourcing queue - approved PRs ready for sourcing exec intake
  app.get("/api/procurement-requests/sourcing-queue", authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      // Fetch approved procurement requests that haven't been assigned to sourcing yet
      const requests = await storage.getProcurementRequestsByStatus(['approved']);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching sourcing queue:", error);
      res.status(500).json({ message: "Failed to fetch sourcing queue" });
    }
  });

  app.get("/api/procurement-requests/:id", authMiddleware, async (req, res) => {
    try {
      const request = await storage.getProcurementRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching procurement request:", error);
      res.status(500).json({ message: "Failed to fetch procurement request" });
    }
  });

  app.put("/api/procurement-requests/:id", authMiddleware, async (req, res) => {
    try {
      const request = await storage.updateProcurementRequest(req.params.id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating procurement request:", error);
      res.status(500).json({ message: "Failed to update procurement request" });
    }
  });

  app.delete("/api/procurement-requests/:id", authMiddleware, async (req, res) => {
    try {
      const request = await storage.deleteProcurementRequest(req.params.id);
      res.json(request);
    } catch (error) {
      console.error("Error deleting procurement request:", error);
      res.status(500).json({ message: "Failed to delete procurement request" });
    }
  });

  // Update procurement method for sourcing executives
  app.patch("/api/procurement-requests/:id/method", authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const { procurementMethod } = req.body;
      const requestId = req.params.id;

      // Validate procurement method
      const validMethods = ['rfx', 'auction', 'direct'];
      if (!validMethods.includes(procurementMethod)) {
        return res.status(400).json({ 
          message: "Invalid procurement method. Must be 'rfx', 'auction', or 'direct'" 
        });
      }

      // Get the procurement request to check it exists and status
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if request is in correct status for method selection
      if (!['request_approved', 'procurement_method_pending', 'procurement_approved'].includes(request.overallStatus)) {
        return res.status(400).json({ 
          message: "Procurement method can only be set for approved requests" 
        });
      }

      // Allow method updates only if no sourcing event has been created yet
      if (request.procurementMethod && request.procurementMethod !== 'null' && request.sourcingEventId) {
        return res.status(400).json({ 
          message: "Cannot change procurement method - sourcing event already created" 
        });
      }

      // Update the procurement method
      const updatedRequest = await storage.updateProcurementRequest(requestId, {
        procurementMethod: procurementMethod,
        procurementMethodStatus: 'pending',
        overallStatus: 'procurement_method_pending'
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating procurement method:", error);
      res.status(500).json({ message: "Failed to update procurement method" });
    }
  });

  // Withdraw procurement request (for requesters)
  app.post("/api/procurement-requests/:id/withdraw", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const requestId = req.params.id;

      // Get the request to check ownership and status
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if user is the requester
      if (request.requestedBy !== userId) {
        return res.status(403).json({ message: "You can only withdraw your own requests" });
      }

      // Check if request can be withdrawn (only if SUBMITTED status)
      if (request.overallStatus !== 'request_approval_pending') {
        return res.status(400).json({ 
          message: "Request can only be withdrawn when in SUBMITTED status" 
        });
      }

      // Update request status to withdrawn/draft
      const updatedRequest = await storage.updateProcurementRequest(requestId, {
        overallStatus: 'draft',
        requestApprovalStatus: 'pending',
        currentRequestApprover: null,
      });

      res.json({ 
        message: "Request withdrawn successfully",
        request: updatedRequest 
      });
    } catch (error) {
      console.error("Error withdrawing procurement request:", error);
      res.status(500).json({ message: "Failed to withdraw procurement request" });
    }
  });

  // ===== DEPARTMENTS CONFIGURATION ROUTES (ADMIN ONLY) =====

  // Get all departments
  app.get("/api/departments", authMiddleware, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Create department (admin only)
  app.post("/api/departments", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, code, description } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: "Name and code are required" });
      }

      const department = await storage.createDepartment({
        name,
        code: code.toUpperCase(),
        description,
        createdBy: userId,
      });

      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Update department (admin only)
  app.put("/api/departments/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const departmentId = req.params.id;
      const { name, code, description, isActive } = req.body;

      const department = await storage.updateDepartment(departmentId, {
        name,
        code: code?.toUpperCase(),
        description,
        isActive,
      });

      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  // Get BOM template download
  app.get("/api/bom/template", authMiddleware, async (req, res) => {
    try {
      // CSV template headers
      const csvHeaders = [
        'Item Name*',
        'Item Code',
        'Description', 
        'Quantity*',
        'UOM*',
        'Estimated Price',
        'Specifications',
        'Catalog Reference'
      ];

      // Sample data rows
      const sampleRows = [
        ['Steel Rods', 'STL-001', '10mm steel rods for construction', '100', 'PCS', '50.00', 'Grade A steel', 'CAT-STEEL-001'],
        ['Cement Bags', 'CEM-002', 'Portland cement 50kg bags', '20', 'BAGS', '300.00', 'OPC 43 Grade', 'CAT-CEM-002'],
        ['Electrical Wire', 'ELE-003', '2.5mm copper wire', '500', 'METERS', '5.50', 'ISI certified', 'CAT-ELE-003']
      ];

      // Generate CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bom_template.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating BOM template:", error);
      res.status(500).json({ message: "Failed to generate BOM template" });
    }
  });

  // ===== PR APPROVAL ROUTES FOR DEPT_APPROVER =====

  // Approve procurement request
  app.post("/api/pr/:id/approve", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const requestId = req.params.id;

      // Check user has approval role
      const user = await storage.getUser(userId);
      if (!user || !['request_approver', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions to approve requests" });
      }

      // Get the request to check status
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if request can be approved
      if (request.overallStatus !== 'request_approval_pending') {
        return res.status(400).json({ 
          message: "Request can only be approved when in pending approval status" 
        });
      }

      // Update request status to approved and move to sourcing queue
      const updatedRequest = await storage.updateProcurementRequest(requestId, {
        overallStatus: 'request_approved',
        requestApprovalStatus: 'approved',
        currentRequestApprover: userId,
        requestApprovedAt: new Date().toISOString(),
        procurementStatus: 'method_selection_pending',
      });

      // TODO: Send notification to requester
      // TODO: Add to sourcing queue

      res.json({ 
        message: "Procurement request approved successfully",
        request: updatedRequest,
        nextStep: "Moved to sourcing queue for procurement method selection"
      });
    } catch (error) {
      console.error("Error approving procurement request:", error);
      res.status(500).json({ message: "Failed to approve procurement request" });
    }
  });

  // Reject procurement request
  app.post("/api/pr/:id/reject", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const requestId = req.params.id;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      // Check user has approval role
      const user = await storage.getUser(userId);
      if (!user || !['request_approver', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions to reject requests" });
      }

      // Get the request to check status
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if request can be rejected
      if (request.overallStatus !== 'request_approval_pending') {
        return res.status(400).json({ 
          message: "Request can only be rejected when in pending approval status" 
        });
      }

      // Update request status to rejected
      const updatedRequest = await storage.updateProcurementRequest(requestId, {
        overallStatus: 'rejected',
        requestApprovalStatus: 'rejected',
        currentRequestApprover: userId,
        requestRejectedAt: new Date().toISOString(),
        requestRejectionReason: reason,
      });

      // TODO: Send notification to requester

      res.json({ 
        message: "Procurement request rejected",
        request: updatedRequest,
        reason: reason
      });
    } catch (error) {
      console.error("Error rejecting procurement request:", error);
      res.status(500).json({ message: "Failed to reject procurement request" });
    }
  });

  // Send back procurement request for edits
  app.post("/api/pr/:id/sendback", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const requestId = req.params.id;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Send back reason is required" });
      }

      // Check user has approval role
      const user = await storage.getUser(userId);
      if (!user || !['request_approver', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions to send back requests" });
      }

      // Get the request to check status
      const request = await storage.getProcurementRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if request can be sent back
      if (request.overallStatus !== 'request_approval_pending') {
        return res.status(400).json({ 
          message: "Request can only be sent back when in pending approval status" 
        });
      }

      // Update request status to needs edits
      const updatedRequest = await storage.updateProcurementRequest(requestId, {
        overallStatus: 'needs_edits',
        requestApprovalStatus: 'needs_edits',
        currentRequestApprover: userId,
        requestSentBackAt: new Date().toISOString(),
        requestSendBackReason: reason,
      });

      // TODO: Send notification to requester

      res.json({ 
        message: "Procurement request sent back for edits",
        request: updatedRequest,
        reason: reason
      });
    } catch (error) {
      console.error("Error sending back procurement request:", error);
      res.status(500).json({ message: "Failed to send back procurement request" });
    }
  });

  // Approval Configuration routes (Admin only)
  app.post("/api/approval-configurations", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create approval configurations" });
      }

      const configData = {
        ...req.body,
        createdBy: userId,
      };

      const config = await storage.createApprovalConfiguration(configData);
      res.json(config);
    } catch (error) {
      console.error("Error creating approval configuration:", error);
      res.status(500).json({ message: "Failed to create approval configuration" });
    }
  });

  app.get("/api/approval-configurations", authMiddleware, async (req, res) => {
    try {
      const { approvalType, department } = req.query;
      const filters: any = {};

      if (approvalType) filters.approvalType = approvalType as string;
      if (department) filters.department = department as string;

      const configs = await storage.getApprovalConfigurations(filters);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching approval configurations:", error);
      res.status(500).json({ message: "Failed to fetch approval configurations" });
    }
  });

  app.put("/api/approval-configurations/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update approval configurations" });
      }

      const config = await storage.updateApprovalConfiguration(req.params.id, req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating approval configuration:", error);
      res.status(500).json({ message: "Failed to update approval configuration" });
    }
  });

  app.delete("/api/approval-configurations/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete approval configurations" });
      }

      await storage.deleteApprovalConfiguration(req.params.id);
      res.json({ message: "Approval configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting approval configuration:", error);
      res.status(500).json({ message: "Failed to delete approval configuration" });
    }
  });

  // Approval History routes
  app.get("/api/approval-history", authMiddleware, async (req, res) => {
    try {
      const { entityId, approverId, status } = req.query;
      const filters: any = {};

      if (entityId) filters.entityId = entityId as string;
      if (approverId) filters.approverId = approverId as string;
      if (status) filters.status = status as string;

      const history = await storage.getApprovalHistory(filters);
      res.json(history);
    } catch (error) {
      console.error("Error fetching approval history:", error);
      res.status(500).json({ message: "Failed to fetch approval history" });
    }
  });

  // Sourcing queue endpoint for sourcing executives
  app.get("/api/procurement-requests/sourcing-queue-v2", authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const requests = await storage.getProcurementRequestsByStatus(['request_approved']);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching sourcing queue:", error);
      res.status(500).json({ message: "Failed to fetch sourcing queue" });
    }
  });

  // Sourcing events endpoints
  app.post("/api/sourcing-events", authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const eventData = {
        ...req.body,
        createdBy: userId,
      };

      const event = await storage.createSourcingEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating sourcing event:", error);
      res.status(500).json({ message: "Failed to create sourcing event" });
    }
  });

  app.get("/api/sourcing-events/pending", authMiddleware, requireRole('sourcing_exec', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const events = await storage.getSourcingEventsByStatus(['PENDING_SM_APPROVAL']);
      res.json(events);
    } catch (error) {
      console.error("Error fetching pending sourcing events:", error);
      res.status(500).json({ message: "Failed to fetch pending sourcing events" });
    }
  });

  app.post("/api/sourcing-events/:id/approve", authMiddleware, requireRole('sourcing_manager', 'admin'), async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const { comments } = req.body;

      const updatedEvent = await storage.updateSourcingEvent(req.params.id, {
        status: 'SM_APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error approving sourcing event:", error);
      res.status(500).json({ message: "Failed to approve sourcing event" });
    }
  });

  app.post("/api/sourcing-events/:id/reject", authMiddleware, requireRole('sourcing_manager', 'admin'), async (req, res) => {
    try {
      const { comments } = req.body;

      const updatedEvent = await storage.updateSourcingEvent(req.params.id, {
        status: 'SM_REJECTED',
        rejectionReason: comments,
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error rejecting sourcing event:", error);
      res.status(500).json({ message: "Failed to reject sourcing event" });
    }
  });

  app.post("/api/sourcing-events/:id/request_changes", authMiddleware, requireRole('sourcing_manager', 'admin'), async (req, res) => {
    try {
      const { comments } = req.body;

      const updatedEvent = await storage.updateSourcingEvent(req.params.id, {
        status: 'CHANGES_REQUESTED',
        changeRequestComments: comments,
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error requesting changes:", error);
      res.status(500).json({ message: "Failed to request changes" });
    }
  });

  // Approval Action routes
  app.post("/api/approval-requests/:id/approve", authMiddleware, requireRole('dept_approver', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const requestId = req.params.id;
      const { comments } = req.body;

      // Get the procurement request
      const procurementRequest = await storage.getProcurementRequest(requestId);
      if (!procurementRequest) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if user has approval authority based on role
      const canApprove = ['dept_approver', 'sourcing_manager', 'admin'].includes(user.role);
      if (!canApprove) {
        return res.status(403).json({ message: "You don't have approval authority" });
      }

      // Create approval history record
      await storage.createApprovalHistory({
        entityType: 'procurement_request',
        entityId: requestId,
        approvalType: user.role === 'dept_approver' ? 'request_approval' : 'procurement_approval',
        level: 1, // TODO: Implement proper level calculation based on configuration
        approverId: userId,
        status: 'approved',
        comments,
        processedAt: new Date(),
      });

      // Update the procurement request status
      let updates: any = {};
      if (user.role === 'dept_approver') {
        updates = {
          requestApprovalStatus: 'approved',
          overallStatus: 'request_approved',
        };
      } else if (user.role === 'sourcing_manager') {
        updates = {
          procurementMethodStatus: 'approved',
          overallStatus: 'procurement_approved',
        };
      }

      const updatedRequest = await storage.updateProcurementRequest(requestId, updates);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.post("/api/approval-requests/:id/reject", authMiddleware, requireRole('dept_approver', 'sourcing_manager', 'admin'), async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const requestId = req.params.id;
      const { comments } = req.body;

      // Get the procurement request
      const procurementRequest = await storage.getProcurementRequest(requestId);
      if (!procurementRequest) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Check if user has approval authority
      const canApprove = ['dept_approver', 'sourcing_manager', 'admin'].includes(user.role);
      if (!canApprove) {
        return res.status(403).json({ message: "You don't have approval authority" });
      }

      // Create approval history record
      await storage.createApprovalHistory({
        entityType: 'procurement_request',
        entityId: requestId,
        approvalType: user.role === 'dept_approver' ? 'request_approval' : 'procurement_approval',
        level: 1, // TODO: Implement proper level calculation
        approverId: userId,
        status: 'rejected',
        comments: comments || 'Request rejected',
        processedAt: new Date(),
      });

      // Update the procurement request status
      const updatedRequest = await storage.updateProcurementRequest(requestId, {
        overallStatus: 'rejected',
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // Approval Hierarchy Configuration Routes (Admin only)
  app.get('/api/admin/approval-hierarchies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const entityType = req.query.entityType as 'procurement_request' | 'purchase_order' | undefined;
      const hierarchies = await storage.getApprovalHierarchies(entityType);
      
      // Get levels for each hierarchy
      const hierarchiesWithLevels = await Promise.all(
        hierarchies.map(async (hierarchy) => {
          const levels = await storage.getApprovalLevels(hierarchy.id);
          return { ...hierarchy, levels };
        })
      );

      res.json(hierarchiesWithLevels);
    } catch (error) {
      console.error('Error fetching approval hierarchies:', error);
      res.status(500).json({ message: 'Failed to fetch approval hierarchies' });
    }
  });

  app.get('/api/admin/approval-hierarchies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const hierarchy = await storage.getApprovalHierarchy(req.params.id);
      if (!hierarchy) {
        return res.status(404).json({ message: "Approval hierarchy not found" });
      }

      const levels = await storage.getApprovalLevels(hierarchy.id);
      res.json({ ...hierarchy, levels });
    } catch (error) {
      console.error('Error fetching approval hierarchy:', error);
      res.status(500).json({ message: 'Failed to fetch approval hierarchy' });
    }
  });

  app.post('/api/admin/approval-hierarchies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const hierarchyData = {
        ...req.body,
        createdBy: req.user.claims.sub,
      };

      const newHierarchy = await storage.createApprovalHierarchy(hierarchyData);
      res.status(201).json(newHierarchy);
    } catch (error) {
      console.error('Error creating approval hierarchy:', error);
      res.status(500).json({ message: 'Failed to create approval hierarchy' });
    }
  });

  app.put('/api/admin/approval-hierarchies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const updatedHierarchy = await storage.updateApprovalHierarchy(req.params.id, req.body);
      if (!updatedHierarchy) {
        return res.status(404).json({ message: "Approval hierarchy not found" });
      }

      res.json(updatedHierarchy);
    } catch (error) {
      console.error('Error updating approval hierarchy:', error);
      res.status(500).json({ message: 'Failed to update approval hierarchy' });
    }
  });

  app.delete('/api/admin/approval-hierarchies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const deleted = await storage.deleteApprovalHierarchy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Approval hierarchy not found" });
      }

      res.json({ message: "Approval hierarchy deleted successfully" });
    } catch (error) {
      console.error('Error deleting approval hierarchy:', error);
      res.status(500).json({ message: 'Failed to delete approval hierarchy' });
    }
  });

  // Approval Level Routes
  app.post('/api/admin/approval-hierarchies/:hierarchyId/levels', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const levelData = {
        ...req.body,
        hierarchyId: req.params.hierarchyId,
        createdBy: req.user.claims.sub,
      };

      const newLevel = await storage.createApprovalLevel(levelData);
      res.status(201).json(newLevel);
    } catch (error) {
      console.error('Error creating approval level:', error);
      res.status(500).json({ message: 'Failed to create approval level' });
    }
  });

  app.put('/api/admin/approval-levels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const updatedLevel = await storage.updateApprovalLevel(req.params.id, req.body);
      if (!updatedLevel) {
        return res.status(404).json({ message: "Approval level not found" });
      }

      res.json(updatedLevel);
    } catch (error) {
      console.error('Error updating approval level:', error);
      res.status(500).json({ message: 'Failed to update approval level' });
    }
  });

  app.delete('/api/admin/approval-levels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const deleted = await storage.deleteApprovalLevel(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Approval level not found" });
      }

      res.json({ message: "Approval level deleted successfully" });
    } catch (error) {
      console.error('Error deleting approval level:', error);
      res.status(500).json({ message: 'Failed to delete approval level' });
    }
  });

  app.put('/api/admin/approval-hierarchies/:hierarchyId/reorder-levels', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      await storage.reorderApprovalLevels(req.params.hierarchyId, req.body.levelOrders);
      res.json({ message: "Approval levels reordered successfully" });
    } catch (error) {
      console.error('Error reordering approval levels:', error);
      res.status(500).json({ message: 'Failed to reorder approval levels' });
    }
  });

  // Audit Log routes (Admin only)
  app.get('/api/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        entityType: req.query.entityType as string,
        action: req.query.action as string,
        severity: req.query.severity as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  app.get('/api/audit-logs/stats', isAuthenticated, async (req: any, res) => {
    try {
      const timeRange = (req.query.timeRange as 'day' | 'week' | 'month') || 'day';
      const stats = await storage.getAuditLogStats(timeRange);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching audit log stats:', error);
      res.status(500).json({ message: 'Failed to fetch audit log statistics' });
    }
  });

  // Delete procurement request
  app.delete('/api/procurement-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const deletedPR = await storage.deleteProcurementRequest(id, userId);

      if (!deletedPR) {
        return res.status(404).json({ message: "Procurement request not found or access denied" });
      }

      res.json({ message: "Procurement request deleted successfully" });
    } catch (error) {
      console.error("Error deleting procurement request:", error);
      res.status(500).json({ message: "Failed to delete procurement request" });
    }
  });

  // Create sourcing event
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check user role
      if (!user || user.role !== 'SOURCING_EXEC') {
        return res.status(403).json({ message: "Access denied. Sourcing Executive role required." });
      }

      const { procurementRequestId, type, justification, selectedVendors, aiDiscoveryQuery } = req.body;

      // Validate required fields
      if (!procurementRequestId || !type || !selectedVendors || selectedVendors.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate justification for DIRECT_PO
      if (type === 'DIRECT_PO' && !justification?.trim()) {
        return res.status(400).json({ message: "Justification required for Direct PO" });
      }

      // Verify PR exists
      const pr = await storage.getProcurementRequest(procurementRequestId);
      if (!pr) {
        return res.status(404).json({ message: "Procurement request not found" });
      }

      // Create sourcing event
      const eventData = {
        procurementRequestId,
        type,
        justification: type === 'DIRECT_PO' ? justification : null,
        selectedVendors,
        aiDiscoveryQuery: aiDiscoveryQuery?.trim() || null,
        status: 'PENDING_SM_APPROVAL',
        createdBy: userId,
        referenceNo: `SE-${Date.now()}`,
        title: `${type} - ${pr.title}`,
        needByDate: pr.needByDate,
        estimatedValue: pr.estimatedValue || 0,
      };

      const sourcingEvent = await storage.createSourcingEvent(eventData);

      res.status(201).json(sourcingEvent);
    } catch (error) {
      console.error("Error creating sourcing event:", error);
      res.status(500).json({ message: "Failed to create sourcing event" });
    }
  });

  // Get sourcing events
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Filter based on user role
      let events = [];
      if (user.role === 'SOURCING_EXEC' || user.role === 'SOURCING_MANAGER') {
        events = await storage.getSourcingEvents();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(events);
    } catch (error) {
      console.error("Error fetching sourcing events:", error);
      res.status(500).json({ message: "Failed to fetch sourcing events" });
    }
  });

  // Get pending sourcing events for sourcing manager approval
  app.get("/api/events/pending-approval", authMiddleware, requireRole(['sourcing_manager', 'admin']), async (req, res) => {
    try {
      console.log("=== FETCHING PENDING SOURCING EVENTS ===");
      
      // Fetch events pending SM approval
      const filters = { status: 'PENDING_SM_APPROVAL' };
      const events = await storage.getSourcingEvents(filters);
      console.log("Found pending events:", events.length);

      // Enrich events with procurement request details
      const enrichedEvents = await Promise.all(
        events.map(async (event) => {
          try {
            const procurementRequest = await storage.getProcurementRequest(event.procurementRequestId);
            
            // Get vendor details for selected vendors
            const vendors = await Promise.all(
              event.selectedVendorIds.map(async (vendorId) => {
                try {
                  const vendor = await storage.getVendor(vendorId);
                  return vendor;
                } catch (error) {
                  console.warn(`Could not fetch vendor ${vendorId}:`, error);
                  return null;
                }
              })
            );

            return {
              ...event,
              procurementRequest,
              vendors: vendors.filter(Boolean),
            };
          } catch (error) {
            console.warn(`Could not enrich event ${event.id}:`, error);
            return event;
          }
        })
      );

      res.json(enrichedEvents);
    } catch (error) {
      console.error("Error fetching pending sourcing events:", error);
      res.status(500).json({ 
        message: "Failed to fetch pending sourcing events",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Process sourcing event approval
  app.post("/api/events/:id/approval", authMiddleware, requireRole(['sourcing_manager', 'admin']), async (req, res) => {
    try {
      const { id: eventId } = req.params;
      const { action, comments } = req.body;
      const userId = req.user?.id || 'dev-user-123';

      console.log("=== PROCESSING EVENT APPROVAL ===");
      console.log("Event ID:", eventId);
      console.log("Action:", action);
      console.log("Comments:", comments);

      // Get the sourcing event
      const event = await storage.getSourcingEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Sourcing event not found" });
      }

      // Check if event can be processed
      if (event.status !== 'PENDING_SM_APPROVAL') {
        return res.status(400).json({ 
          message: "Event is not in pending approval status" 
        });
      }

      let updateData: any = {
        approvedBy: userId,
        approvedAt: new Date(),
      };

      switch (action) {
        case 'approve':
          updateData.status = 'SM_APPROVED';
          
          // TODO: Implement post-approval actions
          // - For competitive methods (RFQ/RFP/RFI/AUCTION): Send vendor invitations
          // - For DIRECT_PO: Create draft Purchase Order
          
          console.log(`Event ${eventId} approved - method: ${event.type}`);
          break;

        case 'reject':
          if (!comments?.trim()) {
            return res.status(400).json({ message: "Comments are required for rejection" });
          }
          updateData.status = 'SM_REJECTED';
          updateData.rejectionReason = comments.trim();
          console.log(`Event ${eventId} rejected with reason: ${comments}`);
          break;

        case 'request_changes':
          if (!comments?.trim()) {
            return res.status(400).json({ message: "Comments are required when requesting changes" });
          }
          updateData.status = 'CHANGES_REQUESTED';
          updateData.changeRequestComments = comments.trim();
          console.log(`Changes requested for event ${eventId}: ${comments}`);
          break;

        default:
          return res.status(400).json({ message: "Invalid action. Must be 'approve', 'reject', or 'request_changes'" });
      }

      // Update the sourcing event
      const updatedEvent = await storage.updateSourcingEvent(eventId, updateData);

      // TODO: Send notifications to relevant users
      // - Notify sourcing executive of approval/rejection/changes
      // - If approved and competitive method, notify selected vendors

      res.json({
        message: `Sourcing event ${action}d successfully`,
        event: updatedEvent
      });
    } catch (error) {
      console.error("Error processing event approval:", error);
      res.status(500).json({ 
        message: "Failed to process approval",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Dropdown Configuration Management API
  // Get all dropdown configurations with optional filters
  app.get("/api/admin/dropdown-configurations", async (req: any, res: any) => {
    try {
      const { screen, category, isActive } = req.query;
      const filters = {
        ...(screen && { screen }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      };
      
      const configurations = await storage.getDropdownConfigurations(filters);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching dropdown configurations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get a specific dropdown configuration
  app.get("/api/admin/dropdown-configurations/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const configuration = await storage.getDropdownConfiguration(id);
      
      if (!configuration) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      res.json(configuration);
    } catch (error) {
      console.error("Error fetching dropdown configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new dropdown configuration
  app.post("/api/admin/dropdown-configurations", async (req: any, res: any) => {
    try {
      const configData = {
        id: nanoid(),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const configuration = await storage.createDropdownConfiguration(configData);
      res.status(201).json(configuration);
    } catch (error) {
      console.error("Error creating dropdown configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a dropdown configuration
  app.put("/api/admin/dropdown-configurations/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const configuration = await storage.updateDropdownConfiguration(id, updates);
      res.json(configuration);
    } catch (error) {
      console.error("Error updating dropdown configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a dropdown configuration
  app.delete("/api/admin/dropdown-configurations/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDropdownConfiguration(id);
      
      if (!success) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      res.json({ message: "Configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting dropdown configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dropdown Options API
  // Get options for a specific configuration
  app.get("/api/admin/dropdown-configurations/:configId/options", async (req: any, res: any) => {
    try {
      const { configId } = req.params;
      const options = await storage.getDropdownOptions(configId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new dropdown option
  app.post("/api/admin/dropdown-options", async (req: any, res: any) => {
    try {
      const optionData = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Handle sort order for new options
      if (!optionData.sortOrder) {
        // Get the maximum sort order for this configuration and add 1
        const existingOptions = await storage.db
          .select({ sortOrder: dropdownOptions.sortOrder })
          .from(dropdownOptions)
          .where(eq(dropdownOptions.configurationId, req.body.configurationId));
        
        const maxSortOrder = Math.max(0, ...existingOptions.map(o => o.sortOrder || 0));
        optionData.sortOrder = maxSortOrder + 1;
      } else {
        // If sort order is specified, shift existing items
        await storage.db
          .update(dropdownOptions)
          .set({ 
            sortOrder: sql`sort_order + 1`,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(dropdownOptions.configurationId, req.body.configurationId),
              gte(dropdownOptions.sortOrder, optionData.sortOrder)
            )
          );
      }

      const option = await storage.createDropdownOption(optionData);

      // Also add to source table if needed
      const config = await storage.getDropdownConfiguration(req.body.configurationId);
      if (config) {
        if (config.fieldName === 'department' && req.body.label && req.body.value) {
          // Add to departments table
          try {
            await storage.createDepartment({
              id: uuidv4(),
              name: req.body.label,
              code: req.body.value,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } catch (error: any) {
            // Ignore conflicts (department already exists)
            if (!error.message?.includes('duplicate') && !error.message?.includes('constraint')) {
              throw error;
            }
          }
        } else if (config.fieldName === 'category' && req.body.label && req.body.value) {
          // Add to product_categories table
          try {
            await storage.createProductCategory({
              id: uuidv4(),
              name: req.body.label,
              code: req.body.value,
              level: 1,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } catch (error: any) {
            // Ignore conflicts (category already exists)
            if (!error.message?.includes('duplicate') && !error.message?.includes('constraint')) {
              throw error;
            }
          }
        }
      }

      res.status(201).json(option);
    } catch (error) {
      console.error("Error creating dropdown option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a dropdown option
  app.put("/api/admin/dropdown-options/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // First get the option to see which configuration it belongs to
      const option = await storage.getDropdownOption(id);
      if (!option) {
        return res.status(404).json({ message: "Option not found" });
      }

      // Get configuration to determine which source table to sync
      const config = await storage.getDropdownConfiguration(option.configurationId);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      // Handle sort order conflicts before updating
      if (updates.sortOrder !== undefined && updates.sortOrder !== option.sortOrder) {
        // If changing sort order, we need to handle potential conflicts
        try {
          await storage.db
            .update(dropdownOptions)
            .set({ 
              sortOrder: sql`sort_order + 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(dropdownOptions.configurationId, option.configurationId),
                gte(dropdownOptions.sortOrder, updates.sortOrder),
                ne(dropdownOptions.id, id)
              )
            );
        } catch (error) {
          console.error("Error handling sort order conflicts:", error);
        }
      }

      // Update the dropdown option
      const updatedOption = await storage.updateDropdownOption(id, updates);

      // Sync with source table based on configuration type
      if (config.fieldName === 'department' && updates.label && option.value) {
        // Update departments table using Drizzle
        await storage.updateDepartmentByCode(option.value, { name: updates.label });
      } else if (config.fieldName === 'category' && updates.label && option.value) {
        // Update product_categories table using Drizzle
        await storage.updateProductCategoryByName(option.label || option.value, { name: updates.label });
      }

      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating dropdown option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a dropdown option
  app.delete("/api/admin/dropdown-options/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDropdownOption(id);
      
      if (!success) {
        return res.status(404).json({ message: "Option not found" });
      }
      
      res.json({ message: "Option deleted successfully" });
    } catch (error) {
      console.error("Error deleting dropdown option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk update options for a configuration
  app.put("/api/admin/dropdown-configurations/:configId/options", async (req: any, res: any) => {
    try {
      const { configId } = req.params;
      const { options } = req.body;

      // Add IDs and timestamps to options if not present
      const processedOptions = options.map((option: any) => ({
        ...option,
        id: option.id || uuidv4(),
        configurationId: configId,
        createdAt: option.createdAt || new Date(),
        updatedAt: new Date(),
      }));

      const updatedOptions = await storage.bulkUpdateDropdownOptions(configId, processedOptions);
      res.json(updatedOptions);
    } catch (error) {
      console.error("Error bulk updating dropdown options:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public API for frontend to get dropdown options by screen
  app.get("/api/dropdowns/:screen", async (req: any, res: any) => {
    try {
      const { screen } = req.params;
      const options = await storage.getDropdownOptionsByScreen(screen);
      res.json(options);
    } catch (error) {
      console.error("Error fetching dropdown options by screen:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin user management routes
  app.get("/api/admin/users", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can manage users" });
      }

      const { role, isActive, search } = req.query;
      const filters: any = {};

      if (role) filters.role = role as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;

      const users = await storage.getAllUsers(filters);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create users" });
      }

      const userData = {
        ...req.body,
        isActive: req.body.isActive ?? true,
      };

      const newUser = await storage.createUser(userData);
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/admin/users/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update users" });
      }

      const updatedUser = await storage.updateUser(req.params.id, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || 'dev-user-123';
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete users" });
      }

      // Prevent admin from deleting themselves
      if (req.params.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(req.params.id);
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}