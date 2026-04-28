# Permission System Implementation Guide

## Overview

This document explains the **Employee Permission & Module Access Control System** implemented in the frontend. It provides detailed instructions for the backend team to implement the required database tables, API endpoints, and business logic.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Employee logs in with UID (employee code) + password        │
│  2. Frontend sends to /auth/login endpoint                      │
│  3. Frontend stores modules + permissions from response         │
│  4. Route guards check if user has required modules             │
│  5. Sidebar shows only modules user can access                  │
│  6. usePermissions() composable controls button visibility      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕
                         (HTTP API)
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Node.js/Express)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Receive login request with UID + password                   │
│  2. Validate credentials against employees table                │
│  3. Fetch modules from employee_modules table                   │
│  4. Fetch permissions from employee_permissions table           │
│  5. Generate JWT token                                          │
│  6. Return all data in required format                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕
            (Database queries & persistence)
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • employees table                                              │
│  • employee_modules table (junction table)                      │
│  • employee_permissions table (junction table)                  │
│  • (Optional) roles table                                       │
│  • (Optional) permissions table                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Design

### Table 1: `employees`

Store employee basic information.

```sql
CREATE TABLE employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,    -- The "UID" used for login
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,         -- bcrypt hash of password
  designation VARCHAR(100),
  branch_id VARCHAR(50),
  role VARCHAR(50) DEFAULT 'employee',         -- 'admin' or 'employee'
  status VARCHAR(50) DEFAULT 'active',         -- 'active', 'inactive', 'locked'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_employee_id ON employees(employee_id);
CREATE INDEX idx_email ON employees(email);
CREATE INDEX idx_status ON employees(status);
```

**Sample Data:**
```sql
INSERT INTO employees (id, employee_id, name, email, password_hash, designation, branch_id, role)
VALUES 
  ('emp-001', 'EMP001', 'John Manager', 'john@ksfe.com', '$2b$10$...hash1...', 'Manager', 'BRANCH_001', 'employee'),
  ('emp-002', 'EMP002', 'Jane Coordinator', 'jane@ksfe.com', '$2b$10$...hash2...', 'Coordinator', 'BRANCH_001', 'employee'),
  ('emp-003', 'EMP003', 'Bob Admin', 'bob@ksfe.com', '$2b$10$...hash3...', 'Admin', 'BRANCH_001', 'admin');
```

---

### Table 2: `employee_modules`

Map employees to modules they have access to. **This is the critical table for controlling which sections of the app employees can see.**

```sql
CREATE TABLE employee_modules (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  module_name VARCHAR(100) NOT NULL,           -- Must match frontend module names
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(50),                     -- Admin who assigned this module
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, module_name)             -- Prevent duplicate assignments
);

-- Indexes for faster queries
CREATE INDEX idx_employee_id_modules ON employee_modules(employee_id);
CREATE INDEX idx_module_name ON employee_modules(module_name);
CREATE INDEX idx_is_active ON employee_modules(is_active);
```

**Sample Data:**
```sql
-- EMP001: Can access Insurance
INSERT INTO employee_modules (id, employee_id, module_name, assigned_by)
VALUES ('em-001', 'EMP001', 'insuranceModule', 'admin');

-- EMP002: Can access Insurance + Reports
INSERT INTO employee_modules (id, employee_id, module_name, assigned_by)
VALUES 
  ('em-002', 'EMP002', 'insuranceModule', 'admin'),
  ('em-003', 'EMP002', 'reportsModule', 'admin');

-- EMP003 (Admin): Can access all modules (handled in code, not needed in table if admin check)
-- OR explicitly add all modules:
INSERT INTO employee_modules (id, employee_id, module_name, assigned_by)
VALUES 
  ('em-004', 'EMP003', 'insuranceModule', 'admin'),
  ('em-005', 'EMP003', 'reportsModule', 'admin'),
  ('em-006', 'EMP003', 'payrollModule', 'admin');
```

