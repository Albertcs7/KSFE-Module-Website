import { useAuthStore } from '@/store/auth.store'
import { computed } from 'vue'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERMISSION COMPOSABLE - usePermissions()
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This composable provides methods to check user permissions and module access.
 * Use it in Vue components to conditionally show/hide UI elements based on
 * what the user is allowed to do.
 * 
 * USAGE EXAMPLES:
 * ───────────────
 * 
 * 1. Check if user can access a module:
 *    const { canAccessModule } = usePermissions()
 *    if (canAccessModule('insuranceModule')) {
 *      // Show insurance section
 *    }
 * 
 * 2. Check if user has specific permission:
 *    const { hasPermission } = usePermissions()
 *    if (hasPermission('editInsurance')) {
 *      // Show edit button
 *    }
 * 
 * 3. Check if user is admin:
 *    const { isAdmin } = usePermissions()
 *    if (isAdmin.value) {
 *      // Show admin features
 *    }
 * 
 * 4. In template with v-if:
 *    <button v-if="hasPermission('deleteInsurance')">Delete</button>
 *    <p v-else>You don't have permission to delete</p>
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const usePermissions = () => {
  const authStore = useAuthStore()

  /**
   * Check if current user is an admin
   * 
   * Admin users have:
   * - Access to ALL modules
   * - ALL permissions
   * - Cannot be restricted
   * 
   * BACKEND TEAM: Only grant 'admin' role to trusted administrators.
   * Login response must have role: "admin" for admin users.
   */
  const isAdmin = computed(() => {
    return authStore.roleName?.toLowerCase() === 'admin'
  })

  /**
   * Check if user has a specific permission
   * 
   * @param permissionName - Name of the permission to check (e.g., 'viewInsurance', 'editInsurance')
   * @returns true if user has permission, false otherwise
   * 
   * NOTE: This checks GRANULAR permissions (specific actions).
   * Use canAccessModule() to check if user can access entire modules.
   * 
   * BACKEND TEAM: Permission names must match exactly what you return in login response.
   * See permissions.constants.ts for available permission names.
   */
  const hasPermission = (permissionName: string): boolean => {
    // Admin has all permissions
    if (isAdmin.value) return true
    
    const permissions = authStore.permissions || []
    return permissions.some(p => 
      p.name?.toLowerCase() === permissionName.toLowerCase()
    )
  }

  /**
   * Check if user has ALL of the specified permissions (AND logic)
   * 
   * @param permissionNames - Array of permission names
   * @returns true only if user has ALL permissions, false if missing any
   * 
   * USAGE:
   *   if (hasAllPermissions(['editInsurance', 'deleteInsurance'])) {
   *     // Show advanced edit/delete features
   *   }
   * 
   * BACKEND TEAM: Make sure user has all these permissions in the database.
   */
  const hasAllPermissions = (permissionNames: string[]): boolean => {
    if (isAdmin.value) return true
    
    return permissionNames.every(name => hasPermission(name))
  }

  /**
   * Check if user has AT LEAST ONE of the specified permissions (OR logic)
   * 
   * @param permissionNames - Array of permission names
   * @returns true if user has at least one of the permissions
   * 
   * USAGE:
   *   if (hasAnyPermission(['editInsurance', 'editSLI'])) {
   *     // Show edit menu (can edit either Insurance or SLI)
   *   }
   * 
   * BACKEND TEAM: User needs at least one of these permissions.
   */
  const hasAnyPermission = (permissionNames: string[]): boolean => {
    if (isAdmin.value) return true
    
    return permissionNames.some(name => hasPermission(name))
  }

  /**
   * Get current user's role name
   * 
   * @returns role name (e.g., 'admin', 'employee')
   * 
   * BACKEND TEAM: Role names come from login response: role: "admin" or role: "employee"
   */
  const getUserRole = (): string => {
    return authStore.roleName || ''
  }

  /**
   * Check if user can access a specific MODULE
   * 
   * @param moduleName - Name of the module to check (e.g., 'insuranceModule', 'payrollModule')
   * @returns true if user has access to this module, false otherwise
   * 
   * NOTE: This checks MODULE-level access (entire features).
   * For granular permission checking, use hasPermission() instead.
   * 
   * USAGE:
   *   if (canAccessModule('insuranceModule')) {
   *     // User can see/access insurance section
   *   }
   * 
   * BACKEND TEAM:
   * - Module names must match exactly what you return in login response.
   * - Modules array comes from employee_modules table
   * - See permissions.constants.ts for available module names
   * - Example: modules: ["insuranceModule", "reportsModule"]
   */
  const canAccessModule = (moduleName: string): boolean => {
    // Admin can access all modules
    if (isAdmin.value) return true
    
    const modules = authStore.modules || []
    return modules.includes(moduleName)
  }

  /**
   * Check if user can access MULTIPLE modules (AND logic)
   * 
   * @param moduleNames - Array of module names
   * @returns true only if user has access to ALL modules
   * 
   * USAGE:
   *   if (canAccessAllModules(['insuranceModule', 'reportsModule'])) {
   *     // Show combined Insurance+Reports feature
   *   }
   */
  const canAccessAllModules = (moduleNames: string[]): boolean => {
    if (isAdmin.value) return true
    
    return moduleNames.every(name => canAccessModule(name))
  }

  /**
   * Check if user can access AT LEAST ONE module (OR logic)
   * 
   * @param moduleNames - Array of module names
   * @returns true if user has access to at least one module
   * 
   * USAGE:
   *   if (canAccessAnyModule(['insuranceModule', 'payrollModule'])) {
   *     // User has access to either insurance or payroll
   *   }
   */
  const canAccessAnyModule = (moduleNames: string[]): boolean => {
    if (isAdmin.value) return true
    
    return moduleNames.some(name => canAccessModule(name))
  }

  /**
   * Get all modules the user has access to
   * 
   * @returns Array of module names
   * 
   * BACKEND TEAM: Modules list comes from employee_modules table
   */
  const getAccessibleModules = (): string[] => {
    if (isAdmin.value) {
      // For admin, return all available modules
      return ['insuranceModule', 'payrollModule', 'reportsModule', 'adminModule']
    }
    return authStore.modules || []
  }

  /**
   * Get all permissions the user has
   * 
   * @returns Array of permission objects
   * 
   * BACKEND TEAM: Permissions list comes from employee_permissions table
   */
  const getMyPermissions = () => {
    return authStore.permissions || []
  }

  return {
    // Public API
    isAdmin,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccessModule,
    canAccessAllModules,
    canAccessAnyModule,
    getUserRole,
    getAccessibleModules,
    getMyPermissions,
  }
}
