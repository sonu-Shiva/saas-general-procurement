# Comprehensive Field Testing & Fix Plan

## CRITICAL ISSUES IDENTIFIED AND FIXES NEEDED

### 1. BOM Items Loading Issues ✅ FIXED
- **Issue**: Missing GET endpoint for `/api/boms/:id/items`
- **Fix Applied**: Added GET endpoint in server/routes.ts
- **Status**: RESOLVED

### 2. Dropdown Configuration Synchronization Issues 
- **Issue**: Multiple forms still have hardcoded dropdown values
- **Screens Affected**: 
  - create-procurement-request.tsx (urgency levels)
  - direct-procurement-simple.tsx (priority/payment terms)
  - procurement-requests-old.tsx (priority filter)
  - bom-management.tsx (category values in filters)
  - AuditLogs.tsx (priority filter)

### 3. TypeScript Errors Across Platform
- **Files with Errors**:
  - client/src/pages/sourcing-intake.tsx (1 error)
  - server/routes.ts (42 errors) 
  - client/src/pages/procurement-requests.tsx (9 errors)

### 4. Form Field Validation Issues
- **Missing dropdown loading states**
- **Inconsistent field naming** (priority vs priority_level)
- **Missing error handling for dropdown API failures**

### 5. Role-Based Access Control Testing
- **Need to verify field visibility for all 6 roles**:
  - admin
  - department_requester
  - dept_approver
  - sourcing_exec
  - sourcing_manager
  - vendor

## SYSTEMATIC FIX EXECUTION PLAN

### Phase 1: TypeScript Error Resolution
1. Fix all parameter type annotations
2. Resolve interface conflicts
3. Update deprecated type definitions

### Phase 2: Dropdown Configuration Fixes
1. Replace ALL hardcoded dropdown values with config system
2. Add loading states for dropdown fetching
3. Add error handling for dropdown API failures
4. Standardize field naming across platform

### Phase 3: Form Validation Enhancement
1. Add proper form validation for all input fields
2. Implement consistent error messaging
3. Add field-level validation feedback

### Phase 4: Role-Based Testing
1. Test field visibility for each role
2. Verify action availability per role
3. Test form submission permissions

### Phase 5: Cross-Screen Consistency
1. Standardize component patterns
2. Ensure consistent styling
3. Verify responsive behavior

## SCREENS TO TEST (Total: 18)

1. Dashboard
2. Vendor Management
3. Product Catalogue  
4. BOM Management
5. Procurement Requests
6. RFx Management
7. Auction Center
8. Sourcing Intake
9. Purchase Orders
10. Direct Procurement
11. Method Approval
12. Vendor Portal
13. Analytics
14. Vendor Discovery
15. Admin Dropdown Config
16. Admin User Management
17. Approval Hierarchies
18. Audit Logs

## ROLES TO TEST (Total: 6)

1. admin - Full access to all features
2. department_requester - Create requests, BOMs
3. dept_approver - Approve department requests
4. sourcing_exec - Execute sourcing activities
5. sourcing_manager - Approve procurement methods
6. vendor - Access vendor portal, respond to RFx

## IMMEDIATE ACTIONS

1. ✅ Fix BOM items API endpoint
2. ⏳ Fix TypeScript errors in sourcing-intake.tsx
3. ⏳ Replace hardcoded dropdowns in create-procurement-request.tsx
4. ⏳ Update procurement-requests.tsx priority interface
5. ⏳ Fix direct-procurement-simple.tsx dropdown integration