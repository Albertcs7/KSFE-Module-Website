<script setup lang="ts">
/**
 * GISPage.vue
 * -----------
 * Main container for the State Life Insurance (GIS) module.
 * It integrates the search bar, the three action modals (Add, Remittance, Cheque),
 * and handles data display for a selected employee.
 */

import { ref, computed } from 'vue'
import { useGISStore, type GISCheque, type GISRemittance, type GISUser } from '../store/useGISStore'
import SearchBar, { type SearchBarItem } from '../../../components/searchBar/SearchBar.vue'
import { useToast } from '../../../composables/useToast'
import type {
  InsuranceChequeForm,
  InsurancePolicyForm,
  InsurancePolicyOption,
  InsuranceRemittanceForm,
} from '../types/insurance.types'

// Import Modals for GIS Actions
import InsuranceChequeModal from '../components/shared/InsuranceChequeModal.vue'
import InsurancePolicyModal from '../components/shared/InsurancePolicyModal.vue'
import InsuranceRemittanceModal from '../components/shared/InsuranceRemittanceModal.vue'
import ExportReportModal from '../components/ExportReportModal.vue'

const gisStore = useGISStore()
const toast = useToast()

// --- MODAL STATE MANAGEMENT ---
// These refs control the visibility of the different pop-up modals
const isRemittanceOpen = ref(false)
const isChequeOpen = ref(false)
const isEditUserOpen = ref(false)
const isAddGISOpen = ref(false)
const isExportOpen = ref(false)
const isImporting = ref(false)
const importError = ref('')

// Tracks which policy row the Print button was clicked on
const policyForExport = ref<GISUser | null>(null)

// Stores the specific user being edited when the Edit Modal is opened
const userToEdit = ref<GISUser | null>(null)

// --- SEARCH & FILTER STATE ---
// Tracks which employee is currently selected from the SearchBar
const selectedEmpCode = ref<string | null>(null)

// Map our local store users into the format required by the SearchBar component
const searchItems = computed<SearchBarItem[]>(() => {
  // Deduplicate by empCode for the search bar so it only shows unique employees
  const uniqueEmps = new Map()
  gisStore.users.forEach(user => {
    const code = user.empCode.toUpperCase()
    if (!uniqueEmps.has(code)) {
      uniqueEmps.set(code, user)
    }
  })
  
  return Array.from(uniqueEmps.values()).map(user => ({
    label: user.empCode.toUpperCase(),
    description: user.empName,
    path: '' 
  }))
})

// Triggered when a user clicks an item in the SearchBar dropdown
const handleSearchSelect = (item: SearchBarItem) => {
  selectedEmpCode.value = item.label
}

// Resets the view to the empty state by clearing the selected employee
const clearSelection = () => {
  selectedEmpCode.value = null
}

// --- DATA COMPUTATION FOR TABLES ---
// Filters policies to only show those matching the selected Employee Code
const displayedUsers = computed(() => {
  if (selectedEmpCode.value) {
    const searchCode = selectedEmpCode.value.toUpperCase()
    const userPolicies = gisStore.users.filter(u => u.empCode.toUpperCase() === searchCode)
    
    // Deduplicate by policy number to ensure uniqueness
    const uniquePolicies = new Map<string, GISUser>()
    userPolicies.forEach(policy => {
      uniquePolicies.set(policy.gisPolicyNumber.toUpperCase(), policy)
    })
    return Array.from(uniquePolicies.values())
  }
  return [] // Empty array ensures tables don't render if no user is selected
})

// Computes the selected Employee's Name to display in the header card
const selectedEmpName = computed(() => {
  if (!selectedEmpCode.value) return ''
  const searchCode = selectedEmpCode.value.toUpperCase()
  const user = gisStore.users.find(u => u.empCode.toUpperCase() === searchCode)
  return user ? user.empName : ''
})

// Checks if the selected employee already has a GIS policy (only one allowed)
const hasGISPolicy = computed(() => {
  if (!selectedEmpCode.value) return false
  const searchCode = selectedEmpCode.value.toUpperCase()
  return gisStore.users.some(u => u.empCode.toUpperCase() === searchCode)
})

// Filters remittances to only show those matching the selected Employee Code
const displayedRemittances = computed(() => {
  if (selectedEmpCode.value) {
    const searchCode = selectedEmpCode.value.toUpperCase()
    return gisStore.remittances.filter(r => r.empCode.toUpperCase() === searchCode)
  }
  return []
})

