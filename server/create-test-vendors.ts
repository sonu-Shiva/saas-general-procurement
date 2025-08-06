
import { db } from "./db";
import { vendors } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createTestVendors() {
  try {
    // Check if test vendors already exist
    const existingVendors = await db.select().from(vendors).limit(5);
    
    if (existingVendors.length < 3) {
      const testVendors = [
        {
          companyName: "TechCorp Solutions",
          contactPerson: "John Smith",
          email: "contact@techcorp.com",
          phone: "+91-80-12345678",
          address: "123 Tech Park, Bangalore",
          status: "approved",
          categories: ["Technology", "Software"],
        },
        {
          companyName: "Global Supplies Ltd",
          contactPerson: "Sarah Johnson", 
          email: "info@globalsupplies.com",
          phone: "+91-80-87654321",
          address: "456 Supply Chain Rd, Mumbai",
          status: "approved",
          categories: ["Office Supplies", "General"],
        },
        {
          companyName: "Elite Procurement Inc",
          contactPerson: "Mike Davis",
          email: "sales@eliteprocurement.com", 
          phone: "+91-80-55667788",
          address: "789 Business Hub, Delhi",
          status: "approved",
          categories: ["Procurement", "Consulting"],
        }
      ];

      for (const vendor of testVendors) {
        await db.insert(vendors).values(vendor);
      }

      console.log("Test vendors created successfully");
    } else {
      console.log("Test vendors already exist");
    }
  } catch (error) {
    console.error("Error creating test vendors:", error);
  }
}

createTestVendors();