**Available Module Names** (must match these exactly):
- `insuranceModule` - Insurance/GIS/SLI sections
- `payrollModule` - Payroll section (if added in future)
- `reportsModule` - Reports section (if added in future)
- `adminModule` - Admin settings (if added in future)

---

### Table 3: `employee_permissions`

Map employees to granular permissions for specific actions. **This table controls what actions employees can perform within modules.**

```sql
CREATE TABLE employee_permissions (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  permission_name VARCHAR(100) NOT NULL,      -- Must match frontend permission names
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by VARCHAR(50),                     -- Admin who granted this permission
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, permission_name)        -- Prevent duplicate permissions
);

-- Indexes for faster queries
CREATE INDEX idx_employee_id_perms ON employee_permissions(employee_id);
CREATE INDEX idx_permission_name ON employee_permissions(permission_name);
CREATE INDEX idx_is_active_perms ON employee_permissions(is_active);
```

**Sample Data:**
```sql
-- EMP001: Can view and edit insurance
INSERT INTO employee_permissions (id, employee_id, permission_name, granted_by)
VALUES 
  ('ep-001', 'EMP001', 'viewInsurance', 'admin'),
  ('ep-002', 'EMP001', 'editInsurance', 'admin');

-- EMP002: Can view insurance but not edit
INSERT INTO employee_permissions (id, employee_id, permission_name, granted_by)
VALUES 
  ('ep-003', 'EMP002', 'viewInsurance', 'admin'),
  ('ep-004', 'EMP002', 'viewReports', 'admin');

-- EMP003 (Admin): All permissions (handled in code)
```

**Available Permission Names** (must match these exactly):
- `viewInsurance` - Can see insurance module
- `editInsurance` - Can edit insurance records
- `deleteInsurance` - Can delete insurance records
- `viewSLI` - Can see SLI sub-section
- `editSLI` - Can edit SLI records
- `viewGIS` - Can see GIS sub-section
- `editGIS` - Can edit GIS records
- `viewMonthlyReport` - Can see monthly reports
- `exportMonthlyReport` - Can export reports

---

## Backend API Implementation

### POST /auth/login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "UID": "EMP001",
  "password": "employee_password",
  "token": true
}
```

**Response (Success 200):**
```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "emp-001",
      "name": "John Manager"
    },
    "employeeId": "EMP001",
    "role": "employee",
    "designation": "Manager",
    "branchId": "BRANCH_001",
    "modules": [
      "insuranceModule"
    ],
    "permissions": [
      "viewInsurance",
      "editInsurance"
    ],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZUlkIjoiRU1QMDAxIiwicm9sZSI6ImVtcGxveWVlIiwiaWF0IjoxNzE0MzIxNjAwfQ.signature..."
  }
}
```

**Response (Error 401):**
```json
{
  "status": false,
  "message": "Invalid credentials"
}
```

**Implementation Steps:**

```typescript
// Pseudocode - implement in your backend

