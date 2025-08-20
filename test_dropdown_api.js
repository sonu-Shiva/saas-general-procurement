// Simple test script to create sample dropdown configurations
const config1 = {
  screen: "vendor-management",
  category: "general", 
  fieldName: "status",
  displayName: "Vendor Status",
  description: "Status options for vendor management",
  isActive: true,
  sortOrder: 1
};

const options1 = [
  { value: "active", label: "Active", sortOrder: 1, isActive: true },
  { value: "inactive", label: "Inactive", sortOrder: 2, isActive: true },
  { value: "pending", label: "Pending Approval", sortOrder: 3, isActive: true },
  { value: "suspended", label: "Suspended", sortOrder: 4, isActive: true }
];

const config2 = {
  screen: "product-catalogue",
  category: "general",
  fieldName: "category",
  displayName: "Product Category",
  description: "Categories for product classification",
  isActive: true,
  sortOrder: 1
};

const options2 = [
  { value: "electronics", label: "Electronics", sortOrder: 1, isActive: true },
  { value: "software", label: "Software", sortOrder: 2, isActive: true },
  { value: "services", label: "Services", sortOrder: 3, isActive: true },
  { value: "hardware", label: "Hardware", sortOrder: 4, isActive: true }
];

console.log("Sample dropdown configurations:");
console.log("Config 1:", JSON.stringify(config1, null, 2));
console.log("Options 1:", JSON.stringify(options1, null, 2));
console.log("Config 2:", JSON.stringify(config2, null, 2));
console.log("Options 2:", JSON.stringify(options2, null, 2));