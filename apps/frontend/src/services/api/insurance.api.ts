import api from "../http/axios";
import type { CreatePolicyPayload } from "../types/insurance.types";

/**
 * GET all policies
 */
export const getPolicies = () => {
  return api.get("/insurance/policies");
};

/**
 * GET GIS policies (filters by policy_type=GIS)
 */
export const getGISPolicies = () => {
  return api.get("/insurance/policies?policy_type=GIS");
};

/**
 * CREATE new policy
 */
export const createPolicy = (data: CreatePolicyPayload) => {
  return api.post("/insurance/policies", data);
};