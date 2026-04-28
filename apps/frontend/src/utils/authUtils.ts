import { useAuthStore } from '@/store/auth.store'

/**
 * Utility function to check if user can access a module
 * @param moduleName - The module to check access for
 * @returns true if user has access, false otherwise
 */
export const canAccessModule = (moduleName: string): boolean => {
  const authStore = useAuthStore()
  
  // Admin has access to everything
  if (authStore.roleName?.toLowerCase() === 'admin') {
    return true
  }

  // Check if module is in user's modules list
  const userModules = authStore.modules || []
  return userModules.includes(moduleName)
}

/**
 * Utility function to check user role
 * @returns The user's role name
 */
export const getUserRole = (): string => {
  const authStore = useAuthStore()
  return authStore.roleName || 'guest'
}

/**
 * Utility function to check if user is admin
 * @returns true if user is admin
 */
export const isUserAdmin = (): boolean => {
  const authStore = useAuthStore()
  return authStore.roleName?.toLowerCase() === 'admin'
}

/**
 * Utility function to check if user has a specific permission
 * @param permissionName - The permission to check
 * @returns true if user has permission, false otherwise
 */
export const hasPermission = (permissionName: string): boolean => {
  const authStore = useAuthStore()

  // Admin has all permissions
  if (authStore.roleName?.toLowerCase() === 'admin') {
    return true
  }

  const permissions = authStore.permissions || []
  return permissions.some(p => p.name?.toLowerCase() === permissionName.toLowerCase())
}
