// Comprehensive Role-Based Testing Script
const BASE_URL = 'http://localhost:5000';

const roles = [
  'admin',
  'department_requester', 
  'dept_approver',
  'sourcing_exec',
  'sourcing_manager',
  'vendor'
];

const testModules = {
  'Dashboard': ['/api/dashboard/stats', '/api/auth/user'],
  'Product Catalogue': ['/api/products', '/api/product-categories'],
  'Vendor Management': ['/api/vendors'],
  'BOM Management': ['/api/boms', '/api/bom-items'],
  'Procurement Requests': ['/api/procurement-requests'],
  'Approvals': ['/api/approvals', '/api/admin/approval-hierarchies'],
  'RFx Management': ['/api/rfx'],
  'Auctions': ['/api/auctions'],
  'Direct Procurement': ['/api/direct-procurement'],
  'Purchase Orders': ['/api/purchase-orders'],
  'Audit Trail': ['/api/audit-logs'],
  'Admin Settings': ['/api/admin/users', '/api/admin/dropdown-configurations']
};

async function setRole(role) {
  const response = await fetch(`${BASE_URL}/api/auth/user/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  return response.ok;
}

async function testEndpoint(endpoint, role) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const status = response.status;
    let data = null;
    
    if (response.ok) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { status, data, accessible: response.ok };
  } catch (error) {
    return { status: 0, data: error.message, accessible: false };
  }
}

async function runRoleBasedTests() {
  console.log('🚀 Starting Comprehensive Role-Based Testing\n');
  
  const results = {};
  
  for (const role of roles) {
    console.log(`\n=== Testing Role: ${role.toUpperCase()} ===`);
    
    const roleSet = await setRole(role);
    if (!roleSet) {
      console.log(`❌ Failed to set role to ${role}`);
      continue;
    }
    
    results[role] = {};
    
    for (const [moduleName, endpoints] of Object.entries(testModules)) {
      console.log(`\n📋 Testing ${moduleName}:`);
      results[role][moduleName] = {};
      
      for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint, role);
        results[role][moduleName][endpoint] = result;
        
        const statusIcon = result.accessible ? '✅' : '❌';
        const dataCount = Array.isArray(result.data) ? `(${result.data.length} items)` : 
                         typeof result.data === 'object' && result.data !== null ? '(object)' : '';
        
        console.log(`  ${statusIcon} ${endpoint} - Status: ${result.status} ${dataCount}`);
        
        if (!result.accessible && result.status !== 403) {
          console.log(`      Error: ${result.data.substring(0, 100)}...`);
        }
      }
    }
  }
  
  // Summary Report
  console.log('\n\n📊 ROLE-BASED ACCESS SUMMARY');
  console.log('='.repeat(50));
  
  for (const role of roles) {
    if (!results[role]) continue;
    
    console.log(`\n${role.toUpperCase()}:`);
    for (const [module, endpoints] of Object.entries(results[role])) {
      const accessible = Object.values(endpoints).filter(e => e.accessible).length;
      const total = Object.keys(endpoints).length;
      console.log(`  ${module}: ${accessible}/${total} accessible`);
    }
  }
  
  // Test Data Summary
  console.log('\n\n📈 EXISTING TEST DATA SUMMARY');
  console.log('='.repeat(50));
  
  await setRole('admin');
  
  const dataSummary = [
    { name: 'Product Categories', endpoint: '/api/product-categories' },
    { name: 'Products', endpoint: '/api/products' },
    { name: 'Vendors', endpoint: '/api/vendors' },
    { name: 'BOMs', endpoint: '/api/boms' },
    { name: 'Procurement Requests', endpoint: '/api/procurement-requests' },
    { name: 'Purchase Orders', endpoint: '/api/purchase-orders' },
    { name: 'RFx Events', endpoint: '/api/rfx' },
    { name: 'Auctions', endpoint: '/api/auctions' },
    { name: 'Direct Procurement', endpoint: '/api/direct-procurement' },
    { name: 'Approval Hierarchies', endpoint: '/api/admin/approval-hierarchies' }
  ];
  
  for (const item of dataSummary) {
    const result = await testEndpoint(item.endpoint, 'admin');
    const count = Array.isArray(result.data) ? result.data.length : 'N/A';
    console.log(`${item.name}: ${count} records`);
  }
  
  return results;
}

// Run the tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runRoleBasedTests };
} else {
  runRoleBasedTests().then(() => {
    console.log('\n✅ Role-based testing completed!');
  }).catch(error => {
    console.error('❌ Testing failed:', error);
  });
}
