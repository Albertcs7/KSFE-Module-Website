<script setup lang="ts">
import { ref, watch } from "vue";
import type { InsurancePolicyForm } from "../../types/insurance.types";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import { searchPolicies } from "@/services/api/insurance.api";

const props = defineProps<{
  isOpen: boolean;
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
    if (isOpen) {
      formData.value = emptyForm();
      showConfirm.value = false;
    }
  }
);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
  () => formData.value.empCode,
  (newCode) => {
    if (!newCode || newCode.trim() === "") return;

    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
      try {
        const res = await searchPolicies(newCode);
        const data = res.data?.data || res.data || [];

        // Find exact match
        const match = data.find(
          (p: any) => String(p.employee_code || p.empCode) === newCode
        );

        if (match) {
          const fetchedName = match.employee_name || match.empName || "";
          if (fetchedName) {
            formData.value.empName = fetchedName;
          }
        }
      } catch (err) {
        console.error("Failed to auto-fetch employee name", err);
      }
    }, 500); // Debounce to avoid too many requests
  }
);

const handleRequestSubmit = () => {
  if (!formData.value.empCode || !formData.value.empName) return;
  if (!formData.value.policyNumber) return;
  if (!formData.value.premium || formData.value.premium <= 0) return;
  if (!formData.value.policyType) return;

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
        <h2>Add New Policy</h2>
        <button class="close-btn" :disabled="isSaving" @click="emit('close')">
          &times;
        </button>
      </div>

      <form @submit.prevent="handleRequestSubmit" class="modal-form">
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
          <label for="addUserPolicyType">Policy Type</label>
          <select id="addUserPolicyType" v-model="formData.policyType" required>
            <option value="SLI">SLI</option>
            <option value="GIS">GIS</option>
          </select>
        </div>

        <div class="form-group">
          <label for="addUserPolicyNumber">Policy Number</label>
          <input
            id="addUserPolicyNumber"
            v-model="formData.policyNumber"
            type="text"
            :placeholder="`e.g. 1234`"
            required
          />
        </div>

        <div class="form-group">
          <label for="addUserPremium">Premium (Amount)</label>
          <input
            id="addUserPremium"
            v-model.number="formData.premium"
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
            Add Policy
          </button>
        </div>
      </form>
    </div>
  </div>

  <ConfirmDialog
    :isOpen="showConfirm"
    title="Confirm Add Policy"
    message="Are you sure you want to add this policy?"
    confirmText="Yes, Add Policy"
    :isSaving="isSaving"
    @confirm="handleConfirm"
    @cancel="showConfirm = false"
  />
</template>

<style src="./modal-shared.css" />

<style src="./modal-shared.css" />
