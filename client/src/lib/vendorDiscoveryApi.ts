// Dedicated API module for vendor discovery to avoid any conflicts
export interface VendorDiscoveryRequest {
  query: string;
  location?: string;
  category?: string;
}

export interface DiscoveredVendor {
  name: string;
  email: string;
  phone: string;
  category: string;
  location?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}

export async function discoverVendorsAPI(request: VendorDiscoveryRequest): Promise<DiscoveredVendor[]> {
  const url = "/api/vendors/discover";
  const method = "POST";
  const headers = {
    "Content-Type": "application/json",
  };
  const body = JSON.stringify(request);
  
  console.log("🔍 Starting vendor discovery API call");
  console.log("URL:", url);
  console.log("Method:", method);
  console.log("Headers:", headers);
  console.log("Body:", body);
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      credentials: "include",
      body: body,
    });
    
    console.log("📡 Response received:");
    console.log("Status:", response.status);
    console.log("StatusText:", response.statusText);
    console.log("OK:", response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Response not OK:", errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("✅ Successfully parsed JSON response:");
    console.log("Vendors found:", result.length);
    
    return result;
  } catch (error) {
    console.error("💥 Fetch error occurred:");
    console.error("Error type:", typeof error);
    console.error("Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Full error object:", error);
    throw error;
  }
}