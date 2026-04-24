<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ToastNotification from './components/ui/ToastNotification.vue'

const router = useRouter()
const route = useRoute()

// Session Management: 15-minute idle timeout
const TIMEOUT_MS = 15 * 60 * 1000
let timeoutId: number | undefined

const resetTimer = () => {
  clearTimeout(timeoutId)
  if (route.path !== '/login') {
    timeoutId = window.setTimeout(() => {
      router.push('/login')
      // You can add a toast notification here if desired
    }, TIMEOUT_MS)
  }
}

const events = ['mousemove', 'keydown', 'scroll', 'click']

onMounted(() => {
  events.forEach(e => window.addEventListener(e, resetTimer))
  resetTimer()
})

onUnmounted(() => {
  events.forEach(e => window.removeEventListener(e, resetTimer))
  clearTimeout(timeoutId)
})
</script>

<template>
  <ToastNotification />
  <router-view />
</template>

<style scoped></style>
