/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERMISSION & MODULE CONFIGURATION FILE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * BACKEND TEAM: Please read this carefully!
 * 
 * This file defines the available modules and permissions in the frontend.
 * Your backend login endpoint MUST return these exact module names and 
 * permission names for users.
 * 
 * WORKFLOW:
 * 1. Employee logs in with UID (employee code) and password
 * 2. Your backend validates credentials
 * 3. Your backend fetches employee's assigned modules from your database
 * 4. Your backend returns these modules in the login response
 * 5. Frontend stores these modules and uses them to control access
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * AVAILABLE MODULES IN THE SYSTEM
 * 
 * Each module represents a major feature/section of the application.
 * Employees can only see and access modules that are assigned to them.
 * 
 * HOW TO USE:
 * - In your backend database, create a mapping of employees to modules
 * - When employee logs in, fetch their assigned modules from DB
 * - Return module names in the login response (see FORMAT section below)
 * 
 * EXAMPLE BACKEND DATABASE TABLE:
 * ┌─────────────────────────────────────────────┐
 * │ employee_modules                            │
 * ├──────────────┬──────────────────────────────┤
 * │ employee_id  │ module_name                  │
 * ├──────────────┼──────────────────────────────┤
 * │ EMP001       │ insuranceModule              │
 * │ EMP002       │ insuranceModule              │
 * │ EMP002       │ reportsModule                │
 * │ EMP003       │ insuranceModule              │
 * │ EMP003       │ payrollModule                │
 * └──────────────┴──────────────────────────────┘
 */
export const AVAILABLE_MODULES = {
  INSURANCE: 'insuranceModule',
  PAYROLL: 'payrollModule',
  REPORTS: 'reportsModule',
  ADMIN: 'adminModule',
  // BACKEND TEAM: Add new modules here as features are added
  // HCM: 'hcmModule',
  // FINANCE: 'financeModule',
} as const

/**
 * GRANULAR PERMISSIONS
 * 
 * These are fine-grained permissions that can be applied to specific actions.
 * While modules control which sections users see, permissions control what 
 * actions they can perform within those sections.
 * 
 * HOW TO USE:
 * - Use these permission names to control specific actions (view, edit, delete)
 * - Your backend should validate permissions on API endpoints too
 * - Frontend can use usePermissions().hasPermission('name') to check before showing UI
 * 
 * EXAMPLE BACKEND SETUP:
 * ┌──────────────────────────────────────────────┐
 * │ employee_permissions                         │
 * ├──────────────┬───────────────────────────────┤
 * │ employee_id  │ permission_name               │
 * ├──────────────┼───────────────────────────────┤
 * │ EMP001       │ viewInsurance                 │
 * │ EMP001       │ editInsurance                 │
 * │ EMP002       │ viewInsurance                 │
 * │ EMP003       │ viewInsurance                 │
 * │ EMP003       │ deleteInsurance               │
 * └──────────────┴───────────────────────────────┘
 */
