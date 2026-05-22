import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate, authorize } from "../../core/auth/auth.middleware";
import { validateCsrf } from "../../core/auth/csrf.middleware";
import { createCheque, createPolicy, createRemittance, deactivatePolicy, deletePolicy, downloadPolicyReport, getAllPolicies, getMonthlyReport, getPolicyReport, getPolicyReportHtml, searchPolicies, updatePolicy } from "./insurance.controller";

const asyncRoute = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

const router = Router();

const requireAccess = (permission: string) => [authenticate, authorize(permission)] as const;
const requireEdit = [authenticate, authorize("editInsurance"), validateCsrf] as const;

router.get("/insurance/policies/search", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await searchPolicies(req, res); }));
router.get("/insurance/policies/:policyId/report", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await getPolicyReport(req, res); }));
router.get("/insurance/policies/:policyId/report/html", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await getPolicyReportHtml(req, res); }));
router.get("/insurance/policies/:policyId/report/download", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await downloadPolicyReport(req, res); }));
router.get("/insurance/policies", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await getAllPolicies(req, res); }));
router.post("/insurance/policies", ...requireEdit, asyncRoute(async (req, res) => { await createPolicy(req, res); }));
router.post("/insurance/remittance", ...requireEdit, asyncRoute(async (req, res) => { await createRemittance(req, res); }));
router.post("/insurance/cheque", ...requireEdit, asyncRoute(async (req, res) => { await createCheque(req, res); }));
router.put("/insurance/policies/:policyNo", ...requireEdit, asyncRoute(async (req, res) => { await updatePolicy(req, res); }));
router.patch("/insurance/policies/:policyNo/deactivate", authenticate, authorize("deactivateInsurance"), validateCsrf, asyncRoute(async (req, res) => { await deactivatePolicy(req, res); }));
router.delete("/insurance/policies/:policyNo", ...requireEdit, asyncRoute(async (req, res) => { await deletePolicy(req, res); }));
router.get("/insurance/monthly-report", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await getMonthlyReport(req, res); }));

export const insuranceRoutes = router;

