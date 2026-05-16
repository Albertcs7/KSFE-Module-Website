<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '../../../components/ui/BaseButton.vue'
import { useToast } from '../../../composables/useToast'
import { downloadPolicyReport, getPolicyReport, type PolicyReportResponse } from '../../../services/api/insurance.api'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const reportData = ref<PolicyReportResponse | null>(null)
const isLoading = ref(false)
const isDownloading = ref(false)
const errorMessage = ref('')

const policyId = computed(() => String(route.params.id || '').trim())

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN')
}

const formatMonth = (value?: string | null) => {
  if (!value) return '-'
  const [year, month] = String(value).split('-')
  if (!year || !month) return value
  const date = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

const getPolicyTypeFullName = (policyType?: string): string => {
  const typeMap: Record<string, string> = {
    'GIS': 'Group Insurance Scheme',
    'SLI': 'State Life Insurance'
  }
  return typeMap[policyType || ''] || policyType || ''
}

const getFilenameFromResponse = (fallbackFilename: string, contentDisposition?: string) => {
  if (!contentDisposition) return fallbackFilename

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''))
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return fallbackFilename
}

const loadReport = async () => {
  if (!policyId.value || !/^\d+$/.test(policyId.value)) {
    errorMessage.value = 'Invalid policy id.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getPolicyReport(policyId.value)
    reportData.value = response.data
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || error?.message || 'Failed to load policy report.'
  } finally {
    isLoading.value = false
  }
}

const handleBack = () => {
  router.push('/insurance/policies')
}

const handleDownloadPdf = async () => {
  if (!policyId.value) return

  isDownloading.value = true
  try {
    const response = await downloadPolicyReport(policyId.value)
    const fallbackFilename = `policy-report-${reportData.value?.policy.policy_no || policyId.value}.pdf`
    const filename = getFilenameFromResponse(
      fallbackFilename,
      String(response.headers['content-disposition'] ?? response.headers['Content-Disposition'] ?? '')
    )

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)

    toast.success('Policy report downloaded successfully.')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to download policy report.')
  } finally {
    isDownloading.value = false
  }
}

onMounted(loadReport)
watch(policyId, loadReport)
</script>

<template>
  <section class="report-shell">
    <div class="toolbar no-print">
      <div>
        <h1 class="page-title">Single Policy Report</h1>
        <p class="page-subtitle">Preview and download the printable policy report.</p>
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

    <div v-else-if="reportData" class="paper-wrap">
      <article class="paper">
        <div class="letterhead">
          <img src="/report-letterhead.png" alt="Report letterhead" />
        </div>

        <div class="date-display">
          Date :
          {{
            new Date(reportData.generatedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          }}
        </div>

        <div class="title-block">
          <h2>
            Schedule of salary deduction for
            {{ getPolicyTypeFullName(reportData.policy.policy_type) }}
          </h2>
          <div class="title-underline"></div>
        </div>

        <section class="details-section">
          <div class="detail-row">
            <div class="detail-inline">
              <span class="detail-label">Full Name:</span>&nbsp;{{
                reportData.policy.employee_name
              }}
            </div>
            <div class="detail-inline">
              <span class="detail-label">Employee Code:</span>&nbsp;{{
                reportData.policy.employee_code
              }}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-inline">
              <span class="detail-label">Policy No:</span>&nbsp;{{
                reportData.policy.policy_no
              }}
            </div>
            <div class="detail-inline">
              <span class="detail-label">Date Of Death:</span>&nbsp;{{
                formatDate(reportData.policy.maturity_date)
              }}
            </div>
          </div>
        </section>

        <section class="section">
          <table class="report-table">
            <thead>
              <tr>
                <th>Due Month of Premium</th>
                <th>Amount Deducted</th>
                <th>Salary Month</th>
                <th>Date of Encashment</th>
                <th>Receipt No / Cheque Details</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="remittance in reportData.remittances"
                :key="remittance.policy_remittance_id"
              >
                <td>{{ formatMonth(remittance.due_month) }}</td>
                <td class="right">
                  ₹{{
                    Number(remittance.amount_deducted).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td>{{ formatMonth(remittance.salary_month) }}</td>
                <td>{{ formatDate(remittance.encashment_date) }}</td>
                <td>{{ remittance.receipt_no || remittance.policy_cheque_id || "-" }}</td>
              </tr>
              <tr v-if="reportData.remittances.length === 0">
                <td colspan="5" class="empty-state">
                  No remittance records found for this policy.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="signature-section">
          <div class="signature-box">
            <div>Yours faithfully,</div>
            <div style="margin-top: 4px; font-weight: 600">For The K.S.F.E. LTD</div>
            <div style="margin-top: 70px; font-weight: 600">
              DEPUTY GENERAL MANAGER (P&HR)
            </div>
          </div>
        </section>
      </article>
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
  margin-bottom: 1.25rem;
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
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
}

.status-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #0f172a;
}

.status-card.error {
  border-color: #fecaca;
  color: #b91c1c;
}

.paper-wrap {
  display: flex;
  justify-content: center;
}

.paper {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  color: #111827;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
  padding: 16px 100px 20px;
}

.letterhead {
  padding-bottom: 6px;
  border-bottom: 1px solid #111827;
  margin-bottom: 8px;
}

.letterhead img {
  width: 70%;
  height: 140px;
  max-height: 190px;
  display: block;
  object-fit: fill;
}

.date-display {
  font-size: 16px;
  color: #111827;
  margin-bottom: 8px;
  text-align: right;
}

.title-block {
  text-align: center;
  margin-bottom: 16px;
}

.title-block h2 {
  margin: 0;
  font-size: 23px;
  font-weight: 600;
  text-decoration: underline;
}

.title-underline {
  display: none;
}

.details-section {
  margin-bottom: 14px;
  font-size: 16px;
  line-height: 1.8;
}

.detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 120px;
  margin-bottom: 6px;
}

.detail-inline {
  display: flex;
  gap: 0;
}

.detail-inline:nth-child(1) {
  margin-left: 20px;
}

.detail-inline:nth-child(2) {
  margin-left: 40px;
}

.detail-label {
  font-weight: 400;
  color: #111827;
}

.detail-inline strong {
  color: #111827;
}

.section {
  margin-top: 12px;
}

.section h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1f2937;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
  table-layout: fixed;
}

.report-table th,
.report-table td {
  border: 1px solid #1f2937;
  padding: 8px 6px;
  vertical-align: top;
}

.report-table th {
  background: #e5e7eb;
  text-align: left;
  font-size: 16px;
}

.report-table th:last-child,
.report-table td:last-child {
  width: 28%;
}

.right {
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 14px 10px;
  color: #6b7280;
  font-size: 16px;
}

.signature-section {
  margin-top: 38px;
  display: flex;
  justify-content: flex-start;
}

.signature-box {
  text-align: left;
  font-size: 16px;
}
.signature-box span {
  display: block;
  margin-top: 4px;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
  }

  .paper {
    width: 100%;
    min-height: auto;
    overflow-x: auto;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .report-shell {
    padding: 0;
    background: #fff;
  }

  .paper {
    box-shadow: none;
    width: 210mm;
    min-height: 297mm;
  }
}
</style>
