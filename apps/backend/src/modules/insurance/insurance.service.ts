import ExcelJS from "exceljs";
import { logger } from "../../core/logger/logger";
import { db } from "../../database/mysql";
import { createPolicyRepo, deactivatePolicyRepo, getAllPoliciesRepo, getMonthlyReportDataRepo, getPolicyByNumberRepo, getPolicyRemittancesRepo, searchPoliciesCountRepo, searchPoliciesRepo, updatePolicyRepo } from "./insurance.repository";
import { ExcelBufferResult, GetMonthlyReportParams, MonthlyReportRow } from "./insurance.types";

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

  if (!policyNo || policyNo.trim() === "") {
    throw new Error("Policy number is required");
  }

  const existingPolicy = await getPolicyByNumberRepo(policyNo);
  if (!existingPolicy) {
    throw new Error(`Policy with number '${policyNo}' not found`);
  }

  if (Number(existingPolicy.status) === 0) {
    throw new Error("This policy is deactivated and cannot be edited");
  }

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

export const deactivatePolicyService = async (policyNo: string) => {
  if (!policyNo || policyNo.trim() === "") {
    throw new Error("Policy number is required");
  }

  const existingPolicy = await getPolicyByNumberRepo(policyNo);
  if (!existingPolicy) {
    throw new Error(`Policy with number '${policyNo}' not found`);
  }

  if (Number(existingPolicy.status) === 0) {
    return { message: "Policy already deactivated" };
  }

  const result = await deactivatePolicyRepo(policyNo);
  if (!result?.affectedRows) {
    throw new Error(`Policy with number '${policyNo}' not found`);
  }

  logger.info(`Policy ${policyNo} deactivated`, { affectedRows: result.affectedRows });
  return result;
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

// Helper: month number ("03") -> month name uppercase ("MARCH")
const MONTH_NAMES = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
];

// Estimate column widths based on header and content lengths
const computeColumnWidths = (headers: string[], rows: any[]) => {
  const widths = headers.map(h => Math.max(10, Math.min(40, h.length + 2)));
  rows.forEach(row => {
    headers.forEach((h, i) => {
      const cell = Object.values(row)[i];
      const len = cell === null || cell === undefined ? 0 : String(cell).length;
      widths[i] = Math.max(widths[i], Math.min(60, len + 2));
    });
  });
  return widths.map(w => ({ width: w }));
};

