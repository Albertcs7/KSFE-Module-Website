import { IncomingMessage, ServerResponse } from "http";
import { parseBody } from "../../utils/parseBody";
import { createPolicyService,createChequeAndAttachService , createRemittanceService, getAllPoliciesService, searchPoliciesService, updatePolicyService } from "./insurance.service";

export const getAllPolicies = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const data = await getAllPoliciesService();

    res.writeHead(200);
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error(error);

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
    console.log("📨 Remittance Request Body:", { 
      empCode, 
      policyNumber, 
      salaryMonth, 
      dueMonth, 
      amountDeducted, 
      chequeId 
    });
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
    console.error(error);

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
    console.error('Update policy error:', error);
    res.writeHead(400);
    res.end(JSON.stringify({ 
      message: error.message || "Failed to update policy" 
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
    console.error("Cheque creation error:", error);

    res.writeHead(400);
    res.end(JSON.stringify({
      message: error.message || "Failed to create cheque"
    }));
  }
};