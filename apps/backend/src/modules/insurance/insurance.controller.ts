import { IncomingMessage, ServerResponse } from "http";
import { logger } from "../../core/logger/logger";
import { parseBody } from "../../utils/parseBody";
import { createChequeAndAttachService, createPolicyService, createRemittanceService, deactivatePolicyService, deletePolicyService, generateMonthlyExcelReport, generatePolicyPdfReport, generatePolicyReportHtml, getAllPoliciesService, getPolicyReportService, searchPoliciesService, updatePolicyService } from "./insurance.service";

export const getAllPolicies = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const data = await getAllPoliciesService();

    res.writeHead(200);
    res.end(JSON.stringify(data));
  } catch (error: any) {
    logger.error("getAllPolicies error", { message: error.message });

    res.writeHead(500);
    res.end(JSON.stringify({ message: "Internal Server Error" }));
  }
};

/*SEARCH BY EMPLOYEE CODE*/

export const searchPolicies = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    // Extract query parameters: ?empCode=3571&empName=john&limit=50&offset=0
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const empCode = url.searchParams.get("empCode") || undefined;
    const empName = url.searchParams.get("empName") || undefined;
    const policyNo = url.searchParams.get("policyNo") || undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 100;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const result = await searchPoliciesService({
      empCode,
      empName,
      policyNo,
      limit,
      offset,
    });

    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (error: any) {
    res.writeHead(400);
    res.end(JSON.stringify({ message: error.message }));
  }
};

/* ADDING THE EMPLOYEE POLICIES */

export const createPolicy = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const body = await parseBody(req);

    const result = await createPolicyService(body);

    res.writeHead(201);
    res.end(JSON.stringify({
      message: "Policy created successfully",
      data: result
    }));

  } catch (error: any) {
    res.writeHead(400);
    res.end(JSON.stringify({ message: error.message }));
  }
};

//Remitance function

export const createRemittance = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const body = await parseBody(req);
    
    const {
      empCode,
      policyNumber,
      salaryMonth,
      dueMonth,
      amountDeducted,
      chequeId
    } = body;

    logger.info("Remittance request received", { hasChequeId: !!chequeId, salaryMonth, dueMonth });
    // 🔒 Basic validation
    if (
      !empCode ||
      !policyNumber ||
      !salaryMonth ||
      !dueMonth ||
      !amountDeducted
    ) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Missing required fields" }));
      return;
    }

    //  call service 
    const result = await createRemittanceService({
      empCode,
      policyNumber,
      salaryMonth,
      dueMonth,
      amountDeducted,
      chequeId
    });

    res.writeHead(201);
    res.end(JSON.stringify({
      message: "Remittance created successfully",
      data: result
    }));

  } catch (error: any) {
    logger.error("createRemittance error", { message: error.message });

    res.writeHead(400);
    res.end(JSON.stringify({ message: error.message }));
  }
};

/* UPDATE POLICY */

export const updatePolicy = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const body = await parseBody(req);

    // Extract policy number from URL
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const pathParts = url.pathname.split("/");
    const policyNo = pathParts[pathParts.length - 1];

    if (!policyNo) {
      res.writeHead(400);
      res.end(JSON.stringify({ 
        message: "Policy number is required" 
      }));
      return;
    }

    // Validate required fields in request body
    if (!body.employee_name || !body.policy_type || body.premium === undefined) {
      res.writeHead(400);
      res.end(JSON.stringify({ 
        message: "Missing required fields: employee_name, policy_type, premium" 
      }));
      return;
    }

    const result = await updatePolicyService(policyNo, body);

    res.writeHead(200);
    res.end(JSON.stringify({
      message: "Policy updated successfully",
      data: result
    }));

  } catch (error: any) {
    logger.error('Update policy error', { message: error.message });
    res.writeHead(400);
    res.end(JSON.stringify({ 
      message: error.message || "Failed to update policy" 
    }));
  }
};

export const deletePolicy = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const pathParts = url.pathname.split("/");
    const policyNo = pathParts[pathParts.length - 1];

    if (!policyNo) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Policy number is required" }));
      return;
    }

    const result = await deletePolicyService(policyNo);

    res.writeHead(200);
    res.end(JSON.stringify({
      message: "Policy deleted successfully",
      data: result,
    }));
  } catch (error: any) {
    logger.error("Delete policy error", { message: error.message });
    res.writeHead(400);
    res.end(JSON.stringify({
      message: error.message || "Failed to delete policy",
    }));
  }
};

