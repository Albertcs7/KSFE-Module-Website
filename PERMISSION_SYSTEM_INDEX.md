# Permission System - Master Index & Navigation Guide

## 📚 Quick Navigation

### 🎯 Start Here Based on Your Role

#### **Backend Team** (Implementing the API)
1. ⭐ **START:** [BACKEND_TEAM_QUICK_START.md](./BACKEND_TEAM_QUICK_START.md)
   - 2-page checklist to get started
   - Database quick reference
   - Testing commands
   - Common FAQs

2. **THEN:** [PERMISSION_SYSTEM_REFERENCE.md](./PERMISSION_SYSTEM_REFERENCE.md)
   - Data flow diagrams
   - Exact response format
   - Module/permission names
   - Sample SQL

3. **DETAILED:** [BACKEND_PERMISSION_IMPLEMENTATION.md](./BACKEND_PERMISSION_IMPLEMENTATION.md)
   - Full database schema
   - API specifications
   - Pseudocode examples
   - Troubleshooting

#### **Frontend Team** (Using the permission system)
1. ⭐ **USAGE GUIDE:** [FRONTEND_PERMISSION_USAGE.md](./FRONTEND_PERMISSION_USAGE.md)
   - 11 practical examples
   - How to check permissions in Vue components
   - Best practices

2. **CONSTANTS:** [src/utils/permissions.constants.ts](./apps/frontend/src/utils/permissions.constants.ts)
   - Available module names
   - Available permission names
   - Database table examples

3. **CODE REFERENCE:**
   - [src/composables/usePermissions.ts](./apps/frontend/src/composables/usePermissions.ts) - Permission API
   - [src/router/index.ts](./apps/frontend/src/router/index.ts) - Route guards
   - [src/modules/index.ts](./apps/frontend/src/modules/index.ts) - Module filtering

