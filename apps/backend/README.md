# Backend API Notes

## Policy Report Endpoints

All policy report endpoints require a valid Bearer token in the Authorization header.

- `GET /insurance/policies/:id/report`
  - Returns report JSON data.
- `GET /insurance/policies/:id/report/html`
  - Returns backend-rendered HTML (`Content-Type: text/html; charset=utf-8`).
  - Useful for preview in a browser tab.
- `GET /insurance/policies/:id/report/download`
  - Returns PDF (`Content-Type: application/pdf`).

## Auth Notes

For direct browser navigation, custom Authorization headers are not sent by default. If your frontend stores JWT tokens and uses header-based auth, use fetch-based flows:

Preview HTML in a new window:

```ts
const token = localStorage.getItem("token");
const policyId = 123;
const res = await fetch(`/insurance/policies/${policyId}/report/html`, {
  headers: { Authorization: `Bearer ${token}` },
});
const html = await res.text();
const popup = window.open("", "_blank");
if (popup) {
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
```

Download PDF with fetch + blob:

```ts
const token = localStorage.getItem("token");
const policyId = 123;
const res = await fetch(`/insurance/policies/${policyId}/report/download`, {
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `policy-report-${policyId}.pdf`;
a.click();
URL.revokeObjectURL(url);
```

## Environment Configuration

Update backend `.env` (or copy from `.env.example`):

- `PDF_USE_FRONTEND=false`
  - Recommended default. Forces backend HTML rendering for PDF generation.
- `FRONTEND_PREVIEW_BASE_URL=http://localhost:5173`
  - Only used when `PDF_USE_FRONTEND=true`.
- `PDF_AUTH_TOKEN=`
  - Optional token used for frontend preview mode in Puppeteer.
- `PDF_MAX_CONCURRENCY=2`
  - Max concurrent Puppeteer PDF jobs.
- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173`
  - Comma-separated list of allowed frontend origins.

## Operational Notes

- Global API rate limiting is applied in middleware.
- PDF generation now uses a bounded in-process queue (`PDF_MAX_CONCURRENCY`) to reduce Puppeteer load spikes.
- Backend falls back to server-rendered HTML if frontend preview mode fails.
- Monitor logs for `Policy PDF generation error` and fallback warnings for latency/failure trends.
