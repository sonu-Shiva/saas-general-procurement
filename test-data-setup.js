// Comprehensive test data setup script for procurement platform
const BASE_URL = 'http://localhost:5000';

// Test data configurations
const testUsers = [
  { role: 'admin', name: 'Admin User', email: 'admin@sclen.com' },
  { role: 'department_requester', name: 'John Requester', email: 'john.req@sclen.com', department: 'IT' },
  { role: 'dept_approver', name: 'Jane Manager', email: 'jane.mgr@sclen.com', department: 'IT' },
  { role: 'sourcing_exec', name: 'Mike Executive', email: 'mike.exec@sclen.com' },
  { role: 'sourcing_manager', name: 'Sarah Manager', email: 'sarah.mgr@sclen.com' },
  { role: 'vendor', name: 'Vendor Rep', email: 'vendor@techcorp.com' }
];

const testCategories = [
  { name: 'IT Equipment', description: 'Computers, servers, networking equipment' },
  { name: 'Office Supplies', description: 'General office materials and supplies' },
  { name: 'Software', description: 'Software licenses and subscriptions' },
  { name: 'Services', description: 'Professional and consulting services' }
];

const testProducts = [
  {
    name: 'Dell OptiPlex 7090',
    description: 'Business desktop computer',
    sku: 'DELL-OPT-7090',
    categoryId: null, // Will be set during creation
    unitPrice: 899.99,
    specifications: { cpu: 'Intel i7', ram: '16GB', storage: '512GB SSD' }
  },
  {
    name: 'Microsoft Office 365',
    description: 'Office productivity suite license',
    sku: 'MS-O365-BUS',
    categoryId: null,
    unitPrice: 12.50,
    specifications: { type: 'Monthly subscription', users: 'Per user' }
  },
  {
    name: 'Ethernet Cable Cat6',
    description: '25ft Category 6 Ethernet cable',
    sku: 'ETH-CAT6-25FT',
    categoryId: null,
    unitPrice: 15.99,
    specifications: { length: '25 feet', category: 'Cat6', color: 'Blue' }
  }
];

const testVendors = [
  {
    companyName: 'TechCorp Solutions',
    contactName: 'Alice Johnson',
    email: 'alice@techcorp.com',
    phone: '+1-555-0123',
    address: '123 Tech Street, Silicon Valley, CA 94000',
    taxId: 'TC-123456789',
    businessLicense: 'BL-987654321',
    categories: ['IT Equipment', 'Software'],
    status: 'verified'
  },
  {
    companyName: 'Office Dynamics',
    contactName: 'Bob Smith',
    email: 'bob@officedynamics.com',
    phone: '+1-555-0456',
    address: '456 Business Ave, New York, NY 10001',
    taxId: 'OD-987654321',
    businessLicense: 'BL-123456789',
    categories: ['Office Supplies', 'Services'],
    status: 'verified'
  }
];

const dropdownConfigurations = [
  {
    name: 'Priority Levels',
    type: 'single_select',
    isRequired: true,
    isActive: true,
    appliesTo: ['procurement_request', 'rfx'],
    options: [
      { value: 'low', label: 'Low Priority', sortOrder: 1, isActive: true },
      { value: 'medium', label: 'Medium Priority', sortOrder: 2, isActive: true },
      { value: 'high', label: 'High Priority', sortOrder: 3, isActive: true },
      { value: 'urgent', label: 'Urgent', sortOrder: 4, isActive: true }
    ]
  },
  {
    name: 'Departments',
    type: 'single_select', 
    isRequired: true,
    isActive: true,
    appliesTo: ['procurement_request', 'user'],
    options: [
      { value: 'it', label: 'Information Technology', sortOrder: 1, isActive: true },
      { value: 'finance', label: 'Finance', sortOrder: 2, isActive: true },
      { value: 'hr', label: 'Human Resources', sortOrder: 3, isActive: true },
      { value: 'operations', label: 'Operations', sortOrder: 4, isActive: true },
      { value: 'marketing', label: 'Marketing', sortOrder: 5, isActive: true }
    ]
  },
  {
    name: 'Budget Categories',
    type: 'single_select',
    isRequired: false,
    isActive: true,
    appliesTo: ['procurement_request', 'bom'],
    options: [
      { value: 'capex', label: 'Capital Expenditure', sortOrder: 1, isActive: true },
      { value: 'opex', label: 'Operational Expenditure', sortOrder: 2, isActive: true },
      { value: 'maintenance', label: 'Maintenance', sortOrder: 3, isActive: true }
    ]
  }
];

