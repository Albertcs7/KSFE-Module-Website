# KSFE Internal Website

Monorepo for the KSFE internal website. The repository contains a TypeScript backend service and a Vue 3 frontend SPA.

## Project Structure

- `apps/backend` - Node.js + TypeScript API (Express), MySQL access, auth and insurance modules, report/PDF generation and DB migrations.
- `apps/frontend` - Vue 3 + Vite single-page application (Pinia for state, vue-router for routing).

## Frameworks & Key Libraries

- **Frontend:** Vue 3, Vite, Pinia, vue-router, TypeScript, ESLint, Prettier
- **Backend:** Node.js, Express 5, TypeScript, ts-node, mysql2, jsonwebtoken, dotenv, puppeteer, exceljs
- **Monorepo:** npm workspaces (root package.json manages `apps/frontend` and `apps/backend`)

## Features (included)

- Authentication module (JWT sessions, auth middleware, CSRF protection)
- Insurance module with API endpoints, repository layer, and report generation
- PDF/report export using Puppeteer and Excel export using ExcelJS
- Database migrations and a migration script at `apps/backend/scripts/migrate.ts`
- Request logging, rate limiting, and common HTTP middleware
- External auth integration client/service (for third-party SSO)
- TypeScript types and integration points exposed in `apps/*/src/types`

## Requirements

- Node.js 20 or newer (frontend enforces engines in `apps/frontend/package.json`)
- MySQL database (schema available under `MYSql databse/ksfedb.sql` and migrations in `apps/backend/migrations`)
- Backend environment variables configured (place a `.env` in `apps/backend` matching `apps/backend/config/env.ts`)

## Install

From the repository root:

```bash
npm install 
```

## Run (development)

Start the backend (from repo root or from `apps/backend`):

```bash
cd apps/backend
npm run dev
```

Start the frontend (from repo root or from `apps/frontend`):

```bash
cd apps/frontend
npm run dev
```

## Database migrations

Run migrations from `apps/backend`:

```bash
cd apps/backend
npm run migrate
```

## Useful scripts

- Frontend: `npm run dev`, `npm run build`, `npm run preview`
- Backend: `npm run dev`, `npm run migrate`

## Development notes

- Backend entry: `apps/backend/src/server.ts` and `apps/backend/src/app.ts`.
- Frontend entry: `apps/frontend/src/main.ts` and `apps/frontend/vite.config.ts`.
- Check `apps/backend/README.md` for backend-specific endpoints and report generation details.

## Contributing / Next steps

- Add a root-level `.env.example` documenting required backend env vars.
- Consider adding simple Docker Compose for local MySQL + app dev environment.

## Contact

For questions about modules or running the project, check `apps/backend/README.md` or ask the repository maintainer.
