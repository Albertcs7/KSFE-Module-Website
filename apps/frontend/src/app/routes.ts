import type { RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../layouts/DashboardLayout.vue'
import InsuranceLayout from '../modules/Insurance/layout/InsuranceLayout.vue'
import InsurancePage from '../modules/Insurance/pages/InsurancePage.vue'
import HomePage from './pages/HomePage.vue'

export const appRoutes: RouteRecordRaw[] = [
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
    path:'/insurance',
    component:InsuranceLayout,
    children:[
     {
      path:'',
      name:'insurance',
      component:InsurancePage,
     }
    ]
  }
]
