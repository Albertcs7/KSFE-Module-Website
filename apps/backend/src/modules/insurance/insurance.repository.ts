import { db } from "../../database/mysql";

type SearchPolicyRow = {
  employee_policy_id: number;
  employee_code: number | string;
  employee_name: string;
  policy_no: string;
  policy_type: string;
  premium: number;
  maturity_date: string | null;
  status?: number;
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

//Viewing employee policies

export const getAllPoliciesRepo = async () => {
  const [rows] = await db.query("SELECT * FROM employee_policy");
  return rows;
};

// Search policies by employee code or employee name with database indexing
export const searchPoliciesRepo = async (params: {
  empCode?: string;
  empName?: string;
  policyNo?: string;
  limit?: number;
  offset?: number;
}) => {
  let query = "SELECT * FROM employee_policy WHERE 1=1";
  const values: any[] = [];

  // Filter by employee code (indexed column) - exact match
  if (params.empCode) {
    query += " AND employee_code = ?";
    values.push(params.empCode);
  }

  // Filter by employee name (partial match, indexed for performance)
  if (params.empName) {
    query += " AND employee_name LIKE ?";
    values.push(`%${params.empName}%`);
  }

  // Filter by policy number (unique, indexed)
  if (params.policyNo) {
    query += " AND policy_no = ?";
    values.push(params.policyNo);
  }

  // Pagination for large result sets
  const limit = params.limit || 100;
  const offset = params.offset || 0;
  query += " LIMIT ? OFFSET ?";
  values.push(limit, offset);

  const [rows] = await db.query(query, values);
  return rows;
};

export const getPolicyRemittancesRepo = async (policyIds: number[]) => {
  if (policyIds.length === 0) {
    return [];
  }

  const placeholders = policyIds.map(() => "?").join(", ");
  const query = `
    SELECT
      pr_ranked.policy_remittance_id,
      pr_ranked.employee_policy_id,
      DATE_FORMAT(pr_ranked.salary_month, '%Y-%m') AS salary_month,
      DATE_FORMAT(pr_ranked.due_month, '%Y-%m') AS due_month,
      pr_ranked.amount_deducted,
      pr_ranked.policy_cheque_id,
      pc.receipt_no,
      ep.employee_code,
      ep.employee_name,
      ep.policy_no,
      ep.policy_type
    FROM (
      SELECT
        pr.*,
        ROW_NUMBER() OVER (PARTITION BY pr.employee_policy_id ORDER BY pr.salary_month DESC, pr.due_month DESC, pr.policy_remittance_id DESC) as rn
      FROM policy_remittance pr
      WHERE pr.employee_policy_id IN (${placeholders})
    ) pr_ranked
    INNER JOIN employee_policy ep ON ep.employee_policy_id = pr_ranked.employee_policy_id
    LEFT JOIN policy_cheque pc ON pc.policy_cheque_id = pr_ranked.policy_cheque_id
    WHERE pr_ranked.rn <= 10
    ORDER BY pr_ranked.salary_month DESC, pr_ranked.due_month DESC, pr_ranked.policy_remittance_id DESC
  `;

  const [rows] = await db.query(query, policyIds);
  return rows as SearchRemittanceRow[];
};

// Get count of search results for pagination metadata
export const searchPoliciesCountRepo = async (params: {
  empCode?: string;
  empName?: string;
  policyNo?: string;
}) => {
  let query = "SELECT COUNT(*) as total FROM employee_policy WHERE 1=1";
  const values: any[] = [];

  if (params.empCode) {
    query += " AND employee_code = ?";
    values.push(params.empCode);
  }

  if (params.empName) {
    query += " AND employee_name LIKE ?";
    values.push(`%${params.empName}%`);
  }

  if (params.policyNo) {
    query += " AND policy_no = ?";
    values.push(params.policyNo);
  }

  const [rows]: any = await db.query(query, values);
  return rows[0]?.total || 0;
};

//Adding a policy

export const createPolicyRepo = async (data: any) => {
  const query = `
    INSERT INTO employee_policy 
    (employee_code, employee_name, policy_no, policy_type, premium, maturity_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.employee_code,
    data.employee_name,
    data.policy_no,
    data.policy_type,
    data.premium,
    data.maturity_date || null,
    data.status ?? 1
  ];

  const [result]: any = await db.query(query, values);
  return result;
};

// UPDATE POLICY

export const updatePolicyRepo = async (policyNo: string, data: any) => {
  const query = `
    UPDATE employee_policy 
    SET employee_name = ?, policy_type = ?, premium = ?, maturity_date = ?
    WHERE policy_no = ?
  `;

  const values = [
    data.employee_name,
    data.policy_type,
    data.premium,
    data.maturity_date || null,
    policyNo
  ];

  const [result]: any = await db.query(query, values);
  return result;
};

export const deletePolicyRemittancesRepo = async (employeePolicyId: number) => {
  const query = `
    DELETE FROM policy_remittance
    WHERE employee_policy_id = ?
  `;

  const [result]: any = await db.query(query, [employeePolicyId]);
  return result;
};

export const deletePolicyRepo = async (policyNo: string) => {
  const query = `
    DELETE FROM employee_policy
    WHERE policy_no = ?
  `;

  const [result]: any = await db.query(query, [policyNo]);
  return result;
};

// ADD REMITTANCE

export const createRemittanceRepo = async (data: {
  employee_policy_id: number;
  salary_month: string;
  due_month: string;
  amount_deducted: number;
  policy_cheque_id?: number;
}) => {

  const query = `
    INSERT INTO policy_remittance
    (employee_policy_id, salary_month, due_month, amount_deducted, policy_cheque_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [
    data.employee_policy_id,
    data.salary_month,
    data.due_month,
    data.amount_deducted,
    data.policy_cheque_id ?? null  // 👈 important
  ];

  const [result]: any = await db.query(query, values);
  return result;
};


/*-------------------
ADDING CHEQUE DETAILS
---------------------*/

export const createChequeRepo = async (data: {
  encashment_date: string;
  receipt_no: string;
  salary_month: string;
  policy_type: 'GIS' | 'SLI';
}) => {
  const query = `
    INSERT INTO policy_cheque
    (encashment_date, receipt_no, salary_month, policy_type)
    VALUES (?, ?, ?, ?)
  `;

  const values = [
    data.encashment_date,
    data.receipt_no,
    data.salary_month,
    data.policy_type
  ];

  const [result]: any = await db.query(query, values);
  return result;
};


export const attachChequeToRemittancesRepo = async (data: {
  chequeId: number;
  remittanceIds: number[];
}) => {
  if (!data.remittanceIds.length) return;

  const placeholders = data.remittanceIds.map(() => "?").join(",");

  const query = `
    UPDATE policy_remittance
    SET policy_cheque_id = ?
    WHERE policy_remittance_id IN (${placeholders})
  `;

  const values = [data.chequeId, ...data.remittanceIds];

  const [result]: any = await db.query(query, values);
  return result;
};

/**
 * Get monthly report rows for given policy type and month/year.
 * Returns raw rows only.
 */
export const getMonthlyReportDataRepo = async (policyType: 'GIS' | 'SLI', month: number, year: number) => {
  // Filter by MONTH() and YEAR() for the salary_month column
  const query = `
    SELECT
      ep.employee_code,
      ep.employee_name,
      ep.policy_no,
      pr.amount_deducted
    FROM employee_policy ep
    INNER JOIN policy_remittance pr
      ON ep.employee_policy_id = pr.employee_policy_id
    WHERE ep.policy_type = ?
      AND MONTH(pr.salary_month) = ?
      AND YEAR(pr.salary_month) = ?
    ORDER BY ep.employee_name ASC, ep.employee_code ASC
  `;

  const [rows] = await db.query(query, [policyType, month, year]);
  return rows;
};