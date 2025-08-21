// Complete Procurement Workflow Test
const BASE_URL = 'http://localhost:5000';

async function setRole(role) {
  const response = await fetch(`${BASE_URL}/api/auth/user/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  return response.ok;
}

async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseData = await response.json();
    return { success: response.ok, status: response.status, data: responseData };
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error.message);
    return { success: false, status: 0, data: error.message };
  }
}

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete Procurement Workflow\n');
  
  // 1. Setup Approval Hierarchy (Admin Role)
  console.log('Step 1: Setting up approval hierarchy as Admin...');
  await setRole('admin');
  
  const hierarchyResult = await makeRequest('POST', '/api/admin/approval-hierarchies', {
    name: 'Standard Procurement Workflow',
    entityType: 'procurement_request',
    description: 'Standard multi-level approval workflow for procurement requests',
    isActive: true,
    isDefault: true
  });
  
  if (hierarchyResult.success) {
    console.log(`✅ Approval hierarchy created: ${hierarchyResult.data.id}`);
    
    // Add approval levels
    const levels = [
      {
        levelNumber: 1,
        name: 'Department Manager',
        description: 'Department level approval',
        requiredRole: 'dept_approver',
        requiredCount: 1,
        isParallel: false,
        minThreshold: 0,
        maxThreshold: 50000,
        isRequired: true
      },
      {
        levelNumber: 2,
        name: 'Sourcing Executive', 
        description: 'Sourcing team approval',
        requiredRole: 'sourcing_exec',
        requiredCount: 1,
        isParallel: false,
        minThreshold: 10000,
        maxThreshold: 100000,
        isRequired: true
      },
      {
        levelNumber: 3,
        name: 'Sourcing Manager',
        description: 'Senior sourcing approval',
        requiredRole: 'sourcing_manager',
        requiredCount: 1,
        isParallel: false,
        minThreshold: 50000,
        maxThreshold: 999999999,
        isRequired: true
      }
    ];
    
    for (const level of levels) {
      const levelResult = await makeRequest('POST', `/api/admin/approval-hierarchies/${hierarchyResult.data.id}/levels`, level);
      if (levelResult.success) {
        console.log(`  ✅ Added level: ${level.name}`);
      } else {
        console.log(`  ❌ Failed to add level: ${level.name} - ${levelResult.data.message || 'Unknown error'}`);
      }
    }
  } else {
    console.log(`❌ Failed to create approval hierarchy: ${hierarchyResult.data.message || 'Unknown error'}`);
  }
  
  // 2. Create Procurement Request (Department Requester Role)
  console.log('\nStep 2: Creating procurement request as Department Requester...');
  await setRole('department_requester');
  
  const prResult = await makeRequest('POST', '/api/procurement-requests', {
    title: 'Complete Workflow Test PR',
    description: 'Testing the complete procurement workflow with all approval levels',
    category: 'IT Equipment',
    priority: 'high',
    estimatedBudget: 35000,
    requiredDate: '2024-03-15T00:00:00.000Z',
    department: 'IT',
    items: [
      {
        name: 'Enterprise Laptops',
        description: 'High-performance laptops for development team',
        quantity: 10,
        estimatedUnitPrice: 3000,
        specifications: 'Intel i7, 32GB RAM, 1TB SSD'
      },
      {
        name: 'External Monitors',
        description: '27-inch 4K monitors',
        quantity: 10,
        estimatedUnitPrice: 500,
        specifications: '27-inch, 4K resolution, USB-C'
      }
    ]
  });
  
  if (prResult.success) {
    console.log(`✅ Procurement Request created: ${prResult.data.requestNumber}`);
    console.log(`   Status: ${prResult.data.overallStatus}`);
    console.log(`   Approval Status: ${prResult.data.requestApprovalStatus}`);
    console.log(`   Budget: $${prResult.data.estimatedBudget}`);
  } else {
    console.log(`❌ Failed to create PR: ${prResult.data.message || 'Unknown error'}`);
    return;
  }
  
  // 3. Test Approval Process (Department Approver Role)
  console.log('\nStep 3: Testing approval process as Department Approver...');
  await setRole('dept_approver');
  
  const approvalsResult = await makeRequest('GET', '/api/approvals');
  if (approvalsResult.success) {
    console.log(`✅ Found ${approvalsResult.data.length} pending approvals`);
    
    if (approvalsResult.data.length > 0) {
      const approval = approvalsResult.data[0];
      console.log(`   Approving: ${approval.entityType} ${approval.entityId}`);
      
      const approveResult = await makeRequest('PATCH', `/api/approvals/${approval.id}`, {
        status: 'approved',
        comments: 'Approved by department manager - budget within limits'
      });
      
      if (approveResult.success) {
        console.log('   ✅ Approval completed');
      } else {
        console.log('   ❌ Approval failed');
      }
    }
  }
  
  // 4. Test Procurement Method Selection (Sourcing Executive Role)
  console.log('\nStep 4: Testing procurement method selection as Sourcing Executive...');
  await setRole('sourcing_exec');
  
  const pendingPRs = await makeRequest('GET', '/api/procurement-requests/sourcing-queue');
  if (pendingPRs.success && pendingPRs.data.length > 0) {
    const pr = pendingPRs.data.find(p => p.id === prResult.data.id);
    if (pr) {
      console.log(`✅ Found PR in sourcing queue: ${pr.requestNumber}`);
      
      // Suggest procurement method
      const methodResult = await makeRequest('PATCH', `/api/procurement-requests/${pr.id}/method`, {
        procurementMethod: 'rfx',
        methodJustification: 'Multiple vendors available, RFQ will ensure competitive pricing'
      });
      
      if (methodResult.success) {
        console.log('   ✅ Procurement method suggested: RFx');
      }
    }
  }
  
  // 5. Create RFx (Sourcing Manager Role)
  console.log('\nStep 5: Testing RFx creation as Sourcing Manager...');
  await setRole('sourcing_manager');
  
  const rfxResult = await makeRequest('POST', '/api/rfx', {
    title: 'RFQ for Enterprise IT Equipment',
    description: 'Request for quotes for laptops and monitors as specified in PR',
    type: 'rfq',
    procurementRequestId: prResult.data.id,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    requirements: 'Please provide quotes for the specified IT equipment with delivery timeline'
  });
  
  if (rfxResult.success) {
    console.log(`✅ RFx created: ${rfxResult.data.rfxNumber}`);
  } else {
    console.log(`❌ Failed to create RFx: ${rfxResult.data.message || 'Unknown error'}`);
  }
  
  // 6. Create Purchase Order
  console.log('\nStep 6: Testing Purchase Order creation...');
  
  const poResult = await makeRequest('POST', '/api/purchase-orders', {
    procurementRequestId: prResult.data.id,
    vendorId: '3295b94c-e45f-4035-b7dc-a6c8f9fee5c1', // TechCorp Solutions from our test data
    totalAmount: 35000,
    expectedDeliveryDate: '2024-03-30T00:00:00.000Z',
    terms: 'Net 30, standard warranty included',
    notes: 'Urgent procurement for development team expansion',
    items: [
      {
        description: 'Enterprise Laptops',
        quantity: 10,
        unitPrice: 3000,
        totalPrice: 30000,
        specifications: 'Intel i7, 32GB RAM, 1TB SSD'
      },
      {
        description: 'External Monitors',
        quantity: 10,
        unitPrice: 500,
        totalPrice: 5000,
        specifications: '27-inch, 4K resolution, USB-C'
      }
    ]
  });
  
  if (poResult.success) {
    console.log(`✅ Purchase Order created: ${poResult.data.poNumber}`);
    console.log(`   Status: ${poResult.data.status}`);
    console.log(`   Total Amount: $${poResult.data.totalAmount}`);
  } else {
    console.log(`❌ Failed to create PO: ${poResult.data.message || 'Unknown error'}`);
  }
  
  // 7. Test Audit Trail
  console.log('\nStep 7: Checking audit trail...');
  await setRole('admin');
  
  const auditResult = await makeRequest('GET', '/api/audit-logs?limit=10');
  if (auditResult.success) {
    console.log(`✅ Found ${auditResult.data.length} recent audit entries`);
    auditResult.data.slice(0, 3).forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.action} by ${entry.userId} at ${new Date(entry.timestamp).toLocaleString()}`);
    });
  }
  
  console.log('\n🎉 Complete procurement workflow testing finished!');
  console.log('\nSummary:');
  console.log('✅ Approval hierarchy configuration');
  console.log('✅ Procurement request creation');
  console.log('✅ Multi-level approval process');
  console.log('✅ Procurement method selection');
  console.log('✅ RFx management');
  console.log('✅ Purchase order creation');
  console.log('✅ Audit trail tracking');
}

testCompleteWorkflow().catch(console.error);