const policyOptions = computed<InsurancePolicyOption[]>(() =>
  gisStore.users.map(user => ({
    empCode: user.empCode,
    empName: user.empName,
    policyNumber: user.gisPolicyNumber,
    premium: user.premium,
    dateOfMaturity: user.dateOfMaturity,
  })),
)

const userToEditForm = computed<InsurancePolicyForm | null>(() => {
  if (!userToEdit.value) return null

  return {
    empCode: userToEdit.value.empCode,
    empName: userToEdit.value.empName,
    policyNumber: userToEdit.value.gisPolicyNumber,
    premium: userToEdit.value.premium,
    dateOfMaturity: userToEdit.value.dateOfMaturity,
  }
})

// --- ACTIONS ---

// Opens the edit modal and passes the selected policy data to it
const openEditModal = (user: GISUser) => {
  userToEdit.value = user
  isEditUserOpen.value = true
}

/**
 * Opens the ExportReportModal for a specific GIS policy row.
 */
const openPrintModal = (policy: GISUser) => {
  policyForExport.value = policy
  isExportOpen.value = true
}

const toGISUser = (user: InsurancePolicyForm): GISUser => ({
  empCode: user.empCode,
  empName: user.empName,
  gisPolicyNumber: user.policyNumber,
  premium: user.premium,
  dateOfMaturity: user.dateOfMaturity,
})

const toGISRemittance = (remittance: InsuranceRemittanceForm): GISRemittance => ({
  empCode: remittance.empCode,
  gisPolicyNumber: remittance.policyNumber,
  salaryMonth: remittance.salaryMonth,
  dueMonth: remittance.dueMonth,
  amountDeducted: remittance.amountDeducted,
  chequeId: remittance.chequeId,
})

const toGISCheque = (cheque: InsuranceChequeForm): GISCheque => ({
  encashmentDate: cheque.encashmentDate,
  receiptNoOrChequeNo: cheque.receiptNoOrChequeNo,
  salaryMonth: cheque.salaryMonth,
})

const handleAddUser = async (user: InsurancePolicyForm) => {
  try {
    await gisStore.addUser(toGISUser(user))
    isAddGISOpen.value = false
    toast.success('User added successfully!')
  } catch {
    toast.error(gisStore.error.addUser || 'Unable to add user. Please try again.')
  }
}

const handleUpdateUser = async (user: InsurancePolicyForm) => {
  try {
    await gisStore.updateUser(toGISUser(user))
    isEditUserOpen.value = false
    toast.success('User details updated successfully!')
  } catch {
    toast.error(gisStore.error.updateUser || 'Unable to update user details. Please try again.')
  }
}

const handleAddRemittance = async (remittance: InsuranceRemittanceForm) => {
  if (!remittance.empCode || !remittance.policyNumber || !remittance.salaryMonth) {
    toast.error('Please fill in required fields: Employee Code, Policy Number, and Salary Month.')
    return
  }

  try {
    await gisStore.addRemittance(toGISRemittance(remittance))
    isRemittanceOpen.value = false
    toast.success('Remittance added successfully!')
  } catch {
    toast.error(gisStore.error.addRemittance || 'Unable to add remittance. Please try again.')
  }
}

const handleAddCheque = async (cheque: InsuranceChequeForm) => {
  if (!cheque.encashmentDate || !cheque.receiptNoOrChequeNo) {
    toast.error('Please fill in required fields.')
    return
  }

  try {
    await gisStore.addCheque(toGISCheque(cheque))
    isChequeOpen.value = false
    toast.success('Cheque Details added successfully!')
  } catch {
    toast.error(gisStore.error.addCheque || 'Unable to save cheque details. Please try again.')
  }
}

