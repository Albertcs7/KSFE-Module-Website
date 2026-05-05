import { db } from "../../database/mysql";
import { createPolicyRepo, createRemittanceRepo, getAllPoliciesRepo, getPolicyRemittancesRepo, searchPoliciesCountRepo, searchPoliciesRepo, updatePolicyRepo } from "./insurance.repository";

type SearchPolicyRow = {
  employee_policy_id: number;
  employee_code: number | string;
  employee_name: string;
  policy_no: string;
  policy_type: string;
  premium: number;
  maturity_date: string | null;
  [key: string]: any;
};

type SearchRemittanceRow = {
  policy_remittance_id: number;
  employee_policy_id: number;
  salary_month: string;
  due_month: string;
  amount_deducted: number;
  policy_cheque_id: number | null;
  employee_code: number | string;
  employee_name: string;
  policy_no: string;
  policy_type: string;
};

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

  const policies = (await searchPoliciesRepo(params)) as SearchPolicyRow[];
  const remittances = await getPolicyRemittancesRepo(
    policies.map(policy => policy.employee_policy_id)
  );
  const total = await searchPoliciesCountRepo(params);

  const remittancesByPolicyId = new Map<number, SearchRemittanceRow[]>();

  remittances.forEach((remittance) => {
    const existing = remittancesByPolicyId.get(remittance.employee_policy_id) || [];
    existing.push(remittance);
    remittancesByPolicyId.set(remittance.employee_policy_id, existing);
  });

  const policyData = policies.map((policy) => ({
    ...policy,
    remittances: remittancesByPolicyId.get(policy.employee_policy_id) || [],
  }));

  const remittanceData = remittances.map((remittance) => ({
    id: remittance.policy_remittance_id,
    empCode: String(remittance.employee_code),
    empName: remittance.employee_name,
    policyNumber: remittance.policy_no,
    policyType: remittance.policy_type,
    salaryMonth: remittance.salary_month,
    dueMonth: remittance.due_month,
    amountDeducted: remittance.amount_deducted,
    chequeId: remittance.policy_cheque_id ? String(remittance.policy_cheque_id) : "",
  }));

  return {
    data: policyData,
    remittances: remittanceData,
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
    // Convert empCode to number since employee_code is likely stored as integer
    const empCodeNum = parseInt(empCode, 10);
    
    console.log("🔍 Looking up policy:", { empCodeNum, policyNumber });
    
    if (isNaN(empCodeNum)) {
      throw new Error("Invalid employee code format");
    }

    // Look up employee_policy_id using empCode and policyNumber
    const [rows]: any = await db.query(
      `SELECT employee_policy_id FROM employee_policy WHERE employee_code = ? AND policy_no = ?`,
      [empCodeNum, policyNumber]
    );

    console.log("📋 Query result:", rows);

    if (!rows || rows.length === 0) {
      throw new Error(`Policy not found for employee ${empCode} with policy number ${policyNumber}`);
    }

    const employee_policy_id = rows[0].employee_policy_id;

    // Convert `YYYY-MM` (from <input type="month">) to `YYYY-MM-01` for MySQL DATE columns
    const toSqlDate = (ym: string) => {
      if (!/^\d{4}-\d{2}$/.test(ym)) {
        throw new Error("Invalid month format, expected YYYY-MM");
      }
      return `${ym}-01`;
    };

    const salaryMonthDate = toSqlDate(salaryMonth);
    const dueMonthDate = toSqlDate(dueMonth);

    const result = await createRemittanceRepo({
      employee_policy_id,
      salary_month: salaryMonthDate,
      due_month: dueMonthDate,
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

/* 
  UPDATING EXISTING POLICIES
*/

export const updatePolicyService = async (policyNo: string, data: any) => {

  // ✅ Comprehensive validation
  if (!data.employee_name || data.employee_name.trim() === '') {
    throw new Error("Employee name is required and cannot be empty");
  }
  
  if (!data.policy_type) {
    throw new Error("Policy type is required");
  }
  
  if (data.premium === undefined || data.premium === null) {
    throw new Error("Premium is required");
  }
  
  if (isNaN(Number(data.premium)) || Number(data.premium) < 0) {
    throw new Error("Premium must be a valid positive number");
  }

  try {
    const result = await updatePolicyRepo(policyNo, data);
    
    if (result.affectedRows === 0) {
      throw new Error(`Policy with number '${policyNo}' not found`);
    }
    
    console.log(`✅ Policy ${policyNo} updated successfully:`, {
      affectedRows: result.affectedRows,
      employee_name: data.employee_name,
      premium: data.premium
    });
    
    return result;
  } catch (err: any) {
    console.error(`❌ Error updating policy ${policyNo}:`, err.message);
    throw err;
  }
};