export const deactivatePolicy = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const pathParts = url.pathname.split("/");
    const policyNo = pathParts[pathParts.length - 2];

    if (!policyNo) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Policy number is required" }));
      return;
    }

    const result = await deactivatePolicyService(policyNo);

    res.writeHead(200);
    res.end(JSON.stringify({
      message: "Policy deactivated successfully",
      data: result,
    }));
  } catch (error: any) {
    logger.error("Deactivate policy error", { message: error.message });
    res.writeHead(400);
    res.end(JSON.stringify({
      message: error.message || "Failed to deactivate policy",
    }));
  }
};

/*-------------------
ADDING CHEQUE DETAILS
---------------------*/

export const createCheque = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const body = await parseBody(req);

    const {
      encashmentDate,
      receiptNo,
      salaryMonth,
      policyType
    } = body;

    // 🔒 Validation
    if (!encashmentDate || !receiptNo || !salaryMonth || !policyType) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Missing required fields" }));
      return;
    }

    const result = await createChequeAndAttachService({
      encashmentDate,
      receiptNo,
      salaryMonth,
      policyType
    });

    res.writeHead(201);
    res.end(JSON.stringify(result));

  } catch (error: any) {
    logger.error("Cheque creation error", { message: error.message });

    res.writeHead(400);
    res.end(JSON.stringify({
      message: error.message || "Failed to create cheque"
    }));
  }
};

export const getMonthlyReport = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const type = (url.searchParams.get("type") || "").toUpperCase();
    const month = url.searchParams.get("month") || ""; // expected MM
    const year = url.searchParams.get("year") || ""; // expected YYYY

    // Basic validation
    if (!type || !["GIS", "SLI"].includes(type)) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Invalid or missing 'type' query parameter. Use 'GIS' or 'SLI'." }));
      return;
    }

    if (!/^(0[1-9]|1[0-2])$/.test(month)) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Invalid or missing 'month' query parameter. Use two-digit month like '03'." }));
      return;
    }

    if (!/^\d{4}$/.test(year)) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Invalid or missing 'year' query parameter. Use 'YYYY'." }));
      return;
    }

    const { buffer, filename } = await generateMonthlyExcelReport({ policyType: type as 'GIS' | 'SLI', month, year });

    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  } catch (error: any) {
    logger.error('Monthly report generation error', { message: error.message });
    res.writeHead(500);
    res.end(JSON.stringify({ message: error.message || 'Failed to generate report' }));
  }
};

export const getPolicyReport = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const policyId = Number(pathParts[pathParts.length - 2]);

    if (!Number.isInteger(policyId) || policyId <= 0) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: 'Invalid policy id' }));
      return;
    }

    const result = await getPolicyReportService(policyId);

    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(result));
  } catch (error: any) {
    logger.error('Policy report fetch error', { message: error.message });
    const statusCode = error.message?.includes('not found') ? 404 : 400;
    res.writeHead(statusCode);
    res.end(JSON.stringify({ message: error.message || 'Failed to fetch policy report' }));
  }
};

export const downloadPolicyReport = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const policyId = Number(pathParts[pathParts.length - 3]);

    if (!Number.isInteger(policyId) || policyId <= 0) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: 'Invalid policy id' }));
      return;
    }

    const { buffer, filename } = await generatePolicyPdfReport(policyId);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  } catch (error: any) {
    logger.error('Policy PDF generation error', { message: error.message });
    const statusCode = error.message?.includes('not found') ? 404 : 500;
    res.writeHead(statusCode);
    res.end(JSON.stringify({ message: error.message || 'Failed to generate policy report PDF' }));
  }
};

export const getPolicyReportHtml = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const policyId = Number(pathParts[pathParts.length - 3]);

    if (!Number.isInteger(policyId) || policyId <= 0) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: 'Invalid policy id' }));
      return;
    }

    const reportData = await getPolicyReportService(policyId);
    const html = generatePolicyReportHtml(reportData);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error: any) {
    logger.error('Policy report HTML fetch error', { message: error.message });
    const statusCode = error.message?.includes('not found') ? 404 : 400;
    res.writeHead(statusCode);
    res.end(JSON.stringify({ message: error.message || 'Failed to fetch policy report HTML' }));
  }
};