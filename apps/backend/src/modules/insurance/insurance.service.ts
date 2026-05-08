import { logger } from "../../core/logger/logger";
import { db } from "../../database/mysql";
import { createPolicyRepo, getAllPoliciesRepo, getPolicyRemittancesRepo, searchPoliciesCountRepo, searchPoliciesRepo, updatePolicyRepo } from "./insurance.repository";

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
    // Use a dedicated connection and transaction to avoid race conditions
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Convert empCode to number
      const empCodeNum = parseInt(empCode, 10);
      logger.info("Looking up policy (for update)", { empCodeNum, policyNumberMasked: String(policyNumber).slice(-6) });
      if (isNaN(empCodeNum)) {
        throw new Error("Invalid employee code format");
      }

      // Lock the employee_policy row to serialize remittance inserts for this policy
      const [rows]: any = await conn.query(
        `SELECT employee_policy_id FROM employee_policy WHERE employee_code = ? AND policy_no = ? FOR UPDATE`,
        [empCodeNum, policyNumber]
      );

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

      const [result]: any = await conn.query(
        `
          INSERT INTO policy_remittance
          (employee_policy_id, salary_month, due_month, amount_deducted, policy_cheque_id)
          VALUES (?, ?, ?, ?, ?)
        `,
        [employee_policy_id, salaryMonthDate, dueMonthDate, amountDeducted, chequeId ? Number(chequeId) : null]
      );

      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

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
    
    logger.info(`Policy ${policyNo} updated`, {
      affectedRows: result.affectedRows,
      premium: data.premium
    });
    
    return result;
  } catch (err: any) {
    logger.error(`Error updating policy ${policyNo}`, { message: err.message });
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
    // Use a transaction to create cheque and attach atomically
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [chequeResult]: any = await conn.query(
        `
          INSERT INTO policy_cheque
          (encashment_date, receipt_no, salary_month, policy_type)
          VALUES (?, ?, ?, ?)
        `,
        [encashmentDate, receiptNo, salaryMonthDate, policyType]
      );

      const chequeId = chequeResult.insertId;

      // Lock matching remittances to avoid concurrent attachments
      const [remittances]: any = await conn.query(
        `
        SELECT pr.policy_remittance_id
        FROM policy_remittance pr
        INNER JOIN employee_policy ep 
          ON ep.employee_policy_id = pr.employee_policy_id
        WHERE pr.salary_month = ?
          AND ep.policy_type = ?
          AND pr.policy_cheque_id IS NULL
        FOR UPDATE
        `,
        [salaryMonthDate, policyType]
      );

      const remittanceIds = remittances.map((r: any) => r.policy_remittance_id);

      if (remittanceIds.length > 0) {
        const placeholders = remittanceIds.map(() => '?').join(',');
        const updateSql = `UPDATE policy_remittance SET policy_cheque_id = ? WHERE policy_remittance_id IN (${placeholders})`;
        await conn.query(updateSql, [chequeId, ...remittanceIds]);
      }

      await conn.commit();

      return {
        message: "Cheque created successfully",
        chequeId,
        attachedRemittances: remittanceIds.length
      };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

  } catch (err: any) {

    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("Cheque already exists for this month and type OR receipt number duplicate");
    }

    throw err;
  }
};