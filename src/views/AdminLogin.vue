<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800 mb-2">管理员登录</h1>
          <p class="text-gray-600">请输入管理员密码</p>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-6">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入管理员密码"
              required
            />
          </div>

          <div v-if="error" class="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <button @click="goBack" class="text-gray-600 hover:text-gray-800">
            返回首页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api'

const router = useRouter()

const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!password.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await adminApi.login(password.value)
    localStorage.setItem('adminToken', response.token)
    router.push('/admin')
  } catch (err) {
    error.value = err.response?.data?.message || '登录失败，请检查密码'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>