/*
 *Generate Monthly Excel Report buffer using ExcelJS
*/
export const generateMonthlyExcelReport = async (params: GetMonthlyReportParams): Promise<ExcelBufferResult> => {
  const { policyType, month, year } = params;

  // Convert month to number
  const monthNum = parseInt(month, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month');
  }

  // Fetch raw rows from repository
  const rows = (await getMonthlyReportDataRepo(policyType, monthNum, parseInt(year, 10))) as MonthlyReportRow[];

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KSFE Backend';
  const monthName = MONTH_NAMES[monthNum - 1];
  const sheetName = `${policyType}-${monthName}-${year}`.slice(0, 31);
  const ws = workbook.addWorksheet(sheetName);

  // Define columns
  const tableHeaders = ['S.NO', 'Emp. CODE', 'NAME', 'POLICY NUMBER', `${policyType} DEDUCTED AMOUNT`];

  const headerText =
    policyType === 'GIS'
      ? {
          line2: 'GROUP INSURANCE SCHEME',
          line3: 'Form GIS - B',
          line4: `Statement showing Deduction towards Group Insurance Scheme for the Month of ${monthName} ${year}`,
          line5: 'DDO/Office Code :.......................................................',
          line6: 'Name of Office: CORPORATE OFFICE,BHADRATHA,CHEMBUKAVU,THRISSUR 680020',
          line7: 'Department: :KERALA STATE FINANCIAL ENTERPRISES Ltd.',
          line8: 'Mode of Payment (By Salary Deduction/ Demand Draft/Cheque/Challan):.......................................',
          line9: 'Details of Demand Draft/Cheque/Challan :....................................................................................',
        }
      : {
          line2: 'STATE LIFE INSURANCE SCHEME',
          line3: 'Form - B',
          line4: `Statement showing Deduction towards State Life Insurance Scheme for the Month of ${monthName} ${year}`,
          line5: 'DDO/Office Code :.......................................................',
          line6: 'Name of Office: CORPORATE OFFICE,BHADRATHA,CHEMBUKAVU,THRISSUR 680020',
          line7: 'Department: :KERALA STATE FINANCIAL ENTERPRISES Ltd.',
          line8: 'Mode of Payment (By Salary Deduction/ Demand Draft/Cheque/Challan):.......................................',
          line9: 'Details of Demand Draft/Cheque/Challan :....................................................................................',
        };

  const applyHeaderCell = (cell: ExcelJS.Cell, alignment: Partial<ExcelJS.Alignment>) => {
    cell.alignment = { vertical: 'middle', wrapText: true, ...alignment };
  };

  // Heading section - merged across 5 columns
  ws.mergeCells('A1:E1');
  ws.getCell('A1').value = 'KERALA STATE INSURANCE DEPARTMENT';
  applyHeaderCell(ws.getCell('A1'), { horizontal: 'center' });
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getRow(1).height = 20;

  ws.mergeCells('A2:E2');
  ws.getCell('A2').value = headerText.line2;
  applyHeaderCell(ws.getCell('A2'), { horizontal: 'center' });
  ws.getCell('A2').font = { bold: true };
  ws.getRow(2).height = 20;

  ws.mergeCells('A3:E3');
  ws.getCell('A3').value = headerText.line3;
  applyHeaderCell(ws.getCell('A3'), { horizontal: 'center' });
  ws.getRow(3).height = 20;

  ws.mergeCells('A4:E4');
  ws.getCell('A4').value = headerText.line4;
  applyHeaderCell(ws.getCell('A4'), { horizontal: 'center' });
  ws.getRow(4).height = 30;

  ws.mergeCells('A5:E5');
  ws.getCell('A5').value = headerText.line5;
  applyHeaderCell(ws.getCell('A5'), { horizontal: 'left' });
  ws.getRow(5).height = 20;

  ws.mergeCells('A6:E6');
  ws.getCell('A6').value = headerText.line6;
  applyHeaderCell(ws.getCell('A6'), { horizontal: 'left' });
  ws.getRow(6).height = 20;

  ws.mergeCells('A7:E7');
  ws.getCell('A7').value = headerText.line7;
  applyHeaderCell(ws.getCell('A7'), { horizontal: 'left' });
  ws.getRow(7).height = 20;

  ws.mergeCells('A8:E8');
  ws.getCell('A8').value = headerText.line8;
  applyHeaderCell(ws.getCell('A8'), { horizontal: 'left' });
  ws.getRow(8).height = 34;

  ws.mergeCells('A9:E9');
  ws.getCell('A9').value = headerText.line9;
  applyHeaderCell(ws.getCell('A9'), { horizontal: 'left' });
  ws.getRow(9).height = 34;

  // Start table at row 11
  const tableStartRow = 11;

  // Add header row
  const headerRow = ws.getRow(tableStartRow);
  tableHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  headerRow.height = 20;

  // Insert rows
  let totalAmount = 0;
  if (!rows || rows.length === 0) {
    const r = ws.getRow(tableStartRow + 1);
    r.getCell(1).value = 1;
    r.getCell(2).value = '';
    r.getCell(3).value = 'No records found for selection';
    r.getCell(4).value = '';
    r.getCell(5).value = 0;
    totalAmount = 0;
    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  } else {
    rows.forEach((row, idx) => {
      const amount = Number(row.amount_deducted) || 0;
      totalAmount += amount;
      const excelRow = ws.getRow(tableStartRow + 1 + idx);
      excelRow.getCell(1).value = idx + 1;
      excelRow.getCell(2).value = row.employee_code;
      excelRow.getCell(3).value = row.employee_name;
      excelRow.getCell(4).value = row.policy_no;
      excelRow.getCell(5).value = amount;

      // styling
      excelRow.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 5 ? 'right' : 'left' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
  }

  const totalRowNumber = tableStartRow + 1 + (rows && rows.length ? rows.length : 1);
  const totalRow = ws.getRow(totalRowNumber);
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = 'TOTAL';
  totalRow.getCell(4).value = '';
  totalRow.getCell(5).value = totalAmount;
  for (let colNumber = 1; colNumber <= 5; colNumber += 1) {
    const cell = totalRow.getCell(colNumber);
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 5 ? 'right' : 'left' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  }

  // Adjust column widths
  const contentRows = rows && rows.length ? rows.map(r => [null, r.employee_code, r.employee_name, r.policy_no, String(r.amount_deducted)]) : [];
  const colWidths = computeColumnWidths(tableHeaders, contentRows as any[]);
  ws.columns = colWidths;

  // Footer formatting: freeze header row
  ws.views = [{ state: 'frozen', ySplit: tableStartRow }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `${policyType}-${monthName.charAt(0)+monthName.slice(1).toLowerCase()}-${year}.xlsx`;

  return { buffer: Buffer.from(buffer), filename };
};