<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-xl shadow-lg p-5 sm:p-6">
        <div class="text-center section-gap">
          <h1 class="page-title mb-2">管理员登录</h1>
          <p class="text-gray-600 text-sm sm:text-base">请输入管理员密码</p>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-5">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="input-base"
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
            class="w-full btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
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
    await adminApi.login(password.value)
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
