import { db } from "../../database/mysql";

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