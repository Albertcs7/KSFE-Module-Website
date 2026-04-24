<script setup lang="ts">
/**
 * ExportReportModal.vue
 * ─────────────────────
 * Per-policy print/export modal.
 *
 * Props:
 *   isOpen       – controls visibility
 *   moduleType   – 'SLI' | 'GIS'
 *   empCode      – employee code
 *   empName      – employee name
 *   policyNumber – specific policy to export
 *
 * Features:
 *   - 4 date range modes: All Records | Last 1 Year | Last 3 Years | Custom
 *   - Format selector: CSV | XLS
 */
import { ref } from 'vue'
import { useSLIStore } from '../store/useSLIStore'
import { useGISStore } from '../store/useGISStore'
import { useToast } from '../../../composables/useToast'

const props = defineProps<{
  isOpen: boolean
  moduleType: 'SLI' | 'GIS'
  empCode: string
  empName: string
  policyNumber: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const sliStore = useSLIStore()
const gisStore = useGISStore()
const toast = useToast()

// Date range
type RangeKey = 'all' | '1year' | '3years' | 'custom'
const dateRange = ref<RangeKey>('all')
const customFrom = ref('')
const customTo = ref('')

const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: 'all',    label: 'All Records (From Enrollment)' },
  { key: '1year',  label: 'Last 1 Year' },
  { key: '3years', label: 'Last 3 Years' },
  { key: 'custom', label: 'Custom Date Range' },
]

// File format
type FormatKey = 'csv' | 'xls'
const fileFormat = ref<FormatKey>('csv')

/** Returns true if salaryMonth (YYYY-MM) is within the selected range */
const inRange = (salaryMonth: string): boolean => {
  if (dateRange.value === 'all') return true
  const d = new Date(salaryMonth + '-01')
  const now = new Date()
  if (dateRange.value === '1year')  return d >= new Date(now.getFullYear() - 1, now.getMonth(), 1)
  if (dateRange.value === '3years') return d >= new Date(now.getFullYear() - 3, now.getMonth(), 1)
  if (dateRange.value === 'custom') {
    const from = customFrom.value ? new Date(customFrom.value + '-01') : new Date(0)
    const to   = customTo.value   ? new Date(customTo.value   + '-01') : new Date()
    return d >= from && d <= to
  }
  return true
}

/** Download as CSV */
const downloadAsCSV = (filename: string, rows: string[][]) => {
  const content = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n')
  triggerDownload(encodeURI(content), filename + '.csv')
}

