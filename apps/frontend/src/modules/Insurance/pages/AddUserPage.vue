<script setup lang="ts">
import { ref } from 'vue'
import { useSLIStore } from '../store/useSLIStore'
import { useGISStore } from '../store/useGISStore'

const sliStore = useSLIStore()
const gisStore = useGISStore()

const type = ref<'SLI' | 'GIS'>('SLI')

const empCode = ref('')
const empName = ref('')

interface PolicyEntry {
  policyNumber: string
  premium: number | ''
  dateOfMaturity: string
}

// For GIS, only 1 policy is allowed.
const gisPolicy = ref<PolicyEntry>({ policyNumber: '', premium: '', dateOfMaturity: '' })

// For SLI, multiple policies are allowed.
const sliPolicies = ref<PolicyEntry[]>([{ policyNumber: '', premium: '', dateOfMaturity: '' }])

const addSliPolicyField = () => {
  sliPolicies.value.push({ policyNumber: '', premium: '', dateOfMaturity: '' })
}

const removeSliPolicyField = (index: number) => {
  sliPolicies.value.splice(index, 1)
}

const handleSubmit = () => {
  if (!empCode.value || !empName.value) {
    alert("Employee Code and Name are required.")
    return
  }

  const code = empCode.value.toUpperCase()

  if (type.value === 'GIS') {
    if (!gisPolicy.value.policyNumber || gisPolicy.value.premium === '' || !gisPolicy.value.dateOfMaturity) {
      alert("Please fill in all GIS policy details.")
      return
    }
    
    // Check if GIS policy already exists for this person
    const existing = gisStore.users.find(u => u.empCode.toUpperCase() === code)
    if (existing) {
      alert("This employee already has a GIS policy. Only one policy is allowed per person in GIS.")
      return
    }
    
    gisStore.addUser({
      empCode: code,
      empName: empName.value,
      gisPolicyNumber: gisPolicy.value.policyNumber,
      premium: Number(gisPolicy.value.premium),
      dateOfMaturity: gisPolicy.value.dateOfMaturity
    })
    
    alert("GIS User enrolled successfully!")
    gisPolicy.value = { policyNumber: '', premium: '', dateOfMaturity: '' }
    
  } else {
    // SLI
    // Filter out completely empty policies
    const validPolicies = sliPolicies.value.filter(p => p.policyNumber.trim() !== '')
    if (validPolicies.length === 0) {
      alert("Please enter at least one SLI policy.")
      return
    }
    
    // Check if any required field is missing in the valid policies
    const isInvalid = validPolicies.some(p => p.premium === '' || !p.dateOfMaturity)
    if (isInvalid) {
      alert("Please fill in all fields (Premium, Maturity Date) for the entered policies.")
      return
    }

    validPolicies.forEach(p => {
      sliStore.addUser({
        empCode: code,
        empName: empName.value,
        sliPolicyNumber: p.policyNumber,
        premium: Number(p.premium),
        dateOfMaturity: p.dateOfMaturity
      })
    })

    alert(`Successfully enrolled user with ${validPolicies.length} SLI policies!`)
    sliPolicies.value = [{ policyNumber: '', premium: '', dateOfMaturity: '' }]
  }

  // Clear common fields after successful enrollment
  empCode.value = ''
  empName.value = ''
}
</script>

