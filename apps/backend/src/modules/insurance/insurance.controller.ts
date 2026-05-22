import { Request, Response } from "express";
import { logger } from "../../core/logger/logger";
import { createChequeAndAttachService, createPolicyService, createRemittanceService, deactivatePolicyService, deletePolicyService, generateMonthlyExcelReport, generatePolicyPdfReport, generatePolicyReportHtml, getAllPoliciesService, getPolicyReportService, searchPoliciesService, updatePolicyService } from "./insurance.service";

const firstQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value || undefined;
};

export const getAllPolicies = async (
  req: Request,
  res: Response
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
  req: Request,
  res: Response
) => {
  try {
    // Extract query parameters: ?empCode=3571&empName=john&limit=50&offset=0
    const empCode = firstQueryValue(req.query.empCode as any);
    const empName = firstQueryValue(req.query.empName as any);
    const policyNo = firstQueryValue(req.query.policyNo as any);
    const limit = firstQueryValue(req.query.limit as any) ? parseInt(firstQueryValue(req.query.limit as any)!) : 100;
    const offset = firstQueryValue(req.query.offset as any) ? parseInt(firstQueryValue(req.query.offset as any)!) : 0;

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
  req: Request,
  res: Response
) => {
  try {
    const body = req.body;

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
  req: Request,
  res: Response
) => {
  try {
    const body = req.body;
    
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
  req: Request,
  res: Response
) => {
  try {
    const body = req.body;

    // Extract policy number from URL
    const policyNo = String(req.params.policyNo || "");

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
  req: Request,
  res: Response
) => {
  try {
    const policyNo = String(req.params.policyNo || "");

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
  req: Request,
  res: Response
) => {
  try {
    const policyNo = String(req.params.policyNo || "");

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
  req: Request,
  res: Response
) => {
  try {
    const body = req.body;

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

export const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const type = String(firstQueryValue(req.query.type as any) || "").toUpperCase();
    const month = String(firstQueryValue(req.query.month as any) || ""); // expected MM
    const year = String(firstQueryValue(req.query.year as any) || ""); // expected YYYY

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

export const getPolicyReport = async (req: Request, res: Response) => {
  try {
    const policyId = Number(req.params.policyId);

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

export const downloadPolicyReport = async (req: Request, res: Response) => {
  try {
    const policyId = Number(req.params.policyId);
    const deathType = String(firstQueryValue(req.query.deathType as any) || 'death');
    const deathDate = String(firstQueryValue(req.query.deathDate as any) || '');

    if (!Number.isInteger(policyId) || policyId <= 0) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: 'Invalid policy id' }));
      return;
    }

    const { buffer, filename } = await generatePolicyPdfReport(policyId, deathType, deathDate);

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

export const getPolicyReportHtml = async (req: Request, res: Response) => {
  try {
    const policyId = Number(req.params.policyId);
    const deathType = String(firstQueryValue(req.query.deathType as any) || 'death');
    const deathDate = String(firstQueryValue(req.query.deathDate as any) || '');

    if (!Number.isInteger(policyId) || policyId <= 0) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: 'Invalid policy id' }));
      return;
    }

    const reportData = await getPolicyReportService(policyId);
    const html = generatePolicyReportHtml(reportData, deathType, deathDate);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error: any) {
    logger.error('Policy report HTML fetch error', { message: error.message });
    const statusCode = error.message?.includes('not found') ? 404 : 400;
    res.writeHead(statusCode);
    res.end(JSON.stringify({ message: error.message || 'Failed to fetch policy report HTML' }));
  }
};