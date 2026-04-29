export interface CreatePolicyPayload {
  employee_code: number;
  employee_name: string;
  policy_no: string;
  policy_type: "GIS" | "SLI";
  premium: number;
  maturity_date: string;
}