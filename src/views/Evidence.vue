<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="mb-6">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">证据列表</h1>

      <div class="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="filterCategory(cat.id)"
            :class="[
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              selectedFilter === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ cat.icon }} {{ cat.name }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-4 text-gray-600">加载中...</p>
      </div>

      <div v-else-if="filteredEvidence.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">📭</div>
        <p class="text-gray-600 text-lg">暂无证据</p>
        <button @click="goToUpload" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          立即上传
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="evidence in filteredEvidence"
          :key="evidence.id"
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
        >
          <div class="relative">
            <div v-if="evidence.type === 'image'" class="aspect-video bg-gray-100">
              <img
                :src="evidence.url"
                :alt="evidence.description"
                class="w-full h-full object-cover cursor-pointer"
                @click="showImage(evidence)"
              />
            </div>
            <div v-else class="aspect-video bg-gray-100 flex items-center justify-center">
              <div class="w-full h-full relative">
                <video
                  :src="evidence.url"
                  class="w-full h-full object-cover"
                  controls
                ></video>
                <div
                  v-if="evidence.watermarkText"
                  class="absolute right-2 bottom-2 bg-black/35 text-white text-xs px-2 py-1 rounded"
                >
                  {{ evidence.watermarkText }}
                </div>
              </div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p class="text-white text-sm font-medium">{{ getCategoryName(evidence.category) }}</p>
            </div>
          </div>
          
          <div class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-500">{{ formatDate(evidence.timestamp) }}</span>
              <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{{ evidence.building || '未填写' }}</span>
            </div>
            <p v-if="evidence.description" class="text-gray-700 text-sm mb-2">{{ evidence.description }}</p>
            <div class="flex items-center text-xs text-gray-500">
              <span class="mr-4">📍 {{ evidence.building || '公共区域' }}</span>
              <span>🆔 {{ evidence.id.slice(-8) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="text-center mt-8">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <div
      v-if="showImageModal"
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      @click="closeImageModal"
    >
      <img :src="selectedImage?.url" :alt="selectedImage?.description" class="max-w-full max-h-full object-contain" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { evidenceApi } from '@/api'

const router = useRouter()

const evidenceList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const selectedFilter = ref('')
const hasMore = ref(false)
const page = ref(1)
const showImageModal = ref(false)
const selectedImage = ref(null)

const categories = [
  { id: '', name: '全部', icon: '📋' },
  { id: 'corridor', name: '楼道/电梯卫生', icon: '🧹' },
  { id: 'garbage', name: '垃圾堆积', icon: '🗑️' },
  { id: 'greenery', name: '绿化缺失', icon: '🌿' },
  { id: 'facility', name: '设施损坏', icon: '🔧' },
  { id: 'fire', name: '消防通道堵塞', icon: '🚒' },
  { id: 'lighting', name: '照明/监控缺失', icon: '💡' },
  { id: 'other', name: '其他问题', icon: '📋' }
]

const filteredEvidence = computed(() => {
  if (!selectedFilter.value) return evidenceList.value
  return evidenceList.value.filter(e => e.category === selectedFilter.value)
})

const loadEvidence = async (reset = false) => {
  if (reset) {
    page.value = 1
    evidenceList.value = []
  }
  
  loading.value = true
  try {
    const response = await evidenceApi.list({
      page: page.value,
      category: selectedFilter.value || undefined
    })
    
    if (reset) {
      evidenceList.value = response.data
    } else {
      evidenceList.value = [...evidenceList.value, ...response.data]
    }
    
    hasMore.value = response.hasMore
  } catch (error) {
    console.error('加载证据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  page.value++
  await loadEvidence(false)
  loadingMore.value = false
}

const filterCategory = (categoryId) => {
  selectedFilter.value = categoryId
  loadEvidence(true)
}

const getCategoryName = (categoryId) => {
  const cat = categories.find(c => c.id === categoryId)
  return cat ? cat.name : '未知'
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const showImage = (evidence) => {
  if (evidence.type === 'image') {
    selectedImage.value = evidence
    showImageModal.value = true
  }
}

const closeImageModal = () => {
  showImageModal.value = false
  selectedImage.value = null
}

const goBack = () => {
  router.push('/')
}

const goToUpload = () => {
  router.push('/upload')
}

onMounted(() => {
  loadEvidence(true)
})
</script>
