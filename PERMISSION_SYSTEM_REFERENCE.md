# Permission System - Data Flow & Configuration Reference

## Complete Data Flow Diagram

```
EMPLOYEE LOGS IN
       ↓
   UID: "EMP001"
   Password: "secret"
       ↓
    [Frontend]
    LoginPage.vue sends credentials
       ↓
   POST /auth/login (API call)
       ↓
    [Backend API]
    /auth/login endpoint receives request
       ↓
  1. Query employees table:
     SELECT * FROM employees 
     WHERE employee_id = 'EMP001'
     AND status = 'active'
       ↓
  2. Verify password hash (bcrypt)
       ↓
  3. Query employee_modules table:
     SELECT module_name 
     FROM employee_modules 
     WHERE employee_id = 'EMP001'
     AND is_active = true
     Result: ["insuranceModule"]
       ↓
  4. Query employee_permissions table:
     SELECT permission_name 
     FROM employee_permissions 
     WHERE employee_id = 'EMP001'
     AND is_active = true
     Result: ["viewInsurance", "editInsurance"]
       ↓
  5. Generate JWT token
       ↓
  6. Return response
       ↓
    [Response Format]
    {
      "status": true,
      "data": {
        "user": { "id": "...", "name": "..." },
        "employeeId": "EMP001",
        "role": "employee",
        "designation": "...",
        "branchId": "...",
        "modules": ["insuranceModule"],           // ← From employee_modules table
        "permissions": ["viewInsurance", "editInsurance"], // ← From employee_permissions table
        "token": "JWT_TOKEN"
      }
    }
       ↓
    [Frontend]
    auth.store.ts normalizes and stores data
       ↓
  localStorage.setItem('auth_user', JSON.stringify(normalizedUser))
  localStorage.setItem('token', token)
       ↓
  [Router Guard]
  checks MODULE_REQUIREMENTS:
  - If route requires 'insuranceModule'
  - Check if 'insuranceModule' in user.modules
  - If yes → allow route
  - If no → redirect to /unauthorized
       ↓
  [Sidebar]
  getVisibleModules() filters ALL_MODULES
  Shows only modules in user.modules array
       ↓
  [Components]
  usePermissions().hasPermission('editInsurance')
  Shows/hides buttons based on user.permissions array
       ↓
  EMPLOYEE SEES ONLY WHAT THEY'RE ALLOWED TO ACCESS
```

---

## Database Schema at a Glance

```sql
-- Table 1: employees (stores employee basic info)
employees
├── id (PRIMARY KEY)
├── employee_id (UNIQUE) ← Used for login (UID)
├── name
├── password_hash ← Hashed with bcrypt
├── designation
├── branch_id
├── role ("admin" or "employee")
└── status ("active", "inactive", "locked")

-- Table 2: employee_modules (maps employees to modules)
employee_modules
├── id (PRIMARY KEY)
├── employee_id (FOREIGN KEY → employees.employee_id)
├── module_name ← Must match frontend module names
├── assigned_at
└── is_active (BOOLEAN)

-- Table 3: employee_permissions (maps employees to permissions)
employee_permissions
├── id (PRIMARY KEY)
├── employee_id (FOREIGN KEY → employees.employee_id)
├── permission_name ← Must match frontend permission names
├── granted_at
└── is_active (BOOLEAN)
```

---

## Exact Backend Response Format

Your backend **MUST** return this exact format. Frontend parsing depends on it.

