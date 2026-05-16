import { createRouter, createWebHistory } from 'vue-router'
import { appRoutes } from '../app/routes'
import { useAuthStore } from '@/store/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
})

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERMISSION-BASED ROUTE GUARD SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Global route guard for authentication and authorization:
 * 1. Redirects to login if not authenticated
 * 2. Checks if user has access to the requested module
 * 3. Redirects to /unauthorized if user lacks permission
 * 4. Allows admins to access all routes
 *
 * BACKEND TEAM: The modules list is populated from your login response.
 * Make sure your /auth/login endpoint returns:
 * {
 *   user: { id, name },
 *   role: "roleName",
 *   modules: ["insuranceModule", "otherModule"], // List of modules user can access
 *   permissions: ["viewInsurance", "editInsurance"], // Granular permissions
 *   employeeId: "EMP001",
 *   token: "jwt-token",
 *   branchId: "branch-001",
 *   designation: "title"
 * }
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Module requirements mapping
 * BACKEND TEAM: Update this mapping if you add new routes or modules.
 * Each route path should map to a module name that must exist in user's modules array.
 * 
 * Module names are returned by your backend in the login response.
 * Example: if backend returns modules: ["insuranceModule"], then user can access
 * all routes that require "insuranceModule"
 */
const MODULE_REQUIREMENTS: Record<string, string> = {
  '/insurance': 'insuranceModule',
  '/insurance/policies': 'insuranceModule',
  '/insurance/monthly-report': 'insuranceModule',
  // BACKEND TEAM: Add new module routes here as you add features
  // Example: '/payroll': 'payrollModule',
  // Example: '/reports': 'reportsModule',
}

const PERMISSION_REQUIREMENTS: Array<{ pattern: RegExp; permission: string }> = [
  { pattern: /^\/insurance\/policies\/\d+\/report$/, permission: 'viewInsurance' },
  { pattern: /^\/insurance\/policies\/\d+\/report\/download$/, permission: 'exportPolicyReport' },
]

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/unauthorized']

/**
 * Global route guard - Check authentication & authorization
 */
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const authStore = useAuthStore()

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Authentication Check
  // ─────────────────────────────────────────────────────────────────────────
  
  if (!PUBLIC_ROUTES.includes(to.path) && !token) {
    // User not logged in, redirect to login
    console.info(`[AUTH] Redirecting to login - no token found for route: ${to.path}`)
    next('/login')
    return
  }

  // If already logged in and trying to access login page, redirect to home
  if (to.path === '/login' && token) {
    console.info('[AUTH] User already logged in, redirecting to home')
    next('/')
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Authorization Check - Module Access
  // ─────────────────────────────────────────────────────────────────────────

  const isAdmin = authStore.roleName?.toLowerCase() === 'admin'
  const userModules = authStore.modules || []
  const userPermissions = authStore.permissions?.map(permission => permission.name) || []

  const explicitPermissionRequirement = PERMISSION_REQUIREMENTS.find(rule => rule.pattern.test(to.path))

  if (explicitPermissionRequirement) {
    if (isAdmin) {
      next()
      return
    }

    if (!userPermissions.includes(explicitPermissionRequirement.permission)) {
      console.warn(`[PERMISSION] Access DENIED - User lacks permission '${explicitPermissionRequirement.permission}' for route: ${to.path}`)
      next('/unauthorized')
      return
    }

    next()
    return
  }
  
  // Get the required module for this route
  const requiredModule = MODULE_REQUIREMENTS[to.path] || 
                         Object.keys(MODULE_REQUIREMENTS).find(route => to.path.startsWith(route))

  if (requiredModule) {
    // Admin has full access - bypass module check
    if (isAdmin) {
      console.info(`[PERMISSION] Admin accessing: ${to.path}`)
      next()
      return
    }

    // Check if user has the required module
    if (!userModules.includes(requiredModule)) {
      // User doesn't have access to this module
      console.warn(`[PERMISSION] Access DENIED - User lacks module '${requiredModule}' for route: ${to.path}`)
      console.warn(`[PERMISSION] User has modules: ${userModules.join(', ') || 'none'}`)
      console.warn(`[PERMISSION] Redirecting to /unauthorized`)
      next('/unauthorized')
      return
    }

    console.info(`[PERMISSION] User has access to ${requiredModule} - allowing route: ${to.path}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // All checks passed - proceed with navigation
  // ─────────────────────────────────────────────────────────────────────────
  next()
})

export default router

