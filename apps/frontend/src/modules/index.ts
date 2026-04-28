import { useAuthStore } from '@/store/auth.store'

export interface VisibleModule {
  label: string
  path: string
  icon: string
  requiresPermission?: string
  moduleName?: string
  children?: { label: string; path: string; requiresPermission?: string; moduleName?: string }[]
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ALL AVAILABLE MODULES IN THE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This array defines all modules available in the application.
 * The moduleName property links to what the backend returns in the login response.
 * 
 * BACKEND TEAM: 
 * - moduleName values must match exactly what you store in your database
 * - See src/utils/permissions.constants.ts for the standard module names
 * - When employee logs in, return these exact module names in the modules array
 * - Example: if you want employee to access Insurance, include "insuranceModule" in their modules array
 * 
 * FLOW:
 * 1. Employee logs in with UID
 * 2. Backend fetches their assigned modules from employee_modules table
 * 3. Backend returns modules: ["insuranceModule"] in login response
 * 4. Frontend stores modules in auth store
 * 5. getVisibleModules() filters ALL_MODULES based on user's modules
 * 6. Sidebar only shows modules user can access
 * ═══════════════════════════════════════════════════════════════════════════
 */
const ALL_MODULES: VisibleModule[] = [
  {
    label: "Insurance",
    path: '/insurance',
    icon: 'heart-handshake',
    // BACKEND DATA: This moduleName is what the backend returns for insurance access
    // Database: employees_modules table should have entry with module_name = 'insuranceModule'
    moduleName: 'insuranceModule',
    // BACKEND DATA: This permission is for granular access control
    // If set, user needs this permission to view the module in sidebar
    // Database: employee_permissions table should have entry with permission_name = 'viewInsurance'
    requiresPermission: 'viewInsurance',
    children: [
      { 
        label: 'SLI', 
        path: '/insurance/sli', 
        moduleName: 'insuranceModule', 
        requiresPermission: 'viewSLI' 
      },
      { 
        label: 'GIS', 
        path: '/insurance/gis', 
        moduleName: 'insuranceModule', 
        requiresPermission: 'viewGIS' 
      },
      { 
        label: 'Monthly Report', 
        path: '/insurance/monthly-report', 
        moduleName: 'insuranceModule', 
        requiresPermission: 'viewMonthlyReport' 
      },
    ]
  }
  
  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │ BACKEND TEAM: Add new modules here as features are added                │
  // │                                                                         │
  // │ Example:                                                                │
  // │ {                                                                       │
  // │   label: "Payroll",                                                    │
  // │   path: '/payroll',                                                    │
  // │   icon: 'dollar-sign',                                                │
  // │   moduleName: 'payrollModule',  // Use exact names from your database │
  // │   requiresPermission: 'viewPayroll',                                  │
  // │   children: [                                                          │
  // │     { label: 'Salary', path: '/payroll/salary', moduleName: 'payrollModule', requiresPermission: 'viewSalary' },                                    │
  // │     { label: 'Attendance', path: '/payroll/attendance', moduleName: 'payrollModule', requiresPermission: 'viewAttendance' },                        │
  // │   ]                                                                     │
  // │ },                                                                      │
  // │                                                                         │
  // │ {                                                                       │
  // │   label: "Reports",                                                    │
  // │   path: '/reports',                                                    │
  // │   icon: 'bar-chart',                                                  │
  // │   moduleName: 'reportsModule',  // Use exact names from your database │
  // │   requiresPermission: 'viewReports',                                  │
  // │   children: [                                                          │
  // │     { label: 'Monthly', path: '/reports/monthly', moduleName: 'reportsModule', requiresPermission: 'viewMonthlyReports' },                        │
  // │     { label: 'Annual', path: '/reports/annual', moduleName: 'reportsModule', requiresPermission: 'viewAnnualReports' },                           │
  // │   ]                                                                     │
  // │ }                                                                       │
  // └─────────────────────────────────────────────────────────────────────────┘
]

/**
 * Get modules visible to the current user based on their role and permissions
 * 
 * LOGIC:
 * - If user is not logged in → return empty array (no modules)
 * - If user is admin → return all modules (full access)
 * - If user is regular employee → filter modules based on their modules list from backend
 * 
 * HOW IT WORKS:
 * 1. Get user's modules array from auth store (comes from backend)
 * 2. Filter ALL_MODULES - keep only modules the user can access
 * 3. Also filter child modules - some users might have access to parent but not all children
 * 4. Return filtered list for sidebar rendering
 * 
 * EXAMPLE:
 * - Employee A has modules: ["insuranceModule"]
 *   → Sees: Insurance > SLI, GIS, Monthly Report
 * 
 * - Employee B has modules: ["insuranceModule", "reportsModule"]
 *   → Sees: Insurance (with SLI, GIS) + Reports (with Monthly, Annual)
 * 
 * - Admin user
 *   → Sees: ALL modules (Insurance + Payroll + Reports + Admin)
 * 
 * BACKEND TEAM: Make sure when employee logs in, their modules array includes:
 * - 'insuranceModule' if they should see Insurance section
 * - 'payrollModule' if they should see Payroll section
 * - 'reportsModule' if they should see Reports section
 * - etc.
 * 
 * Modules are fetched from employee_modules table:
 * SELECT module_name FROM employee_modules WHERE employee_id = ?
 */
export const getVisibleModules = (): VisibleModule[] => {
  const authStore = useAuthStore()
  
  // If not logged in, return empty
  if (!authStore.isLoggedIn) {
    return []
  }

  const isAdmin = authStore.roleName?.toLowerCase() === 'admin'
  const userModules = authStore.modules || []

  // Admin users have access to all modules
  if (isAdmin) {
    // TODO: Could clone to avoid mutation, but modules array is static
    return ALL_MODULES
  }

  // Filter modules based on user's assigned modules list
  return ALL_MODULES.filter(module => {
    // Check if user has this module
    if (module.moduleName && !userModules.includes(module.moduleName)) {
      return false
    }

    // If module has children, filter them based on user's access
    if (module.children) {
      module.children = module.children.filter(child => {
        // Child must have same module as parent for user to see it
        if (child.moduleName && !userModules.includes(child.moduleName)) {
          return false
        }
        return true
      })
      
      // If all children are filtered out, remove the parent too
      if (module.children.length === 0 && module.requiresPermission) {
        return false
      }
    }

    return true
  })
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND TEAM - IMPLEMENTATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * To add a new module to the system:
 * 
 * 1. UPDATE THIS FILE:
 *    - Add entry to ALL_MODULES array above
 *    - Use moduleName: 'yourNewModule' (must be unique)
 *    - Add children if needed
 * 
 * 2. UPDATE DATABASE:
 *    - Add entries to employee_modules table
 *    - Example: INSERT INTO employee_modules (employee_id, module_name) VALUES ('EMP001', 'payrollModule')
 * 
 * 3. UPDATE ROUTES:
 *    - Add routes in src/app/routes.ts
 *    - Add route mapping in src/router/index.ts MODULE_REQUIREMENTS
 * 
 * 4. UPDATE PERMISSIONS:
 *    - Add permissions to src/utils/permissions.constants.ts
 *    - Add permission entries to employee_permissions table
 * 
 * 5. CREATE COMPONENTS:
 *    - Create module pages and components
 * 
 * 6. TEST:
 *    - Create test employees with different modules
 *    - Verify sidebar shows correct modules
 *    - Verify route guards prevent unauthorized access
 * ═══════════════════════════════════════════════════════════════════════════
 */

