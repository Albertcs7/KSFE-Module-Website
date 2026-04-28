# Backend Team - Permission System Quick Start Checklist

## 🎯 Your Mission

Implement the backend logic so that:
1. Employees can login with their employee code (UID)
2. Frontend receives their assigned modules and permissions
3. Frontend controls what they can see and do based on this data

**Timeline:** [To be filled by your team lead]

---

## ✅ Quick Start Checklist

### Phase 1: Database Setup (Start Here)

```
☐ 1. Create employees table
   - Fields: id, employee_id, name, password_hash, designation, branch_id, role, status
   - Primary key: id
   - Unique: employee_id (this is the UID for login)
   - Sample query: BACKEND_PERMISSION_IMPLEMENTATION.md → "Database Design" section

☐ 2. Create employee_modules table
   - Fields: id, employee_id, module_name, assigned_at, assigned_by, is_active
   - Foreign key: employee_id → employees.employee_id
   - Unique constraint: (employee_id, module_name)
   - Sample query: BACKEND_PERMISSION_IMPLEMENTATION.md → "Database Design" section

☐ 3. Create employee_permissions table
   - Fields: id, employee_id, permission_name, granted_at, granted_by, is_active
   - Foreign key: employee_id → employees.employee_id
   - Unique constraint: (employee_id, permission_name)
   - Sample query: BACKEND_PERMISSION_IMPLEMENTATION.md → "Database Design" section

☐ 4. Add indexes for performance
   - idx_employee_id (on employees)
   - idx_employee_id_modules (on employee_modules)
   - idx_employee_id_permissions (on employee_permissions)

☐ 5. Create test data
   - 1 admin user
   - 2-3 regular employees with different module assignments
   - See: PERMISSION_SYSTEM_REFERENCE.md → "Sample Data Setup"
```

### Phase 2: Backend API Implementation (Middle)

```
☐ 6. Implement /auth/login endpoint
   - Accepts: { UID, password, token }
   - Step 1: Find employee by UID in employees table
   - Step 2: Verify password hash (bcrypt.compare)
   - Step 3: Query employee_modules table → get modules array
   - Step 4: Query employee_permissions table → get permissions array
   - Step 5: Generate JWT token
   - Step 6: Return response in exact format
   - Reference: PERMISSION_SYSTEM_REFERENCE.md → "Exact Backend Response Format"

☐ 7. Add password hashing
   - Use bcrypt (npm install bcrypt)
   - Hash rounds: minimum 10
   - When storing new employee: bcrypt.hash(password, 10)
   - When verifying: bcrypt.compare(password, storedHash)

☐ 8. Add JWT token generation
   - Library: jsonwebtoken (npm install jsonwebtoken)
   - Payload: { employeeId, role, userId }
   - Secret: store in .env (JWT_SECRET)
   - Expiration: 24 hours recommended
   - Example: jwt.sign(payload, secret, { expiresIn: '24h' })

☐ 9. Add error handling
   - 401: Invalid credentials
   - 401: Employee not found
   - 401: Account locked/inactive
   - 500: Server errors
```

### Phase 3: Testing (Almost Done)

```
☐ 10. Test admin login
    curl -X POST http://localhost:5000/auth/login \
      -H "Content-Type: application/json" \
      -d '{"UID":"ADMIN","password":"admin_password","token":true}'
    ✓ Should return: role "admin", full access

☐ 11. Test employee login (single module)
    ✓ Should return: modules ["insuranceModule"]
    ✓ Should return: permissions ["viewInsurance", "editInsurance"]

☐ 12. Test employee login (multiple modules)
    ✓ Should return: modules ["insuranceModule", "reportsModule"]

☐ 13. Test invalid credentials
    ✓ Should return: status false, error message

☐ 14. Test frontend integration
    ✓ Frontend logs in successfully
    ✓ Frontend stores token & user data
    ✓ Sidebar shows correct modules
    ✓ Route guards allow access to assigned modules
    ✓ Buttons show/hide based on permissions
```

### Phase 4: Security & Validation (Final)

```
☐ 15. Add request validation
    - Validate UID format
    - Validate password not empty
    - Validate token flag is boolean

☐ 16. Add response validation
    - Ensure modules is always an array
    - Ensure permissions is always an array
    - Ensure response has required fields

☐ 17. Add security headers
    - CORS configuration (allow frontend domain)
    - Content-Type application/json
    - Rate limiting on /auth/login

☐ 18. Add logging
    - Log successful logins with employee ID
    - Log failed login attempts
    - Do NOT log passwords

☐ 19. Add database backups
    - Regular backup schedule
    - Document recovery procedure
```

