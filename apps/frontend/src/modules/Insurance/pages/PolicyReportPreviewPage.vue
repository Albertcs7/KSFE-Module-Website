<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseButton from "../../../components/ui/BaseButton.vue";
import { useToast } from "../../../composables/useToast";
import { downloadPolicyReport } from "../../../services/api/insurance.api";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isLoading = ref(false);
const isDownloading = ref(false);
const errorMessage = ref("");
const htmlContent = ref("");

const policyId = computed(() => String(route.params.id || "").trim());
const deathType = computed(() => String(route.query.deathType || "death").trim());
const deathDate = computed(() => String(route.query.deathDate || "").trim());

const getFilenameFromResponse = (
  fallbackFilename: string,
  contentDisposition?: string
) => {
  if (!contentDisposition) return fallbackFilename;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return fallbackFilename;
};

const handleBack = () => {
  router.push("/insurance/policies");
};

const loadReportHtml = async () => {
  const token = localStorage.getItem("token");

  if (!policyId.value || !/^\d+$/.test(policyId.value)) {
    errorMessage.value = "Invalid policy ID.";
    return;
  }

  if (!token) {
    errorMessage.value = "Not authenticated. Please log in again.";
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";
  htmlContent.value = "";

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    if (deathType.value) params.append("deathType", deathType.value);
    if (deathDate.value) params.append("deathDate", deathDate.value);

    const reportUrl = `${baseUrl}/insurance/policies/${policyId.value}/report/html?${params}`;

    const response = await fetch(reportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    htmlContent.value = await response.text();
  } catch (error: any) {
    errorMessage.value = `Failed to load report: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
};

const handleDownloadPdf = async () => {
  if (!policyId.value) return;

  isDownloading.value = true;
  try {
    const params = new URLSearchParams();
    if (deathType.value) params.append("deathType", deathType.value);
    if (deathDate.value) params.append("deathDate", deathDate.value);

    const response = await downloadPolicyReport(policyId.value, params.toString());
    const fallbackFilename = `policy-report-${policyId.value}.pdf`;
    const filename = getFilenameFromResponse(
      fallbackFilename,
      String(
        response.headers["content-disposition"] ??
          response.headers["Content-Disposition"] ??
          ""
      )
    );

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    toast.success("Policy report downloaded successfully.");
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to download policy report."
    );
  } finally {
    isDownloading.value = false;
  }
};

onMounted(loadReportHtml);
watch(policyId, loadReportHtml);
</script>

<template>
  <section class="report-shell">
    <div class="toolbar">
      <div>
        <h1 class="page-title">Policy Report</h1>
        <p class="page-subtitle">View and download the policy report.</p>
      </div>

      <div class="toolbar-actions">
        <BaseButton variant="secondary" @click="handleBack">Back</BaseButton>
        <BaseButton
          variant="primary"
          :loading="isDownloading"
          loading-text="Downloading..."
          @click="handleDownloadPdf"
        >
          Download PDF
        </BaseButton>
      </div>
    </div>

    <div v-if="isLoading" class="status-card">Loading report...</div>
    <div v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</div>
    <div v-else-if="htmlContent" class="report-container">
      <iframe class="report-iframe" :srcdoc="htmlContent" title="Policy Report"></iframe>
    </div>
  </section>
</template>

<style scoped>
.report-shell {
  min-height: 100%;
  padding: 2rem;
  background: linear-gradient(180deg, #f6f7fb 0%, #eef2f7 100%);
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: #fff;
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.page-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
}

.page-subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
}

.status-card {
  padding: 1.5rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  text-align: center;
  font-size: 1rem;
}

.status-card.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.report-container {
  display: flex;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.report-iframe {
  width: 100%;
  height: 900px;
  border: none;
}

@media (max-width: 900px) {
  .report-shell {
    padding: 1rem;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .report-iframe {
    height: 600px;
  }
}

@media print {
  .toolbar {
    display: none !important;
  }

  .report-shell {
    padding: 0;
    background: #fff;
  }

  .report-container {
    box-shadow: none;
  }

  .report-iframe {
    height: auto;
  }
}
</style>
