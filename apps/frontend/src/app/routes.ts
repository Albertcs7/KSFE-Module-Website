import type { RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../layouts/DashboardLayout.vue'
import InsuranceLayout from '../modules/Insurance/layout/InsuranceLayout.vue'
import InsurancePage from '../modules/Insurance/pages/InsurancePage.vue'
import InsuranceOptionPage from '../modules/Insurance/pages/InsuranceOptionPage.vue'
import SLIPage from '../modules/Insurance/pages/SLIPage.vue'
import GISPage from '../modules/Insurance/pages/GISPage.vue'
import AddUserPage from '../modules/Insurance/pages/AddUserPage.vue'
import HomePage from './pages/HomePage.vue'
import LoginPage from './pages/LoginPage.vue'

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
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
      path:':optionId',
      name:'insurance-option',
      component:InsuranceOptionPage,
     }
    ]
  }
]
