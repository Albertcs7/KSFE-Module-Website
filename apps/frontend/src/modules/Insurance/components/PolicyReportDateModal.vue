<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from '../../../composables/useToast';

interface Props {
  isOpen: boolean
  maturityDate?: string
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', type: 'death' | 'retirement', date: string): void
}>()

const toast = useToast()

type ReportType = 'death' | 'retirement' | null
const reportType = ref<ReportType>(null)
const customDate = ref('')
const isSubmitting = ref(false)

const handleConfirm = async () => {
  if (!reportType.value) {
    toast.error('Please select Death or Retirement')
    return
  }

  if (!customDate.value) {
    toast.error('Please select a date')
    return
  }

  isSubmitting.value = true
  try {
    emit('confirm', reportType.value, customDate.value)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  reportType.value = null
  customDate.value = ''
  emit('close')
}

const isFormValid = computed(() => reportType.value && customDate.value)
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>Policy Report Options</h2>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <div class="section">
          <p class="section-label">Select Report Type</p>
          <div class="type-options">
            <button
              class="option-btn"
              :class="{ active: reportType === 'death' }"
              @click="reportType = 'death'"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
              </svg>
              <span>Death</span>
            </button>
            <button
              class="option-btn"
              :class="{ active: reportType === 'retirement' }"
              @click="reportType = 'retirement'"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9" y2="9.01"/>
                <line x1="15" y1="9" x2="15" y2="9.01"/>
              </svg>
              <span>Retirement</span>
            </button>
          </div>
        </div>

        <div v-if="reportType" class="section">
          <label :for="`date-input-${reportType}`" class="section-label">
            {{ reportType === 'death' ? 'Date of Death' : 'Date of Retirement' }}
          </label>
          <input
            :id="`date-input-${reportType}`"
            v-model="customDate"
            type="date"
            class="date-input"
          />
          <small v-if="reportType === 'retirement' && maturityDate" class="hint">
            Maturity date: {{ new Date(maturityDate).toLocaleDateString('en-IN') }}
          </small>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose">Cancel</button>
        <button
          class="btn-confirm"
          :disabled="!isFormValid || isSubmitting"
          @click="handleConfirm"
        >
          {{ isSubmitting ? 'Processing...' : 'Generate Report' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.modal-content {
  background: #fff;
  width: 90%;
  max-width: 420px;
  border-radius: 14px;
  padding: 1.75rem 2rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.14);
  animation: slideUp 0.22s ease-out;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1d3a6d;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.7rem;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #475569;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #475569;
}

.type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
  color: #475569;
  font-weight: 500;
  font-size: 0.9rem;
}

.option-btn:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.option-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d3a6d;
}

.option-btn svg {
  color: currentColor;
}

.date-input {
  padding: 0.6rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.date-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.hint {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: #64748b;
}

.modal-footer {
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-cancel,
.btn-confirm {
  padding: 0.65rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e2e8f0;
  color: #475569;
}

.btn-cancel:hover {
  background: #cbd5e1;
}

.btn-confirm {
  background: #2563eb;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