export const AVAILABLE_PERMISSIONS = {
  // Insurance Module Permissions
  VIEW_INSURANCE: 'viewInsurance',
  EDIT_INSURANCE: 'editInsurance',
  DELETE_INSURANCE: 'deleteInsurance',
  DEACTIVATE_INSURANCE: 'deactivateInsurance',
  VIEW_SLI: 'viewSLI',
  EDIT_SLI: 'editSLI',
  VIEW_GIS: 'viewGIS',
  EDIT_GIS: 'editGIS',
  VIEW_MONTHLY_REPORT: 'viewMonthlyReport',
  EXPORT_MONTHLY_REPORT: 'exportMonthlyReport',
  
  // BACKEND TEAM: Add new permissions as needed
  // VIEW_PAYROLL: 'viewPayroll',
  // EDIT_PAYROLL: 'editPayroll',
  // VIEW_REPORTS: 'viewReports',
} as const

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGIN API RESPONSE FORMAT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * BACKEND TEAM: Your /auth/login endpoint must return this structure:
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "status": true,
 *   "message": "Login successful",
 *   "data": {
 *     "user": {
 *       "id": "USER_ID",
 *       "name": "Employee Name"
 *     },
 *     "employeeId": "EMP001",          // Employee code (from UID login)
 *     "role": "employee",               // Role: "admin" or "employee"
 *     "designation": "Manager",         // Job title
 *     "branchId": "BRANCH_001",        // Employee's branch
 *     
 *     // CRITICAL: Fetch from your database based on employee_id
 *     // These control what the user can access in the frontend
 *     "modules": [
 *       "insuranceModule",
 *       "reportsModule"
 *     ],
 *     
 *     // IMPORTANT: These control specific actions within modules
 *     "permissions": [
 *       "viewInsurance",
 *       "editInsurance",
 *       "viewReports"
 *     ],
 *     
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   }
 * }
 * 
 * EXPECTED ERRORS (40x):
 * {
 *   "status": false,
 *   "message": "Invalid credentials" | "Employee not found" | "Account locked"
 * }
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * EMPLOYEE DATA TABLE STRUCTURE REFERENCE
 * 
 * Your backend should have these tables to support the permission system:
 * 
 * TABLE 1: employees
 * ┌──────────────┬──────────────┬─────────────┬──────────────┐
 * │ employee_id  │ name         │ designation │ branch_id    │
 * ├──────────────┼──────────────┼─────────────┼──────────────┤
 * │ EMP001       │ John Doe     │ Manager     │ BRANCH_001   │
 * │ EMP002       │ Jane Smith   │ Coordinator │ BRANCH_001   │
 * │ EMP003       │ Bob Wilson   │ Director    │ BRANCH_002   │
 * └──────────────┴──────────────┴─────────────┴──────────────┘
 * 
 * TABLE 2: employee_modules (Assign modules to employees)
 * ┌──────────────┬──────────────────┐
 * │ employee_id  │ module_name      │
 * ├──────────────┼──────────────────┤
 * │ EMP001       │ insuranceModule  │
 * │ EMP002       │ insuranceModule  │
 * │ EMP002       │ reportsModule    │
 * │ EMP003       │ insuranceModule  │
 * │ EMP003       │ payrollModule    │
 * └──────────────┴──────────────────┘
 * 
 * TABLE 3: employee_permissions (Assign granular permissions)
 * ┌──────────────┬─────────────────┐
 * │ employee_id  │ permission_name │
 * ├──────────────┼─────────────────┤
 * │ EMP001       │ viewInsurance   │
 * │ EMP001       │ editInsurance   │
 * │ EMP002       │ viewInsurance   │
 * │ EMP003       │ viewInsurance   │
 * │ EMP003       │ deleteInsurance │
 * └──────────────┴─────────────────┘
 * 
 * SQL QUERIES FOR BACKEND:
 * 
 * 1. Get modules for an employee:
 *    SELECT module_name FROM employee_modules 
 *    WHERE employee_id = ?
 * 
 * 2. Get permissions for an employee:
 *    SELECT permission_name FROM employee_permissions 
 *    WHERE employee_id = ?
 * 
 * 3. Check if employee has specific module:
 *    SELECT COUNT(*) FROM employee_modules 
 *    WHERE employee_id = ? AND module_name = ?
 * 
 * 4. Check if employee has specific permission:
 *    SELECT COUNT(*) FROM employee_permissions 
 *    WHERE employee_id = ? AND permission_name = ?
 */

/**
 * ROLE TYPES
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const

/**
 * Helper function to validate if a module name is valid
 * 
 * BACKEND TEAM: When storing module assignments, validate against these known modules
 */
export const isValidModule = (moduleName: string): boolean => {
  return Object.values(AVAILABLE_MODULES).includes(moduleName as any)
}

/**
 * Helper function to validate if a permission is valid
 * 
 * BACKEND TEAM: When storing permission assignments, validate against these known permissions
 */
export const isValidPermission = (permissionName: string): boolean => {
  return Object.values(AVAILABLE_PERMISSIONS).includes(permissionName as any)
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION CHECKLIST FOR BACKEND TEAM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Required actions in your backend:
 * 
 * ☐ Create database tables:
 *   - employees (if not exists)
 *   - employee_modules (to map employees to modules)
 *   - employee_permissions (to map employees to permissions)
 * 
 * ☐ Update /auth/login endpoint to:
 *   - Accept UID (employee code) and password
 *   - Validate credentials
 *   - Query employee's assigned modules from employee_modules table
 *   - Query employee's assigned permissions from employee_permissions table
 *   - Return modules[] and permissions[] arrays in response
 * 
 * ☐ Use module names from AVAILABLE_MODULES constant:
 *   - 'insuranceModule'
 *   - 'payrollModule'
 *   - 'reportsModule'
 *   - etc.
 * 
 * ☐ Use permission names from AVAILABLE_PERMISSIONS constant:
 *   - 'viewInsurance'
 *   - 'editInsurance'
 *   - 'deleteInsurance'
 *   - etc.
 * 
 * ☐ Add permission checks on all API endpoints:
 *   - Verify user has the required module/permission
 *   - Return 403 Forbidden if unauthorized
 * 
 * ☐ Create admin user with all modules and permissions
 * 
 * ☐ Test with sample employees:
 *   - Employee with only Insurance module
 *   - Employee with Insurance + Reports modules
 *   - Admin user (all modules)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */
