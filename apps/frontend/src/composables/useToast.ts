import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

const toasts = ref<ToastMessage[]>([])
let nextId = 0

export function useToast() {
  const addToast = (message: string, type: ToastType = 'info', duration = 3500) => {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) toasts.value.splice(index, 1)
  }

  return {
    toasts,
    success: (msg: string, d?: number) => addToast(msg, 'success', d),
    error: (msg: string, d?: number) => addToast(msg, 'error', d),
    info: (msg: string, d?: number) => addToast(msg, 'info', d),
    removeToast
  }
}
