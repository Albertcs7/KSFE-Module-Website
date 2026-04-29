<script setup lang="ts">
import { ref, watch } from 'vue'
import type { InsuranceModuleType, InsurancePolicyForm } from '../../types/insurance.types'

const props = defineProps<{
  isOpen: boolean
  mode: 'add' | 'edit'
  moduleType: InsuranceModuleType
  userToEdit?: InsurancePolicyForm | null
  isSaving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', value: InsurancePolicyForm): void
}>()

const emptyForm = (): InsurancePolicyForm => ({
  empCode: '',
  empName: '',
  policyNumber: '',
  premium: 0,
  dateOfMaturity: '',
})

const formData = ref<InsurancePolicyForm>(emptyForm())

watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen && props.mode === 'edit' && props.userToEdit) {
      formData.value = { ...props.userToEdit }
      return
    }

    if (isOpen && props.mode === 'add') {
      formData.value = emptyForm()
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
        <h2>{{ mode === 'add' ? `Add New ${moduleType} User` : `Edit ${moduleType} User` }}</h2>
        <button class="close-btn" :disabled="isSaving" @click="emit('close')">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-group">
          <label for="insuranceEmpCode">Employee Code</label>
          <input id="insuranceEmpCode" v-model="formData.empCode" type="text" pattern="[0-9]+" placeholder="e.g. 3571" :readonly="mode === 'edit'" :disabled="mode === 'edit'" required />
        </div>

        <div class="form-group">
          <label for="insuranceEmpName">Employee Name</label>
          <input id="insuranceEmpName" v-model="formData.empName" type="text" placeholder="e.g. John Doe" required />
        </div>

        <div class="form-group">
          <label for="insurancePolicyNumber">{{ moduleType }} Policy Number</label>
          <input id="insurancePolicyNumber" v-model="formData.policyNumber" type="text" :placeholder="`e.g. ${moduleType}-1234`" :readonly="mode === 'edit'" :disabled="mode === 'edit'" required />
        </div>

        <div class="form-group">
          <label for="insurancePremium">Premium (Amount)</label>
          <input id="insurancePremium" v-model="formData.premium" type="number" placeholder="0.00" required />
        </div>

        <div class="form-group">
          <label for="insuranceDateOfMaturity">Date of Maturity</label>
          <input id="insuranceDateOfMaturity" v-model="formData.dateOfMaturity" type="date" required />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" :disabled="isSaving" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : mode === 'add' ? 'Add User' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header,
.modal-actions {
  display: flex;
  align-items: center;
}

.modal-header {
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
  color: #1d3a6d;
  font-size: 1.4rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #64748b;
  line-height: 1;
}

.modal-form,
.form-group {
  display: flex;
  flex-direction: column;
}

.modal-form {
  gap: 1.2rem;
}

.form-group {
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:disabled {
  background-color: #f1f5f9;
  cursor: not-allowed;
  color: #64748b;
}

.form-group input:focus:not(:disabled) {
  outline: none;
  border-color: #5bb700;
  box-shadow: 0 0 0 3px rgba(91, 183, 0, 0.1);
}

.modal-actions {
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel,
.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.btn-primary {
  background: #5bb700;
  color: #fff;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #4a9500;
}

.btn-cancel:disabled,
.btn-primary:disabled,
.close-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.btn-primary:disabled:hover {
  background: #5bb700;
}

.form-error {
  margin: 0;
  padding: 0.75rem 1rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.9rem;
}
</style>