```javascript
// ✅ CORRECT RESPONSE (for valid login)
{
  "status": true,
  "message": "Login successful",
  "data": {
    // User basic info (required)
    "user": {
      "id": "user-123",           // Unique user ID
      "name": "John Manager"      // Employee name
    },

    // Employee identification (required)
    "employeeId": "EMP001",       // The UID used for login
    
    // Role (required)
    "role": "employee",           // "admin" or "employee"
    
    // Job title (optional but recommended)
    "designation": "Manager",
    
    // Branch (optional but recommended)
    "branchId": "BRANCH_001",
    
    // ⭐ CRITICAL: Modules array (required)
    // These come from employee_modules table
    // Frontend uses this to filter which sections are visible
    // Frontend checks: if (modules.includes('insuranceModule'))
    "modules": [
      "insuranceModule",          // User can see Insurance section
      // Optionally add more: "reportsModule", "payrollModule", etc.
    ],
    
    // ⭐ CRITICAL: Permissions array (required)
    // These come from employee_permissions table
    // Frontend uses this to show/hide buttons and features
    // Frontend checks: if (permissions.includes('editInsurance'))
    "permissions": [
      "viewInsurance",            // Can view insurance records
      "editInsurance",            // Can edit insurance records
      // Optionally add more specific permissions as needed
    ],
    
    // JWT Token (required)
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZUlkIjoiRU1QMDAxIn0.signature..."
  }
}

// ❌ ERROR RESPONSE (for invalid login)
{
  "status": false,
  "message": "Invalid credentials",
  "data": null
}
```

---

## Module Names Reference

These exact names must be used throughout the system:

```typescript
// AVAILABLE MODULES (what backend returns in response.data.modules)
{
  'insuranceModule',     // Insurance/GIS/SLI features
  // Future modules:
  // 'payrollModule',
  // 'reportsModule',
  // 'adminModule',
}

// When frontend receives modules: ["insuranceModule"]
// → Sidebar shows: Insurance (with SLI, GIS, Reports children)
// → Route guards allow: /insurance, /insurance/sli, /insurance/gis, etc.
// → usePermissions().canAccessModule('insuranceModule') returns true
```

---

## Permission Names Reference

These exact names must be used throughout the system:

```typescript
// AVAILABLE PERMISSIONS (what backend returns in response.data.permissions)
{
  // Insurance module permissions
  'viewInsurance',           // Can see insurance records
  'editInsurance',           // Can edit insurance records
  'deleteInsurance',         // Can delete insurance records
  
  // SLI sub-section permissions
  'viewSLI',                 // Can see SLI records
  'editSLI',                 // Can edit SLI records
  
  // GIS sub-section permissions
  'viewGIS',                 // Can see GIS records
  'editGIS',                 // Can edit GIS records
  
  // Reports permissions
  'viewMonthlyReport',       // Can view reports
  'exportMonthlyReport',     // Can export reports
  
  // Future permissions as features are added
  // 'viewPayroll',
  // 'editPayroll',
}

// When frontend receives permissions: ["viewInsurance", "editInsurance"]
// → usePermissions().hasPermission('editInsurance') returns true
// → Edit buttons appear in UI
// → Delete buttons are hidden
```

---

## SQL Queries You'll Need

```sql
-- 1. Get all modules for an employee
SELECT module_name 
FROM employee_modules 
WHERE employee_id = ?
AND is_active = true;

-- 2. Get all permissions for an employee
SELECT permission_name 
FROM employee_permissions 
WHERE employee_id = ?
AND is_active = true;

-- 3. Check if employee has specific module
SELECT COUNT(*) as has_module
FROM employee_modules 
WHERE employee_id = ? 
AND module_name = ?
AND is_active = true;

-- 4. Check if employee has specific permission
SELECT COUNT(*) as has_permission
FROM employee_permissions 
WHERE employee_id = ? 
AND permission_name = ?
AND is_active = true;

-- 5. Get all data for a specific employee
SELECT e.*, 
       GROUP_CONCAT(DISTINCT em.module_name) as modules,
       GROUP_CONCAT(DISTINCT ep.permission_name) as permissions
FROM employees e
LEFT JOIN employee_modules em ON e.employee_id = em.employee_id AND em.is_active = true
LEFT JOIN employee_permissions ep ON e.employee_id = ep.employee_id AND ep.is_active = true
WHERE e.employee_id = ?
GROUP BY e.id;
```

---

## Sample Data Setup