/** Download as XLS using Office-compatible HTML table */
const downloadAsXLS = (filename: string, rows: string[][]) => {
  const tableRows = rows.map(r => {
    const cells = r.map(cell => `<td>${cell}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><meta name="ProgId" content="Excel.Sheet"></head>
    <body><table border="1">${tableRows}</table></body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename + '.xls')
  URL.revokeObjectURL(url)
}

const triggerDownload = (href: string, filename: string) => {
  const a = document.createElement('a')
  a.setAttribute('href', href)
  a.setAttribute('download', filename)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const handleExport = () => {
  if (dateRange.value === 'custom' && !customFrom.value) {
    toast.error('Please select a start month for the custom range.')
    return
  }

  const code = props.empCode.toUpperCase()
  const rows: string[][] = []

  // ── Header ──
  rows.push([`KSFE - ${props.moduleType} Policy Report`])
  rows.push([`Employee Code`, code])
  rows.push([`Employee Name`, props.empName])
  rows.push([`Policy Number`, props.policyNumber])
  rows.push([`Date Range`, rangeOptions.find(r => r.key === dateRange.value)?.label ?? ''])
  rows.push([`Generated On`, new Date().toLocaleDateString('en-IN')])
  rows.push([])
  rows.push([`Due Month`, `Amount Deducted (Rs.)`, `Salary Month`, `Date of Encashment`, `Receipt No / Cheque No`])

  if (props.moduleType === 'SLI') {
    const remittances = sliStore.remittances.filter(r =>
      r.empCode.toUpperCase() === code &&
      r.sliPolicyNumber === props.policyNumber &&
      inRange(r.salaryMonth)
    )

    if (remittances.length === 0) {
      toast.info('No remittance records found for the selected date range.')
      return
    }

    remittances.forEach(r => {
      const cheque = sliStore.cheques.find(c => c.receiptNoOrChequeNo === r.chequeId)
      rows.push([r.dueMonth, r.amountDeducted.toString(), r.salaryMonth, cheque?.encashmentDate ?? 'N/A', cheque?.receiptNoOrChequeNo ?? 'N/A'])
    })
    const total = remittances.reduce((s, r) => s + r.amountDeducted, 0)
    rows.push([])
    rows.push([`TOTAL`, `Rs.${total}`, '', '', ''])

  } else {
    const remittances = gisStore.remittances.filter(r =>
      r.empCode.toUpperCase() === code && inRange(r.salaryMonth)
    )

    if (remittances.length === 0) {
      toast.info('No remittance records found for the selected date range.')
      return
    }

    remittances.forEach(r => {
      const cheque = gisStore.cheques.find(c => c.receiptNoOrChequeNo === r.chequeId)
      rows.push([r.dueMonth, r.amountDeducted.toString(), r.salaryMonth, cheque?.encashmentDate ?? 'N/A', cheque?.receiptNoOrChequeNo ?? 'N/A'])
    })
    const total = remittances.reduce((s, r) => s + r.amountDeducted, 0)
    rows.push([])
    rows.push([`TOTAL`, `Rs.${total}`, '', '', ''])
  }

  const filename = `${props.moduleType}_${code}_${props.policyNumber}_${dateRange.value}`

  if (fileFormat.value === 'xls') {
    downloadAsXLS(filename, rows)
  } else {
    downloadAsCSV(filename, rows)
  }

  toast.success(`Report downloaded as .${fileFormat.value}.`)
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">

      <!-- Header -->
      <div class="modal-header">
        <div>
          <h2>Print {{ moduleType }} Policy Report</h2>
          <p class="modal-sub">{{ empName }} &nbsp;·&nbsp; {{ policyNumber }}</p>
        </div>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <!-- Date Range -->
      <div class="section">
        <p class="section-label">Date Range</p>
        <div class="range-grid">
          <button
            v-for="opt in rangeOptions"
            :key="opt.key"
            class="opt-btn"
            :class="{ active: dateRange === opt.key }"
            @click="dateRange = opt.key"
          >
            {{ opt.label }}
          </button>
        </div>

        <div v-if="dateRange === 'custom'" class="custom-range">
          <div class="custom-field">
            <label for="mFrom">From Month</label>
            <input id="mFrom" v-model="customFrom" type="month" class="month-input" />
          </div>
          <div class="custom-field">
            <label for="mTo">To Month</label>
            <input id="mTo" v-model="customTo" type="month" class="month-input" />
          </div>
        </div>
      </div>

      <!-- File Format -->
      <div class="section">
        <p class="section-label">File Format</p>
        <div class="format-toggle">
          <button
            id="fmt-csv"
            class="opt-btn fmt"
            :class="{ active: fileFormat === 'csv' }"
            @click="fileFormat = 'csv'"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            CSV (.csv)
          </button>
          <button
            id="fmt-xls"
            class="opt-btn fmt"
            :class="{ active: fileFormat === 'xls' }"
            @click="fileFormat = 'xls'"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            Excel (.xls)
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('close')">Cancel</button>
        <button class="btn-download" @click="handleExport">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Print / Download
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex; justify-content: center; align-items: center;
  z-index: 200;
}

.modal-content {
  background: #fff;
  width: 90%; max-width: 500px;
  border-radius: 14px;
  padding: 1.75rem 2rem;
  box-shadow: 0 24px 48px rgba(0,0,0,0.14);
  animation: slideUp 0.22s ease-out;
  display: flex; flex-direction: column; gap: 1.4rem;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Header */
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; }
.modal-header h2 { margin: 0 0 0.2rem; color: #1d3a6d; font-size: 1.2rem; }
.modal-sub { margin: 0; color: #64748b; font-size: 0.83rem; }
.close-btn { background: none; border: none; font-size: 1.7rem; cursor: pointer; color: #94a3b8; line-height: 1; padding: 0 4px; }

/* Sections */
.section { display: flex; flex-direction: column; gap: 0.6rem; }
.section-label { margin: 0; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #475569; }

/* Option buttons */
.range-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.format-toggle { display: flex; gap: 0.6rem; }

.opt-btn {
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: all 0.17s ease;
  font-family: inherit; text-align: center;
}
.opt-btn.fmt { display: flex; align-items: center; gap: 0.4rem; }
.opt-btn:hover { border-color: #1d3a6d; color: #1d3a6d; }
.opt-btn.active { background: #1d3a6d; border-color: #1d3a6d; color: #fff; box-shadow: 0 3px 10px rgba(29,58,109,0.22); }

/* Custom range */
.custom-range { display: flex; gap: 0.9rem; margin-top: 0.2rem; }
.custom-field { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.custom-field label { font-size: 0.78rem; font-weight: 600; color: #475569; }
.month-input {
  padding: 0.55rem 0.8rem;
  border: 1.5px solid #e2e8f0; border-radius: 7px;
  font-size: 0.88rem; font-family: inherit;
}
.month-input:focus { outline: none; border-color: #1d3a6d; box-shadow: 0 0 0 3px rgba(29,58,109,0.1); }

/* Actions */
.modal-actions {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding-top: 0.75rem; border-top: 1px solid #f1f5f9;
}
.btn-cancel {
  padding: 0.65rem 1.2rem; background: #f1f5f9; color: #475569;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: inherit;
}
.btn-download {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.65rem 1.2rem; background: #5bb700; color: #fff;
  border: none; border-radius: 8px; font-weight: 700;
  cursor: pointer; transition: background 0.2s; font-family: inherit;
}
.btn-download:hover { background: #4a9500; }
</style>
