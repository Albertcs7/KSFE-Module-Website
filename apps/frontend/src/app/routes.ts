import type { RouteRecordRaw } from 'vue-router'

import InsuranceLayout from '../modules/Insurance/layout/InsuranceLayout.vue'
import PoliciesPage from '../modules/Insurance/pages/PoliciesPage.vue'
import MonthlyReportPage from '../modules/Insurance/pages/MonthlyReportPage.vue'
import LoginPage from './pages/LoginPage.vue'
import UnauthorizedPage from './pages/UnauthorizedPage.vue'

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
  },
  {
    path: '/unauthorized',
    name: 'unauthorized',
    component: UnauthorizedPage,
  },
  {
    path: '/',
    redirect: '/insurance',
  },
  {
    path: '/insurance',
    component: InsuranceLayout,
    children: [
      {
        path: '',
        name: 'insurance',
        redirect: '/insurance/policies',
      },
      {
        path: 'policies',
        name: 'insurance-policies',
        component: PoliciesPage,
      },
      {
        path: 'monthly-report',
        name: 'insurance-monthly-report',
        component: MonthlyReportPage,
      }
    ]
  }
]
