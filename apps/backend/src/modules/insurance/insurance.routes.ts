import { IncomingMessage, ServerResponse } from "http";
import { authenticate, authorize, type AuthenticatedRequest } from "../../core/auth/auth.middleware";
import { runMiddlewares } from "../../core/http/middlewareRunner";
import { createCheque, createPolicy, createRemittance, getAllPolicies, searchPolicies, updatePolicy } from "./insurance.controller";

export const insuranceRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  const guardedReq = req as AuthenticatedRequest;

  const requireAccess = (permission: string) =>
    runMiddlewares(guardedReq, res, [authenticate, authorize(permission)]);

  // GET SEARCH POLICIES (EFFICIENT INDEXED SEARCH)
  if (req.method === "GET" && req.url?.startsWith("/insurance/policies/search")) {
    if (!requireAccess("viewInsurance")) return true;
    await searchPolicies(req, res);
    return true;
  }

  // GET VIEW EMPLOYEE POLICIES
  if (req.method === "GET" && req.url?.startsWith("/insurance/policies") && !req.url?.startsWith("/insurance/policies/search")) {
    if (!requireAccess("viewInsurance")) return true;
    await getAllPolicies(req, res);
    return true;
  }

  // POST ADDING EMPLOYEE POLICIES ✅
  if (req.method === "POST" && req.url === "/insurance/policies") {
    if (!requireAccess("editInsurance")) return true;
    await createPolicy(req, res);
    return true;
  }
  
  // POST ADD REMITTANCE 
  if (req.method === "POST" && req.url === "/insurance/remittance") {
    if (!requireAccess("editInsurance")) return true;
    await createRemittance(req, res);
    return true;
  }

  // POST CREATE CHEQUE
  if (req.method === "POST" && req.url === "/insurance/cheque") {
    if (!requireAccess("editInsurance")) return true;
    await createCheque(req, res);
    return true;
  }

  // PUT UPDATE POLICY
  if (req.method === "PUT" && req.url?.startsWith("/insurance/policies/")) {
    if (!requireAccess("editInsurance")) return true;
    await updatePolicy(req, res);
    return true;
  }

  return false;
};

