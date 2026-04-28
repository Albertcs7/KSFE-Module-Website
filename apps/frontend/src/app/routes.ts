import type { RouteRecordRaw } from 'vue-router'

import InsuranceLayout from '../modules/Insurance/layout/InsuranceLayout.vue'
import InsurancePage from '../modules/Insurance/pages/InsurancePage.vue'
import InsuranceOptionPage from '../modules/Insurance/pages/InsuranceOptionPage.vue'
import SLIPage from '../modules/Insurance/pages/SLIPage.vue'
import GISPage from '../modules/Insurance/pages/GISPage.vue'
import AddUserPage from '../modules/Insurance/pages/AddUserPage.vue'
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
    path:'/insurance',
    component:InsuranceLayout,
    children:[
     {
      path:'',
      name:'insurance',
      component:InsurancePage,
     },
     {
      path:'sli',
      name:'insurance-sli',
      component:SLIPage,
     },
     {
      path:'gis',
      name:'insurance-gis',
      component:GISPage,
     },
     {
      path:'enroll',
      name:'insurance-enroll',
      component:AddUserPage,
     },
     {
      path:'monthly-report',
      name:'insurance-monthly-report',
      component:MonthlyReportPage,
     },
     {
      path:':optionId',
      name:'insurance-option',
      component:InsuranceOptionPage,
     }
    ]
  }
]