```sql
-- Create admin user
INSERT INTO employees (id, employee_id, name, password_hash, designation, branch_id, role, status)
VALUES (
  'emp-admin-001',
  'ADMIN',
  'Admin User',
  '$2b$10$...bcrypt_hash...',
  'System Administrator',
  'BRANCH_001',
  'admin',
  'active'
);

-- Admin gets all modules and permissions (handled in code via role check)
-- No need to add entries in employee_modules/employee_permissions for admin


-- Create regular employee with Insurance access
INSERT INTO employees (id, employee_id, name, password_hash, designation, branch_id, role, status)
VALUES (
  'emp-001',
  'EMP001',
  'John Manager',
  '$2b$10$...bcrypt_hash...',
  'Manager',
  'BRANCH_001',
  'employee',
  'active'
);

-- Assign module to EMP001
INSERT INTO employee_modules (id, employee_id, module_name, assigned_by, is_active)
VALUES (
  'em-001',
  'EMP001',
  'insuranceModule',
  'ADMIN',
  true
);

-- Assign permissions to EMP001
INSERT INTO employee_permissions (id, employee_id, permission_name, granted_by, is_active)
VALUES
  ('ep-001', 'EMP001', 'viewInsurance', 'ADMIN', true),
  ('ep-002', 'EMP001', 'editInsurance', 'ADMIN', true),
  ('ep-003', 'EMP001', 'viewSLI', 'ADMIN', true),
  ('ep-004', 'EMP001', 'editSLI', 'ADMIN', true);

-- Result: EMP001 login returns:
-- {
--   "modules": ["insuranceModule"],
--   "permissions": ["viewInsurance", "editInsurance", "viewSLI", "editSLI"]
-- }


-- Create another employee with multiple modules
INSERT INTO employees (id, employee_id, name, password_hash, designation, branch_id, role, status)
VALUES (
  'emp-002',
  'EMP002',
  'Jane Coordinator',
  '$2b$10$...bcrypt_hash...',
  'Coordinator',
  'BRANCH_001',
  'employee',
  'active'
);

-- Assign multiple modules to EMP002
INSERT INTO employee_modules (id, employee_id, module_name, assigned_by, is_active)
VALUES
  ('em-002', 'EMP002', 'insuranceModule', 'ADMIN', true),
  ('em-003', 'EMP002', 'reportsModule', 'ADMIN', true);

-- Assign permissions to EMP002
INSERT INTO employee_permissions (id, employee_id, permission_name, granted_by, is_active)
VALUES
  ('ep-005', 'EMP002', 'viewInsurance', 'ADMIN', true),
  ('ep-006', 'EMP002', 'viewReports', 'ADMIN', true),
  ('ep-007', 'EMP002', 'exportMonthlyReport', 'ADMIN', true);

-- Result: EMP002 login returns:
-- {
--   "modules": ["insuranceModule", "reportsModule"],
--   "permissions": ["viewInsurance", "viewReports", "exportMonthlyReport"]
-- }
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Wrong Module Names
```javascript
// ❌ WRONG
"modules": ["insurance", "reports"]  // Names don't match frontend

// ✅ CORRECT
"modules": ["insuranceModule", "reportsModule"]
```

### ❌ Mistake 2: Missing Modules/Permissions Arrays
```javascript
// ❌ WRONG - Frontend crashes trying to map over undefined
"data": {
  "user": { ... },
  "role": "employee"
  // Missing: modules and permissions
}

// ✅ CORRECT - Always include both
"data": {
  "user": { ... },
  "role": "employee",
  "modules": ["insuranceModule"],
  "permissions": ["viewInsurance"]
}
```

### ❌ Mistake 3: Case Sensitivity
```javascript
// ❌ WRONG - Permission names don't match
"permissions": ["ViewInsurance"]  // Capital V
// Frontend checks: "viewInsurance"  // Lowercase v
// They don't match!

// ✅ CORRECT
"permissions": ["viewInsurance"]   // Lowercase
```

### ❌ Mistake 4: Inconsistent Response Format
```javascript
// ❌ WRONG - Response structure varies
{
  "data": ["insuranceModule"],     // Sometimes array
  "modules": ["insuranceModule"]   // Sometimes different key
}

// ✅ CORRECT - Always use this structure
{
  "status": true,
  "data": {
    "modules": ["insuranceModule"],
    "permissions": ["viewInsurance"]
  }
}
```

### ❌ Mistake 5: Returning All Modules for All Employees
```javascript
// ❌ WRONG - Every employee gets all modules
"modules": ["insuranceModule", "payrollModule", "reportsModule", "adminModule"]
// Frontend doesn't filter - all employees see everything

