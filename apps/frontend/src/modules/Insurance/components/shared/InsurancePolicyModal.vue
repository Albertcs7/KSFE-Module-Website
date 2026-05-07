<script setup lang="ts">
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import { ref, watch } from "vue";
import type {
  InsuranceModuleType,
  InsurancePolicyForm,
} from "../../types/insurance.types";

const props = defineProps<{
  isOpen: boolean;
  moduleType: InsuranceModuleType;
  userToEdit?: InsurancePolicyForm | null;
  isSaving: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", value: InsurancePolicyForm): void;
}>();

const emptyForm = (): InsurancePolicyForm => ({
  empCode: "",
  empName: "",
  policyNumber: "",
  policyType: "SLI",
  premium: 0,
  dateOfMaturity: "",
});

const formData = ref<InsurancePolicyForm>(emptyForm());
const showConfirm = ref(false);

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.userToEdit) {
      formData.value = { ...props.userToEdit };
      showConfirm.value = false;
    }
  }
);

const handleRequestSubmit = () => {
  showConfirm.value = true;
};

const handleConfirm = () => {
  showConfirm.value = false;
  emit("submit", { ...formData.value });
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit {{ moduleType }} Policy</h2>
        <button class="close-btn" :disabled="isSaving" @click="emit('close')">
          &times;
        </button>
      </div>

      <form @submit.prevent="handleRequestSubmit" class="modal-form">
        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-group">
          <label for="editUserEmpCode">Employee Code</label>
          <input
            id="editUserEmpCode"
            v-model="formData.empCode"
            type="text"
            pattern="[0-9]+"
            placeholder="e.g. 3571"
            readonly
            disabled
            required
          />
        </div>

        <div class="form-group">
          <label for="editUserEmpName">Employee Name</label>
          <input
            id="editUserEmpName"
            v-model="formData.empName"
            type="text"
            placeholder="e.g. John Doe"
            readonly
            disabled
            required
          />
        </div>

        <div class="form-group">
          <label for="editUserPolicyNumber">{{ moduleType }} Policy Number</label>
          <input
            id="editUserPolicyNumber"
            v-model="formData.policyNumber"
            type="text"
            :placeholder="`e.g. ${moduleType}-1234`"
            required
          />
        </div>

        <div class="form-group">
          <label for="editUserPremium">Premium (Amount)</label>
          <input
            id="editUserPremium"
            v-model="formData.premium"
            type="number"
            placeholder="0.00"
            required
          />
        </div>

        <div class="form-group">
          <label for="editUserDateOfMaturity">Date of Maturity</label>
          <input
            id="editUserDateOfMaturity"
            v-model="formData.dateOfMaturity"
            type="date"
            required
          />
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-cancel"
            :disabled="isSaving"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="isSaving">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>

  <ConfirmDialog
    :isOpen="showConfirm"
    title="Confirm Edit Policy"
    message="Are you sure you want to save these changes?"
    confirmText="Yes, Save Changes"
    :isSaving="isSaving"
    @confirm="handleConfirm"
    @cancel="showConfirm = false"
  />
</template>

<style src="./modal-shared.css" />