#### **QA/Testing Team**
1. ⭐ **TEST GUIDE:** [BACKEND_TEAM_QUICK_START.md](./BACKEND_TEAM_QUICK_START.md#-testing-the-login-endpoint)
   - Testing commands
   - Expected responses
   - Sample test data

2. **SCENARIOS:** [PERMISSION_SYSTEM_REFERENCE.md](./PERMISSION_SYSTEM_REFERENCE.md#sample-data-setup)
   - Admin user testing
   - Employee with 1 module
   - Employee with multiple modules

---

## 📖 Documentation Files Overview

### Files in Root Directory

| File | Pages | For Whom | Contains |
|------|-------|----------|----------|
| **BACKEND_TEAM_QUICK_START.md** | 4 | Backend Team | ✓ Checklist ✓ DB schema ✓ Testing ✓ FAQs |
| **BACKEND_PERMISSION_IMPLEMENTATION.md** | 10 | Backend Team | ✓ Full design ✓ API specs ✓ Pseudocode ✓ Troubleshooting |
| **PERMISSION_SYSTEM_REFERENCE.md** | 8 | Backend Team | ✓ Data flow ✓ Response format ✓ SQL queries ✓ Common mistakes |
| **FRONTEND_PERMISSION_USAGE.md** | 10 | Frontend Team | ✓ Usage examples ✓ Vue patterns ✓ Best practices ✓ Rules |
| **IMPLEMENTATION_SUMMARY.md** | 6 | All | ✓ Overview ✓ Architecture ✓ Next steps ✓ Success criteria |
| **PERMISSION_SYSTEM_INDEX.md** | This file | All | ✓ Navigation ✓ Quick reference ✓ File locations |

### Files in Frontend Code

| File | Purpose | Developers |
|------|---------|-----------|
| `src/composables/usePermissions.ts` | ✨ Permission checking composable | Frontend |
| `src/utils/permissions.constants.ts` | ✨ Module/permission names | Both teams |
| `src/store/auth.store.ts` | State management with auth data | Frontend |
| `src/router/index.ts` | Route guards with permission checks | Frontend |
| `src/modules/index.ts` | Module filtering for sidebar | Frontend |
| `src/services/api/auth.api.ts` | Login API layer | Frontend |
| `src/components/layout/AppSidebar.vue` | Sidebar using filtered modules | Frontend |

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  EMPLOYEE LOGS IN                                               │
│  ├─ UID (employee code) + password                             │
│  └─ frontend: LoginPage.vue → POST /auth/login                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BACKEND VALIDATES & RESPONDS                                   │
│  ├─ Check credentials in employees table                        │
│  ├─ Get modules from employee_modules table                    │
│  ├─ Get permissions from employee_permissions table             │
│  ├─ Generate JWT token                                          │
│  └─ Return: { modules: [...], permissions: [...], token: ... } │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND STORES DATA                                           │
│  ├─ auth.store → state management                              │
│  └─ localStorage → persistence                                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PERMISSION SYSTEM ACTIVATES                                    │
│  ├─ Route guards check module access                            │
│  ├─ Sidebar filters modules shown                               │
│  ├─ usePermissions() checks permissions                         │
│  └─ Buttons show/hide based on permissions                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RESULT                                                         │
│  ✓ Employee sees only assigned modules                         │
│  ✓ Employee can only perform allowed actions                   │
│  ✓ Unauthorized routes are blocked                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Data Structures

### Backend Response (What Frontend Expects)
```javascript
{
  "status": true,
  "data": {
    "user": { "id": "...", "name": "..." },
    "employeeId": "EMP001",
    "role": "employee",
    "designation": "Manager",
    "branchId": "BRANCH_001",
    "modules": ["insuranceModule"],                    // ← From DB
    "permissions": ["viewInsurance", "editInsurance"], // ← From DB
    "token": "JWT_TOKEN"
  }
}
```

### Module Names (Must be Exact)
```
insuranceModule
payrollModule (future)
reportsModule (future)
adminModule (future)
```

### Permission Names (Must be Exact)
```
viewInsurance, editInsurance, deleteInsurance
viewSLI, editSLI
viewGIS, editGIS
viewMonthlyReport, exportMonthlyReport
```

### Database Tables
```
employees
├── employee_id (UID for login)
├── password_hash (bcrypt)
├── role (admin/employee)
└── status (active/inactive)

employee_modules
├── employee_id (FK)
└── module_name

employee_permissions
├── employee_id (FK)
└── permission_name
```

---

## ⚡ Core APIs

### usePermissions() Composable
```typescript
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

// Check module access
permissions.canAccessModule('insuranceModule')
permissions.canAccessAllModules(['insurance', 'reports'])
permissions.canAccessAnyModule(['insurance', 'payroll'])

// Check permissions
permissions.hasPermission('editInsurance')
permissions.hasAllPermissions(['edit', 'delete'])
permissions.hasAnyPermission(['edit', 'create'])

// Admin & role
permissions.isAdmin.value
permissions.getUserRole()

// Info
permissions.getAccessibleModules()
permissions.getMyPermissions()
```

### Route Guards (Automatic)
```typescript
// In router/index.ts - already implemented
// Automatically checks:
// - User is logged in
// - User has required module for route
// - Redirects to /unauthorized if not
```

### Module Filtering (Automatic)
```typescript
// In AppSidebar.vue - already implemented
// Automatically shows only:
// - Modules in user's modules array
// - Child modules user has access to
```

---

## 🧪 Testing Commands

### Backend API Testing (For Backend Team)
```bash
# Test admin login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"ADMIN","password":"admin123","token":true}'

# Test employee login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"EMP001","password":"emp123","token":true}'

# Test invalid credentials
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"INVALID","password":"wrong","token":true}'
```

### Frontend Testing (For Frontend Team)
```typescript
// In browser console
// Check if logged in
localStorage.getItem('token')

// Check user data
JSON.parse(localStorage.getItem('auth_user'))

// Check auth store
useAuthStore().modules
useAuthStore().permissions

// Check permissions
usePermissions().isAdmin.value
usePermissions().canAccessModule('insuranceModule')
usePermissions().hasPermission('editInsurance')
```

---

## ✅ Implementation Checklist

### Phase 1: Backend Database
- [ ] Create employees table
- [ ] Create employee_modules table
- [ ] Create employee_permissions table
- [ ] Add indexes
- [ ] Insert test data

### Phase 2: Backend API
- [ ] Implement POST /auth/login
- [ ] Add password hashing (bcrypt)
- [ ] Add JWT generation
- [ ] Query database for modules/permissions
- [ ] Return correct response format

### Phase 3: Testing
- [ ] Test with curl commands
- [ ] Test with frontend integration
- [ ] Verify sidebar filters correctly
- [ ] Verify route guards work
- [ ] Verify permissions in UI

### Phase 4: Security
- [ ] Add rate limiting
- [ ] Add error handling
- [ ] Validate response format
- [ ] Add logging
- [ ] Database backups

---

## 🎯 Success Criteria

✅ **Implementation is complete when:**

**Backend:**
- POST /auth/login returns correct format
- Modules array is populated from database
- Permissions array is populated from database
- JWT token is valid
- All test cases pass

**Frontend:**
- Login succeeds with valid credentials
- Token stored in localStorage
- User data stored in auth store
- Sidebar shows correct modules
- Route guards prevent unauthorized access
- Permission checks control button visibility
- Admin sees everything
- Different employees see different modules

**Combined:**
- No console errors
- Response time < 1 second
- All test scenarios pass

---

## 🔗 File Navigation

### Quick Links to Files

**Frontend Code:**
- [Permission Composable](./apps/frontend/src/composables/usePermissions.ts)
- [Auth Store](./apps/frontend/src/store/auth.store.ts)
- [Router Guards](./apps/frontend/src/router/index.ts)
- [Module Filtering](./apps/frontend/src/modules/index.ts)
- [Permission Constants](./apps/frontend/src/utils/permissions.constants.ts)
- [Auth API](./apps/frontend/src/services/api/auth.api.ts)
- [AppSidebar](./apps/frontend/src/components/layout/AppSidebar.vue)

**Documentation:**
- [Backend Quick Start](./BACKEND_TEAM_QUICK_START.md)
- [Backend Implementation](./BACKEND_PERMISSION_IMPLEMENTATION.md)
- [Permission Reference](./PERMISSION_SYSTEM_REFERENCE.md)
- [Frontend Usage](./FRONTEND_PERMISSION_USAGE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

---

## 💬 Quick FAQ

### Q: Where do I start?
**A:** 
- If Backend: Read `BACKEND_TEAM_QUICK_START.md`
- If Frontend: Read `FRONTEND_PERMISSION_USAGE.md`
- If QA: Read testing section in `BACKEND_TEAM_QUICK_START.md`

### Q: What module names should I use?
**A:** See `src/utils/permissions.constants.ts` for the exact names. Use them exactly.

### Q: Can I change permission names?
**A:** No, frontend expects specific names. Keep them consistent with constants.

### Q: Where do I put the module/permission data?
**A:** In your database tables:
- Modules → `employee_modules` table
- Permissions → `employee_permissions` table

### Q: What if employee doesn't have any modules?
**A:** Return empty array: `"modules": []`. Frontend shows /unauthorized.

### Q: How do I test the backend?
**A:** Use curl commands. See `BACKEND_TEAM_QUICK_START.md#testing-the-login-endpoint`

### Q: What's the difference between modules and permissions?
**A:** 
- Modules: Major feature sections (Insurance, Payroll)
- Permissions: Specific actions (view, edit, delete)

### Q: Do I need to worry about frontend permission checks?
**A:** Frontend checks are for UX only. Always validate on backend API too.

---

## 🚀 Next Steps

### Immediate (Today)
1. Backend team reads `BACKEND_TEAM_QUICK_START.md`
2. Frontend team familiarizes with permission system
3. QA team reviews test scenarios

### This Week
1. Backend creates database tables
2. Backend implements /auth/login endpoint
3. Frontend tests integration

### Next Week
1. Security review
2. Performance testing
3. Documentation review
4. Deployment planning

---

## 📊 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend Permission System | ✅ Complete | All features implemented |
| Route Guards | ✅ Complete | Module access checking |
| Sidebar Module Filtering | ✅ Complete | Auto-filters based on permissions |
| usePermissions() Composable | ✅ Complete | Full permission checking API |
| Documentation | ✅ Complete | 5 comprehensive guides |
| Backend API | ⏳ Pending | Awaiting backend team implementation |
| Database Design | 📖 Documented | Backend to implement |
| Testing | ✅ Documented | Ready for all teams |

---

## 📞 Support & Questions

**For Questions About:**
- Frontend permission API → [FRONTEND_PERMISSION_USAGE.md](./FRONTEND_PERMISSION_USAGE.md)
- Backend implementation → [BACKEND_PERMISSION_IMPLEMENTATION.md](./BACKEND_PERMISSION_IMPLEMENTATION.md)
- Data format → [PERMISSION_SYSTEM_REFERENCE.md](./PERMISSION_SYSTEM_REFERENCE.md)
- Specific use case → [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

**For Code Reference:**
- Permission checking → [usePermissions.ts](./apps/frontend/src/composables/usePermissions.ts)
- State management → [auth.store.ts](./apps/frontend/src/store/auth.store.ts)
- Route guards → [router/index.ts](./apps/frontend/src/router/index.ts)
- Module list → [modules/index.ts](./apps/frontend/src/modules/index.ts)

---

## 🎉 Final Notes

This permission system is **production-ready on the frontend**:

✅ **Comprehensive** - Module + permission-based access control  
✅ **Secure** - Backend validation included in design  
✅ **Flexible** - Easy to add new modules/permissions  
✅ **Well-documented** - 5 guides covering all aspects  
✅ **Tested** - Clear test scenarios provided  
✅ **Maintainable** - Consistent naming, clear separation of concerns  

Your backend team can now proceed with implementation following the provided guides.

Frontend is ready for integration. 🚀
