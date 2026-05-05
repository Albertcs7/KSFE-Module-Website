import api from "../http/axios";
import type { CreatePolicyPayload, UpdatePolicyPayload } from "../types/insurance.types";

/**
 * GET  policies by employee code
 */
export const getPolicies = (empCode?: string) => {
  if (empCode && empCode.trim() !== '') {
    return api.get(`/insurance/policies?employee_code=${empCode}`);
  }
  return api.get("/insurance/policies");
};

/**
 * SEARCH policies by employee code
 * Used by the remittance modal to populate the policy dropdown on demand.
 */
export const searchPoliciesByEmployeeCode = (empCode: string) => {
  return api.get(`/insurance/policies/search?empCode=${encodeURIComponent(empCode)}`);
};

/**
 * SEARCH policies (by empCode, empName, etc.)
 */
export const searchPolicies = (empCode?: string) => {
  if (empCode && empCode.trim() !== '') {
    return api.get(`/insurance/policies/search?empCode=${empCode}`);
  }
  return api.get("/insurance/policies/search");
};


/**
 * GET GIS policies (filters by policy_type=GIS)
 */
export const getGISPolicies = () => {
  return api.get("/insurance/policies?policy_type=GIS");
};

/**
 * GET SLI policies (filters by policy_type=SLI)
 */
export const getSLIPolicies = () => {
  return api.get("/insurance/policies?policy_type=SLI");
};

/**
 * CREATE new policy
 */
export const createPolicy = (data: CreatePolicyPayload) => {
  return api.post("/insurance/policies", data);
};

/**
 * DELETE policy
 */
export const deletePolicy = (policyNo: string) => {
  return api.delete(`/insurance/policies/${policyNo}`);
};

/**
 * UPDATE policy
 */
export const updatePolicy = (policyNo: string, data: UpdatePolicyPayload) => {
  return api.put(`/insurance/policies/${policyNo}`, data);
};

/**
 * CREATE remittance
 * Backend receives empCode and policyNumber, looks up employee_policy_id, and stores remittance
 */
export const createRemittance = (data: {
  empCode: string
  policyNumber: string
  salaryMonth: string
  dueMonth: string
  amountDeducted: number
  chequeId?: string
}) => {
  return api.post("/insurance/remittance", data);
};