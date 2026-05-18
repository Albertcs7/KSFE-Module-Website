# KSFE Project — Architecture Forensic Analysis

## Summary

This document provides a granular, function-by-function forensic analysis of the KSFE codebase (backend auth + insurance features and frontend auth/insurance integration). It lists purpose, logic & workflow, dependencies, exact data flow (inputs → transformations → outputs), and integration points for each module and function.

---

## Repository entry points

**File:** apps/backend/src/server.ts

- Purpose: Bootstrap backend: load env, test DB, start HTTP server, graceful shutdown.
- Logic & Workflow:
  - Load `.env` via `dotenv`.
  - Create HTTP app via `createApp()`.
  - Test DB connection (`db.getConnection()`).
  - Start server on `PORT`.
  - Handle SIGINT/SIGTERM: close HTTP server and `db.end()`.
- Dependencies:
  - `dotenv`, `createApp()` (apps/backend/src/app.ts), `db` (apps/backend/src/database/mysql.ts), `logger`.
- Data Flow:
  - Input: env vars.
  - Stores: opens DB pool, listens on HTTP.
  - Output: running HTTP server; logs status.

**File:** apps/backend/src/app.ts

- Purpose: Node HTTP server factory; apply CORS, rate-limiting, preflight, request logging, and routing.
- Logic & Workflow:
  - Attach request logger.
  - Set CORS headers for allowed origins.
  - Apply `rateLimit(req,res)`; return early on limit.
  - Handle `OPTIONS` preflight (204).
  - Call `router(req,res)` and return 404 if not handled.
- Dependencies: `rateLimit`, `attachRequestLogger`, `router`, `logger`.
- Data Flow:
  - Input: `IncomingMessage` / `ServerResponse`.
  - Transformations: header setting, middleware checks.
  - Output: forwarded to route handlers or direct HTTP response.

---

## HTTP Core Helpers

**File:** apps/backend/src/core/http/requestLogger.ts

- Function: `attachRequestLogger(req, res)`
  - Purpose: Log request lifecycle and response timing.
  - Logic: record start time; on `res.finish` compute latency and call `logger.info`.
  - Dependencies: `logger`.
  - Data Flow: Input `req`/`res` → output `logger.info`.

**File:** apps/backend/src/core/http/rateLimiter.ts

- Function: `rateLimit(req, res)`
  - Purpose: Simple IP-based rate limiting.
  - Logic: maintain Map<ip, {count, windowStart}>; reset on window expiry; block when count > `RATE_LIMIT_REQUESTS`.
  - Dependencies: env `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_MS`, `logger`.
  - Data Flow:
    - Input: `req.socket.remoteAddress`.
    - Output: boolean true (continue) or writes 429 JSON and returns false.

**File:** apps/backend/src/core/http/middlewareRunner.ts

- Function: `runMiddlewares(req, res, middlewares)`
  - Purpose: Execute middleware functions sequentially until one fails.
  - Data Flow: returns boolean pass/fail.

---

## Utilities & DB

**File:** apps/backend/src/utils/parseBody.ts

- Function: `parseBody(req): Promise<any>`
  - Purpose: Read and parse JSON request bodies from Node `IncomingMessage`.
  - Logic: accumulate `data` chunks, `end` -> JSON.parse; rejects on invalid JSON.
  - Dependencies: Node `IncomingMessage`.
  - Data Flow:
    - Input: raw request body stream.
    - Output: parsed JS object or rejection.

**File:** apps/backend/src/database/mysql.ts

