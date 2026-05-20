import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { FRONTEND_PREVIEW_BASE_URL, PDF_AUTH_TOKEN, PDF_MAX_CONCURRENCY, PDF_USE_FRONTEND } from "../../config/env";
import { logger } from "../../core/logger/logger";
import { db } from "../../database/mysql";
import { attachChequeToMonthTypeRemittancesRepo, createChequeRepo, createPolicyRepo, deactivatePolicyRepo, getAllPoliciesRepo, getEmployeePolicyForUpdateRepo, getLatestChequeForMonthTypeForUpdateRepo, getMonthlyReportDataRepo, getPolicyByNumberRepo, getPolicyRemittancesRepo, getPolicyReportDataRepo, searchPoliciesCountRepo, searchPoliciesRepo, updateChequeByIdRepo, updatePolicyRepo, upsertRemittanceRepo } from "./insurance.repository";
import { ExcelBufferResult, GetMonthlyReportParams, MonthlyReportRow, PolicyReportData } from "./insurance.types";

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

type PolicyReportRenderData = PolicyReportData;

const POLICY_PDF_MAX_CONCURRENCY = Math.max(1, PDF_MAX_CONCURRENCY);
let activePdfJobs = 0;
const pdfQueue: Array<() => void> = [];

const acquirePdfSlot = async (): Promise<void> => {
  if (activePdfJobs < POLICY_PDF_MAX_CONCURRENCY) {
    activePdfJobs += 1;
    return;
  }

  await new Promise<void>((resolve) => {
    pdfQueue.push(() => {
      activePdfJobs += 1;
      resolve();
    });
  });
};

