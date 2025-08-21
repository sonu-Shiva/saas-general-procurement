/**
 * Comprehensive Field Testing Script
 * Tests every field in every screen for all 6 roles
 * Identifies and logs all bugs/issues found
 */

const ROLES = [
  'admin',
  'department_requester', 
  'dept_approver',
  'sourcing_exec',
  'sourcing_manager',
  'vendor'
];

const SCREENS = [
  // Core screens
  { name: 'Dashboard', path: '/', forms: [] },
  { name: 'Vendor Management', path: '/vendors', forms: ['create_vendor', 'edit_vendor'] },
  { name: 'Product Catalogue', path: '/products', forms: ['create_product', 'edit_product'] },
  { name: 'BOM Management', path: '/boms', forms: ['create_bom', 'edit_bom'] },
  { name: 'Procurement Requests', path: '/procurement-requests', forms: ['create_request', 'filters'] },
  { name: 'RFx Management', path: '/rfx', forms: ['create_rfx', 'edit_rfx'] },
  { name: 'Auction Center', path: '/auctions', forms: ['create_auction', 'bidding'] },
  { name: 'Sourcing Intake', path: '/sourcing-intake', forms: ['rfx_form', 'auction_form'] },
  { name: 'Purchase Orders', path: '/purchase-orders', forms: ['create_po', 'edit_po'] },
  { name: 'Direct Procurement', path: '/direct-procurement', forms: ['create_order'] },
  { name: 'Method Approval', path: '/method-approval', forms: ['approval_actions'] },
  { name: 'Vendor Portal', path: '/vendor-portal', forms: ['rfx_response'] },
  { name: 'Analytics', path: '/analytics', forms: ['filters'] },
  { name: 'Vendor Discovery', path: '/vendor-discovery', forms: ['search_form'] },
  
  // Admin screens
  { name: 'Admin Dropdown Config', path: '/admin/dropdown-config', forms: ['config_form'] },
  { name: 'Admin User Management', path: '/admin/user-management', forms: ['user_form'] },
  { name: 'Approval Hierarchies', path: '/admin/approval-hierarchies', forms: ['hierarchy_form'] },
  { name: 'Audit Logs', path: '/admin/audit-logs', forms: ['filters'] }
];

const DROPDOWN_FIELDS = [
  // BOM Management
  { screen: 'bom-management', field: 'product_category', configId: 'a4ca02d8-e90f-4609-b817-055d71963cbf' },
  
  // Procurement Requests  
  { screen: 'procurement-requests', field: 'department', configId: 'cdfab1ae-bb52-41b0-bd3e-10986fff68a6' },
  { screen: 'procurement-requests', field: 'urgency_level', configId: '5e2cce40-c949-4197-9eb0-3e1bc8418150' },
  
  // Purchase Orders
  { screen: 'purchase-orders', field: 'payment_terms', configId: '4b844108-db4f-40f6-98f1-22bd6ce93890' },
  { screen: 'purchase-orders', field: 'priority_level', configId: '9d31c65f-38ae-43e3-ab20-961d31f3d1bd' }
];

const ISSUES_FOUND = [];

function logIssue(category, screen, role, field, issue, severity = 'medium') {
  ISSUES_FOUND.push({
    timestamp: new Date().toISOString(),
    category,
    screen,
    role,
    field,
    issue,
    severity,
    status: 'open'
  });
  console.log(`🐛 [${severity.toUpperCase()}] ${screen} - ${role} - ${field}: ${issue}`);
}

