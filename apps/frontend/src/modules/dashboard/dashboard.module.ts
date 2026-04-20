import type { RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../../layouts/DashboardLayout.vue'
import DashboardPage from './DashboardPage.vue'

export const dashboardModuleRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardPage,
      },
    ],
  },
]
