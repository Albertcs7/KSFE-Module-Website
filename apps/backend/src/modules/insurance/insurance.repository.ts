import { db } from "../../database/mysql";

export const getAllPoliciesRepo = async () => {
  const [rows] = await db.query("SELECT * FROM employee_policy");
  return rows;
};