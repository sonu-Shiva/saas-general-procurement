# Vendor Purchase Order View Implementation Plan

## Requirement Summary

**Current Issue**: Vendors can see all PO buckets (Pending Approval, Approved, Issued, Acknowledged, Rejected) which should not be visible to them.

**Required Changes**:
1. Vendors should only see **"Issued"** and **"Acknowledged"** buckets
2. Add **"Acknowledge"** button for vendors on Issued POs
3. When vendor clicks "Acknowledge", PO moves from Issued to Acknowledged bucket

## Current State Analysis

### ✅ **What's Already Working:**
- Purchase Orders page exists with bucket-based view
- Database schema has PO status field supporting multiple states
- Role-based authentication system is operational
- Storage methods for PO CRUD operations exist

### ❌ **What Needs to Be Fixed:**
- All buckets are visible to vendors (should only show Issued/Acknowledged)
- No "Acknowledge" button for vendors on Issued POs
- No API endpoint for PO acknowledgment
- No role-based filtering of PO buckets in UI

## Step-by-Step Implementation Plan

### Phase 1: Update UI for Vendor Role (Priority: CRITICAL)

#### Step 1.1: Modify Purchase Orders Page Component
**File**: `client/src/pages/purchase-orders.tsx`
**Estimated Time**: 45 minutes

**Current Implementation**: Shows all 5 buckets to all users
**Required Change**: Filter buckets based on user role

```typescript
// Add role-based bucket filtering
const getVisibleBuckets = (userRole: string) => {
  if (userRole === 'vendor') {
    return [
      { id: 'issued', label: 'Issued', status: 'issued' as const },
      { id: 'acknowledged', label: 'Acknowledged', status: 'acknowledged' as const }
    ];
  }
  
  // For buyers/sourcing managers - show all buckets
  return [
    { id: 'pending', label: 'Pending Approval', status: 'pending_approval' as const },
    { id: 'approved', label: 'Approved', status: 'approved' as const },
    { id: 'issued', label: 'Issued', status: 'issued' as const },
    { id: 'acknowledged', label: 'Acknowledged', status: 'acknowledged' as const },
    { id: 'rejected', label: 'Rejected', status: 'rejected' as const }
  ];
};
```

#### Step 1.2: Add Acknowledge Button for Vendors
**File**: `client/src/pages/purchase-orders.tsx`
**Estimated Time**: 30 minutes

**Implementation**: Add vendor-specific action button

```typescript
// Add acknowledge button in PO card for vendors
const renderVendorActions = (po: PurchaseOrder) => {
  if (user?.role === 'vendor' && po.status === 'issued') {
    return (
      <Button
        onClick={() => handleAcknowledgePO(po.id)}
        disabled={acknowledgeMutation.isPending}
        className="w-full bg-green-600 hover:bg-green-700"
        data-testid={`button-acknowledge-${po.id}`}
      >
        {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
      </Button>
    );
  }
  return null;
};
```

### Phase 2: Backend API Implementation (Priority: CRITICAL)

#### Step 2.1: Add PO Acknowledgment Endpoint
**File**: `server/routes.ts`
**Estimated Time**: 30 minutes

**New Endpoint**: `PATCH /api/purchase-orders/:id/acknowledge`

```typescript
// PO Acknowledgment endpoint for vendors
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
    const updatedPO = await storage.updatePurchaseOrder(id, { status: 'acknowledged' });

    res.json(updatedPO);
  } catch (error) {
    console.error("Error acknowledging PO:", error);
    res.status(500).json({ message: "Failed to acknowledge purchase order" });
  }
});
```

#### Step 2.2: Add Vendor-Specific PO Filter Endpoint
**File**: `server/routes.ts`
**Estimated Time**: 20 minutes

**Enhanced Endpoint**: Update existing `GET /api/purchase-orders` to filter by vendor

```typescript
// Update existing PO endpoint to filter by vendor for vendor role
app.get('/api/purchase-orders', async (req, res) => {
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
      
      purchaseOrders = await storage.getPurchaseOrdersByVendor(vendor.id, ['issued', 'acknowledged']);
    } else {
      // For buyers/sourcing managers, show all POs
      purchaseOrders = await storage.getPurchaseOrders();
    }

    res.json(purchaseOrders);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({ message: "Failed to fetch purchase orders" });
  }
});
```

### Phase 3: Database Layer Enhancement (Priority: HIGH)

#### Step 3.1: Add Vendor-Specific Storage Methods
**File**: `server/storage.ts`
**Estimated Time**: 30 minutes

**New Methods**: Add vendor-specific PO retrieval methods

```typescript
// Add method to get POs for specific vendor with status filter
async getPurchaseOrdersByVendor(vendorId: string, statuses?: string[]): Promise<PurchaseOrder[]> {
  let query = this.db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorId, vendorId));
  
  if (statuses && statuses.length > 0) {
    query = query.where(inArray(purchaseOrders.status, statuses));
  }
  
  return await query.orderBy(desc(purchaseOrders.createdAt));
}

// Add method to update PO status specifically for acknowledgment
async acknowledgePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const [updatedPO] = await this.db
    .update(purchaseOrders)
    .set({ status: 'acknowledged', updatedAt: new Date() })
    .where(eq(purchaseOrders.id, id))
    .returning();
    
  if (!updatedPO) {
    throw new Error('Purchase order not found');
  }
  
  return updatedPO;
}
```

### Phase 4: Frontend Integration (Priority: HIGH)

#### Step 4.1: Update React Query Integration
**File**: `client/src/pages/purchase-orders.tsx`
**Estimated Time**: 25 minutes

**Add Mutation**: For PO acknowledgment

