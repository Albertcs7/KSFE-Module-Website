import { loginApi, type LoginPayload, logoutApi } from "@/services/api/auth.api";
import { clearLocalAuth } from "@/services/authHelpers";
import type {
  AuthUserData,
  BackendLoginData,
} from "@/services/types/auth.types";
import { defineStore } from "pinia";

interface AuthState {
  user: AuthUserData | null;
  token: string | null;
  loading: boolean;
}

const getStoredUser = (): AuthUserData | null => {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUserData;
  } catch {
    return null;
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NORMALIZE BACKEND LOGIN DATA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This function transforms the backend login response into the frontend's
 * internal user data structure.
 * 
 * BACKEND TEAM: Your /auth/login endpoint MUST return this structure:
 * {
 *   "status": true,
 *   "data": {
 *     "user": { "id": "...", "name": "Employee Name" },
 *     "employeeId": "EMP001",           // From UID (employee code)
 *     "role": "employee" | "admin",     // User's role
 *     "designation": "Job Title",
 *     "branchId": "BRANCH_001",
 *     "modules": ["insuranceModule"],   // Modules user can access
 *     "permissions": ["viewInsurance"], // User's permissions
 *     "token": "JWT_TOKEN"
 *   }
 * }
 * 
 * Module names should match values in src/utils/permissions.constants.ts
 * Permission names should match values in src/utils/permissions.constants.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */
const normalizeBackendUser = (data: BackendLoginData): AuthUserData => {
  const roleName = data.role;

  // Trust backend-provided access control and sanitize empty values.
  const modules = Array.isArray(data.modules)
    ? data.modules.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    : [];

  const permissions = Array.isArray(data.permissions)
    ? data.permissions.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    : [];

  return {
    role: {
      name: roleName,
      permissions: permissions.map((name, index) => ({
        name,
        isDeleted: false,
        id: `perm-${index}`,
      })),
      isDeleted: false,
      modules,
      id: "role-0",
    },
    roleName,
    employee_id: data.employeeId,
    first_name: data.user.name,
    designation: data.designation,
    mobile: "",
    branchId: data.branchId,
    regionalBranches: [],
    branch_name: "",
    userId: data.user.id,
    token: data.token,
  };
};


/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTH STORE - Central authentication state management
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This Pinia store manages:
 * - User login/logout
 * - Token storage
 * - User permissions and module access
 * - User data caching
 * 
 * BACKEND TEAM: The login() action calls your /auth/login endpoint.
 * Make sure the response includes modules and permissions as per the format above.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: getStoredUser(),
    token: localStorage.getItem("token"),
    loading: false
  }),

  getters: {
    /**
     * Check if user is currently logged in
     */
    isLoggedIn: (state) => !!state.token && !!state.user,

    /**
     * Get array of user's permissions
     * 
     * BACKEND TEAM: These come from employee_permissions table for the logged-in employee
     * Each permission controls specific actions (view, edit, delete, etc.)
     */
    permissions: (state) =>
      state.user?.role.permissions ?? [],

    /**
     * Get array of modules user can access
     * 
     * BACKEND TEAM: These come from employee_modules table for the logged-in employee
     * Each module represents a major feature section of the app
     * Module names must match constants in src/utils/permissions.constants.ts
     */
    modules: (state) =>
      state.user?.role.modules ?? [],

    /**
     * Get user's role (admin, employee, etc.)
     */
    roleName: (state) =>
      state.user?.roleName ?? ""
  },

  actions: {
    /**
     * Login action - authenticate user and fetch their permissions
     * 
     * @param payload - { UID: "employee_code", password: "...", token: true }
     * 
     * FLOW:
     * 1. User enters employee code (UID) and password on login page
     * 2. Frontend sends to /auth/login endpoint
     * 3. Backend:
     *    a. Validates credentials against employees table
     *    b. Fetches modules from employee_modules table
     *    c. Fetches permissions from employee_permissions table
     *    d. Returns JWT token
     * 4. Frontend stores user data and token in localStorage
     * 5. Router guards use this data to control access
     * 
     * BACKEND TEAM: Implement these steps:
     * ✓ Query employees table WHERE email = UID or id = UID
     * ✓ Validate password hash
     * ✓ Query employee_modules WHERE employee_id = ?
     * ✓ Query employee_permissions WHERE employee_id = ?
     * ✓ Generate JWT token
     * ✓ Return all in the format specified by BackendLoginData
     */
    async login(payload: LoginPayload) {
      this.loading = true;

      try {
        // BACKEND ENDPOINT: POST /auth/login
        // Expects: { UID: "emp-code", password: "***", token: true }
        // See permissions.constants.ts for required response format
        const res = await loginApi(payload);

        if (!res.status) {
          throw new Error(res.message);
        }

        const normalizedUser = normalizeBackendUser(res.data);

        // Store user data in state
        this.user = normalizedUser;

        // Store token in state
        this.token = res.data.token;

        // Persist token to localStorage (used by route guards)
        localStorage.setItem("token", res.data.token);
        
        // Persist user data to localStorage (recovered on page reload)
        localStorage.setItem("auth_user", JSON.stringify(normalizedUser));

      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.message ||
          error?.message ||
          "Login failed";
        throw new Error(message);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout action - clear all user data and tokens
     */
    async logout() {
      try {
        await logoutApi();
      } catch {}

      this.user = null;
      this.token = null;
      clearLocalAuth();
    }
  },
});
