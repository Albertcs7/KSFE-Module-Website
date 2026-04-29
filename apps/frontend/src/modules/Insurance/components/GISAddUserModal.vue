<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import type { GISUser } from "../store/useGISStore";

/**
 * Props from parent
 * isOpen → controls modal visibility
 */
const props = defineProps<{
  isOpen: boolean;
}>();

/**
 * Events emitted to parent
 * close → close modal
 * submit → send form data to parent
 */
const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", user: GISUser): void;
}>();

const toast = useToast();

/**
 * Initial form structure
 * This matches frontend model (NOT backend)
 */
const createInitialFormData = (): GISUser => ({
  empCode: "",
  empName: "",
  gisPolicyNumber: "",
  premium: 0,
  dateOfMaturity: "",
});

/**
 * Reactive form state
 */
const formData = ref<GISUser>(createInitialFormData());

/**
 * Handle form submission
 */
const handleSubmit = () => {
  // ✅ Basic validation
  if (!formData.value.empCode || !formData.value.empName) {
    toast.error("Employee Code and Name are required");
    return;
  }

  if (!formData.value.gisPolicyNumber) {
    toast.error("Policy number is required");
    return;
  }

  if (!formData.value.premium || formData.value.premium <= 0) {
    toast.error("Premium must be greater than 0");
    return;
  }

  // ✅ Emit data to parent (IMPORTANT)
  emit("submit", { ...formData.value });

  // 🔄 Reset form after submit
  formData.value = createInitialFormData();

  // ❌ Modal should NOT stay open after submit
  emit("close");
};
</script>

<template>
  <!-- Modal Overlay -->
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>Add GIS Policy</h2>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Employee Code -->
        <div class="form-group">
          <label>Employee Code</label>
          <input
            v-model="formData.empCode"
            type="text"
            placeholder="e.g. 3571"
            required
          />
        </div>

        <!-- Employee Name -->
        <div class="form-group">
          <label>Employee Name</label>
          <input
            v-model="formData.empName"
            type="text"
            placeholder="e.g. John Doe"
            required
          />
        </div>

        <!-- Policy Number -->
        <div class="form-group">
          <label>GIS Policy Number</label>
          <input
            v-model="formData.gisPolicyNumber"
            type="text"
            placeholder="e.g. GIS-1234"
            required
          />
        </div>

        <!-- Premium -->
        <div class="form-group">
          <label>Premium</label>
          <input
            v-model.number="formData.premium"
            type="number"
            placeholder="0.00"
            required
          />
        </div>

        <!-- Maturity Date -->
        <div class="form-group">
          <label>Date of Maturity</label>
          <input v-model="formData.dateOfMaturity" type="date" required />
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary">Add Policy</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  animation: gisdeUp 0.3s ease-out;
}

@keyframes gisdeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
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

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
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

.form-group input:focus {
  outline: none;
  border-color: #5bb700;
  box-shadow: 0 0 0 3px rgba(91, 183, 0, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel {
  padding: 0.75rem 1.5rem;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #5bb700;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #4a9500;
}
</style>
