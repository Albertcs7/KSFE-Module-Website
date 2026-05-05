export interface CreatePolicyPayload {
  employee_code: number;
  employee_name: string;
  policy_no: string;
  policy_type: "GIS" | "SLI";
  premium: number;
  maturity_date: string;
}

export interface UpdatePolicyPayload {
  employee_name: string;
  policy_type: "GIS" | "SLI";
  premium: number;
  maturity_date: string;
}

export interface CreateRemittancePayload {
  employee_policy_id: number
  salary_month: string
  due_month: string
  amount_deducted: number
  policy_cheque_id?: number
}