# Development Guidelines & Regression Prevention

## Critical Rules for Preventing Regressions

### 1. API Signature Changes Protocol
**BEFORE** changing any API function signature:
1. Search entire codebase for all usages
2. Update ALL files simultaneously 
3. Test each affected component individually
4. Verify no breaking changes in related functionality

### 2. Schema Import Validation
**BEFORE** modifying schema imports:
1. Verify all imported items exist in the actual schema file
2. Check TypeScript diagnostics for import errors
3. Test affected API endpoints individually
4. Ensure database operations still function correctly

### 3. Interface-Implementation Consistency
**ENSURE** all interfaces match their implementations:
1. Method names must match exactly between interface and class
2. Parameter types must be consistent
3. Return types must match expectations
4. All interface methods must be implemented

### 4. Pre-Deployment Validation Checklist
**BEFORE** marking any task complete:
- [ ] All TypeScript diagnostics resolved
- [ ] All API endpoints return expected data format
- [ ] Authentication/authorization still works
- [ ] All previously working features still function
- [ ] No console errors in browser
- [ ] Role switching doesn't break functionality

### 5. Systematic Refactoring Protocol
**WHEN** making changes that affect multiple files:
1. Identify ALL files that need updates
2. Make changes to ALL files in single session
3. Test each component after changes
4. Verify integration between components
5. Test user workflows end-to-end

### 6. Testing Priority Order
1. **Core Authentication** - Login/logout, role switching
2. **Data Display** - Lists, tables, product catalogues
3. **CRUD Operations** - Create, Read, Update, Delete
4. **Advanced Features** - Search, filtering, AI integration

### 7. Error Recovery Protocol
**WHEN** regressions occur:
1. Identify exact scope of broken functionality
2. Trace root cause to specific code changes
3. Fix ALL related issues simultaneously
4. Test thoroughly before declaring resolved
5. Document lessons learned in replit.md

## Code Quality Standards

### TypeScript Strict Mode
- All TypeScript diagnostics must be resolved
- No `any` types except for legacy compatibility
- Proper interface definitions for all data structures

### API Consistency
- Consistent error handling across all endpoints
- Standardized response formats
- Proper HTTP status codes

### Component Standards
- All interactive elements must have data-testid attributes
- Consistent error states and loading indicators
- Proper form validation and error messages

## Version Control Best Practices

### Commit Message Format
```
type(scope): description

Examples:
fix(products): resolve API signature mismatch in product-catalogue
feat(vendors): add AI discovery with contact validation
refactor(api): standardize response format across endpoints
```

### Branch Protection
- Never commit directly to main/master
- All changes through feature branches
- Mandatory testing before merge

### Documentation Updates
- Update replit.md for all architectural changes
- Document breaking changes immediately
- Record user preferences and requirements

## Emergency Procedures

### When Regressions Occur
1. **STOP** all other development work
2. **IDENTIFY** exact scope of broken functionality
3. **FIX** all related issues comprehensively
4. **TEST** affected functionality thoroughly
5. **DOCUMENT** lessons learned
6. **UPDATE** prevention guidelines

### Critical System Components (Never Break)
1. User authentication and role management
2. Product catalogue display and management
3. Vendor management CRUD operations
4. AI vendor discovery functionality
5. Purchase order workflows

Remember: **Working functionality is sacred** - preserving existing features is always the top priority.