---

## 📋 Files to Read (In Order)

1. **PERMISSION_SYSTEM_REFERENCE.md** ← START HERE
   - Overview of data flow
   - Exact response format
   - Sample SQL queries
   - Common mistakes to avoid

2. **BACKEND_PERMISSION_IMPLEMENTATION.md**
   - Detailed database design
   - Full pseudocode example
   - Implementation checklist
   - Troubleshooting guide

3. **FRONTEND_PERMISSION_USAGE.md**
   - How frontend uses the data
   - Examples of permission checks
   - Helps understand what backend data enables

---

## 🔑 Key Points to Remember

### Module Names (Must be Exact)
```javascript
// These are the ONLY module names the frontend expects
'insuranceModule'     // Insurance/GIS/SLI
'payrollModule'       // (future)
'reportsModule'       // (future)
'adminModule'         // (future)
```

### Permission Names (Must be Exact)
```javascript
// These are the ONLY permission names the frontend expects
'viewInsurance'
'editInsurance'
'deleteInsurance'
'viewSLI'
'editSLI'
'viewGIS'
'editGIS'
'viewMonthlyReport'
'exportMonthlyReport'
```

### Response Format (Must be Exact)
```javascript
{
  "status": true,
  "data": {
    "user": { "id": "...", "name": "..." },
    "employeeId": "EMP001",
    "role": "employee",
    "designation": "...",
    "branchId": "...",
    "modules": ["insuranceModule"],           // ← CRITICAL
    "permissions": ["viewInsurance", "editInsurance"], // ← CRITICAL
    "token": "JWT_TOKEN"
  }
}
```

### Admin vs Employee
```javascript
// Admin user
{
  "role": "admin",
  "modules": ["insuranceModule", "payrollModule", ...], // or leave empty - code checks role
  "permissions": [...all permissions...] // or leave empty - code checks role
}

// Regular employee
{
  "role": "employee",
  "modules": ["insuranceModule"],        // Only assigned modules
  "permissions": ["viewInsurance", "editInsurance"] // Only assigned permissions
}
```

---

## 🚀 Getting Started Now

### Step 1: Understand the Flow (5 minutes)
Read: PERMISSION_SYSTEM_REFERENCE.md → "Complete Data Flow Diagram"

### Step 2: Design Database (10 minutes)
Read: BACKEND_PERMISSION_IMPLEMENTATION.md → "Database Design"
Copy the CREATE TABLE statements

### Step 3: Create Database Tables (10 minutes)
Execute the SQL scripts in your database

### Step 4: Insert Sample Data (5 minutes)
Execute the INSERT statements for test employees

### Step 5: Code the API (30-60 minutes)
Implement POST /auth/login following the pseudocode

### Step 6: Test (15 minutes)
Run the curl commands to verify everything works

### Step 7: Integrate with Frontend (ongoing)
Frontend team will test and provide feedback

---

## 💾 Database Quick Reference

### Create Employees Table
```sql
CREATE TABLE employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  designation VARCHAR(100),
  branch_id VARCHAR(50),
  role VARCHAR(50) DEFAULT 'employee',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Create Employee_Modules Table
```sql
CREATE TABLE employee_modules (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, module_name)
);
```

### Create Employee_Permissions Table
```sql
CREATE TABLE employee_permissions (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, permission_name)
);
```

### Insert Admin User
```sql
INSERT INTO employees (id, employee_id, name, password_hash, designation, branch_id, role, status)
VALUES ('emp-admin', 'ADMIN', 'Admin User', '[bcrypt_hash_here]', 'Administrator', 'BRANCH_001', 'admin', 'active');
```

### Insert Test Employee
```sql
INSERT INTO employees (id, employee_id, name, password_hash, designation, branch_id, role, status)
VALUES ('emp-001', 'EMP001', 'John Manager', '[bcrypt_hash_here]', 'Manager', 'BRANCH_001', 'employee', 'active');

INSERT INTO employee_modules (id, employee_id, module_name, assigned_by)
VALUES ('em-001', 'EMP001', 'insuranceModule', 'ADMIN');

INSERT INTO employee_permissions (id, employee_id, permission_name, granted_by)
VALUES 
  ('ep-001', 'EMP001', 'viewInsurance', 'ADMIN'),
  ('ep-002', 'EMP001', 'editInsurance', 'ADMIN');
