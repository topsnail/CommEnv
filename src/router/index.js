import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('@/views/Upload.vue')
  },
  {
    path: '/evidence',
    name: 'Evidence',
    component: () => import('@/views/Evidence.vue')
  },
  {
    path: '/legal',
    name: 'Legal',
    component: () => import('@/views/Legal.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue')
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/AdminLogin.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
