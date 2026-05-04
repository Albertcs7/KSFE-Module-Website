<script setup lang="ts">
/**
 * PoliciesPage.vue
 * -----------
 * Main container for both SLI and GIS insurance modules.
 * It integrates the search bar, the action modals (Add, Remittance, Cheque),
 * and handles data display for a selected employee.
 */
import { createPolicy, createRemittance, getPolicies } from '@/services/api/insurance.api'
import { computed, onMounted, ref, watch } from 'vue'
import SearchBar, { type SearchBarItem } from '../../../components/searchBar/SearchBar.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import { useToast } from '../../../composables/useToast'
import { useGISStore } from '../store/useGISStore'
import { useSLIStore } from '../store/useSLIStore'
import type {
  InsuranceChequeForm,
  InsurancePolicyForm,
  InsurancePolicyOption, InsuranceRemittanceForm
} from '../types/insurance.types'

// Import Modals for Actions
import ExportReportModal from '../components/ExportReportModal.vue'
import InsuranceAddUserModal from '../components/shared/InsuranceAddUserModal.vue'
import InsuranceChequeModal from '../components/shared/InsuranceChequeModal.vue'
import InsurancePolicyModal from '../components/shared/InsurancePolicyModal.vue'
import InsuranceRemittanceModal from '../components/shared/InsuranceRemittanceModal.vue'

// We use both stores if needed, or primarily use one for common API error states if they are similar.
// Since the prompt asks to keep remittances and cheque details working, we'll route the calls based on policyType.
const sliStore = useSLIStore()
const gisStore = useGISStore()
const toast = useToast()

// Unified User type
interface UserPolicy {
  id: number
  empCode: string
  empName: string
  policyNumber: string
  policyType: 'SLI' | 'GIS'
  premium: number
  dateOfMaturity: string
}

// --- BACKEND DATA STATE ---
const policies = ref<UserPolicy[]>([])
const isLoadingUsers = ref(false)
const loadError = ref('')

const fetchPolicies = async (empCode?: string) => {
  isLoadingUsers.value = true
  loadError.value = ''
  try {
    const res = await getPolicies(empCode)
    const data = Array.isArray(res.data) ? res.data : res.data.data || []

    policies.value = data.map((p: any) => ({
      id: p.id,
      empCode: String(p.employee_code || p.empCode),
      empName: p.employee_name || p.empName,
      policyNumber: p.policy_no || p.sliPolicyNumber || p.gisPolicyNumber || p.policyNumber,
      policyType: p.policy_type || (p.sliPolicyNumber ? 'SLI' : 'GIS'),
      premium: p.premium || 0,
      dateOfMaturity: p.maturity_date || p.dateOfMaturity,
    }))
  } catch (err) {
    console.error('Failed to fetch policies', err)
    loadError.value = 'Failed to load policies'
    toast.error(loadError.value)
  } finally {
    isLoadingUsers.value = false
  }
}

onMounted(() => fetchPolicies())

// --- MODAL STATE MANAGEMENT ---
const isRemittanceOpen = ref(false)
const isChequeOpen = ref(false)
const isEditUserOpen = ref(false)
const isAddPolicyOpen = ref(false)
const isExportOpen = ref(false)

const policyForExport = ref<UserPolicy | null>(null)
const userToEdit = ref<UserPolicy | null>(null)
const policyToDelete = ref<UserPolicy | null>(null)
const isDeleteConfirmOpen = ref(false)
const isDeleting = ref(false)

