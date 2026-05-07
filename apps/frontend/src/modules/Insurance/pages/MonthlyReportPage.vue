<script setup lang="ts">
/**
 * MonthlyReportPage.vue
 * ─────────────────────
 * Organisation-wide report download page.
 * Admin picks a salary month → downloads ALL employees' data for that month.
 * Separate download buttons for SLI and GIS.
 */
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import { useGISStore } from "../store/useGISStore";
import { useSLIStore } from "../store/useSLIStore";

const sliStore = useSLIStore();
const gisStore = useGISStore();
const toast = useToast();

const salaryMonth = ref("");

/** Trigger a browser CSV download */
const downloadCSV = (filename: string, rows: string[][]) => {
  const content =
    "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.setAttribute("href", encodeURI(content));
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/** Download org-wide SLI report for the selected salary month */
const downloadSLI = () => {
  if (!salaryMonth.value) {
    toast.error("Please select a salary month.");
    return;
  }

  const rows: string[][] = [];
  rows.push([`KSFE - SLI Organisation Report`]);
  rows.push([`Salary Month`, salaryMonth.value]);
  rows.push([`Generated On`, new Date().toLocaleDateString("en-IN")]);
  rows.push([]);

  const empMap = new Map<string, typeof sliStore.users[0]>();
  sliStore.users.forEach((u) => {
    if (!empMap.has(u.empCode.toUpperCase())) empMap.set(u.empCode.toUpperCase(), u);
  });

  if (empMap.size === 0) {
    toast.error("No SLI employee data found.");
    return;
  }

  empMap.forEach((_, code) => {
    const policies = new Map<string, typeof sliStore.users[0]>();
    sliStore.users
      .filter((u) => u.empCode.toUpperCase() === code)
      .forEach((u) => policies.set(u.sliPolicyNumber.toUpperCase(), u));

    const empInfo = sliStore.users.find((u) => u.empCode.toUpperCase() === code)!;
    rows.push([`Employee Code`, empInfo.empCode, `Name`, empInfo.empName]);

    policies.forEach((policy) => {
      rows.push([
        `  Policy`,
        policy.sliPolicyNumber,
        `Premium`,
        `Rs.${policy.premium}`,
        `Maturity`,
        policy.dateOfMaturity,
      ]);
      rows.push([
        `  Due Month`,
        `Amount Deducted (Rs.)`,
        `Salary Month`,
        `Date of Encashment`,
        `Receipt No / Cheque No`,
      ]);

      const remittances = sliStore.remittances.filter(
        (r) =>
          r.empCode.toUpperCase() === code &&
          r.sliPolicyNumber === policy.sliPolicyNumber &&
          r.salaryMonth === salaryMonth.value
      );

      if (remittances.length === 0) {
        rows.push([`  No remittance records for this salary month.`]);
      } else {
        remittances.forEach((r) => {
          const cheque = sliStore.cheques.find(
            (c) => c.receiptNoOrChequeNo === r.chequeId
          );
          rows.push([
            `  ${r.dueMonth}`,
            r.amountDeducted.toString(),
            r.salaryMonth,
            cheque?.encashmentDate ?? "N/A",
            cheque?.receiptNoOrChequeNo ?? "N/A",
          ]);
        });
        const total = remittances.reduce((s, r) => s + r.amountDeducted, 0);
        rows.push([`  SUBTOTAL`, `Rs.${total}`, "", "", ""]);
      }
    });
    rows.push([]);
  });

  downloadCSV(`SLI_OrgReport_${salaryMonth.value}.csv`, rows);
  toast.success(`SLI organisation report downloaded (${empMap.size} employees).`);
};

/** Download org-wide GIS report for the selected salary month */
const downloadGIS = () => {
  if (!salaryMonth.value) {
    toast.error("Please select a salary month.");
    return;
  }

  const rows: string[][] = [];
  rows.push([`KSFE - GIS Organisation Report`]);
  rows.push([`Salary Month`, salaryMonth.value]);
  rows.push([`Generated On`, new Date().toLocaleDateString("en-IN")]);
  rows.push([]);

  if (gisStore.users.length === 0) {
    toast.error("No GIS employee data found.");
    return;
  }

  const seen = new Set<string>();
  gisStore.users.forEach((policy) => {
    const code = policy.empCode.toUpperCase();
    if (seen.has(code)) return;
    seen.add(code);

    rows.push([`Employee Code`, policy.empCode, `Name`, policy.empName]);
    rows.push([
      `  Policy`,
      policy.gisPolicyNumber,
      `Premium`,
      `Rs.${policy.premium}`,
      `Maturity`,
      policy.dateOfMaturity,
    ]);
    rows.push([
      `  Due Month`,
      `Amount Deducted (Rs.)`,
      `Salary Month`,
      `Date of Encashment`,
      `Receipt No / Cheque No`,
    ]);

    const remittances = gisStore.remittances.filter(
      (r) => r.empCode.toUpperCase() === code && r.salaryMonth === salaryMonth.value
    );

    if (remittances.length === 0) {
      rows.push([`  No remittance records for this salary month.`]);
    } else {
      remittances.forEach((r) => {
        const cheque = gisStore.cheques.find((c) => c.receiptNoOrChequeNo === r.chequeId);
        rows.push([
          `  ${r.dueMonth}`,
          r.amountDeducted.toString(),
          r.salaryMonth,
          cheque?.encashmentDate ?? "N/A",
          cheque?.receiptNoOrChequeNo ?? "N/A",
        ]);
      });
      const total = remittances.reduce((s, r) => s + r.amountDeducted, 0);
      rows.push([`  SUBTOTAL`, `Rs.${total}`, "", "", ""]);
    }
    rows.push([]);
  });

  downloadCSV(`GIS_OrgReport_${salaryMonth.value}.csv`, rows);
  toast.success(`GIS organisation report downloaded (${seen.size} employees).`);
};
</script>

<template>
  <section class="report-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header__icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      <div>
        <h1 class="page-title">Organisation Monthly Report</h1>
        <p class="page-subtitle">
          Select a salary month to download SLI or GIS remittance data for all employees.
        </p>
      </div>
    </div>

    <!-- Form Card -->
    <div class="report-card">
      <!-- Month Selector -->
      <div class="form-section">
        <label class="section-label" for="salaryMonthPicker">Select Salary Month</label>
        <div class="input-wrapper">
          <svg
            class="input-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input
            id="salaryMonthPicker"
            v-model="salaryMonth"
            type="month"
            class="month-input"
          />
        </div>
      </div>

      <!-- Download Buttons -->
      <div class="form-section">
        <p class="section-label">Download Report</p>
        <div class="download-grid">
          <button id="download-sli-btn" class="dl-btn sli" @click="downloadSLI">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span class="dl-title">Download SLI Report</span>
            <span class="dl-sub">All employees · All SLI policies</span>
          </button>

          <button id="download-gis-btn" class="dl-btn gis" @click="downloadGIS">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span class="dl-title">Download GIS Report</span>
            <span class="dl-sub">All employees · GIS policy per employee</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.report-page {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  font-family: inherit;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.page-header {
  width: min(100%, 760px);
}

.page-header__icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #1d3a6d, #2d5aa0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 20px rgba(29, 58, 109, 0.25);
}
.page-header__icon svg {
  width: 1.6rem;
  height: 1.6rem;
  stroke: #fff;
}

.page-title {
  margin: 0 0 0.3rem;
  font-size: 1.6rem;
  font-weight: 700;
  color: #0f172a;
}
.page-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
}

.report-card {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  width: min(100%, 760px);
  max-width: 640px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.section-label {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #475569;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 0.9rem;
  width: 1.1rem;
  height: 1.1rem;
  color: #94a3b8;
  pointer-events: none;
}
.month-input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.75rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  font-family: inherit;
  background: #f8fafc;
  color: #0f172a;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.month-input:focus {
  outline: none;
  border-color: #1d3a6d;
  box-shadow: 0 0 0 3px rgba(29, 58, 109, 0.1);
  background: #fff;
}

.download-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.dl-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  padding: 1.1rem 1.25rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.dl-btn svg {
  margin-bottom: 0.4rem;
  stroke: rgba(255, 255, 255, 0.9);
}
.dl-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
}
.dl-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.78);
}

.dl-btn.sli {
  background: linear-gradient(135deg, #1d3a6d, #2d5aa0);
}
.dl-btn.sli:hover {
  background: linear-gradient(135deg, #152b52, #244a8a);
  transform: translateY(-2px);
}

.dl-btn.gis {
  background: linear-gradient(135deg, #5bb700, #4a9500);
}
.dl-btn.gis:hover {
  background: linear-gradient(135deg, #4a9500, #3a7500);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .report-page {
    padding: 1rem;
  }
  .download-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
