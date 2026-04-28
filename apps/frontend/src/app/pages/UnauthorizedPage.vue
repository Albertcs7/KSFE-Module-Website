<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="unauthorized-container">
    <div class="unauthorized-content">
      <svg viewBox="0 0 24 24" class="unauthorized-icon" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      
      <h1>Access Denied</h1>
      <p class="error-message">You don't have permission to access this module.</p>
      
      <div class="error-details">
        <p>Your current role doesn't include access to the requested module.</p>
        <p>Please contact your administrator if you believe this is an error.</p>
      </div>

      <button @click="goBack" class="btn-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </button>
    </div>
  </div>
</template>

<style scoped>
.unauthorized-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  padding: 1rem;
}

.unauthorized-content {
  background: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.unauthorized-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  color: #ef4444;
}

h1 {
  font-size: 2rem;
  color: #1d3a6d;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.error-message {
  font-size: 1.1rem;
  color: #ef4444;
  margin: 0 0 1.5rem 0;
  font-weight: 500;
}

.error-details {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
  text-align: left;
}

.error-details p {
  margin: 0.5rem 0;
  color: #7f1d1d;
  font-size: 0.95rem;
  line-height: 1.5;
}

.error-details p:first-child {
  margin-top: 0;
}

.error-details p:last-child {
  margin-bottom: 0;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #1d3a6d;
  color: white;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1.5rem;
}

.btn-back:hover {
  background: #152b52;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(29, 58, 109, 0.2);
}

.btn-back svg {
  width: 1.2rem;
  height: 1.2rem;
}
</style>
