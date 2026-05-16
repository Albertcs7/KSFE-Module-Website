import type { RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../layouts/DashboardLayout.vue'
import InsuranceLayout from '../modules/Insurance/layout/InsuranceLayout.vue'
import MonthlyReportPage from '../modules/Insurance/pages/MonthlyReportPage.vue'
import PolicyReportPreviewPage from '../modules/Insurance/pages/PolicyReportPreviewPage.vue'
import PoliciesPage from '../modules/Insurance/pages/PoliciesPage.vue'
import HomePage from './pages/HomePage.vue'
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
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: HomePage,
      },
    ],
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
        path: 'policies/:id/report',
        name: 'insurance-policy-report',
        component: PolicyReportPreviewPage,
      },
      {
        path: 'monthly-report',
        name: 'insurance-monthly-report',
        component: MonthlyReportPage,
      }
    ]
  }
]
