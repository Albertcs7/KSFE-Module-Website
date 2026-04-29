<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  InsuranceModuleType,
  InsurancePolicyOption,
  InsuranceRemittanceForm,
} from '../../types/insurance.types'

const props = defineProps<{
  isOpen: boolean
  moduleType: InsuranceModuleType
  policyMode: 'select' | 'auto'
  policies: InsurancePolicyOption[]
  isSaving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', value: InsuranceRemittanceForm): void
}>()

const emptyForm = (): InsuranceRemittanceForm => ({
  empCode: '',
  policyNumber: '',
  salaryMonth: '',
  dueMonth: '',
  amountDeducted: 0,
  chequeId: '',
})

const formData = ref<InsuranceRemittanceForm>(emptyForm())

const availablePolicies = computed(() => {
  if (!formData.value.empCode) return []
  const empCode = formData.value.empCode.toUpperCase()
  const matchingPolicies = props.policies.filter(policy => policy.empCode.toUpperCase() === empCode)
  return Array.from(new Map(matchingPolicies.map(policy => [policy.policyNumber, policy])).values())
})

const selectedEmpName = computed(() => availablePolicies.value[0]?.empName ?? '')

watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen) {
      formData.value = emptyForm()
    }
  },
)

watch(
  () => formData.value.empCode,
  () => {
    if (props.policyMode === 'auto') {
      formData.value.policyNumber = availablePolicies.value[0]?.policyNumber ?? ''
    }
  },
)

const handleSubmit = () => {
  emit('submit', { ...formData.value })
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Monthly Remittance</h2>
        <button class="close-btn" :disabled="isSaving" @click="emit('close')">&times;</button>
      </div>

      <div v-if="selectedEmpName" class="employee-info">
        <div class="emp-avatar">U</div>
        <div class="emp-details">
          <p class="emp-code">{{ formData.empCode }}</p>
          <p class="emp-name">{{ selectedEmpName }}</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-group">
          <label for="remitEmpCode">Employee Code</label>
          <input id="remitEmpCode" v-model="formData.empCode" type="text" pattern="[0-9]+" placeholder="e.g. 3571" required />
        </div>

        <div class="form-group">
          <label for="remitPolicyNumber">{{ moduleType }} Policy Number</label>

          <select
            v-if="policyMode === 'select' && availablePolicies.length > 0"
            id="remitPolicyNumber"
            v-model="formData.policyNumber"
            required
          >
            <option value="">Select a policy</option>
            <option v-for="policy in availablePolicies" :key="policy.policyNumber" :value="policy.policyNumber">
              {{ policy.policyNumber }} (Premium: {{ policy.premium.toFixed(2) }})
            </option>
          </select>

          <input
            v-else
            id="remitPolicyNumber"
            v-model="formData.policyNumber"
            type="text"
            :readonly="policyMode === 'auto'"
            :placeholder="policyMode === 'auto' ? 'Auto-filled when employee code is entered' : `e.g. ${moduleType}-1234`"
            required
          />

          <small v-if="formData.empCode && availablePolicies.length === 0" class="text-muted">
            No {{ moduleType }} policies found for this employee code
          </small>
          <small v-if="policyMode === 'auto' && formData.policyNumber" class="text-success">
            Policy auto-filled (Premium: {{ availablePolicies[0]?.premium.toFixed(2) }})
          </small>
        </div>

        <div class="form-group">
          <label for="salaryMonth">Salary Month</label>
          <input id="salaryMonth" v-model="formData.salaryMonth" type="month" required />
        </div>

        <div class="form-group">
          <label for="dueMonth">Due Month</label>
          <input id="dueMonth" v-model="formData.dueMonth" type="month" required />
        </div>

        <div class="form-group">
          <label for="amountDeducted">Amount Deducted</label>
          <input id="amountDeducted" v-model="formData.amountDeducted" type="number" placeholder="0.00" required />
        </div>

        <div class="form-group">
          <label for="chequeId">Cheque ID (Optional)</label>
          <input id="chequeId" v-model="formData.chequeId" type="text" placeholder="Optional" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" :disabled="isSaving" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Adding...' : 'Add Remittance' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
@import './modal-shared.css';

.employee-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #5bb700;
}

.emp-avatar {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #5bb700;
  border-radius: 999px;
  font-weight: 700;
}

.emp-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.emp-code {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.emp-name {
  font-size: 1rem;
  color: #1d3a6d;
  margin: 0;
  font-weight: 600;
}

.text-muted,
.text-success {
  font-size: 0.85rem;
}

.text-muted {
  color: #94a3b8;
  font-style: italic;
}

.text-success {
  color: #16a34a;
  font-weight: 500;
}
</style>