```

---

## 🔍 Testing the Login Endpoint

### Test 1: Valid Admin
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"ADMIN","password":"admin123","token":true}'

# Expected response:
# {
#   "status": true,
#   "data": {
#     "user": { ... },
#     "role": "admin",
#     "modules": [...],
#     "permissions": [...],
#     "token": "eyJ..."
#   }
# }
```

### Test 2: Valid Employee
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"EMP001","password":"emp123","token":true}'

# Expected response:
# {
#   "status": true,
#   "data": {
#     "role": "employee",
#     "modules": ["insuranceModule"],
#     "permissions": ["viewInsurance", "editInsurance"],
#     ...
#   }
# }
```

### Test 3: Invalid Credentials
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"UID":"INVALID","password":"wrong","token":true}'

# Expected response:
# {
#   "status": false,
#   "message": "Invalid credentials"
# }
```

---

## 📞 Common Questions

### Q: Where do module names come from?
**A:** From the frontend. They are defined in `src/utils/permissions.constants.ts`. You must use exactly those names.

### Q: Can I use different permission names?
**A:** No. The frontend expects specific permission names. If you use different names, the permission checks won't work.

### Q: What if an employee has no modules?
**A:** Return empty array: `"modules": []`. Frontend will show "Unauthorized" page.

### Q: What about admins?
**A:** For admin role, frontend bypasses module/permission checks in code. So you can:
- Return all modules/permissions
- Or return empty arrays (code checks role first)
- Either way works as long as role is "admin"

### Q: How long should JWT tokens be valid?
**A:** Recommended: 24 hours. For security, shorter is better. Configure in JWT generation.

### Q: Do I need an admin API for managing permissions?
**A:** Not for Phase 1. That's optional Phase 2. For now, use SQL to assign modules/permissions.

### Q: What's the difference between modules and permissions?
**A:** 
- **Modules**: Major features (Insurance, Payroll). Employees need module access to even SEE the section.
- **Permissions**: Specific actions (view, edit, delete). Fine-grained control within a module.

### Q: Frontend can't login - what do I check?
**A:** 
1. Is /auth/login endpoint working? Test with curl.
2. Does response have correct format? Check PERMISSION_SYSTEM_REFERENCE.md
3. Are module/permission names exact match? Check case sensitivity.
4. Is token a valid JWT? Use jwt.io to decode.
5. Check backend logs for errors.

---

## 🎓 Learning Resources

- **bcrypt**: https://www.npmjs.com/package/bcrypt
- **jsonwebtoken**: https://www.npmjs.com/package/jsonwebtoken
- **JWT Debugger**: https://jwt.io
- **CORS**: https://expressjs.com/en/resources/middleware/cors.html

---

## 📅 Next Steps

1. ✅ Read this document (you're here!)
2. → Read PERMISSION_SYSTEM_REFERENCE.md
3. → Read BACKEND_PERMISSION_IMPLEMENTATION.md
4. → Create database tables
5. → Implement /auth/login endpoint
6. → Test with curl
7. → Test with frontend
8. → Deploy to staging
9. → Deploy to production

---

## 👥 Team Communication

**For questions about:**
- Frontend data usage → Ask frontend team
- Database design → Your backend lead
- Module/permission naming → See permissions.constants.ts
- Testing → All team

**Frontend will test:**
- Login works
- Modules filter correctly
- Route guards work
- Permissions control buttons

**Backend will test:**
- Database queries correct
- Response format correct
- JWT generation works
- Error handling correct

---

## 📊 Success Criteria

Your implementation is complete when:

- ✅ Employees can login with UID + password
- ✅ Backend returns correct module/permission arrays
- ✅ Frontend shows different modules for different employees
- ✅ Frontend route guards work (no unauthorized access)
- ✅ Frontend buttons show/hide based on permissions
- ✅ All sample test cases pass
- ✅ No console errors in frontend or backend
- ✅ Response time is acceptable (< 1 second)

---

## 🎉 You've Got This!

This permission system is designed to be straightforward:

1. **Employee logs in** → Get their modules & permissions
2. **Frontend receives data** → Store in state & localStorage
3. **Frontend controls UI** → Show/hide based on data
4. **Users see only what they can access** → ✅ Done!

Start with the database tables, then implement the login endpoint. The rest follows naturally.

**Questions?** Check the detailed docs or ask the frontend team.

Good luck! 🚀
