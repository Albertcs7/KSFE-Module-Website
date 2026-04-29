<script setup lang="ts">
import BaseButton from './BaseButton.vue'

defineProps<{
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="!isSaving && emit('cancel')">
    <div class="confirm-dialog">
      <div class="dialog-header">
        <h3>{{ title || 'Confirm Action' }}</h3>
      </div>
      <div class="dialog-body">
        <p>{{ message }}</p>
      </div>
      <div class="dialog-footer">
        <BaseButton variant="cancel" :disabled="isSaving" @click="emit('cancel')">
          {{ cancelText || 'Cancel' }}
        </BaseButton>
        <BaseButton variant="primary" :loading="isSaving" @click="emit('confirm')">
          {{ confirmText || 'Confirm' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.confirm-dialog {
  background: #fff;
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: modal-fade-in 0.2s ease-out;
}

.dialog-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.dialog-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.1rem;
}

.dialog-body {
  padding: 1.5rem;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.5;
}

.dialog-body p {
  margin: 0;
}

.dialog-footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