// --- CSV / XLS UPLOAD LOGIC ---
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isImporting.value = true
  importError.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string

    try {
      if (!text) {
        throw new Error('The selected file is empty.')
      }

      const lines = text.split('\n').filter(line => line.trim())
      let count = 0
      const duplicatePolicyNumbers = new Set<string>()
      const existingPolicyNumbers = new Set(
        gisStore.users.map(user => user.gisPolicyNumber.trim().toUpperCase())
      )

      lines.forEach((line, index) => {
        if (index === 0 && line.toLowerCase().includes('emp')) return // Skip header
        const separator = line.includes('\t') ? '\t' : ','
        const parts = line.split(separator)
        const policyNumber = parts[2]?.trim().toUpperCase() || ''

        if (parts.length >= 5 && policyNumber) {
          if (existingPolicyNumbers.has(policyNumber)) {
            duplicatePolicyNumbers.add(policyNumber)
            return
          }

          gisStore.users.push({
             empCode: parts[0]?.trim() || '',
             empName: parts[1]?.trim() || '',
             gisPolicyNumber: policyNumber,
             premium: Number(parts[3]) || 0,
             dateOfMaturity: parts[4]?.trim() || ''
          })
          existingPolicyNumbers.add(policyNumber)
          count++
        }
      })

      if (count === 0) {
        if (duplicatePolicyNumbers.size > 0) {
          throw new Error(`Duplicate GIS policy number found: ${Array.from(duplicatePolicyNumbers).join(', ')}. No duplicate rows were imported.`)
        }

        throw new Error('No valid GIS policy rows were found in the selected file.')
      }

      toast.success(`Successfully imported ${count} GIS policies from the selected file!`)
      if (duplicatePolicyNumbers.size > 0) {
        importError.value = `Duplicate GIS policy number found: ${Array.from(duplicatePolicyNumbers).join(', ')}. Duplicate rows were not imported.`
        toast.error(importError.value)
      }
    } catch (error) {
      importError.value = error instanceof Error ? error.message : 'Unable to import the selected CSV file.'
      toast.error(importError.value)
    } finally {
      isImporting.value = false
      target.value = ''
    }
  }
  reader.onerror = () => {
    importError.value = 'Unable to read the selected file.'
    isImporting.value = false
    target.value = ''
    toast.error(importError.value)
  }
  reader.readAsText(file)
}
</script>

<template>
  <section class="gis-page">
    <!-- 
      HEADER SECTION 
      Contains the SearchBar and the primary Action buttons.
    -->
    <header class="gis-header">
      <div class="search-section">
        <SearchBar 
          :items="searchItems" 
          placeholder="Search by Employee Code (e.g. 3571)..."
          @select="handleSearchSelect" 
        />
        <button v-if="selectedEmpCode" class="btn-clear" @click="clearSelection">Clear Search</button>
      </div>
      
      <div class="action-buttons">
        <label class="btn-action secondary" :class="{ disabled: isImporting }" style="cursor: pointer;" title="Upload Old Data via CSV or XLS">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          {{ isImporting ? 'Importing...' : 'Upload CSV/XLS' }}
          <input type="file" accept=".csv,.xls,text/csv,application/vnd.ms-excel" :disabled="isImporting" @change="handleFileUpload" style="display: none;" />
        </label>
        <button class="btn-action primary" @click="isAddGISOpen = true" :disabled="hasGISPolicy">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
          Add GIS Policy
        </button>
        <button class="btn-action secondary" @click="isRemittanceOpen = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          Add Monthly Remittance
        </button>
        <button class="btn-action secondary" @click="isChequeOpen = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Add Cheque Details
        </button>
      </div>
    </header>
    <p v-if="importError" class="page-error">{{ importError }}</p>

    <!-- 
      MAIN CONTENT AREA (ACTIVE STATE)
      Only renders if an employee has been selected via the search bar.
    -->
    <main v-if="selectedEmpCode" class="gis-content">
      
      <!-- Common Employee Details Card: Shows Name and Code -->
      <div class="employee-header-card">
        <div class="emp-avatar">{{ selectedEmpName.charAt(0).toUpperCase() }}</div>
        <div class="emp-info">
          <h2>{{ selectedEmpName }}</h2>
          <p>Employee Code: <strong>{{ selectedEmpCode }}</strong></p>
        </div>
      </div>

      <div class="content-section">
        <h3>Policies</h3>
        
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Policy No</th>
                <th>Premium</th>
                <th>Maturity Date</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in displayedUsers" :key="user.gisPolicyNumber">
                <td><strong>{{ user.gisPolicyNumber }}</strong></td>
                <td>₹{{ user.premium }}</td>
                <td>{{ user.dateOfMaturity }}</td>
                <td class="actions-cell">
                  <button class="btn-sm btn-edit" @click="openEditModal(user)" title="Edit">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit
                  </button>
                  <button class="btn-sm btn-print" @click="openPrintModal(user)" title="Print / Export">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print
                  </button>
                </td>
              </tr>
              <tr v-if="displayedUsers.length === 0">
                <td colspan="4" class="empty-state">No policies found for this employee.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- REMITTANCES TABLE SECTION -->
      <div class="content-section" style="margin-top: 2rem;">
        <h3>Remittances</h3>
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Policy No</th>
                <th>Salary Month</th>
                <th>Due Month</th>
                <th>Amount</th>
                <th>Cheque ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(remit, index) in displayedRemittances" :key="index">
                <td><strong>{{ remit.gisPolicyNumber }}</strong></td>
                <td>{{ remit.salaryMonth }}</td>
                <td>{{ remit.dueMonth }}</td>
                <td>₹{{ remit.amountDeducted }}</td>
                <td>{{ remit.chequeId || '-' }}</td>
              </tr>
              <tr v-if="displayedRemittances.length === 0">
                <td colspan="5" class="empty-state">No remittances recorded for this employee.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- 
      MAIN CONTENT AREA (EMPTY STATE)
      Renders when NO employee is selected. Prompts user to search.
    -->
    <main v-else class="gis-content empty-content">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <h2>Search for an Employee</h2>
      <p>Use the search bar above to select an employee and view their GIS details.</p>
    </main>

    <!-- 
      MODAL COMPONENTS 
      These are mounted but hidden until their respective 'isOpen' prop becomes true.
    -->
    <InsurancePolicyModal
      :is-open="isAddGISOpen"
      mode="add"
      module-type="GIS"
      :is-saving="gisStore.loading.addUser"
      :error="gisStore.error.addUser"
      @close="isAddGISOpen = false"
      @submit="handleAddUser"
    />
    <InsuranceRemittanceModal
      :is-open="isRemittanceOpen"
      module-type="GIS"
      policy-mode="auto"
      :policies="policyOptions"
      :is-saving="gisStore.loading.addRemittance"
      :error="gisStore.error.addRemittance"
      @close="isRemittanceOpen = false"
      @submit="handleAddRemittance"
    />
    <InsuranceChequeModal
      :is-open="isChequeOpen"
      :is-saving="gisStore.loading.addCheque"
      :error="gisStore.error.addCheque"
      @close="isChequeOpen = false"
      @submit="handleAddCheque"
    />
    <InsurancePolicyModal
      :is-open="isEditUserOpen"
      mode="edit"
      module-type="GIS"
      :user-to-edit="userToEditForm"
      :is-saving="gisStore.loading.updateUser"
      :error="gisStore.error.updateUser"
      @close="isEditUserOpen = false"
      @submit="handleUpdateUser"
    />
    <ExportReportModal
      v-if="policyForExport"
      :is-open="isExportOpen"
      module-type="GIS"
      :emp-code="policyForExport.empCode"
      :emp-name="policyForExport.empName"
      :policy-number="policyForExport.gisPolicyNumber"
      @close="isExportOpen = false; policyForExport = null"
    />
  </section>