```typescript
// Add acknowledge mutation
const acknowledgeMutation = useMutation({
  mutationFn: async (poId: string) => {
    return await apiRequest(`/api/purchase-orders/${poId}/acknowledge`, {
      method: 'PATCH'
    });
  },
  onSuccess: () => {
    // Invalidate and refetch PO data
    queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
    
    toast({
      title: "Success",
      description: "Purchase order acknowledged successfully",
    });
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: error.message || "Failed to acknowledge purchase order",
      variant: "destructive",
    });
  },
});

const handleAcknowledgePO = (poId: string) => {
  acknowledgeMutation.mutate(poId);
};
```

#### Step 4.2: Add Loading States and Error Handling
**File**: `client/src/pages/purchase-orders.tsx`
**Estimated Time**: 15 minutes

**UI Enhancements**: Better UX for acknowledge action

```typescript
// Add loading states for acknowledge button
<Button
  onClick={() => handleAcknowledgePO(po.id)}
  disabled={acknowledgeMutation.isPending}
  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
  data-testid={`button-acknowledge-${po.id}`}
>
  {acknowledgeMutation.isPending ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Acknowledging...
    </>
  ) : (
    <>
      <Check className="w-4 h-4 mr-2" />
      Acknowledge
    </>
  )}
</Button>
```

### Phase 5: Database Schema Update (Priority: MEDIUM)

#### Step 5.1: Ensure 'acknowledged' Status Exists
**File**: `shared/schema.ts`
**Estimated Time**: 10 minutes

**Verification**: Ensure PO status enum includes 'acknowledged'

```typescript
// Verify purchase order status enum includes all required states
export const poStatusEnum = pgEnum('po_status', [
  'draft',
  'pending_approval', 
  'approved',
  'rejected',
  'issued',        // ✓ Required for vendors
  'acknowledged',  // ✓ Required for vendors  
  'delivered',
  'cancelled'
]);
```

### Phase 6: Testing & Validation (Priority: MEDIUM)

#### Step 6.1: Manual Testing Workflow
**Estimated Time**: 30 minutes

**Test Cases**:
1. **Vendor Login**: Switch to vendor role and verify only 2 buckets show
2. **Issued POs**: Verify "Acknowledge" button appears on issued POs
3. **Acknowledge Action**: Click acknowledge and verify PO moves to acknowledged bucket
4. **Buyer View**: Switch back to buyer role and verify all 5 buckets still show
5. **Authorization**: Ensure vendors can't acknowledge other vendors' POs

#### Step 6.2: Error Scenarios Testing
**Estimated Time**: 20 minutes

**Error Test Cases**:
1. Try to acknowledge already acknowledged PO (should fail)
2. Try to acknowledge PO from different vendor (should fail)  
3. Network error during acknowledge (should show error toast)
4. Unauthorized access (should show 401/403 errors)

## Database Schema Requirements

### Purchase Orders Table (Already Exists):
```sql
purchase_orders:
  - id (UUID)
  - vendor_id (UUID) -- Foreign key to vendors table
  - status (ENUM) -- Must include 'issued' and 'acknowledged' 
  - total_amount (DECIMAL)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  -- ... other PO fields
```

### Required Status Values:
- `issued`: PO has been issued to vendor (vendor can see)
- `acknowledged`: PO has been acknowledged by vendor (vendor can see)
- Other statuses: Only visible to buyers/sourcing managers

## Security Considerations

### Authorization Rules:
1. **Vendor Role Verification**: Only users with role='vendor' can acknowledge POs
2. **Vendor Ownership**: Vendors can only acknowledge their own POs (vendorId match)
3. **Status Validation**: Only POs with status='issued' can be acknowledged
4. **API Endpoint Protection**: All endpoints require authentication

### Data Access Rules:
1. **Vendors**: Can only see POs where vendorId matches their profile
2. **Buyers**: Can see all POs regardless of vendor
3. **Status Filter**: Vendors only see 'issued' and 'acknowledged' POs

## Implementation Timeline

**Total Estimated Time: 3.5 hours**

1. **Phase 1 (UI Changes)**: 1.25 hours - Update purchase orders page for vendor role
2. **Phase 2 (Backend API)**: 50 minutes - Add acknowledgment endpoint and filtering
3. **Phase 3 (Database)**: 30 minutes - Add vendor-specific storage methods
4. **Phase 4 (Frontend)**: 40 minutes - Add mutation and error handling
5. **Phase 5 (Schema)**: 10 minutes - Verify status enum
6. **Phase 6 (Testing)**: 50 minutes - Manual testing and validation

## Success Criteria

1. ✅ Vendors see only "Issued" and "Acknowledged" buckets
2. ✅ "Acknowledge" button appears for vendors on issued POs
3. ✅ Clicking acknowledge moves PO from Issued to Acknowledged bucket
4. ✅ Buyers still see all 5 buckets unchanged
5. ✅ Authorization works correctly (vendors can't acknowledge others' POs)
6. ✅ Error handling provides clear feedback
7. ✅ Loading states work during acknowledge action
8. ✅ Data persistence works correctly

## Risk Mitigation

**High Risk Items:**
- Role-based UI filtering must not break buyer experience
- Authorization checks must be thorough to prevent security issues
- Database status updates must be atomic

**Mitigation Strategy:**
- Test both vendor and buyer roles thoroughly
- Implement comprehensive authorization checks
- Use database transactions for status updates
- Add proper error handling for all edge cases

## Next Steps

1. **Start with Phase 1**: Update UI to filter buckets by role
2. **Add Phase 2**: Implement backend acknowledgment endpoint
3. **Test Incrementally**: Verify each phase works before proceeding
4. **Complete Integration**: Ensure frontend and backend work together
5. **Comprehensive Testing**: Test all user roles and edge cases

This implementation ensures vendors have a clean, focused experience while maintaining full functionality for buyers and sourcing managers.