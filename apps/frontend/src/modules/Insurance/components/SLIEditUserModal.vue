<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSLIStore, type SLIUser } from '../store/useSLIStore'
import { useToast } from '../../../composables/useToast'

const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  userToEdit: SLIUser | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const sliStore = useSLIStore()

// Form State
const formData = ref<SLIUser>({
  empCode: '',
  empName: '',
  sliPolicyNumber: '',
  premium: 0,
  dateOfMaturity: ''
})

// Populate form when modal opens with a user
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.userToEdit) {
    formData.value = { ...props.userToEdit }
  }
})

const handleSubmit = () => {
  if (!formData.value.empCode || !formData.value.empName) {
    toast.error("Please fill in required fields: Employee Code and Name.")
    return
  }
  
  sliStore.updateUser({ ...formData.value })
  emit('close')
  toast.success("User details updated successfully!")
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit SLI User</h2>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-group">
          <label for="editEmpCode">Employee Code (Read Only)</label>
          <input id="editEmpCode" v-model="formData.empCode" type="text" readonly disabled />
        </div>
        
        <div class="form-group">
          <label for="editEmpName">Employee Name</label>
          <input id="editEmpName" v-model="formData.empName" type="text" required />
        </div>
        
        <div class="form-group">
          <label for="editSliPolicyNumber">SLI Policy Number (Read Only)</label>
          <input id="editSliPolicyNumber" v-model="formData.sliPolicyNumber" type="text" readonly disabled />
        </div>
        
        <div class="form-group">
          <label for="editPremium">Premium (Amount)</label>
          <input id="editPremium" v-model="formData.premium" type="number" required />
        </div>
        
        <div class="form-group">
          <label for="editDateOfMaturity">Date of Maturity</label>
          <input id="editDateOfMaturity" v-model="formData.dateOfMaturity" type="date" required />
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
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
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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