const releasePdfSlot = () => {
  activePdfJobs = Math.max(0, activePdfJobs - 1);
  const next = pdfQueue.shift();
  if (next) {
    next();
  }
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
      const rows: any = await getEmployeePolicyForUpdateRepo(empCodeNum, policyNumber, conn);

      if (!rows || rows.length === 0) {
        throw new Error(`Policy not found for employee ${empCode} with policy number ${policyNumber}`);
      }

      const employee_policy_id = rows[0].employee_policy_id;
      const policy_type = rows[0].policy_type as 'GIS' | 'SLI';

      // Convert `YYYY-MM` (from <input type="month">) to `YYYY-MM-01` for MySQL DATE columns
      const toSqlDate = (ym: string) => {
        if (!/^\d{4}-\d{2}$/.test(ym)) {
          throw new Error("Invalid month format, expected YYYY-MM");
        }
        return `${ym}-01`;
      };

      const salaryMonthDate = toSqlDate(salaryMonth);
      const dueMonthDate = toSqlDate(dueMonth);

      // Auto-link remittance to existing cheque for the same month+policy type when chequeId is not supplied.
      const matchingCheques: any = await getLatestChequeForMonthTypeForUpdateRepo(salaryMonthDate, policy_type, conn);

      const explicitChequeId = chequeId ? Number(chequeId) : null;
      if (explicitChequeId !== null && Number.isNaN(explicitChequeId)) {
        throw new Error("Invalid cheque id");
      }
      const resolvedChequeId = explicitChequeId ?? (matchingCheques[0]?.policy_cheque_id ?? null);

      const result: any = await upsertRemittanceRepo(
        {
          employee_policy_id,
          salary_month: salaryMonthDate,
          due_month: dueMonthDate,
          amount_deducted: amountDeducted,
          policy_cheque_id: resolvedChequeId,
        },
        conn
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

const formatDateLabel = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN');
};

const formatMonthLabel = (value?: string | null) => {
  if (!value) return '-';
  const [year, month] = String(value).split('-');
  if (!year || !month) return value;

  const parsedYear = Number(year);
  const parsedMonth = Number(month) - 1;
  const date = new Date(parsedYear, parsedMonth, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
};

const escapeHtml = (value: unknown) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getPolicyTypeFullName = (policyType: string): string => {
  const typeMap: Record<string, string> = {
    'GIS': 'Group Insurance Scheme',
    'SLI': 'State Life Insurance'
  };
  return typeMap[policyType] || policyType;
};

const getReportLetterheadDataUrl = () => {
  const candidatePaths = [
    path.resolve(process.cwd(), 'public/report-letterhead.png'),
    path.resolve(process.cwd(), 'public/KSFE TOP LOGO.png'),
    path.resolve(process.cwd(), 'public/ksfe main logo.png'),

  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      const imageBuffer = fs.readFileSync(candidatePath);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }
  }

  return '';
};

export const generatePolicyReportHtml = (reportData: PolicyReportRenderData, deathType: string = 'death', deathDate: string = '') => {
  const letterheadSrc = getReportLetterheadDataUrl();
  
  // Use provided date or fall back to maturity date
  const displayDate = deathDate || reportData.policy.maturity_date;
  const dateLabel = deathType === 'retirement' ? 'Date of Retirement' : 'Date of Death';
  
  const rowsHtml = reportData.remittances.length > 0
    ? reportData.remittances.map((remittance) => `
        <tr>
          <td>${escapeHtml(formatMonthLabel(remittance.due_month))}</td>
          <td class="right">₹${Number(remittance.amount_deducted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${escapeHtml(formatMonthLabel(remittance.salary_month))}</td>
          <td>${escapeHtml(formatDateLabel(remittance.encashment_date))}</td>
          <td>${escapeHtml(remittance.receipt_no || remittance.policy_cheque_id || '-')}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="5" class="empty-state">No remittance records found for this policy.</td>
        </tr>
      `;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Policy Report - ${escapeHtml(reportData.policy.policy_no)}</title>
        <style>
          @page {
            size: A4;
            margin: 20px;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #f3f4f6;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 16px 50px 20px;
          }

          .letterhead {
            padding-bottom: 6px;
            border-bottom: 1px solid #111827;
            margin-bottom: 8px;
          }

          .letterhead img {
            width: 70%;
            height: 140px;
            max-height: 190px;
            display: block;
            object-fit: fill;
          }

          .date-display {
            font-size: 15px;
            color: #111827;
            margin-bottom: 8px;
            text-align: right;
          }

          .title-block {
            text-align: center;
            margin-bottom: 16px;
          }

          .title-block h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            text-decoration: underline;
          }

          .title-underline {
            display: none;
          }

          .details-section {
            margin-bottom: 14px;
            font-size: 15px;
            line-height: 1.8;
          }

          .detail-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 120px;
            margin-bottom: 6px;
          }

          .detail-inline {
            display: flex;
            gap: 0;
          }

          .detail-inline:nth-child(1) {
            margin-left: 12px;
          }

          .detail-inline:nth-child(2) {
            margin-left: 24px;
          }

          .detail-label {
            font-weight: 400;
            color: #111827;
          }

          .detail-value {
            color: #111827;
          }

          .section {
            margin-top: 12px;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
            table-layout: fixed;
          }

          .report-table th,
          .report-table td {
            border: 1px solid #1f2937;
            padding: 8px 6px;
            vertical-align: top;
          }

          .report-table th {
            background: #e5e7eb;
            text-align: left;
            font-weight: 700;
            font-size: 15px;
          }

          .report-table th:last-child,
          .report-table td:last-child {
            width: 38%;
          }

          .report-table .right {
            text-align: right;
          }

          .empty-state {
            text-align: center;
            padding: 14px 10px;
            color: #6b7280;
            font-size: 15px;
          }

          .signature-block {
            margin-top: 38px;
            display: flex;
            justify-content: flex-start;
          }

          .signature {
            width: 240px;
            text-align: left;
            font-size: 15px;
          }

          .signature-line {
            border-top: 1px solid #111827;
            margin-bottom: 6px;
            height: 24px;
          }

          .signature small {
            display: block;
            margin-top: 4px;
            color: #4b5563;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="letterhead">
            ${letterheadSrc ? `<img src="${letterheadSrc}" alt="KSFE Letterhead" />` : ''}
          </div>

          <div class="date-display">Date : ${escapeHtml(new Date(reportData.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }))}</div>

          <div class="title-block">
            <h2>Schedule of salary deduction for ${escapeHtml(getPolicyTypeFullName(reportData.policy.policy_type))}</h2>
            <div class="title-underline"></div>
          </div>

          <section class="details-section">
            <div class="detail-row">
              <div class="detail-inline"><span class="detail-label">Full Name:</span>&nbsp;<span class="detail-value">${escapeHtml(reportData.policy.employee_name)}</span></div>
              <div class="detail-inline"><span class="detail-label">Employee Code:</span>&nbsp;<span class="detail-value">${escapeHtml(reportData.policy.employee_code)}</span></div>
            </div>
            <div class="detail-row">
              <div class="detail-inline"><span class="detail-label">Policy No:</span>&nbsp;<span class="detail-value">${escapeHtml(reportData.policy.policy_no)}</span></div>
              <div class="detail-inline"><span class="detail-label">${escapeHtml(dateLabel)}:</span>&nbsp;<span class="detail-value">${escapeHtml(formatDateLabel(displayDate))}</span></div>
            </div>
          </section>

          <section class="section">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Due Month of Premium</th>
                  <th>Amount Deducted</th>
                  <th>Salary Month</th>
                  <th>Date of Encashment</th>
                  <th>Receipt No / Cheque Details</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </section>

          <section class="signature-block">
            <div class="signature">
              <div>Yours faithfully,</div>
              <div style="margin-top: 4px; font-weight: 600;">For The K.S.F.E. LTD</div>
              <div style="margin-top: 70px; font-weight: 600;">DEPUTY GENERAL MANAGER (P&HR)</div>
            </div>
          </section>
        </div>
      </body>
    </html>
  `;
};

export const getPolicyReportService = async (policyId: number) => {
  if (!Number.isInteger(policyId) || policyId <= 0) {
    throw new Error('Invalid policy id');
  }

  const report = await getPolicyReportDataRepo(policyId);

  if (!report.policy) {
    throw new Error(`Policy with id '${policyId}' not found`);
  }

  const remittances: PolicyReportData['remittances'] = report.remittances.map((remittance: any) => ({
    policy_remittance_id: Number(remittance.policy_remittance_id),
    employee_policy_id: Number(remittance.employee_policy_id),
    salary_month: String(remittance.salary_month || ''),
    due_month: String(remittance.due_month || ''),
    amount_deducted: Number(remittance.amount_deducted || 0),
    policy_cheque_id: remittance.policy_cheque_id ? Number(remittance.policy_cheque_id) : null,
    encashment_date: remittance.encashment_date || null,
    receipt_no: remittance.receipt_no || null,
  }));

  const totalAmountDeducted = remittances.reduce<number>((sum, item) => sum + Number(item.amount_deducted || 0), 0);

  return {
    policy: {
      employee_policy_id: Number(report.policy.employee_policy_id),
      employee_code: String(report.policy.employee_code),
      employee_name: String(report.policy.employee_name || ''),
      policy_no: String(report.policy.policy_no),
      policy_type: report.policy.policy_type,
      premium: Number(report.policy.premium || 0),
      maturity_date: report.policy.maturity_date,
      status: Number(report.policy.status ?? 1),
    },
    remittances,
    generatedAt: new Date().toISOString(),
    totalAmountDeducted,
  } as PolicyReportData;
};

export const generatePolicyPdfReport = async (policyId: number, deathType: string = 'death', deathDate: string = '') => {
  const reportData = await getPolicyReportService(policyId);

  await acquirePdfSlot();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const html = generatePolicyReportHtml(reportData as PolicyReportRenderData, deathType, deathDate);

    if (PDF_USE_FRONTEND) {
      try {
        // Navigate to a blank page first so we can set localStorage if needed.
        await page.goto('about:blank');

        if (PDF_AUTH_TOKEN) {
          try {
            await page.evaluate((token) => {
              localStorage.setItem('token', token);
            }, PDF_AUTH_TOKEN);
          } catch {
            // ignore localStorage set failures
          }
        }

        const queryString = `deathType=${encodeURIComponent(deathType)}&deathDate=${encodeURIComponent(deathDate)}&_ts=${Date.now()}`;
        const previewUrl = `${FRONTEND_PREVIEW_BASE_URL.replace(/\/+$/, '')}/insurance/policies/${policyId}/report?${queryString}`;
        await page.goto(previewUrl, { waitUntil: 'networkidle0' });
      } catch (error: any) {
        logger.warn('Frontend policy report preview failed; falling back to backend HTML', {
          policyId,
          message: error?.message,
        });
        await page.setContent(html, { waitUntil: 'load' });
      }
    } else {
      await page.setContent(html, { waitUntil: 'load' });
    }

    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await page.close();
    return {
      buffer: Buffer.from(pdf),
      filename: `policy-report-${reportData.policy.policy_no}.pdf`,
    };
  } finally {
    await browser.close();
    releasePdfSlot();
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
    // Use a transaction to upsert cheque and attach atomically
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const existingCheques: any = await getLatestChequeForMonthTypeForUpdateRepo(salaryMonthDate, policyType, conn);

      let chequeId: number;
      let operation: 'created' | 'updated' = 'created';

      if (existingCheques.length > 0) {
        chequeId = Number(existingCheques[0].policy_cheque_id);
        await updateChequeByIdRepo(
          chequeId,
          { encashment_date: encashmentDate, receipt_no: receiptNo },
          conn
        );
        operation = 'updated';
      } else {
        const chequeResult: any = await createChequeRepo(
          {
            encashment_date: encashmentDate,
            receipt_no: receiptNo,
            salary_month: salaryMonthDate,
            policy_type: policyType,
          },
          conn
        );
        chequeId = Number(chequeResult.insertId);
      }

      const attachResult: any = await attachChequeToMonthTypeRemittancesRepo(
        { chequeId, salaryMonth: salaryMonthDate, policyType },
        conn
      );

      await conn.commit();

      return {
        message: operation === 'created' ? "Cheque created successfully" : "Cheque updated successfully",
        chequeId,
        attachedRemittances: Number(attachResult?.affectedRows || 0)
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


  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `${policyType}-${monthName.charAt(0)+monthName.slice(1).toLowerCase()}-${year}.xlsx`;

  return { buffer: Buffer.from(buffer), filename };
};