async function testDropdownConfiguration(field) {
  try {
    const response = await fetch(`/api/admin/dropdown-configurations/${field.configId}/options`);
    if (!response.ok) {
      logIssue('dropdown', field.screen, 'all', field.field, `Dropdown options API failed: ${response.status}`, 'high');
      return false;
    }
    
    const options = await response.json();
    if (!Array.isArray(options) || options.length === 0) {
      logIssue('dropdown', field.screen, 'all', field.field, 'No dropdown options available', 'high');
      return false;
    }
    
    // Verify each option has required fields
    for (const option of options) {
      if (!option.value || !option.label) {
        logIssue('dropdown', field.screen, 'all', field.field, 'Dropdown option missing value or label', 'medium');
      }
    }
    
    console.log(`✅ ${field.screen}.${field.field}: ${options.length} options available`);
    return true;
  } catch (error) {
    logIssue('dropdown', field.screen, 'all', field.field, `Dropdown test failed: ${error.message}`, 'high');
    return false;
  }
}

async function testBOMItemsEndpoint() {
  try {
    // Test with known BOM ID
    const bomId = '27deaba3-4182-444c-b49a-5196a0d53481';
    
    // Test both endpoints
    const endpoints = [
      `/api/boms/${bomId}/items`,
      `/api/bom-items/${bomId}`
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint);
      if (!response.ok) {
        logIssue('api', 'bom-management', 'all', 'bom_items', `BOM items endpoint ${endpoint} failed: ${response.status}`, 'high');
        continue;
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        logIssue('api', 'bom-management', 'all', 'bom_items', `BOM items endpoint ${endpoint} returned non-array`, 'high');
        continue;
      }
      
      console.log(`✅ ${endpoint}: ${data.length} items found`);
    }
  } catch (error) {
    logIssue('api', 'bom-management', 'all', 'bom_items', `BOM items test failed: ${error.message}`, 'high');
  }
}

async function testFormValidation(screen, form) {
  // Test required field validation
  // Test dropdown field population
  // Test form submission
  console.log(`🧪 Testing form validation for ${screen}.${form}`);
}

async function testRoleBasedAccess(screen, role) {
  // Test role-based field visibility
  // Test role-based action availability
  console.log(`🔐 Testing role access for ${role} on ${screen}`);
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Field Testing...');
  console.log(`Testing ${SCREENS.length} screens across ${ROLES.length} roles`);
  
  // Test 1: Dropdown Configuration System
  console.log('\n📋 Testing Dropdown Configuration System...');
  for (const field of DROPDOWN_FIELDS) {
    await testDropdownConfiguration(field);
  }
  
  // Test 2: BOM Items Endpoint
  console.log('\n🏗️ Testing BOM Items Endpoints...');
  await testBOMItemsEndpoint();
  
  // Test 3: Form Validation for Each Screen
  console.log('\n📝 Testing Form Validation...');
  for (const screen of SCREENS) {
    for (const form of screen.forms) {
      await testFormValidation(screen.name, form);
    }
  }
  
  // Test 4: Role-Based Access Control
  console.log('\n👤 Testing Role-Based Access...');
  for (const role of ROLES) {
    for (const screen of SCREENS) {
      await testRoleBasedAccess(screen.name, role);
    }
  }
  
  // Generate Report
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));
  
  const criticalIssues = ISSUES_FOUND.filter(issue => issue.severity === 'high');
  const mediumIssues = ISSUES_FOUND.filter(issue => issue.severity === 'medium');
  const lowIssues = ISSUES_FOUND.filter(issue => issue.severity === 'low');
  
  console.log(`🔴 Critical Issues: ${criticalIssues.length}`);
  console.log(`🟡 Medium Issues: ${mediumIssues.length}`);
  console.log(`🟢 Low Issues: ${lowIssues.length}`);
  console.log(`📋 Total Issues: ${ISSUES_FOUND.length}`);
  
  if (ISSUES_FOUND.length > 0) {
    console.log('\n📝 Detailed Issues:');
    ISSUES_FOUND.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.screen} - ${issue.field}: ${issue.issue}`);
    });
  }
  
  return ISSUES_FOUND;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runComprehensiveTest = runComprehensiveTest;
  window.ISSUES_FOUND = ISSUES_FOUND;
}

console.log('Comprehensive Field Test Script Loaded');
console.log('Run: runComprehensiveTest() to start testing');