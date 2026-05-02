import api from "../http/axios";
import type { CreatePolicyPayload } from "../types/insurance.types";
import type { CreateRemittancePayload } from '../types/insurance.types'

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
 * CREATE remittance
 */
export const createRemittance = (data: CreateRemittancePayload) => {
  return api.post("/insurance/remittance", data);
};