</template>

<style scoped>
.gis-page {
  padding: 2rem;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.gis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  background: #fff;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.search-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-clear {
  padding: 0.5rem 1rem;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-clear:hover {
  background: #e2e8f0;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-action.primary {
  background: #1d3a6d;
  color: #fff;
}

.btn-action.primary:hover {
  background: #152b52;
  box-shadow: 0 4px 12px rgba(29, 58, 109, 0.2);
}

.btn-action.secondary {
  background: #fff;
  color: #1d3a6d;
  border-color: #e2e8f0;
}

.btn-action.secondary:hover {
  border-color: #1d3a6d;
  background: #f8fafc;
}

.btn-action.disabled {
  cursor: not-allowed !important;
  opacity: 0.65;
  pointer-events: none;
}

.page-error {
  margin: -1rem 0 0;
  padding: 0.85rem 1rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.9rem;
}

.gis-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 1.5rem;
}

.employee-header-card {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  border: 1px solid #e2e8f0;
  justify-content: space-between;
}

.emp-avatar {
  width: 3.5rem;
  height: 3.5rem;
  background: #5bb700;
  color: #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  font-weight: bold;
}

.emp-info h2 {
  margin: 0 0 0.2rem 0;
  color: #0f172a;
  font-size: 1.4rem;
}

.emp-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.emp-info strong {
  color: #1d3a6d;
}

.btn-export {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1rem;
  background: #1d3a6d;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.btn-export:hover {
  background: #152b52;
  transform: translateY(-1px);
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  text-align: center;
  color: #64748b;
}

.empty-content h2 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #334155;
  font-size: 1.5rem;
}

.content-section h3 {
  color: #1d3a6d;
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.data-table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  padding: 1rem;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  font-size: 0.95rem;
  vertical-align: middle;
}

.actions-col {
  width: 180px;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-edit {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}

.btn-edit:hover {
  background: #dcfce7;
}

.btn-print {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
}

.btn-print:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 3rem !important;
  font-style: italic;
}

@media (max-width: 959px) {
  .gis-header {
    flex-direction: column;
    align-items: stretch;
  }
  .action-buttons {
    flex-wrap: wrap;
  }
}
</style>
