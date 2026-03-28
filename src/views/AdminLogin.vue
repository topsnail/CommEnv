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
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="input-base pr-16"
                placeholder="请输入管理员密码"
                required
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-blue-700"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :title="showPassword ? '隐藏密码' : '显示密码'"
              >
                <svg
                  v-if="!showPassword"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.323-3.95M9.88 9.88a3 3 0 104.24 4.24" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.1 6.1A9.963 9.963 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.132 5.104M3 3l18 18" />
                </svg>
              </button>
            </div>
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
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  
  if (loading.value) return
  
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
