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

export interface GISUser {
  empCode: string
  empName: string
  gisPolicyNumber: string
  premium: number
  dateOfMaturity: string
}

export interface GISRemittance {
  empCode: string
  gisPolicyNumber: string
  salaryMonth: string
  dueMonth: string
  amountDeducted: number
  chequeId?: string // Optional
}

export interface GISCheque {
  encashmentDate: string
  receiptNoOrChequeNo: string
  salaryMonth: string
}

export const useGISStore = defineStore('gis', () => {
  // --- MOCK DATABASE TABLES ---
  
  let storedUsers = localStorage.getItem('gis_users')
  
  // Migration: Clear old database only if empCode fields use the old 'EMP' prefix format
  // (e.g. 'EMP001'). We parse the JSON and check only the empCode field so that
  // employee names containing 'EMP' do NOT accidentally trigger a wipe of remittances.
  if (storedUsers) {
    try {
      const parsed: Array<{ empCode?: string }> = JSON.parse(storedUsers)
      const hasOldFormat = parsed.some(u => /^EMP\d/i.test(u.empCode ?? ''))
      if (hasOldFormat) {
        localStorage.removeItem('gis_users')
        localStorage.removeItem('gis_remittances')
        localStorage.removeItem('gis_cheques')
        storedUsers = null
      }
    } catch {
      // Corrupt data – start fresh
      localStorage.removeItem('gis_users')
      localStorage.removeItem('gis_remittances')
      localStorage.removeItem('gis_cheques')
      storedUsers = null
    }
  }

  const users = ref<GISUser[]>(storedUsers ? JSON.parse(storedUsers) : [
    { empCode: '3571', empName: 'John Doe', gisPolicyNumber: 'GIS-1234', premium: 500, dateOfMaturity: '2030-12-31' },
    { empCode: '3572', empName: 'Jane Smith', gisPolicyNumber: 'GIS-5678', premium: 750, dateOfMaturity: '2035-06-15' },
  ])

  const storedRemittances = localStorage.getItem('gis_remittances')
  const remittances = ref<GISRemittance[]>(storedRemittances ? JSON.parse(storedRemittances) : [])
  
  const storedCheques = localStorage.getItem('gis_cheques')
  const cheques = ref<GISCheque[]>(storedCheques ? JSON.parse(storedCheques) : [])

  // --- LOCAL STORAGE PERSISTENCE ---
  watch(users, (state) => localStorage.setItem('gis_users', JSON.stringify(state)), { deep: true })
  watch(remittances, (state) => localStorage.setItem('gis_remittances', JSON.stringify(state)), { deep: true })
  watch(cheques, (state) => localStorage.setItem('gis_cheques', JSON.stringify(state)), { deep: true })

  // --- ACTIONS (MOCK API CALLS) ---

  /**
   * Adds a new user to the GIS database.
   * @param user GISUser object
   */
  const addUser = (user: GISUser) => {
    // In production: await api.post('/gis/users', user)
    users.value.push(user)
  }

  /**
   * Adds a monthly remittance record.
   * @param remittance GISRemittance object
   */
  const addRemittance = (remittance: GISRemittance) => {
    // In production: await api.post('/gis/remittances', remittance)
    // Normalize empCode to uppercase so search filtering always matches,
    // regardless of what case the user typed in the form.
    remittances.value.push({ ...remittance, empCode: remittance.empCode.toUpperCase() })
  }

  /**
   * Adds a cheque detail record.
   * @param cheque GISCheque object
   */
  const addCheque = (cheque: GISCheque) => {
    // In production: await api.post('/gis/cheques', cheque)
    cheques.value.push(cheque)
  }

  /**
   * Updates an existing user in the GIS database.
   * @param user GISUser object
   */
  const updateUser = (user: GISUser) => {
    // In production: await api.put(`/gis/users/${user.empCode}/${user.gisPolicyNumber}`, user)
    const index = users.value.findIndex(u => u.empCode === user.empCode && u.gisPolicyNumber === user.gisPolicyNumber)
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
