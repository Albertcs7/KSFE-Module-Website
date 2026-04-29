<script setup lang="ts">
/**
 * ============================================================================
 * InsuranceAddUserModal.vue — Add New User / Policy
 * ============================================================================
 * A dedicated modal for enrolling a NEW employee into an insurance scheme.
 * This is separate from the Edit modal so backend integration is clear:
 *
 * BACKEND TEAM:
 *   - This modal triggers a CREATE / POST operation.
 *   - Endpoint example: POST /api/{moduleType}/users
 *   - Payload: { empCode, empName, policyNumber, premium, dateOfMaturity }
 *   - Wire the @submit handler in the parent page to call your API.
 * ============================================================================
 */

import { ref, watch } from 'vue'
import type { InsuranceModuleType, InsurancePolicyForm } from '../../types/insurance.types'

const props = defineProps<{
  /** Controls modal visibility */
  isOpen: boolean
  /** Which insurance scheme this modal is for ('SLI' or 'GIS') */
  moduleType: InsuranceModuleType
  /** Set to true while the parent is awaiting the API response */
  isSaving: boolean
  /** Error message from the store / API to display inside the modal */
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

// Reset form every time the modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
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
        <h2>Add New {{ moduleType }} User</h2>
        <button class="close-btn" :disabled="isSaving" @click="emit('close')">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-group">
          <label for="addUserEmpCode">Employee Code</label>
          <input
            id="addUserEmpCode"
            v-model="formData.empCode"
            type="text"
            pattern="[0-9]+"
            placeholder="e.g. 3571"
            required
          />
        </div>

        <div class="form-group">
          <label for="addUserEmpName">Employee Name</label>
          <input
            id="addUserEmpName"
            v-model="formData.empName"
            type="text"
            placeholder="e.g. John Doe"
            required
          />
        </div>

        <div class="form-group">
          <label for="addUserPolicyNumber">{{ moduleType }} Policy Number</label>
          <input
            id="addUserPolicyNumber"
            v-model="formData.policyNumber"
            type="text"
            :placeholder="`e.g. ${moduleType}-1234`"
            required
          />
        </div>

        <div class="form-group">
          <label for="addUserPremium">Premium (Amount)</label>
          <input
            id="addUserPremium"
            v-model="formData.premium"
            type="number"
            placeholder="0.00"
            required
          />
        </div>

        <div class="form-group">
          <label for="addUserDateOfMaturity">Date of Maturity</label>
          <input
            id="addUserDateOfMaturity"
            v-model="formData.dateOfMaturity"
            type="date"
            required
          />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" :disabled="isSaving" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Add User' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style src="./modal-shared.css" />
