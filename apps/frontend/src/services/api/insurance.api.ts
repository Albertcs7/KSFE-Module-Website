import api from "../http/axios";
import type { CreatePolicyPayload, UpdatePolicyPayload } from "../types/insurance.types";

export type MonthlyReportType = "GIS" | "SLI";

export type PolicyReportResponse = {
  policy: {
    employee_policy_id: number;
    employee_code: string;
    employee_name: string;
    policy_no: string;
    policy_type: "GIS" | "SLI";
    premium: number;
    maturity_date: string | null;
    status: number;
  };
  remittances: Array<{
    policy_remittance_id: number;
    employee_policy_id: number;
    salary_month: string;
    due_month: string;
    amount_deducted: number;
    policy_cheque_id: number | null;
    encashment_date: string | null;
    receipt_no: string | null;
  }>;
  generatedAt: string;
  totalAmountDeducted: number;
};

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
 * DEACTIVATE policy (sets status to 0)
 */
export const deactivatePolicy = (policyNo: string) => {
  return api.patch(`/insurance/policies/${policyNo}/deactivate`);
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

/**
 * CREATE cheque
 * Creates cheque and auto-attaches matching remittances
 */
export const createCheque = (data: {
  encashmentDate: string
  receiptNo: string
  salaryMonth: string
  policyType: 'GIS' | 'SLI'
}) => {
  return api.post("/insurance/cheque", data);
};

/**
 * Download the backend-generated monthly Excel report as a Blob.
 */
export const downloadMonthlyReport = (params: {
  type: MonthlyReportType;
  month: string;
  year: string;
}) => {
  return api.get("/insurance/monthly-report", {
    params,
    responseType: "blob",
  });
};

export const getPolicyReport = (policyId: string | number) => {
  return api.get<PolicyReportResponse>(`/insurance/policies/${policyId}/report`);
};

export const downloadPolicyReport = (policyId: string | number, queryString?: string) => {
  // Add a timestamp to avoid cached responses and force backend regeneration
  const ts = Date.now();
  const params = new URLSearchParams({ _ts: String(ts) });
  if (queryString) {
    params.append('deathType', new URLSearchParams(queryString).get('deathType') || 'death');
    params.append('deathDate', new URLSearchParams(queryString).get('deathDate') || '');
  }
  return api.get(`/insurance/policies/${policyId}/report/download`, {
    params: Object.fromEntries(params),
    responseType: "blob",
  });
};