app.post('/auth/login', async (req, res) => {
  const { UID, password, token } = req.body;

  try {
    // Step 1: Find employee by UID
    const employee = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND status = ?',
      [UID, 'active']
    );

    if (!employee) {
      return res.status(401).json({
        status: false,
        message: 'Employee not found'
      });
    }

    // Step 2: Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: false,
        message: 'Invalid credentials'
      });
    }

    // Step 3: Fetch modules for this employee
    const modules = await db.query(
      'SELECT module_name FROM employee_modules WHERE employee_id = ? AND is_active = true',
      [UID]
    );
    const moduleList = modules.map(m => m.module_name);

    // Step 4: Fetch permissions for this employee
    const permissions = await db.query(
      'SELECT permission_name FROM employee_permissions WHERE employee_id = ? AND is_active = true',
      [UID]
    );
    const permissionList = permissions.map(p => p.permission_name);

    // Step 5: Generate JWT token
    const jwtToken = jwt.sign(
      {
        employeeId: employee.employee_id,
        role: employee.role,
        userId: employee.id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Step 6: Return response
    res.json({
      status: true,
      message: 'Login successful',
      data: {
        user: {
          id: employee.id,
          name: employee.name
        },
        employeeId: employee.employee_id,
        role: employee.role,
        designation: employee.designation,
        branchId: employee.branch_id,
        modules: moduleList,
        permissions: permissionList,
        token: jwtToken
      }
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Server error'
    });
  }
});
```

---

## Admin Panel API (Future)

For frontend admin users to manage permissions:

### GET /admin/employees
Get list of all employees with their modules and permissions.

### POST /admin/employees/:employeeId/modules
Assign a module to an employee.

```json
{
  "module_name": "insuranceModule"
}
```

### DELETE /admin/employees/:employeeId/modules/:moduleName
Remove a module from an employee.

### POST /admin/employees/:employeeId/permissions
Assign a permission to an employee.

```json
{
  "permission_name": "editInsurance"
}
```

### DELETE /admin/employees/:employeeId/permissions/:permissionName
Remove a permission from an employee.

---

## Implementation Checklist

Use this checklist to track your backend implementation:

### Database Setup
- [ ] Create `employees` table with all columns
- [ ] Create `employee_modules` junction table
- [ ] Create `employee_permissions` junction table
- [ ] Add indexes for performance
- [ ] Insert sample employees (admin, regular, multiple modules)

### Authentication Endpoint
- [ ] Implement POST `/auth/login` endpoint
- [ ] Add password hashing with bcrypt
- [ ] Add JWT token generation
- [ ] Query `employees` table for credentials validation
- [ ] Query `employee_modules` table to get modules list
- [ ] Query `employee_permissions` table to get permissions list
- [ ] Return response in exact format shown above
- [ ] Add error handling for invalid credentials
- [ ] Test with curl or Postman

### Security
- [ ] Add HTTPS/TLS encryption
- [ ] Implement rate limiting on `/auth/login`
- [ ] Add password strength requirements
- [ ] Hash passwords with bcrypt (min 10 rounds)
- [ ] Set JWT expiration (24 hours recommended)
- [ ] Validate JWT on all protected endpoints
- [ ] Log failed login attempts

### Testing
- [ ] Test login with valid admin credentials
- [ ] Test login with valid employee credentials
- [ ] Test login with invalid password
- [ ] Test login with non-existent employee
- [ ] Test employee with single module
- [ ] Test employee with multiple modules
- [ ] Test employee with no modules
- [ ] Test frontend shows correct modules based on login response
- [ ] Test route guards prevent unauthorized access
- [ ] Test sidebar filters modules correctly

### Documentation
- [ ] Document all API endpoints
- [ ] Document module names (insuranceModule, etc.)
- [ ] Document permission names (viewInsurance, etc.)
- [ ] Document database schema
- [ ] Document sample employee setup

---

## Module & Permission Names Reference

These are the names used throughout the system. **They must match exactly.**

### Available Modules
```
insuranceModule    - Insurance/GIS/SLI
payrollModule      - Payroll (if added)
reportsModule      - Reports (if added)
adminModule        - Admin (if added)
```

### Available Permissions
```
viewInsurance              - Can view insurance
editInsurance              - Can edit insurance
deleteInsurance            - Can delete insurance
viewSLI                    - Can view SLI
editSLI                    - Can edit SLI
viewGIS                    - Can view GIS
editGIS                    - Can edit GIS
viewMonthlyReport          - Can view reports
exportMonthlyReport        - Can export reports
```

---

## Adding New Modules

To add a new module to the system:

### 1. Frontend Changes (Already template-ready)
- Add to `ALL_MODULES` array in `src/modules/index.ts`
- Add module route to `src/app/routes.ts`
- Add route mapping to `src/router/index.ts`
- Add permissions to `src/utils/permissions.constants.ts`

### 2. Backend Changes
- Add module name to `employee_modules` table entries
- Create permission names in `employee_permissions` table
- Update `/auth/login` endpoint if needed
- Create new API endpoints for the module
- Add middleware to check permissions on each endpoint

### 3. Database Changes
- Insert sample module assignments for test employees
- Insert sample permission assignments

### 4. Testing
- Test new module appears in sidebar for assigned employees
- Test route guards work for new module routes
- Test permissions control actions within new module

---

## Troubleshooting

### Frontend shows "Unauthorized" page
- **Cause:** User's modules list doesn't include required module
- **Fix:** Check `employee_modules` table - add module for employee
- **Debug:** Check browser console logs and backend response

### User can't see any modules
- **Cause:** No modules assigned to employee
- **Fix:** Insert rows in `employee_modules` table for this employee
- **Debug:** Run: `SELECT * FROM employee_modules WHERE employee_id = 'EMP001'`

### Route guards not working
- **Cause:** Module names don't match between backend and frontend
- **Fix:** Use exact names from `permissions.constants.ts`
- **Debug:** Compare module names in login response vs `MODULE_REQUIREMENTS`

### Sidebar modules not updating after login
- **Cause:** Frontend caching issue or wrong data structure
- **Fix:** Check localStorage, clear browser cache, restart development server
- **Debug:** Check `useAuthStore().modules` in browser console

---

## Example Employee Setup

### Admin User
```sql
INSERT INTO employees (id, employee_id, name, designation, branch_id, role, status)
VALUES ('emp-admin', 'ADMIN', 'Admin User', 'Administrator', 'BRANCH_001', 'admin', 'active');

