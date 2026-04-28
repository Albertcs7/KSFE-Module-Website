import axiosInstance from "../http/axios";
import type { BackendLoginResponse } from "../types/auth.types";

export interface LoginPayload {
  UID: string;
  password: string;
  token: boolean;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTH API LAYER - HTTP Communication with Backend
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module handles all HTTP requests related to authentication.
 * 
 * ENDPOINT: POST /auth/login
 * ──────────────────────────────
 * 
 * REQUEST:
 *   {
 *     "UID": "EMP001",        // Employee code/ID (from login form)
 *     "password": "pass123",  // Employee password (from login form)
 *     "token": true           // Request token generation
 *   }
 * 
 * RESPONSE (Success 200):
 *   {
 *     "status": true,
 *     "message": "Login successful",
 *     "data": {
 *       "user": {
 *         "id": "USER_ID",
 *         "name": "Employee Name"
 *       },
 *       "employeeId": "EMP001",
 *       "role": "employee" | "admin",
 *       "designation": "Job Title",
 *       "branchId": "BRANCH_001",
 *       
 *       // *** CRITICAL: Fetch from your database ***
 *       "modules": [
 *         "insuranceModule",     // Modules from employee_modules table
 *         "reportsModule"
 *       ],
 *       
 *       // *** CRITICAL: Fetch from your database ***
 *       "permissions": [
 *         "viewInsurance",       // Permissions from employee_permissions table
 *         "editInsurance",
 *         "viewReports"
 *       ],
 *       
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     }
 *   }
 * 
 * RESPONSE (Error 401/403):
 *   {
 *     "status": false,
 *     "message": "Invalid credentials" | "Employee not found" | "Account locked"
 *   }
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND TEAM - WHAT YOU NEED TO DO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * In your backend /auth/login endpoint:
 * 
 * 1. Validate UID and password
 *    - Query employees table: SELECT * FROM employees WHERE employee_id = UID
 *    - Verify password hash matches
 *    - Return 401 if invalid
 * 
 * 2. Fetch modules for this employee
 *    - Query: SELECT module_name FROM employee_modules WHERE employee_id = ?
 *    - Example result: ["insuranceModule", "reportsModule"]
 *    - This determines which modules the employee can see in the sidebar
 * 
 * 3. Fetch permissions for this employee
 *    - Query: SELECT permission_name FROM employee_permissions WHERE employee_id = ?
 *    - Example result: ["viewInsurance", "editInsurance"]
 *    - This determines which actions they can perform within modules
 * 
 * 4. Generate JWT token with:
 *    - Payload: { employeeId, role, ...other claims }
 *    - Expiration: Set appropriate expiry (e.g., 24 hours)
 * 
 * 5. Return response in exact format shown above
 * 
 * IMPLEMENTATION CHECKLIST:
 * ☐ Create/verify employees table with: employee_id, name, password_hash, role, designation, branch_id
 * ☐ Create employee_modules table with: employee_id, module_name (foreign keys to relevant tables)
 * ☐ Create employee_permissions table with: employee_id, permission_name
 * ☐ Implement /auth/login endpoint following format above
 * ☐ Add validation to prevent unauthorized module/permission assignments
 * ☐ Test with sample employees: admin user, employee with 1 module, employee with multiple modules
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Login API call
 * 
 * @param payload - User credentials { UID, password, token }
 * @returns Promise with user data and token
 * 
 * Calls: POST /auth/login
 * See documentation above for request/response format
 */
export const loginApi = async (
    payload: LoginPayload): 
    Promise<BackendLoginResponse> => {
  const response = await axiosInstance.post<BackendLoginResponse>(
    "/auth/login",
    payload
  );

  return response.data;
};
