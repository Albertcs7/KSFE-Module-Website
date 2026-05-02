import { getAllPoliciesRepo,searchPoliciesRepo, searchPoliciesCountRepo,createPolicyRepo, createRemittanceRepo } from "./insurance.repository";

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
  employee_policy_id: number;
  salary_month: string;
  due_month: string;
  amount_deducted: number;
  policy_cheque_id?: number;
}) => {

  const {
    employee_policy_id,
    salary_month,
    due_month,
    amount_deducted,
    policy_cheque_id
  } = data;

  // ✅ Validation
  if (!employee_policy_id || !salary_month || !due_month || !amount_deducted) {
    throw new Error("Missing required fields");
  }

  try {
    const result = await createRemittanceRepo({
      employee_policy_id,
      salary_month,
      due_month,
      amount_deducted,
      policy_cheque_id
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