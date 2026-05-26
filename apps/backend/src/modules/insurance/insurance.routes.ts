import { Router, type NextFunction, type Request, type Response } from "express";
import { param, query } from "express-validator";
import { authenticate, authorize } from "../../core/auth/auth.middleware";
import { validateCsrf } from "../../core/auth/csrf.middleware";
import { validateRequest } from "../../core/http/validation.middleware";
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

// Search insurance policies using query parameters (filters, paging)
router.get("/insurance/policies/search", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await searchPolicies(req, res); }));

// Validation for report routes: ensure positive integer policyId and optional query params
const reportValidators = [
  param("policyId").isInt({ gt: 0 }).withMessage("policyId must be a positive integer").toInt(),
  query("deathType").optional().isString().isLength({ max: 50 }).withMessage("deathType must be a short string"),
  query("deathDate").optional().isISO8601().withMessage("deathDate must be a valid date (YYYY-MM-DD)"),
  validateRequest,
];

// Get a generated report for a specific policy (JSON/binary response)
router.get(
  "/insurance/policies/:policyId/report",
  ...requireAccess("viewInsurance"),
  ...reportValidators,
  asyncRoute(async (req, res) => { await getPolicyReport(req, res); })
);

// Get the policy report rendered as HTML
router.get(
  "/insurance/policies/:policyId/report/html",
  ...requireAccess("viewInsurance"),
  ...reportValidators,
  asyncRoute(async (req, res) => { await getPolicyReportHtml(req, res); })
);

// Download the policy report as an attachment
router.get(
  "/insurance/policies/:policyId/report/download",
  ...requireAccess("viewInsurance"),
  ...reportValidators,
  asyncRoute(async (req, res) => { await downloadPolicyReport(req, res); })
);

// List all policies (supports paging and basic filters)
router.get("/insurance/policies", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await getAllPolicies(req, res); }));

// Create a new insurance policy
router.post("/insurance/policies", ...requireEdit, asyncRoute(async (req, res) => { await createPolicy(req, res); }));

// Create a remittance record (payment/transfer)
router.post("/insurance/remittance", ...requireEdit, asyncRoute(async (req, res) => { await createRemittance(req, res); }));

// Create a cheque/payment record
router.post("/insurance/cheque", ...requireEdit, asyncRoute(async (req, res) => { await createCheque(req, res); }));

// Update an existing policy by policy number
router.put("/insurance/policies/:policyNo", ...requireEdit, asyncRoute(async (req, res) => { await updatePolicy(req, res); }));

// Deactivate a policy (soft-disable) — CSRF-protected and restricted
router.patch("/insurance/policies/:policyNo/deactivate", authenticate, authorize("deactivateInsurance"), validateCsrf, asyncRoute(async (req, res) => { await deactivatePolicy(req, res); }));

// Delete a policy by policy number
router.delete("/insurance/policies/:policyNo", ...requireEdit, asyncRoute(async (req, res) => { await deletePolicy(req, res); }));

// Retrieve monthly aggregated insurance report
router.get("/insurance/monthly-report", ...requireAccess("viewInsurance"), asyncRoute(async (req, res) => { await getMonthlyReport(req, res); }));

export const insuranceRoutes = router;