// --- SEARCH &4 STATE ---
const selectedEmpCode = ref<string | null>(null)
const searchQuery = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const searchItems = computed<SearchBarItem[]>(() => {
  const uniqueEmps = new Map()
  policies.value.forEach(user => {
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

const handleSearchSelect = (item: SearchBarItem) => {
  selectedEmpCode.value = item.label
}
const handleSearchInput = (value: string) => {
  searchQuery.value = value
}

const clearSelection = () => {
  selectedEmpCode.value = null
}

watch(searchQuery, (val) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    if (!val || val.trim().length < 2) {
      await fetchPolicies() // reset to all
      return
    }

    await fetchPolicies(val)
  }, 400)
})

// --- DATA COMPUTATION FOR TABLES ---
const displayedUsers = computed(() => {
  if (selectedEmpCode.value) {
    const searchCode = selectedEmpCode.value.toUpperCase()
    const userPolicies = policies.value.filter(u => u.empCode.toUpperCase() === searchCode)

    const uniquePolicies = new Map<string, UserPolicy>()
    userPolicies.forEach(policy => {
      uniquePolicies.set(policy.policyNumber.toUpperCase(), policy)
    })
    return Array.from(uniquePolicies.values())
  }
  return []
})

const selectedEmpName = computed(() => {
  if (!selectedEmpCode.value) return ''
  const searchCode = selectedEmpCode.value.toUpperCase()
  const user = policies.value.find(u => u.empCode.toUpperCase() === searchCode)
  return user ? user.empName : ''
})

const displayedRemittances = computed(() => {
  if (selectedEmpCode.value) {
    const searchCode = selectedEmpCode.value.toUpperCase()
    // Combine remittances from both stores to display them together
    const sliRems = sliStore.remittances.filter(r => r.empCode.toUpperCase() === searchCode).map(r => ({...r, policyType: 'SLI', policyNumber: r.sliPolicyNumber}))
    const gisRems = gisStore.remittances.filter(r => r.empCode.toUpperCase() === searchCode).map(r => ({...r, policyType: 'GIS', policyNumber: r.gisPolicyNumber}))
    return [...sliRems, ...gisRems]
  }
  return []
})

const policyOptions = computed<InsurancePolicyOption[]>(() =>
  policies.value.map(user => ({
    id: user.id, // 👈 ADD THIS
    empCode: user.empCode,
    empName: user.empName,
    policyNumber: user.policyNumber,
    policyType: user.policyType,
    premium: user.premium,
    dateOfMaturity: user.dateOfMaturity,
  })),
)

const userToEditForm = computed<InsurancePolicyForm | null>(() => {
  if (!userToEdit.value) return null

  return {
    empCode: userToEdit.value.empCode,
    empName: userToEdit.value.empName,
    policyNumber: userToEdit.value.policyNumber,
    policyType: userToEdit.value.policyType,
    premium: userToEdit.value.premium,
    dateOfMaturity: userToEdit.value.dateOfMaturity,
  }
})

// --- ACTIONS ---

const openEditModal = (user: UserPolicy) => {
  userToEdit.value = user
  isEditUserOpen.value = true
}

const openPrintModal = (policy: UserPolicy) => {
  policyForExport.value = policy
  isExportOpen.value = true
}

const confirmDeletePolicy = (policy: UserPolicy) => {
  policyToDelete.value = policy
  isDeleteConfirmOpen.value = true
}

import { deletePolicy } from '@/services/api/insurance.api'
import ConfirmDialog from '../../../components/ui/ConfirmDialog.vue'

const handleDeletePolicy = async () => {
  if (!policyToDelete.value) return
  isDeleting.value = true
  try {
    await deletePolicy(policyToDelete.value.policyNumber)
    await fetchPolicies()
    isDeleteConfirmOpen.value = false
    toast.success('Policy deleted successfully!')
  } catch (err) {
    console.error(err)
    toast.error('Unable to delete policy. Please try again.')
  } finally {
    isDeleting.value = false
    policyToDelete.value = null
  }
}

const handleAddUser = async (user: InsurancePolicyForm) => {
  try {
    const payload = {
      employee_code: Number(user.empCode),
      employee_name: user.empName,
      policy_no: user.policyNumber,
      policy_type: user.policyType || 'SLI',
      premium: Number(user.premium),
      maturity_date: user.dateOfMaturity,
    }

    await createPolicy(payload as any)
    await fetchPolicies()

    isAddPolicyOpen.value = false
    toast.success('Policy added successfully!')
  } catch (err) {
    console.error(err)
    toast.error('Unable to add policy. Please try again.')
  }
}

const handleUpdateUser = async (user: InsurancePolicyForm) => {
  try {
    const pType = user.policyType || 'SLI'
    if (pType === 'SLI') {
      await sliStore.updateUser({
        empCode: user.empCode,
        empName: user.empName,
        sliPolicyNumber: user.policyNumber,
        premium: user.premium,
        dateOfMaturity: user.dateOfMaturity,
      })
    } else {
      await gisStore.updateUser({
        empCode: user.empCode,
        empName: user.empName,
        gisPolicyNumber: user.policyNumber,
        premium: user.premium,
        dateOfMaturity: user.dateOfMaturity,
      })
    }
    await fetchPolicies()
    isEditUserOpen.value = false
    toast.success('Policy details updated successfully!')
  } catch {
    toast.error('Unable to update policy details. Please try again.')
  }
}

const handleAddRemittance = async (formData: InsuranceRemittanceForm) => {
  try {
    // Send empCode and policyNumber to backend
    // Backend will look up employee_policy_id and store the remittance
    await createRemittance({
      empCode: formData.empCode,
      policyNumber: formData.policyNumber,
      salaryMonth: formData.salaryMonth,
      dueMonth: formData.dueMonth,
      amountDeducted: formData.amountDeducted,
      chequeId: formData.chequeId,
    })

    isRemittanceOpen.value = false
    toast.success('Remittance added successfully!')

  } catch (err) {
    console.error(err)
    toast.error('Unable to add remittance. Please try again.')
  }
}

const handleAddCheque = async (cheque: InsuranceChequeForm) => {
  if (!cheque.encashmentDate || !cheque.receiptNoOrChequeNo) {
    toast.error('Please fill in required fields.')
    return
  }

  try {
    // We add cheque to both or just SLI? In real usage it might be shared, let's just add to SLI store for now, or both.
    await sliStore.addCheque({
      encashmentDate: cheque.encashmentDate,
      receiptNoOrChequeNo: cheque.receiptNoOrChequeNo,
      salaryMonth: cheque.salaryMonth,
    })
    // also GIS store if needed, but they are mocked mostly anyway.

    isChequeOpen.value = false
    toast.success('Cheque Details added successfully!')
  } catch {
    toast.error('Unable to save cheque details. Please try again.')
  }
}
</script>

<template>
  <section class="policies-page">
    <header class="policies-header">
      <div class="search-section">
        <SearchBar
          :items="searchItems"
          placeholder="Search by Employee Code (e.g. 3571)..."
          @select="handleSearchSelect"
          @input="handleSearchInput"
        />
        <BaseButton v-if="selectedEmpCode" variant="secondary" @click="clearSelection"
          >Clear Search</BaseButton
        >
      </div>

      <div class="action-buttons">
        <BaseButton variant="primary" @click="isAddPolicyOpen = true">
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </template>
          Add Policy
        </BaseButton>
        <BaseButton variant="secondary" @click="isRemittanceOpen = true">
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </template>
          Add Monthly Remittance
        </BaseButton>
        <BaseButton variant="secondary" @click="isChequeOpen = true">
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </template>
          Add Cheque Details
        </BaseButton>
      </div>
    </header>

    <main v-if="selectedEmpCode" class="policies-content">
      <div class="employee-header-card">
        <div class="emp-avatar">{{ selectedEmpName.charAt(0).toUpperCase() }}</div>
        <div class="emp-info">
          <h2>{{ selectedEmpName }}</h2>
          <p>
            Employee Code: <strong>{{ selectedEmpCode }}</strong>
          </p>
        </div>
      </div>

      <div class="content-section">
        <h3>Policies</h3>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Policy No</th>
                <th>Premium</th>
                <th>Maturity Date</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in displayedUsers" :key="user.policyNumber">
                <td>
                  <span :class="'badge ' + user.policyType.toLowerCase()">{{
                    user.policyType
                  }}</span>
                </td>
                <td>
                  <strong>{{ user.policyNumber }}</strong>
                </td>
                <td>₹{{ user.premium }}</td>
                <td>{{ user.dateOfMaturity }}</td>
                <td class="actions-cell">
                  <BaseButton variant="edit" @click="openEditModal(user)" title="Edit">
                    <template #icon>
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        ></path>
                        <path
                          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                        ></path>
                      </svg>
                    </template>
                    Edit
                  </BaseButton>
                  <BaseButton
                    variant="print"
                    @click="openPrintModal(user)"
                    title="Print / Export"
                  >
                    <template #icon>
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path
                          d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                        ></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                      </svg>
                    </template>
                    Print
                  </BaseButton>
                  <BaseButton
                    variant="cancel"
                    @click="confirmDeletePolicy(user)"
                    title="Delete"
                  >
                    <template #icon>
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path
                          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        ></path>
                      </svg>
                    </template>
                    Delete
                  </BaseButton>
                </td>
              </tr>
              <tr v-if="displayedUsers.length === 0">
                <td colspan="5" class="empty-state">
                  No policies found for this employee.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="content-section" style="margin-top: 2rem">
        <h3>Remittances</h3>
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Policy No</th>
                <th>Salary Month</th>
                <th>Due Month</th>
                <th>Amount</th>
                <th>Cheque ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(remit, index) in displayedRemittances" :key="index">
                <td>
                  <span :class="'badge ' + remit.policyType.toLowerCase()">{{
                    remit.policyType
                  }}</span>
                </td>
                <td>
                  <strong>{{ remit.policyNumber }}</strong>
                </td>
                <td>{{ remit.salaryMonth }}</td>
                <td>{{ remit.dueMonth }}</td>
                <td>₹{{ remit.amountDeducted }}</td>
                <td>{{ remit.chequeId || "-" }}</td>
              </tr>
              <tr v-if="displayedRemittances.length === 0">
                <td colspan="6" class="empty-state">
                  No remittances recorded for this employee.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <main v-else class="policies-content empty-content">
      <svg
        viewBox="0 0 24 24"
        width="48"
        height="48"
        fill="none"
        stroke="#cbd5e1"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <h2>Search for an Employee</h2>
      <p>Use the search bar above to select an employee and view their policy details.</p>
    </main>

    <InsuranceAddUserModal
      :is-open="isAddPolicyOpen"
      module-type="ANY"
      :is-saving="isLoadingUsers"
      :error="null"
      @close="isAddPolicyOpen = false"
      @submit="handleAddUser"
    />
    <InsuranceRemittanceModal
      :is-open="isRemittanceOpen"
      policy-mode="select"
      :policies="policyOptions"
      :is-saving="false"
      :error="null"
      @close="isRemittanceOpen = false"
      @submit="handleAddRemittance"
    />
    <InsuranceChequeModal
      :is-open="isChequeOpen"
      :is-saving="false"
      :error="null"
      @close="isChequeOpen = false"
      @submit="handleAddCheque"
    />
    <InsurancePolicyModal
      :is-open="isEditUserOpen"
      :module-type="userToEdit?.policyType || 'SLI'"
      :user-to-edit="userToEditForm"
      :is-saving="false"
      :error="null"
      @close="isEditUserOpen = false"
      @submit="handleUpdateUser"
    />
    <ExportReportModal
      v-if="policyForExport"
      :is-open="isExportOpen"
      :module-type="policyForExport.policyType"
      :emp-code="policyForExport.empCode"
      :emp-name="policyForExport.empName"
      :policy-number="policyForExport.policyNumber"
      @close="
        isExportOpen = false;
        policyForExport = null;
      "
    />
    <ConfirmDialog
      :is-open="isDeleteConfirmOpen"
      title="Delete Policy"
      message="Are you sure you want to delete this policy? This action cannot be undone."
      confirm-text="Delete"
      :is-saving="isDeleting"
      @confirm="handleDeletePolicy"
      @cancel="isDeleteConfirmOpen = false"
    />
  </section>
</template>

<style scoped>
.policies-page {
  padding: 2rem;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.policies-header {
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

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.policies-content {
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
  justify-content: flex-start;
}

.emp-avatar {
  width: 3.5rem;
  height: 3.5rem;
  background: #1d3a6d;
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

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 3rem !important;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.sli {
  background: #e0e7ff;
  color: #3730a3;
}

.badge.gis {
  background: #fce7f3;
  color: #9d174d;
}
</style>
