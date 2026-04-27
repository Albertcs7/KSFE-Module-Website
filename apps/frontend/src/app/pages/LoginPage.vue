<script setup lang="ts">
import { useAuthStore } from '@/store/auth.store'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const empCode = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  errorMsg.value = ''
  
  if (!empCode.value || !password.value) {
    errorMsg.value = 'Please enter both Employee Code and Password'
    return
  }

  isLoading.value = true

  try {
    await authStore.login({
      UID: empCode.value,
      password: password.value,
      token: true,
    })

    router.push('/insurance')
  } catch (error: any) {
    errorMsg.value = error?.message || 'Login failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="login-container">
    <div class="login-split">
      <!-- Left side: Branding / Illustration -->
      <div class="login-brand">
        <div class="brand-content">
          <img src="/KSFE SIDE LOGO.png" alt="KSFE Logo" class="login-logo" />
          <h1 class="brand-title">Welcome to KSFE Hub</h1>
          <p class="brand-subtitle">Secure, comprehensive management for internal modules and insurance tracking.</p>
        </div>
        <div class="brand-overlay"></div>
      </div>
      
      <!-- Right side: Form -->
      <div class="login-form-wrapper">
        <div class="login-card">
          <h2>Sign In</h2>
          <p class="text-muted">Enter your credentials to access your workspace</p>
          
          <form @submit.prevent="handleLogin" class="form-container">
            <div class="input-group">
              <label for="empCode">Employee Code</label>
              <div class="input-wrapper">
                <svg viewBox="0 0 24 24" class="input-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input 
                  id="empCode" 
                  v-model="empCode" 
                  type="text" 
                  pattern="[0-9]+"
                  placeholder="e.g. 3571" 
                  :disabled="isLoading"
                  required 
                />
              </div>
            </div>
            
            <div class="input-group">
              <label for="password">Password</label>
              <div class="input-wrapper">
                <svg viewBox="0 0 24 24" class="input-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input 
                  id="password" 
                  v-model="password" 
                  type="password" 
                  placeholder="••••••••" 
                  :disabled="isLoading"
                  required 
                />
              </div>
            </div>

            <div v-if="errorMsg" class="error-message">
              {{ errorMsg }}
            </div>
            
            <button type="submit" class="btn-submit" :disabled="isLoading">
              <span v-if="isLoading" class="spinner"></span>
              <span v-else>Login</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  background-color: #f7f9fc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.login-split {
  display: flex;
  width: 100%;
  flex-direction: row;
}

/* Left Brand Side */
.login-brand {
  flex: 1.2;
  background: linear-gradient(135deg, #1d3a6d 0%, #112240 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.brand-overlay {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at top right, rgba(204, 242, 92, 0.15), transparent 40%),
                    radial-gradient(circle at bottom left, rgba(204, 242, 92, 0.1), transparent 40%);
  pointer-events: none;
}

.brand-content {
  position: relative;
  z-index: 10;
  max-width: 480px;
  padding: 2rem;
  text-align: center;
}

.login-logo {
  height: 90px;
  margin-bottom: 2rem;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
}

.brand-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  line-height: 1.2;
  color: #fff;
}

.brand-subtitle {
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

/* Right Form Side */
.login-form-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background: #fff;
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.login-card h2 {
  font-size: 2.2rem;
  color: #1d3a6d;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.text-muted {
  color: #64748b;
  margin: 0 0 2.5rem 0;
  font-size: 1rem;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  width: 1.2rem;
  height: 1.2rem;
  color: #94a3b8;
}

.input-wrapper input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 1rem;
  color: #0f172a;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.input-wrapper input:focus {
  outline: none;
  background: #fff;
  border-color: #5bb700;
  box-shadow: 0 0 0 4px rgba(91, 183, 0, 0.1);
}

.error-message {
  padding: 0.75rem;
  border-radius: 8px;
  background: #fef2f2;
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 500;
  border-left: 4px solid #ef4444;
}

.btn-submit {
  margin-top: 0.5rem;
  background: #1d3a6d;
  color: #fff;
  border: none;
  padding: 0.9rem;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 3.2rem;
}

.btn-submit:hover:not(:disabled) {
  background: #152b52;
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(29, 58, 109, 0.2);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Loading Spinner */
.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .login-split {
    flex-direction: column;
  }
  
  .login-brand {
    flex: none;
    padding: 3rem 1.5rem;
  }
  
  .login-logo {
    height: 60px;
  }
  
  .brand-title {
    font-size: 2rem;
  }
  
  .login-form-wrapper {
    padding: 3rem 1.5rem;
  }
}
</style>