<template>
  <div class="enroll-page">
    <div class="enroll-card">
      <h1 class="page-title">Enroll New User</h1>
      <p class="page-subtitle">Add an employee to either the SLI or GIS insurance scheme.</p>
      
      <form @submit.prevent="handleSubmit" class="enroll-form">
        <!-- Common Information -->
        <div class="form-section">
          <h3>Employee Information</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="empCode">Employee Code</label>
              <input id="empCode" v-model="empCode" type="text" pattern="[0-9]+" placeholder="e.g. 3571" required />
            </div>
            <div class="form-group">
              <label for="empName">Employee Name</label>
              <input id="empName" v-model="empName" type="text" placeholder="e.g. John Doe" required />
            </div>
          </div>
        </div>

        <!-- Scheme Selection -->
        <div class="form-section">
          <h3>Insurance Scheme</h3>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="type" value="SLI" />
              <div class="radio-card">
                <strong>SLI</strong>
                <span>State Life Insurance</span>
              </div>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="type" value="GIS" />
              <div class="radio-card">
                <strong>GIS</strong>
                <span>Group Insurance Scheme</span>
              </div>
            </label>
          </div>
        </div>

        <!-- GIS Specific Form -->
        <div v-if="type === 'GIS'" class="form-section">
          <h3>GIS Policy Details</h3>
          <div class="form-row policy-row">
            <div class="form-group">
              <label>Policy Number</label>
              <input v-model="gisPolicy.policyNumber" type="text" placeholder="GIS-XXX" required />
            </div>
            <div class="form-group">
              <label>Premium</label>
              <input v-model="gisPolicy.premium" type="number" placeholder="0" required />
            </div>
            <div class="form-group">
              <label>Maturity Date</label>
              <input v-model="gisPolicy.dateOfMaturity" type="date" required />
            </div>
          </div>
        </div>

        <!-- SLI Specific Form -->
        <div v-if="type === 'SLI'" class="form-section">
          <div class="section-header">
            <h3>SLI Policy Details</h3>
            <button type="button" class="btn-sm btn-add" @click="addSliPolicyField">+ Add Another Policy</button>
          </div>
          
          <div v-for="(policy, index) in sliPolicies" :key="index" class="form-row policy-row">
            <div class="form-group">
              <label>Policy Number {{ index + 1 }}</label>
              <input v-model="policy.policyNumber" type="text" placeholder="SLI-XXX" :required="index === 0" />
            </div>
            <div class="form-group">
              <label>Premium</label>
              <input v-model="policy.premium" type="number" placeholder="0" :required="index === 0 || policy.policyNumber !== ''" />
            </div>
            <div class="form-group">
              <label>Maturity Date</label>
              <input v-model="policy.dateOfMaturity" type="date" :required="index === 0 || policy.policyNumber !== ''" />
            </div>
            <div class="form-group actions">
              <button 
                type="button" 
                class="btn-remove" 
                @click="removeSliPolicyField(index)" 
                v-if="sliPolicies.length > 1"
                title="Remove Policy"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <button type="submit" class="btn-submit">Enroll User</button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
.enroll-page {
  padding: 1rem;
  font-family: inherit;
  display: flex;
  justify-content: center;
}

.enroll-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 2rem 2.5rem;
  width: 100%;
  max-width: 800px;
}

.page-title {
  color: #1d3a6d;
  font-size: 1.8rem;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  margin: 0 0 2rem 0;
  font-size: 1rem;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  color: #0f172a;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
}

.form-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.policy-row {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  align-items: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 200px;
}

.form-group.actions {
  flex: 0 0 auto;
  min-width: auto;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.form-group input {
  padding: 0.65rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #5bb700;
  box-shadow: 0 0 0 3px rgba(91, 183, 0, 0.1);
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-label {
  flex: 1;
  cursor: pointer;
}

.radio-label input {
  display: none;
}

.radio-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  transition: all 0.2s;
  text-align: center;
}

.radio-card strong {
  font-size: 1.2rem;
  color: #1d3a6d;
  margin-bottom: 0.2rem;
}

.radio-card span {
  color: #475569;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.radio-card small {
  color: #94a3b8;
  font-size: 0.8rem;
}

.radio-label input:checked + .radio-card {
  border-color: #5bb700;
  background: #f0fdf4;
}

.radio-label input:checked + .radio-card strong {
  color: #5bb700;
}

.btn-add {
  background: #f1f5f9;
  color: #1d3a6d;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #e2e8f0;
}

.btn-remove {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  font-size: 1.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-remove:hover {
  background: #fecaca;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-submit {
  background: #1d3a6d;
  color: #fff;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.btn-submit:hover {
  background: #152b52;
  transform: translateY(-1px);
}
</style>
