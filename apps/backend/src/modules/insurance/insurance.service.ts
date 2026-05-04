import { db } from "../../database/mysql";
import { createPolicyRepo, createRemittanceRepo, getAllPoliciesRepo, searchPoliciesCountRepo, searchPoliciesRepo } from "./insurance.repository";

/* 
  VIEWING THE EMPLOYEE POLICIES
*/
export const getAllPoliciesService = async () => {
  const policies = await getAllPoliciesRepo();

  // later: validations, transformations, business rules

  return policies;
};

/*SEARCHING BY EMPLOYEE CODE*/

export const searchPoliciesService = async (params: {
  empCode?: string;
  empName?: string;
  policyNo?: string;
  limit?: number;
  offset?: number;
}) => {
  // Validate inputs
  if (!params.empCode && !params.empName && !params.policyNo) {
    throw new Error("Please provide at least one search parameter (empCode, empName, or policyNo)");
  }

  const policies = await searchPoliciesRepo(params);
  const total = await searchPoliciesCountRepo(params);

  return {
    data: policies,
    total,
    limit: params.limit || 100,
    offset: params.offset || 0,
  };
};

/* 
  ADDING THE EMPLOYEE POLICIES
*/

export const createPolicyService = async (data: any) => {

  // ✅ Basic validation
  if (!data.employee_code || !data.employee_name || !data.policy_no) {
    throw new Error("Missing required fields");
  }

  try {
    const result = await createPolicyRepo(data);
    return result;
  } catch (err: any) {

    // ✅ Handle duplicate policy_no
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("Policy number already exists");
    }

    throw err;
  }
};

//Remmittancce ADDING

export const createRemittanceService = async (data: {
  empCode: string;
  policyNumber: string;
  salaryMonth: string;
  dueMonth: string;
  amountDeducted: number;
  chequeId?: string;
}) => {

  const {
    empCode,
    policyNumber,
    salaryMonth,
    dueMonth,
    amountDeducted,
    chequeId
  } = data;

  // ✅ Validation
  if (!empCode || !policyNumber || !salaryMonth || !dueMonth || amountDeducted === undefined) {
    throw new Error("Missing required fields");
  }

  try {
    // Look up employee_policy_id using empCode and policyNumber
    const [rows]: any = await db.query(
      `SELECT id FROM employee_policy WHERE employee_code = ? AND policy_no = ?`,
      [empCode, policyNumber]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Policy not found for this employee");
    }

    const employee_policy_id = rows[0].id;

    const result = await createRemittanceRepo({
      employee_policy_id,
      salary_month: salaryMonth,
      due_month: dueMonth,
      amount_deducted: amountDeducted,
      policy_cheque_id: chequeId ? Number(chequeId) : undefined
    });

    return result;

  } catch (err: any) {

    // ✅ Handle duplicate (employee_policy_id + salary_month)
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("Remittance already exists for this month");
    }

    throw err;
  }
};