// ✅ CORRECT - Return only assigned modules
"modules": ["insuranceModule"]  // Only this employee's modules
```

---

## Testing Your Implementation

```bash
# Test 1: Admin login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"ADMIN","password":"admin_password","token":true}'

# Expected: role "admin", all modules available

# Test 2: Employee with single module
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"EMP001","password":"emp_password","token":true}'

# Expected: modules ["insuranceModule"], permissions ["viewInsurance", "editInsurance"]

# Test 3: Employee with multiple modules
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"EMP002","password":"emp_password","token":true}'

# Expected: modules ["insuranceModule", "reportsModule"]

# Test 4: Invalid credentials
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"INVALID","password":"wrong","token":true}'

# Expected: status false, appropriate error message
```

---

## Frontend Will Check

After login, frontend will verify:

1. ✅ Response has `status: true`
2. ✅ Response data has required fields: `user`, `employeeId`, `role`, `modules`, `permissions`, `token`
3. ✅ `modules` is an array (even if empty)
4. ✅ `permissions` is an array (even if empty)
5. ✅ `token` is valid JWT string
6. ✅ Module names match known modules
7. ✅ Permission names match known permissions

If any check fails, frontend will show error.

---

## Adding New Modules/Permissions

When adding a new feature:

### Step 1: Update Frontend Constants
```typescript
// src/utils/permissions.constants.ts
export const AVAILABLE_MODULES = {
  INSURANCE: 'insuranceModule',
  NEW_MODULE: 'newModule',  // ← Add here
}

export const AVAILABLE_PERMISSIONS = {
  VIEW_NEW_FEATURE: 'viewNewFeature',  // ← Add here
  EDIT_NEW_FEATURE: 'editNewFeature',  // ← Add here
}
```

### Step 2: Update Frontend Modules
```typescript
// src/modules/index.ts
const ALL_MODULES: VisibleModule[] = [
  // ... existing modules
  {
    label: "New Feature",
    path: '/newfeature',
    moduleName: 'newModule',
    requiresPermission: 'viewNewFeature',
  }
]
```

### Step 3: Update Frontend Routes
```typescript
// src/app/routes.ts and src/router/index.ts
const MODULE_REQUIREMENTS: Record<string, string> = {
  '/newfeature': 'newModule',
}
```

### Step 4: Backend Database
```sql
-- Add new permission entries to employee_permissions table for relevant employees
INSERT INTO employee_permissions (id, employee_id, permission_name, granted_by, is_active)
VALUES ('ep-new', 'EMP001', 'viewNewFeature', 'ADMIN', true);

-- Add new module entries to employee_modules table for relevant employees
INSERT INTO employee_modules (id, employee_id, module_name, assigned_by, is_active)
VALUES ('em-new', 'EMP001', 'newModule', 'ADMIN', true);
```

### Step 5: Backend /auth/login
- Will automatically fetch new modules/permissions from database
- No code changes needed if using generic queries

---

## Validation Checklist

Before going to production, verify:

- [ ] All employees have at least one role (admin or employee)
- [ ] Admin user exists with role='admin'
- [ ] Test employees have appropriate modules assigned
- [ ] Test employees have appropriate permissions assigned
- [ ] /auth/login returns correct format
- [ ] Module names match exactly (case-sensitive)
- [ ] Permission names match exactly (case-sensitive)
- [ ] JWT token generation works
- [ ] Password hashing uses bcrypt (min 10 rounds)
- [ ] Frontend successfully logs in and stores data
- [ ] Sidebar shows correct modules for each user
- [ ] Route guards prevent unauthorized navigation
- [ ] Buttons show/hide based on permissions
- [ ] Inactive employees can't login
- [ ] Locked employees can't login

---

## Contact Frontend Team

If you need clarification on:
- Module/permission naming
- Response format requirements
- Database design
- Testing procedures

The frontend team is available to discuss in `BACKEND_PERMISSION_IMPLEMENTATION.md` detailed explanations.

**REMEMBER:** Do not modify frontend code. Only focus on backend implementation.
