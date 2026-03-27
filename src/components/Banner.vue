<template>
  <div v-if="!isHidden" class="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-green-600 text-white p-4 shadow-lg z-50 transition-all duration-300">
    <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex-1">
        <h2 class="text-xl font-bold mb-2">小区公共环境存证平台</h2>
        <p class="text-sm md:text-base opacity-90">
          上传照片记录小区公共环境问题，实现系统化归类存储与客观记录。
          平台保存原始照片，确保信息真实性，便于投诉反馈、整改沟通及合法维权。
          通过信息透明化推动物业有效履职，共建整洁、安全、有序的高品质居住环境。
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">记录</span>
          <span class="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">归集</span>
          <span class="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">保存</span>
          <span class="px-3 py-1 bg-yellow-400 text-blue-900 rounded-full text-xs font-medium">非司法存证</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <router-link to="/upload" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
          立即上传
        </router-link>
        <button 
          @click="closeBanner" 
          class="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
          aria-label="关闭提示"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isHidden = ref(false)

const closeBanner = () => {
  isHidden.value = true
  localStorage.setItem('bannerHidden', 'true')
}

onMounted(() => {
  const hidden = localStorage.getItem('bannerHidden')
  if (hidden === 'true') {
    isHidden.value = true
  }
})
</script>
