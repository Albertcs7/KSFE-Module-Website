<script setup lang="ts">
import { ref, watch } from 'vue'
import type { InsuranceChequeForm } from '../../types/insurance.types'

const props = defineProps<{
  isOpen: boolean
  isSaving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', value: InsuranceChequeForm): void
}>()

const emptyForm = (): InsuranceChequeForm => ({
  encashmentDate: '',
  receiptNoOrChequeNo: '',
  salaryMonth: '',
})

const formData = ref<InsuranceChequeForm>(emptyForm())

watch(
  () => props.isOpen,
  isOpen => {
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
        <h2>Add Cheque Details</h2>
        <button class="close-btn" :disabled="isSaving" @click="emit('close')">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-group">
          <label for="encashmentDate">Encashment Date</label>
          <input id="encashmentDate" v-model="formData.encashmentDate" type="date" required />
        </div>

        <div class="form-group">
          <label for="receiptNo">Receipt No / Cheque No</label>
          <input id="receiptNo" v-model="formData.receiptNoOrChequeNo" type="text" placeholder="e.g. CHQ-998877" required />
        </div>

        <div class="form-group">
          <label for="chequeSalaryMonth">Salary Month</label>
          <input id="chequeSalaryMonth" v-model="formData.salaryMonth" type="month" required />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" :disabled="isSaving" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Cheque' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
@import './modal-shared.css';
</style>
