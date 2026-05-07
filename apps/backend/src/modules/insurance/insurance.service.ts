import { db } from "../../database/mysql";
import { attachChequeToRemittancesRepo, createChequeRepo, createPolicyRepo, createRemittanceRepo, getAllPoliciesRepo, getPolicyRemittancesRepo, searchPoliciesCountRepo, searchPoliciesRepo, updatePolicyRepo } from "./insurance.repository";

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
  receipt_no?: string | null;
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
    receiptNoOrChequeNo: remittance.receipt_no || "",
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

export const deletePolicyService = async (policyNo: string) => {
  if (!policyNo || policyNo.trim() === "") {
    throw new Error("Policy number is required");
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [policyRows]: any = await connection.query(
      `SELECT employee_policy_id FROM employee_policy WHERE policy_no = ?`,
      [policyNo]
    );

    if (!policyRows || policyRows.length === 0) {
      throw new Error(`Policy with number '${policyNo}' not found`);
    }

    const employeePolicyId = policyRows[0].employee_policy_id;

    await connection.query(
      `DELETE FROM policy_remittance WHERE employee_policy_id = ?`,
      [employeePolicyId]
    );

    const [deleteResult]: any = await connection.query(
      `DELETE FROM employee_policy WHERE policy_no = ?`,
      [policyNo]
    );

    if (!deleteResult.affectedRows) {
      throw new Error(`Policy with number '${policyNo}' not found`);
    }

    await connection.commit();

    return deleteResult;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/*-------------------
ADDING CHEQUE DETAILS
---------------------*/

export const createChequeAndAttachService = async (data: {
  encashmentDate: string;
  receiptNo: string;
  salaryMonth: string; // YYYY-MM
  policyType: 'GIS' | 'SLI';
}) => {

  const { encashmentDate, receiptNo, salaryMonth, policyType } = data;

  // ✅ Validation
  if (!encashmentDate || !receiptNo || !salaryMonth || !policyType) {
    throw new Error("Missing required fields");
  }

  // Convert YYYY-MM → YYYY-MM-01
  const toSqlDate = (ym: string) => {
    if (!/^\d{4}-\d{2}$/.test(ym)) {
      throw new Error("Invalid month format, expected YYYY-MM");
    }
    return `${ym}-01`;
  };

  const salaryMonthDate = toSqlDate(salaryMonth);

  try {
    // ✅ Step 1: Create cheque
    const chequeResult: any = await createChequeRepo({
      encashment_date: encashmentDate,
      receipt_no: receiptNo,
      salary_month: salaryMonthDate,
      policy_type: policyType
    });

    const chequeId = chequeResult.insertId;

    // ✅ Step 2: Find matching remittances
    const [remittances]: any = await db.query(
      `
      SELECT pr.policy_remittance_id
      FROM policy_remittance pr
      INNER JOIN employee_policy ep 
        ON ep.employee_policy_id = pr.employee_policy_id
      WHERE pr.salary_month = ?
        AND ep.policy_type = ?
        AND pr.policy_cheque_id IS NULL
      `,
      [salaryMonthDate, policyType]
    );

    const remittanceIds = remittances.map((r: any) => r.policy_remittance_id);

    // ✅ Step 3: Attach (only if exists)
    if (remittanceIds.length > 0) {
      await attachChequeToRemittancesRepo({
        chequeId,
        remittanceIds
      });
    }

    return {
      message: "Cheque created successfully",
      chequeId,
      attachedRemittances: remittanceIds.length
    };

  } catch (err: any) {

    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("Cheque already exists for this month and type OR receipt number duplicate");
    }

    throw err;
  }
};