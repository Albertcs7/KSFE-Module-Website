import { IncomingMessage, ServerResponse } from "http";
import { authenticate, authorize, type AuthenticatedRequest } from "../../core/auth/auth.middleware";
import { validateCsrf } from "../../core/auth/csrf.middleware";
import { runMiddlewares } from "../../core/http/middlewareRunner";
import { createCheque, createPolicy, createRemittance, deactivatePolicy, deletePolicy, downloadPolicyReport, getAllPolicies, getMonthlyReport, getPolicyReport, getPolicyReportHtml, searchPolicies, updatePolicy } from "./insurance.controller";

export const insuranceRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  const guardedReq = req as AuthenticatedRequest;
  const pathname = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`).pathname;

  const requireAccess = (permission: string) =>
    runMiddlewares(guardedReq, res, [authenticate, authorize(permission)]);

  // GET SEARCH POLICIES (EFFICIENT INDEXED SEARCH)
  if (req.method === "GET" && req.url?.startsWith("/insurance/policies/search")) {
    if (!requireAccess("viewInsurance")) return true;
    await searchPolicies(req, res);
    return true;
  }

  // GET SINGLE POLICY REPORT PREVIEW DATA
  if (req.method === "GET" && pathname.match(/^\/insurance\/policies\/\d+\/report$/)) {
    if (!requireAccess("viewInsurance")) return true;
    await getPolicyReport(req, res);
    return true;
  }

  // GET SINGLE POLICY REPORT HTML PREVIEW (backend-rendered)
  if (req.method === "GET" && pathname.match(/^\/insurance\/policies\/\d+\/report\/html$/)) {
    if (!requireAccess("viewInsurance")) return true;
    await getPolicyReportHtml(req, res);
    return true;
  }

  // GET SINGLE POLICY REPORT PDF DOWNLOAD
  if (req.method === "GET" && pathname.match(/^\/insurance\/policies\/\d+\/report\/download$/)) {
    if (!requireAccess("viewInsurance")) return true;
    await downloadPolicyReport(req, res);
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
    if (!runMiddlewares(guardedReq, res, [authenticate, authorize("editInsurance"), validateCsrf])) return true;
    await createPolicy(req, res);
    return true;
  }

  // POST ADD REMITTANCE
  if (req.method === "POST" && req.url === "/insurance/remittance") {
    if (!runMiddlewares(guardedReq, res, [authenticate, authorize("editInsurance"), validateCsrf])) return true;
    await createRemittance(req, res);
    return true;
  }

  // POST CREATE CHEQUE
  if (req.method === "POST" && req.url === "/insurance/cheque") {
    if (!runMiddlewares(guardedReq, res, [authenticate, authorize("editInsurance"), validateCsrf])) return true;
    await createCheque(req, res);
    return true;
  }

  // PUT UPDATE POLICY
  if (req.method === "PUT" && req.url?.startsWith("/insurance/policies/")) {
    if (!runMiddlewares(guardedReq, res, [authenticate, authorize("editInsurance"), validateCsrf])) return true;
    await updatePolicy(req, res);
    return true;
  }

  // PATCH DEACTIVATE POLICY
  if (req.method === "PATCH" && req.url?.startsWith("/insurance/policies/") && req.url?.endsWith("/deactivate")) {
    if (!runMiddlewares(guardedReq, res, [authenticate, authorize("deactivateInsurance"), validateCsrf])) return true;
    await deactivatePolicy(req, res);
    return true;
  }

  // DELETE POLICY
  if (req.method === "DELETE" && req.url?.startsWith("/insurance/policies/")) {
    if (!runMiddlewares(guardedReq, res, [authenticate, authorize("editInsurance"), validateCsrf])) return true;
    await deletePolicy(req, res);
    return true;
  }

  // GET MONTHLY EXCEL REPORT
  if (req.method === "GET" && req.url?.startsWith("/insurance/monthly-report")) {
    if (!requireAccess("viewInsurance")) return true;
    await getMonthlyReport(req, res);
    return true;
  }

  return false;
};

