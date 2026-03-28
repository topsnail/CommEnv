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
    path: '/tutorial',
    name: 'Tutorial',
    component: () => import('@/views/Tutorial.vue')
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
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

async function hasAdminSession() {
  try {
    const res = await fetch('/api/admin/evidence?page=1', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    return res.ok
  } catch {
    return false
  }
}

router.beforeEach(async (to) => {
  if (to.name === 'Admin') {
    const ok = await hasAdminSession()
    if (!ok) return { name: 'AdminLogin' }
    return true
  }
  if (to.name === 'AdminLogin') {
    const ok = await hasAdminSession()
    if (ok) return { name: 'Admin' }
    return true
  }
  return true
})

export default router