-- Admin gets all modules (handled in code with role check)
```

### Regular Employee - Insurance Only
```sql
INSERT INTO employees (id, employee_id, name, designation, branch_id, role, status)
VALUES ('emp-001', 'EMP001', 'John Manager', 'Manager', 'BRANCH_001', 'employee', 'active');

INSERT INTO employee_modules (id, employee_id, module_name)
VALUES ('em-001', 'EMP001', 'insuranceModule');

INSERT INTO employee_permissions (id, employee_id, permission_name)
VALUES 
  ('ep-001', 'EMP001', 'viewInsurance'),
  ('ep-002', 'EMP001', 'editInsurance');
```

### Regular Employee - Multiple Modules
```sql
INSERT INTO employees (id, employee_id, name, designation, branch_id, role, status)
VALUES ('emp-002', 'EMP002', 'Jane Coordinator', 'Coordinator', 'BRANCH_001', 'employee', 'active');

INSERT INTO employee_modules (id, employee_id, module_name)
VALUES 
  ('em-002', 'EMP002', 'insuranceModule'),
  ('em-003', 'EMP002', 'reportsModule');

INSERT INTO employee_permissions (id, employee_id, permission_name)
VALUES 
  ('ep-003', 'EMP002', 'viewInsurance'),
  ('ep-004', 'EMP002', 'viewReports'),
  ('ep-005', 'EMP002', 'exportMonthlyReport');
```

---

## Frontend Files for Reference

The backend team should be aware of these frontend files for understanding how data flows:

- **API Layer:** `src/services/api/auth.api.ts` - Sends login request
- **State Management:** `src/store/auth.store.ts` - Stores modules & permissions
- **Permissions Composable:** `src/composables/usePermissions.ts` - Checks if user can do actions
- **Route Guards:** `src/router/index.ts` - Redirects unauthorized users
- **Module Configuration:** `src/modules/index.ts` - Lists all available modules
- **Constants:** `src/utils/permissions.constants.ts` - Module & permission names

---

## Questions?

Contact the frontend team if:
- Module/permission names are unclear
- Login response format needs clarification
- Database design needs adjustment
- Performance tuning is needed

Frontend team will **NOT** modify backend code - all backend work is for the backend team.