// API helper functions
async function makeRequest(method, endpoint, data = null, role = 'admin') {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    // Set role first
    await fetch(`${BASE_URL}/api/auth/user/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      console.error(`${method} ${endpoint} failed:`, response.status, await response.text());
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error);
    return null;
  }
}

// Setup functions
async function setupDropdownConfigurations() {
  console.log('Setting up dropdown configurations...');
  
  for (const config of dropdownConfigurations) {
    const createdConfig = await makeRequest('POST', '/api/admin/dropdown-configurations', config);
    
    if (createdConfig) {
      console.log(`✓ Created dropdown: ${config.name}`);
      
      // Add options to the configuration
      for (const option of config.options) {
        const optionData = {
          ...option,
          configurationId: createdConfig.id
        };
        
        await makeRequest('POST', '/api/admin/dropdown-options', optionData);
      }
      console.log(`  Added ${config.options.length} options`);
    }
  }
}

async function setupProductCategories() {
  console.log('Setting up product categories...');
  const categories = [];
  
  for (const category of testCategories) {
    const created = await makeRequest('POST', '/api/product-categories', category);
    if (created) {
      categories.push(created);
      console.log(`✓ Created category: ${category.name}`);
    }
  }
  
  return categories;
}

async function setupProducts(categories) {
  console.log('Setting up products...');
  const products = [];
  
  // Assign categories to products
  testProducts[0].categoryId = categories.find(c => c.name === 'IT Equipment')?.id;
  testProducts[1].categoryId = categories.find(c => c.name === 'Software')?.id;
  testProducts[2].categoryId = categories.find(c => c.name === 'IT Equipment')?.id;
  
  for (const product of testProducts) {
    const created = await makeRequest('POST', '/api/products', product);
    if (created) {
      products.push(created);
      console.log(`✓ Created product: ${product.name}`);
    }
  }
  
  return products;
}

async function setupVendors() {
  console.log('Setting up vendors...');
  const vendors = [];
  
  for (const vendor of testVendors) {
    const created = await makeRequest('POST', '/api/vendors', vendor, 'admin');
    if (created) {
      vendors.push(created);
      console.log(`✓ Created vendor: ${vendor.companyName}`);
    }
  }
  
  return vendors;
}

async function setupBOM(products) {
  console.log('Setting up Bill of Materials...');
  
  const bomData = {
    name: 'IT Workstation Setup',
    description: 'Complete workstation setup for new employee',
    version: '1.0',
    status: 'active',
    totalCost: 0 // Will be calculated
  };
  
  const bom = await makeRequest('POST', '/api/boms', bomData);
  
  if (bom && products.length > 0) {
    console.log(`✓ Created BOM: ${bomData.name}`);
    
    // Add items to BOM
    const bomItems = [
      {
        bomId: bom.id,
        productId: products[0]?.id, // Dell OptiPlex
        quantity: 1,
        unitPrice: products[0]?.unitPrice || 899.99,
        totalPrice: products[0]?.unitPrice || 899.99,
        specifications: 'Standard configuration'
      },
      {
        bomId: bom.id,
        productId: products[1]?.id, // Office 365
        quantity: 12, // 12 months
        unitPrice: products[1]?.unitPrice || 12.50,
        totalPrice: (products[1]?.unitPrice || 12.50) * 12,
        specifications: 'Annual subscription'
      }
    ];
    
    for (const item of bomItems) {
      if (item.productId) {
        await makeRequest('POST', '/api/bom-items', item);
      }
    }
    
    console.log(`  Added ${bomItems.length} BOM items`);
    return bom;
  }
}

async function setupApprovalHierarchy() {
  console.log('Setting up approval hierarchy...');
  
  const hierarchyData = {
    name: 'Standard Procurement Approval',
    entityType: 'procurement_request',
    description: 'Standard multi-level approval for procurement requests',
    isActive: true,
    isDefault: true
  };
  
  const hierarchy = await makeRequest('POST', '/api/admin/approval-hierarchies', hierarchyData);
  
  if (hierarchy) {
    console.log(`✓ Created approval hierarchy: ${hierarchyData.name}`);
    
    // Add approval levels
    const levels = [
      {
        levelNumber: 1,
        name: 'Department Manager Approval',
        description: 'Department manager approval for all requests',
        requiredRole: 'dept_approver',
        requiredCount: 1,
        isParallel: false,
        minThreshold: 0,
        maxThreshold: 10000,
        isRequired: true,
        sortOrder: 1
      },
      {
        levelNumber: 2,
        name: 'Sourcing Executive Approval',
        description: 'Sourcing executive approval for medium amounts',
        requiredRole: 'sourcing_exec',
        requiredCount: 1,
        isParallel: false,
        minThreshold: 5000,
        maxThreshold: 50000,
        isRequired: true,
        sortOrder: 2
      },
      {
        levelNumber: 3,
        name: 'Sourcing Manager Approval',
        description: 'Sourcing manager approval for high amounts',
        requiredRole: 'sourcing_manager',
        requiredCount: 1,
        isParallel: false,
        minThreshold: 25000,
        maxThreshold: 999999999,
        isRequired: true,
        sortOrder: 3
      }
    ];
    
    for (const level of levels) {
      const created = await makeRequest('POST', `/api/admin/approval-hierarchies/${hierarchy.id}/levels`, level);
      if (created) {
        console.log(`  ✓ Added level: ${level.name}`);
      }
    }
    
    return hierarchy;
  }
}

// Main setup function
async function setupAllTestData() {
  console.log('Starting comprehensive test data setup...\n');
  
  try {
    // 1. Setup dropdown configurations
    await setupDropdownConfigurations();
    console.log('');
    
    // 2. Setup product categories
    const categories = await setupProductCategories();
    console.log('');
    
    // 3. Setup products
    const products = await setupProducts(categories);
    console.log('');
    
    // 4. Setup vendors
    const vendors = await setupVendors();
    console.log('');
    
    // 5. Setup BOM
    const bom = await setupBOM(products);
    console.log('');
    
    // 6. Setup approval hierarchy
    const hierarchy = await setupApprovalHierarchy();
    console.log('');
    
    console.log('✅ All test data setup completed successfully!');
    console.log('\nSetup Summary:');
    console.log(`- Dropdown Configurations: ${dropdownConfigurations.length}`);
    console.log(`- Product Categories: ${categories?.length || 0}`);
    console.log(`- Products: ${products?.length || 0}`);
    console.log(`- Vendors: ${vendors?.length || 0}`);
    console.log(`- BOMs: ${bom ? 1 : 0}`);
    console.log(`- Approval Hierarchies: ${hierarchy ? 1 : 0}`);
    
    return {
      categories,
      products,
      vendors,
      bom,
      hierarchy
    };
    
  } catch (error) {
    console.error('Test data setup failed:', error);
  }
}

// Run the setup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupAllTestData };
} else {
  setupAllTestData();
}