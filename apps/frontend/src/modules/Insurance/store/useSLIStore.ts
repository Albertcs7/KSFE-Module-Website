import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * ============================================================================
 * BACKEND TEAM INTEGRATION NOTES:
 * ============================================================================
 * This Pinia store acts as a mock "Demo Database" for the frontend. 
 * When hooking up to the real backend API:
 * 
 * 1. Replace the `ref` arrays below with actual API fetch calls (e.g. using Axios).
 * 2. Update the action functions (addUser, addRemittance, addCheque) to make 
 *    POST/PUT requests to your backend endpoints instead of pushing to local arrays.
 * 3. Handle asynchronous states (loading, error, success) properly.
 * ============================================================================
 */

export interface SLIUser {
  empCode: string
  empName: string
  sliPolicyNumber: string
  premium: number
  dateOfMaturity: string
}

export interface SLIRemittance {
  empCode: string
  sliPolicyNumber: string
  salaryMonth: string
  dueMonth: string
  amountDeducted: number
  chequeId?: string // Optional
}

export interface SLICheque {
  encashmentDate: string
  receiptNoOrChequeNo: string
  salaryMonth: string
}

export const useSLIStore = defineStore('sli', () => {
  // --- MOCK DATABASE TABLES ---
  
  let storedUsers = localStorage.getItem('sli_users')
  
  // Migration: Clear old database only if empCode fields use the old 'EMP' prefix format
  // (e.g. 'EMP001'). We parse the JSON and check only the empCode field so that
  // employee names containing 'EMP' (e.g. 'Empower Corp') do NOT accidentally trigger
  // a wipe of all remittance and cheque data on every page reload.
  if (storedUsers) {
    try {
      const parsed: Array<{ empCode?: string }> = JSON.parse(storedUsers)
      const hasOldFormat = parsed.some(u => /^EMP\d/i.test(u.empCode ?? ''))
      if (hasOldFormat) {
        localStorage.removeItem('sli_users')
        localStorage.removeItem('sli_remittances')
        localStorage.removeItem('sli_cheques')
        storedUsers = null
      }
    } catch {
      // Corrupt data – start fresh
      localStorage.removeItem('sli_users')
      localStorage.removeItem('sli_remittances')
      localStorage.removeItem('sli_cheques')
      storedUsers = null
    }
  }

  const users = ref<SLIUser[]>(storedUsers ? JSON.parse(storedUsers) : [
    { empCode: '3571', empName: 'John Doe', sliPolicyNumber: 'SLI-1234', premium: 500, dateOfMaturity: '2030-12-31' },
    { empCode: '3572', empName: 'Jane Smith', sliPolicyNumber: 'SLI-5678', premium: 750, dateOfMaturity: '2035-06-15' },
  ])

  const storedRemittances = localStorage.getItem('sli_remittances')
  const remittances = ref<SLIRemittance[]>(storedRemittances ? JSON.parse(storedRemittances) : [])
  
  const storedCheques = localStorage.getItem('sli_cheques')
  const cheques = ref<SLICheque[]>(storedCheques ? JSON.parse(storedCheques) : [])

  // --- LOCAL STORAGE PERSISTENCE ---
  watch(users, (state) => localStorage.setItem('sli_users', JSON.stringify(state)), { deep: true })
  watch(remittances, (state) => localStorage.setItem('sli_remittances', JSON.stringify(state)), { deep: true })
  watch(cheques, (state) => localStorage.setItem('sli_cheques', JSON.stringify(state)), { deep: true })

  // --- ACTIONS (MOCK API CALLS) ---

  /**
   * Adds a new user to the SLI database.
   * @param user SLIUser object
   */
  const addUser = (user: SLIUser) => {
    // In production: await api.post('/sli/users', user)
    users.value.push(user)
  }

  /**
   * Adds a monthly remittance record.
   * @param remittance SLIRemittance object
   */
  const addRemittance = (remittance: SLIRemittance) => {
    // In production: await api.post('/sli/remittances', remittance)
    // Normalize empCode to uppercase so search filtering always matches,
    // regardless of what case the user typed in the form.
    remittances.value.push({ ...remittance, empCode: remittance.empCode.toUpperCase() })
  }

  /**
   * Adds a cheque detail record.
   * @param cheque SLICheque object
   */
  const addCheque = (cheque: SLICheque) => {
    // In production: await api.post('/sli/cheques', cheque)
    cheques.value.push(cheque)
  }

  /**
   * Updates an existing user in the SLI database.
   * @param user SLIUser object
   */
  const updateUser = (user: SLIUser) => {
    // In production: await api.put(`/sli/users/${user.empCode}/${user.sliPolicyNumber}`, user)
    const index = users.value.findIndex(u => u.empCode === user.empCode && u.sliPolicyNumber === user.sliPolicyNumber)
    if (index !== -1) {
      users.value[index] = { ...user }
    }
  }

  // Return state and actions for components to use
  return {
    users,
    remittances,
    cheques,
    addUser,
    updateUser,
    addRemittance,
    addCheque
  }
})
