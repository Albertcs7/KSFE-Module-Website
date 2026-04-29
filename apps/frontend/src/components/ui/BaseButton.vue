<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'edit' | 'print' | 'cancel'
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  title?: string
  type?: 'button' | 'submit' | 'reset'
}>()

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <button
    :type="type || 'button'"
    :class="['base-button', variant, { disabled: disabled || loading }]"
    :disabled="disabled || loading"
    :title="title"
    @click="$emit('click', $event)"
  >
    <slot name="icon"></slot>
    <span v-if="loading && loadingText">{{ loadingText }}</span>
    <slot v-else></slot>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  font-family: inherit;
  justify-content: center;
}

.base-button.primary {
  background: #1d3a6d;
  color: #fff;
}

.base-button.primary:hover:not(:disabled) {
  background: #152b52;
  box-shadow: 0 4px 12px rgba(29, 58, 109, 0.2);
}

.base-button.secondary {
  background: #fff;
  color: #1d3a6d;
  border-color: #e2e8f0;
}

.base-button.secondary:hover:not(:disabled) {
  border-color: #1d3a6d;
  background: #f8fafc;
}

.base-button.edit {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 6px;
}

.base-button.edit:hover:not(:disabled) {
  background: #dcfce7;
}

.base-button.print {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 6px;
}

.base-button.print:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.base-button.cancel {
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.base-button.cancel:hover:not(:disabled) {
  background: #f8fafc;
  color: #0f172a;
}

.base-button.disabled {
  cursor: not-allowed !important;
  opacity: 0.65;
  pointer-events: none;
}
</style>