- Export: `db` (mysql2/promise pool)
  - Purpose: Provide pooled DB connection.
  - Dependencies: `mysql2/promise`, env `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
  - Data Flow: used by repositories and services for queries and transactions.

---

## Logger

**File:** apps/backend/src/core/logger/logger.ts

- Purpose: Central structured logging with sanitization.
- Logic & Features:
  - Sanitizes sensitive keys (password, token, jwt, etc.) recursively.
  - Writes console (colorized in non-prod), `combined.log`, and `error.log`.
- Dependencies: `winston`, `fs`, `path`.
- Data Flow: Receives log messages and metadata, sanitizes, writes to transports.

---

## Feature Group: Authentication (Auth)

Module: Authentication - Controller

- File: apps/backend/src/core/auth/auth.contoller.ts
  - Functions:
    - `loginController(req, res)`
      - Purpose: Accepts login credentials, invokes `loginService`, sets refresh & CSRF cookies, returns access token and user payload.
      - Dependencies: `loginService`, `createRefreshSession` (via `loginService`), env config: cookie names and token config, `jwt`.
      - Logic & Workflow:
        1. Parse JSON body (internal `parseBody` in controller).
        2. Validate `UID` and `password`.
        3. Call `loginService(body)`.
        4. Receive `{ refreshToken, csrfToken, data... }`.
        5. Set `Set-Cookie` for `REFRESH_COOKIE_NAME` and `CSRF_COOKIE_NAME`.
        6. Return 200 JSON with auth payload (access token included in `data.token`).
      - Data Flow:
        - Input: HTTP JSON body { UID, password, token }.
        - Transformations: validated; forwarded to external auth via `loginService`.
        - Outputs: Sets cookies (server-side refresh session & CSRF), returns JSON with `data` containing `token` and user details.
        - Where data stored/passed: refresh token stored server-side in `refreshSessions` (see `auth.session`), cookie persisted to client.

    - `refreshController(req, res)`
      - Purpose: Rotate refresh session and issue new access token.
      - Dependencies: `rotateRefreshSession` (auth.session), `jwt`, cookie parsing.
      - Logic:
        1. Read cookies; get refresh token and `x-csrf-token` header.
        2. Call `rotateRefreshSession(token, csrf)`.
        3. Create new access token (signed JWT).
        4. Set new cookies and return JSON `{ data: { token: accessToken } }`.
      - Data Flow:
        - Input: refresh cookie, `x-csrf-token` header.
        - Transformations: verify & rotate refresh session; sign new access JWT.
        - Output: sets new cookies (rotated refresh token, CSRF) and returns access token in response body.

    - `logoutController(req, res)`
      - Purpose: Revoke refresh session and clear cookies.
      - Dependencies: `revokeRefreshSession`.
      - Logic:
        1. Extract refresh cookie, verify token if present and revoke session (delete server-side).
        2. Set cookies with Expires in past to clear them.
        3. Return `{ status: true, message: "Logged out" }`.
      - Data Flow:
        - Input: refresh cookie.
        - Output: clears cookies on client; server-side `refreshSessions` entry deleted.

Module: Authentication - Service & Session

- File: apps/backend/src/core/auth/auth.service.ts
  - Functions:
    - `loginService(data)`
      - Purpose: Authenticate via external auth API and produce access/refresh tokens and user payload returned to controller.
      - Dependencies: `externalAuthLogin` (integrations/external-auth), `createAccessToken`, `createRefreshSession`.
      - Logic:
        1. Call external auth API (`externalAuthLogin`) with credentials.
        2. Validate response `status`.
        3. Build `payload` (role, employeeId, branchId, designation, permissions, modules). NOTE: permissions/modules are currently hardcoded (`forcedPermissions`, `forcedModules`) as a temporary measure.
        4. Create access token (`createAccessToken`) and refresh session (`createRefreshSession`) and return token + refresh token + csrf token.
      - Data Flow:
        - Inputs: `{ UID, password, token }`.
        - Transformations: call external auth → map external response to internal `AuthTokenClaims` → sign access token, create refresh session.
        - Outputs: returns `{ status, message, data, refreshToken, csrfToken }`. Access token returned in `data.token`; refresh token stored server-side via `refreshSessions` and a cookie sent to client.

- File: apps/backend/src/core/auth/auth.session.ts
  - Purpose: Manage in-memory refresh sessions (rotate, create, verify, revoke), and create access JWTs.
  - Dependencies: `jsonwebtoken`, `crypto`.
  - Key functions:
    - `createRefreshSession(payload)`:
      - Creates `jti`, `csrfToken`, calculates `expiresAt`, signs refresh token with `REFRESH_TOKEN_SECRET`, stores session in `refreshSessions` Map keyed by `jti`.
      - Data flow: Input `AuthTokenClaims` => create session => store in in-memory Map => returns `{ refreshToken, csrfToken, jti, expiresAt }`.
    - `verifyRefreshSession(refreshToken, csrfToken)`:
      - Verifies JWT refresh token, looks up session by `jti` in `refreshSessions`, checks CSRF match.
    - `rotateRefreshSession(refreshToken, csrfToken)`:
      - Validates and deletes old session, creates a new one and returns rotated tokens and payload.
    - `revokeRefreshSession(refreshToken)`:
      - Extracts `jti` and removes from Map.
  - Security notes: server stores sessions in-memory Map `refreshSessions` (ephemeral across process restarts). CSRF token required to rotate; refresh token cookie is HttpOnly.

- File: apps/backend/src/integrations/external-auth/externalAuth.client.ts
  - Purpose: Axios client wrapper for external auth API.
  - Dependencies: `axios`, `EXTERNAL_AUTH_API_URL` from env, `logger`.
  - Data Flow:
    - Input: endpoint path and payload -> POST to external API -> returns parsed `LoginApiResponse`.
    - Errors: wraps axios errors with consistent messages.

- File: apps/backend/src/integrations/external-auth/externalAuth.service.ts
  - Purpose: Thin adapter to call `externalAuthClient("/admin/login", payload)`.

Integration Points (Auth)

- Frontend:
  - apps/frontend/src/services/api/auth.api.ts calls backend `/auth/login`, `/auth/refresh`, `/auth/logout`.
  - Frontend `axios` instance attaches access token from `localStorage` and `refreshClient` attaches CSRF by reading cookie `XSRF-TOKEN`.

- Backend:
  - `auth.routes` exposes `/auth/login`, `/auth/refresh`, `/auth/logout` handled by `auth.controller`.

---

## Feature Group: Authorization & Middleware

- File: apps/backend/src/core/auth/auth.middleware.ts
  - Functions:
    - `authenticate(req, res)`:
      - Purpose: Verify Bearer access token from `Authorization` header; attach decoded JWT claims to `req.user`.
      - Dependencies: `jsonwebtoken`, JWT env config.
      - Data flow:
        - Input: HTTP header `Authorization: Bearer <token>`.
        - Output: on success sets `req.user` to decoded claims; on failure writes 401 response.
    - `authorize(requiredPermission)`:
      - Purpose: Factory that returns middleware to check `req.user.permissions` inclusion of `requiredPermission`.
      - Data flow:
        - Input: `req.user` (attached by `authenticate`) and permission string.
        - Output: returns true if allowed else sets 403 response.

- `runMiddlewares` is used in the router to combine `authenticate` and `authorize` checks.

---

## Feature Group: Insurance (Viewing, Searching, Adding, Remittance, Cheque, Update, Delete, Report)

Module: Insurance Routes

- File: apps/backend/src/modules/insurance/insurance.routes.ts
  - Purpose: Map HTTP endpoints under `/insurance/*` to controller handlers and enforce permission middlewares.
  - Key endpoints and required permissions:
    - GET `/insurance/policies/search` → `viewInsurance`
    - GET `/insurance/policies` → `viewInsurance`
    - POST `/insurance/policies` → `editInsurance`
    - POST `/insurance/remittance` → `editInsurance`
    - POST `/insurance/cheque` → `editInsurance`
    - PUT `/insurance/policies/:policyNo` → `editInsurance`
    - PATCH `/insurance/policies/:policyNo/deactivate` → `deactivateInsurance`
    - DELETE `/insurance/policies/:policyNo` → `editInsurance`
    - GET `/insurance/monthly-report` → `viewInsurance`
  - Dependencies: `authenticate`, `authorize`, `runMiddlewares`, controller functions in `insurance.controller.ts`.

Module: Insurance Controller

- File: apps/backend/src/modules/insurance/insurance.controller.ts
  - Exposed controller functions:
    - `getAllPolicies(req, res)`
      - Purpose: Return list of all policies.
      - Dependencies: `getAllPoliciesService`.
      - Workflow: call service → write 200 with JSON data.
      - Data Flow: no request body; writes DB data to response.

    - `searchPolicies(req, res)`
      - Purpose: Search policies supporting `empCode`, `empName`, `policyNo`, `limit`, `offset` query params.
      - Dependencies: `searchPoliciesService`.
      - Workflow:
        1. Parse query params via `URL`.
        2. Call `searchPoliciesService({empCode, empName, policyNo, limit, offset})`.
        3. Return result JSON.
      - Data Flow:
        - Inputs: query params from URL; outputs: JSON containing `data` (policy rows with remittances), `remittances`, `total`, `limit`, `offset`.

    - `createPolicy(req, res)`
      - Purpose: Create new policy record.
      - Dependencies: `parseBody`, `createPolicyService`.
      - Workflow:
        1. Parse JSON body.
        2. Call `createPolicyService(body)`.
        3. Return 201 with message and created DB result.
      - Data Flow:
        - Input: JSON body `{ employee_code, employee_name, policy_no, policy_type, premium, ... }`.
        - Output: Inserts row into `employee_policy` (via repo), returns DB insert result.

    - `createRemittance(req, res)`
      - Purpose: Create a remittance record for a policy (salary/due months).
      - Dependencies: `parseBody`, `createRemittanceService`, `logger`.
      - Workflow:
        1. Parse body: expects `{ empCode, policyNumber, salaryMonth, dueMonth, amountDeducted, chequeId? }`.
        2. Validate required fields.
        3. Call `createRemittanceService(...)`.
        4. Return 201 with created result.
      - Data Flow:
        - Input: front-end sends `empCode` (string), `policyNumber` (string), `salaryMonth` (`YYYY-MM`), `dueMonth` (`YYYY-MM`), `amountDeducted` (number), optional `chequeId`.
        - Transformations:
          - `createRemittanceService` converts `empCode` to number, converts `YYYY-MM` → `YYYY-MM-01`, queries DB to lock employee_policy row (FOR UPDATE), inserts into `policy_remittance`.
        - Output: Inserts into `policy_remittance` table (DB), returns DB insert result.

    - `updatePolicy(req, res)`
      - Purpose: Update policy identified by last segment of path (policy number).
      - Dependencies: `parseBody`, `updatePolicyService`.
      - Workflow:
        1. Parse body; extract `policyNo` from URL path.
        2. Validate required fields (`employee_name`, `policy_type`, `premium`).
        3. Call `updatePolicyService(policyNo, body)`.
        4. Return 200 with message and DB result.
      - Data Flow:
        - Input: `policyNo` from URL, body with updated fields.
        - Output: DB `UPDATE employee_policy` via repo.

    - `deletePolicy(req, res)`
      - Purpose: Delete a policy and its remittances atomically.
      - Dependencies: `deletePolicyService`.
      - Workflow:
        1. Extract `policyNo`.
        2. Call `deletePolicyService(policyNo)` which:
           - Begins transaction, selects `employee_policy_id`, deletes remittances, deletes employee_policy row, commits.
        3. Return 200 with delete result.
      - Data Flow:
        - Input: `policyNo` from URL.
        - Output: Deletes rows in `policy_remittance` and `employee_policy` tables.

    - `deactivatePolicy(req, res)`
      - Purpose: Mark policy as deactivated (`status = 0`).
      - Dependencies: `deactivatePolicyService`.
      - Workflow: extract `policyNo`, call service, return 200.
      - Data Flow: Updates `employee_policy.status` in DB.

    - `createCheque(req, res)`
      - Purpose: Create a cheque record and attach matching remittances.
      - Dependencies: `parseBody`, `createChequeAndAttachService`.
      - Workflow:
        1. Parse body: expects `{ encashmentDate, receiptNo, salaryMonth, policyType }`.
        2. Validate.
        3. Call `createChequeAndAttachService`.
        4. Return 201 with response containing `chequeId` and `attachedRemittances`.
      - Data Flow:
        - Input: form data from frontend.
        - Transformations: converts `salaryMonth` to SQL date, inserts into `policy_cheque`, queries matching remittances `FOR UPDATE`, updates `policy_remittance.policy_cheque_id` for matching remittances.
        - Output: `policy_cheque` row and updated `policy_remittance` rows.

    - `getMonthlyReport(req, res)`
      - Purpose: Generate and return an Excel file (XLSX) for given `type` (GIS/SLI), `month` (MM), `year` (YYYY).
      - Dependencies: `generateMonthlyExcelReport` (service), `logger`.
      - Workflow:
        1. Validate query params `type`, `month`, `year`.
        2. Call service to get `{ buffer, filename }`.
        3. Set correct `Content-Type`, `Content-Disposition`, `Content-Length`.
        4. Write the XLSX buffer to response.
      - Data Flow:
        - Input: query params from URL.
        - Output: HTTP binary XLSX file (buffer) built by `ExcelJS` and streamed to client.

Module: Insurance Service

- File: apps/backend/src/modules/insurance/insurance.service.ts
  - Purpose: Business logic for insurance operations; transactions and Excel generation.
  - Key dependencies: `db` (connection pool), `ExcelJS`, `logger`, repository functions from `insurance.repository`.
  - Functions & specifics:

  - `getAllPoliciesService()`
    - Purpose: Fetch all policies.
    - Workflow: calls `getAllPoliciesRepo()`, returns rows.
    - Data Flow: DB SELECT → passthrough JSON.

  - `searchPoliciesService(params)`
    - Purpose: Search policies with remittances and pagination.
    - Workflow:
      1. Validate at least one of `empCode|empName|policyNo`.
      2. Calls `searchPoliciesRepo(params)` → gets policies.
      3. Calls `getPolicyRemittancesRepo(policyIds)` → gets remittances (latest up to 10 per policy).
      4. Calls `searchPoliciesCountRepo(params)` → total count.
      5. Constructs `remittancesByPolicyId` map and normalizes remittance objects.
      6. Returns structured response: `{ data: policyData, remittances, total, limit, offset }`.
    - Data Flow:
      - Input: query params.
      - Interactions with DB: multiple SELECT queries across `employee_policy`, `policy_remittance`, `policy_cheque`.
      - Output: structured JSON used by frontend search UI.

  - `createPolicyService(data)`
    - Purpose: Insert new `employee_policy`.
    - Workflow: validate required fields, call `createPolicyRepo(data)`. Handle duplicate key `ER_DUP_ENTRY` -> user-friendly error.
    - Data Flow: Input body -> `INSERT INTO employee_policy` -> returns insert result (insertId etc).

  - `createRemittanceService(data)`
    - Purpose: Insert remittance for a specific policy with concurrency control.
    - Workflow:
      1. Validate fields.
      2. Get dedicated DB connection and begin transaction.
      3. Parse `empCode` to number; `SELECT employee_policy_id ... FOR UPDATE` to lock row.
      4. Insert into `policy_remittance` with `salary_month` and `due_month` converted to `YYYY-MM-01`.
      5. Commit; on error rollback.
      6. Translate duplicate entry errors to user-friendly message.
    - Data Flow:
      - Inputs: from HTTP body.
      - DB interactions: SELECT FOR UPDATE on `employee_policy`, INSERT into `policy_remittance`.
      - Output: DB insert result.

  - `updatePolicyService(policyNo, data)`
    - Purpose: Update `employee_policy` with validation and status checks.
    - Workflow:
      1. Validate `policyNo` and required `data` fields.
      2. Retrieve existing policy via `getPolicyByNumberRepo`.
      3. If status=0, throw error (cannot update deactivated).
      4. Validate premium numeric and positive.
      5. Call `updatePolicyRepo(policyNo, data)`.
      6. Return update result.
    - Data Flow:
      - Inputs: path param & request body.
      - DB: SELECT then UPDATE.
      - Output: DB update metadata (`affectedRows`).

  - `deactivatePolicyService(policyNo)`:
    - Purpose: Set `status=0`.
    - Workflow: validate existence, call `deactivatePolicyRepo`.
    - Data Flow: Input path param -> UPDATE `employee_policy`.

  - `deletePolicyService(policyNo)`:
    - Purpose: Delete policy and dependent remittances in a transaction.
    - Workflow: begin transaction, select id, delete remittances, delete policy row, commit.
    - Data Flow: Input path param -> DELETE statements.

  - `createChequeAndAttachService(data)`:
    - Purpose: Insert cheque and atomically attach to matching remittances for same `salary_month` and `policy_type`.
    - Workflow:
      1. Validate inputs.
      2. Convert `salaryMonth` to SQL date.
      3. Begin transaction.
      4. Insert into `policy_cheque`, get `chequeId`.
      5. Query for remittances matching salary_month & policy_type where `policy_cheque_id IS NULL` with `FOR UPDATE`.
      6. Update `policy_remittance` rows to set `policy_cheque_id = chequeId` (batched).
      7. Commit.
    - Data Flow:
      - Inputs: cheque details from HTTP body.
      - DB: INSERT into `policy_cheque`, SELECT FOR UPDATE and batch UPDATE `policy_remittance`.
      - Output: `{ chequeId, attachedRemittances }` returned to controller, which returns an HTTP 201 JSON.

  - `generateMonthlyExcelReport(params)`
    - Purpose: Build monthly XLSX report (Excel) for GIS/SLI using `ExcelJS`.
    - Dependencies: `ExcelJS`, `getMonthlyReportDataRepo`.
    - Workflow:
      1. Validate month (1-12).
      2. Call `getMonthlyReportDataRepo(policyType, monthNum, year)`.
      3. Create workbook, format, and write buffer.
      4. Return buffer and filename.
    - Data Flow:
      - Input: `policyType`, `month`, `year`.
      - Output: XLSX binary buffer.

Module: Insurance Repository

- File: apps/backend/src/modules/insurance/insurance.repository.ts
  - Purpose: All DB queries for insurance domain via `db.query`.
  - Functions and SQL queries: see code for details (SELECTs, INSERTs, UPDATEs, DELETEs, partitioned remittance query).

---

## Frontend Integration

Module: HTTP client & Interceptors

- File: apps/frontend/src/services/http/axios.ts
  - Purpose: Axios instance for app API calls, token injection, and automatic refresh handling.
  - Dependencies: `axios`.
  - Key logic:
    - Request interceptor adds `Authorization` header from `localStorage`.
    - Response interceptor handles 401 by calling `/auth/refresh` via `refreshClient`, stores new token and retries; on failure clears auth and reloads.
    - `refreshClient` attaches CSRF token from cookie `XSRF-TOKEN`.
  - Data Flow:
    - Input: outgoing HTTP requests.
    - Transformations: token injection, CSRF header injection, automatic token refresh and request retry.

Module: Auth API layer

- File: apps/frontend/src/services/api/auth.api.ts
  - Functions: `loginApi`, `refreshApi`, `logoutApi`.
  - Data Flow: wraps axios calls and returns backend responses.

Module: Auth store

- File: apps/frontend/src/store/auth.store.ts
  - Purpose: Pinia store managing login/logout, token storage, and normalized user.
  - Actions:
    - `login(payload)` calls backend and stores `token` and `auth_user` in `localStorage`.
    - `logout()` clears local state and calls backend logout.

Module: Router guards

- File: apps/frontend/src/router/index.ts
  - Purpose: Global route guard for authentication and module-based authorization.
  - Logic: checks `localStorage.token` and `authStore.modules`.

Module: Insurance front-end APIs

- File: apps/frontend/src/services/api/insurance.api.ts
  - Purpose: API wrappers for insurance features and monthly report download.

---

## Feature Group: Policy Report Generation (HTML & PDF)

### Overview

Policy reports provide formatted A4-sized schedules of salary deductions for insurance policies. The system generates reports in two formats:

1. **HTML (backend-rendered)**: Complete page with styles, letterhead, policy details, and remittance table.
2. **PDF (via Puppeteer)**: Binary PDF file suitable for download or print.

Both formats are rendered entirely on the backend and served via HTTP endpoints with authentication and authorization checks.

### Backend Infrastructure

**File:** apps/backend/src/modules/insurance/insurance.routes.ts

- New endpoints for policy reports (with `viewInsurance` permission):
  - `GET /insurance/policies/:id/report` → `getPolicyReport` (fetch report data as JSON)
  - `GET /insurance/policies/:id/report/html` → `getPolicyReportHtml` (serve backend-rendered HTML)
  - `GET /insurance/policies/:id/report/download` → `downloadPolicyReport` (generate and serve PDF)

**File:** apps/backend/src/modules/insurance/insurance.controller.ts

Three controller functions handle policy report endpoints:

- `getPolicyReport(req, res)`:
  - Purpose: Fetch and return policy report data (JSON) for a given policy ID.
  - Workflow:
    1. Extract policy ID from URL path: `/insurance/policies/:id/report` → index [length-2].
    2. Validate policy ID (integer > 0).
    3. Call `getPolicyReportService(policyId)`.
    4. Return 200 with JSON report data; 400 if invalid ID, 404 if not found.
  - Data Flow:
    - Input: URL path parameter (policy ID).
    - Output: JSON object containing `{ policy, remittances, generatedAt, totalAmountDeducted }`.

- `getPolicyReportHtml(req, res)`:
  - Purpose: Serve complete, backend-rendered HTML report for inline display or printing.
  - Workflow:
    1. Extract policy ID from URL path: `/insurance/policies/:id/report/html` → index [length-3].
    2. Validate policy ID.
    3. Call `getPolicyReportService(policyId)` to fetch data.
    4. Call `generatePolicyReportHtml(reportData)` to build complete HTML string.
    5. Return 200 with `Content-Type: text/html; charset=utf-8` and HTML string.
  - Data Flow:
    - Input: URL path parameter (policy ID).
    - Transformations: fetch policy data → format dates, amounts → inject into HTML template.
    - Output: Complete, self-contained HTML document (no external CSS/JS dependencies).
  - Security: Requires `viewInsurance` permission via auth middleware.

- `downloadPolicyReport(req, res)`:
  - Purpose: Generate PDF report and serve as downloadable attachment.
  - Workflow:
    1. Extract policy ID from URL path: `/insurance/policies/:id/report/download` → index [length-3].
    2. Validate policy ID.
    3. Call `generatePolicyPdfReport(policyId)`.
    4. Return 200 with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`, and PDF buffer.
  - Data Flow:
    - Input: URL path parameter (policy ID).
    - Output: Binary PDF buffer; HTTP response headers for download.
  - Status codes: 400 invalid ID, 404 not found, 500 generation failure.

**File:** apps/backend/src/modules/insurance/insurance.service.ts

Three key functions manage policy report generation:

- `getPolicyReportService(policyId)`:
  - Purpose: Fetch and normalize report data from database.
  - Workflow:
    1. Validate policy ID (integer > 0); throw error if invalid.
    2. Call `getPolicyReportDataRepo(policyId)` to fetch from DB.
    3. Check if policy exists; throw 404 error if not found.
    4. Normalize remittance array: convert fields to proper types (number, string, date).
    5. Calculate `totalAmountDeducted` by summing all remittance amounts.
    6. Return structured object: `{ policy, remittances, generatedAt, totalAmountDeducted }`.
  - Data Flow:
    - Input: policy ID (number).
    - DB query: fetch policy record and all associated remittances (including linked cheque data).
    - Output: normalized TypeScript object matching `PolicyReportData` type.

- `generatePolicyReportHtml(reportData)`:
  - Purpose: Transform normalized report data into complete A4 HTML document with inline CSS.
  - Template structure:
    - `<!doctype html>` with A4 page sizing (`210mm × 297mm`).
    - **Letterhead**: KSFE logo embedded as base64 data URI.
    - **Date**: Generated date (top right, right-aligned).
    - **Title**: Centered policy type heading (e.g., "Schedule of salary deduction for GIS").
    - **Details section**: 2-column layout with employee name, code, policy no, maturity date.
    - **Remittance table**:
      - 5 columns: Due Month | Amount Deducted | Salary Month | Date of Encashment | Receipt No / Cheque Details.
      - Rows: one per remittance, amount formatted with Indian locale (₹ symbol, commas, 2 decimals).
      - Empty state message if no remittances.
    - **Signature block**: "Yours faithfully, For The K.S.F.E. LTD, DEPUTY GENERAL MANAGER (P&HR)".
    - **CSS**: embedded `<style>` tag with print-friendly styles (A4 sizing, borders, grid layout, no background colors for print).
  - Data Flow:
    - Input: `PolicyReportData` object (policy details + remittances array).
    - Transformations: HTML escape all user data; format dates via `formatDateLabel()`; format amounts via `toLocaleString()`; map remittances to table rows.
    - Output: string containing complete HTML document.
  - Security: All user data is HTML-escaped to prevent XSS in rendered output.

- `generatePolicyPdfReport(policyId)`:
  - Purpose: Launch headless browser (Puppeteer), render report HTML, and export PDF.
  - Workflow:
    1. Acquire PDF concurrency slot (see PDF queue management below).
    2. Fetch report data via `getPolicyReportService(policyId)`.
    3. Launch Puppeteer headless browser with sandbox disabled.
    4. If `PDF_USE_FRONTEND=true` (from env):
       - Navigate to frontend policy report preview URL with timestamp query param.
       - Set localStorage token if `PDF_AUTH_TOKEN` is provided.
       - Wait for network idle; catch errors and fall back to backend HTML.
    5. Else set page content directly to backend-generated HTML.
    6. Emulate screen media type.
    7. Generate PDF via `page.pdf()` with A4 format, print background enabled, 20px margins.
    8. Release concurrency slot.
    9. Return `{ buffer, filename }` where filename is `policy-report-{policyNo}.pdf`.
  - PDF Concurrency Management:
    - Global counters: `activePdfJobs` (current count), `pdfQueue` (pending jobs).
    - `acquirePdfSlot()`: if jobs < max, increment immediately; else queue callback to wait.
    - `releasePdfSlot()`: decrement jobs; dequeue and execute next pending job.
    - Default max: `PDF_MAX_CONCURRENCY` from env (prevents memory/resource overload).
  - Data Flow:
    - Input: policy ID, env config for PDF behavior.
    - Puppeteer interactions: launch browser → create page → setContent or goto URL → emit PDF.
    - Output: PDF binary buffer and suggested filename.
  - Error handling: non-200 PDF fetch falls back to backend HTML with warning log.

### Environment Configuration

**File:** apps/backend/src/config/env.ts

New environment variables for policy report generation:

- `PDF_USE_FRONTEND` (boolean, default=false): If true, attempt to render PDF using frontend preview route; else use backend HTML directly.
- `FRONTEND_PREVIEW_BASE_URL` (string, default="http://localhost:5173"): Base URL of frontend for preview navigation.
- `PDF_AUTH_TOKEN` (string, optional): Token to inject into Puppeteer localStorage for authentication when rendering frontend preview.
- `PDF_MAX_CONCURRENCY` (number, default=2): Maximum concurrent Puppeteer jobs to limit memory usage.
- `CORS_ALLOWED_ORIGINS` (string, comma-separated): Origins allowed to access backend API (e.g., "http://localhost:5173,http://localhost:4173").

### Frontend Integration

**File:** apps/frontend/src/modules/Insurance/pages/PolicyReportPreviewPage.vue

Single-page component for viewing and downloading policy reports. Accessed via `/insurance/policies/:id/report`.

Script section (TypeScript):

- Reactive refs:
  - `policyId`: computed from route params (extracted and validated as numeric string).
  - `isLoading`: boolean indicating HTML fetch in progress.
  - `isDownloading`: boolean indicating PDF download in progress.
  - `htmlContent`: string containing backend-rendered HTML.
  - `errorMessage`: string for displaying fetch/auth errors.
- Functions:
  - `loadReportHtml()`:
    - Validates policy ID and authentication token.
    - Fetches from `{API_BASE_URL}/insurance/policies/{policyId}/report/html` with Bearer token.
    - Stores HTML in `htmlContent` on success; sets `errorMessage` on failure.
    - Called on mounted and when `policyId` changes (reactively).
  - `handleDownloadPdf()`:
    - Calls `downloadPolicyReport(policyId)` API function.
    - Parses `Content-Disposition` header to extract filename.
    - Creates blob and triggers browser download.
    - Shows success/error toast notification.
  - `handleBack()`: navigates back to `/insurance/policies` list.

Template section (Vue):

- Toolbar: title ("Policy Report"), subtitle, Back button, Download PDF button.
- Status display:
  - Loading spinner message: "Loading report..." when `isLoading=true`.
  - Error message card (red background): shows `errorMessage` if present.
  - Report display: iframe with `srcdoc` attribute containing fetched HTML when `htmlContent` exists.
- Styling: responsive grid layout, A4-sized iframe (900px height on desktop, 600px on mobile), print-friendly (hides toolbar on `@media print`).

### Data Flow: Policy Report End-to-End

1. **User navigates to policy report page**: `/insurance/policies/123/report`.
2. **Frontend route loads component**: `PolicyReportPreviewPage.vue` mounts.
3. **onMounted hook fires**: calls `loadReportHtml()`.
4. **Frontend fetches HTML**:
   - URL: `GET /insurance/policies/123/report/html`.
   - Header: `Authorization: Bearer {token}`.
5. **Backend processes request**:
   - `authenticate` middleware verifies token → sets `req.user`.
   - `authorize('viewInsurance')` checks permission → allows or denies.
   - `getPolicyReportHtml` handler extracts policy ID from path.
   - Calls `getPolicyReportService(123)` → queries DB for policy + remittances.
   - Calls `generatePolicyReportHtml(data)` → formats into HTML template.
   - Returns 200 with `text/html` and complete HTML string.
6. **Frontend receives HTML**: stores in `htmlContent` ref.
7. **Template renders iframe**: `<iframe :srcdoc="htmlContent">` displays HTML inline.
8. **User clicks Download PDF**: calls `handleDownloadPdf()`.
9. **Frontend fetches PDF**:
   - URL: `GET /insurance/policies/123/report/download`.
   - Header: `Authorization: Bearer {token}`.
10. **Backend generates PDF**:
    - `authenticate` and `authorize` middleware (same).
    - `downloadPolicyReport` handler calls `generatePolicyPdfReport(123)`.
    - Acquires PDF concurrency slot (waits if limit reached).
    - Launches Puppeteer, renders report HTML (or frontend preview if enabled), exports PDF.
    - Returns 200 with PDF binary, `Content-Disposition: attachment; filename="policy-report-{policyNo}.pdf"`.
11. **Frontend receives blob**: triggers browser download via `<a href=blob>` trick.

### Security Considerations

- **Authentication**: Both HTML and PDF endpoints require valid Bearer token in `Authorization` header.
- **Authorization**: Both endpoints require `viewInsurance` permission; user must have this role.
- **HTML escaping**: All dynamic data in generated HTML is escaped to prevent XSS (user names, policy numbers, amounts).
- **PDF generation**: Puppeteer runs in sandboxed headless mode with `--no-sandbox` on Linux (note: production should evaluate sandbox policy).
- **CORS**: Backend respects `CORS_ALLOWED_ORIGINS` env var; frontend must be whitelisted.
- **Token handling in PDF**: If rendering frontend preview, token is injected into Puppeteer localStorage (not URL param) for auth.

---

## Cross-cutting Data Flow (high-level)

- Login:
  - Frontend `loginApi` → Backend `loginController` → `loginService` → external auth → create access token + refresh session → set cookies + return access token to frontend.
- Authenticated requests:
  - Axios sends access token → backend `authenticate` middleware verifies → `authorize` checks permissions.
- Token refresh:
  - Axios interceptor calls `/auth/refresh` with CSRF header → backend rotates refresh session and returns new access token.
- Insurance operations:
  - Create remittance and cheque flows use DB transactions and `FOR UPDATE` locks; monthly report built via `ExcelJS` and streamed as buffer.
- Policy reports:
  - Frontend fetches backend-rendered HTML via Bearer token → backend normalizes DB data → generates A4 HTML with embedded styles → returns to frontend → frontend displays in iframe.
  - PDF generation: Puppeteer headless browser renders HTML (backend or frontend preview) → emits PDF with A4 format and print margins → returns binary to frontend → browser triggers download.

---

## Security & Operational Notes

- Refresh sessions stored in-memory Map (not suitable for multi-instance production). Recommend Redis.
- CSRF: refresh cookie is HttpOnly; CSRF token provided separately.
- Concurrency: services use `FOR UPDATE` to serialize critical updates.
- Duplicate DB errors `ER_DUP_ENTRY` mapped to user-friendly messages.

---

## Actionable Recommendations

- Persist refresh sessions in a shared store (Redis) for multi-instance stability.
- Replace `forcedPermissions` / `forcedModules` with real external auth data.
- Standardize `parseBody` usage across controllers.
- Stream large Excel exports to reduce memory footprint.

---

## Files Reviewed (quick list)

- Backend: server, app, routes, logger, database, utils, auth modules, insurance modules, external auth client, http helpers.
- Frontend: axios client, auth api, insurance api, auth.store, router.

---

If you want I can commit this file to git with a commit message. Would you like me to do that now?
