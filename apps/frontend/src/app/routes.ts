import type { RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../layouts/DashboardLayout.vue'
import HomePage from './pages/HomePage.vue'
import InsuranceLayout from '@/layouts/InsuranceLayout.vue'
import InsurancePage from './pages/InsurancePage.vue'

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
