import { createRouter, createWebHistory } from 'vue-router'
import { dashboardModuleRoutes } from '../modules/dashboard/dashboard.module'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: dashboardModuleRoutes,
})

export default router
