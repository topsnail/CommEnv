<template>
  <div class="min-h-screen bg-gray-100">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">管理员后台</h1>
        <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          退出登录
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">总证据数</p>
          <p class="text-3xl font-bold text-gray-800">{{ stats.total }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">正常证据</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.normal }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">已隐藏</p>
          <p class="text-3xl font-bold text-red-600">{{ stats.hidden }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-500 text-sm">今日新增</p>
          <p class="text-3xl font-bold text-blue-600">{{ stats.today }}</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-wrap gap-2 items-center justify-between">
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
              {{ cat.name }}
            </button>
          </div>
          <div class="flex gap-2">
            <button
              @click="exportExcel"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出Excel
            </button>
            <button
              @click="downloadAll"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              打包下载
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-4 text-gray-600">加载中...</p>
      </div>

      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">楼栋</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="evidence in filteredEvidence" :key="evidence.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ evidence.id.slice(-8) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ evidence.type === 'image' ? '图片' : '视频' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ getCategoryName(evidence.category) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ evidence.building || '-' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatDate(evidence.timestamp) }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                    evidence.hidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  ]"
                >
                  {{ evidence.hidden ? '已隐藏' : '正常' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="viewDetail(evidence)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  查看
                </button>
                <button
                  v-if="!evidence.hidden"
                  @click="hideEvidence(evidence.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  隐藏
                </button>
                <button
                  v-else
                  @click="showEvidence(evidence.id)"
                  class="text-green-600 hover:text-green-900"
                >
                  显示
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
      v-if="showDetailModal"
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      @click="closeDetailModal"
    >
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">证据详情</h3>
            <button @click="closeDetailModal" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="selectedEvidence" class="space-y-4">
            <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                v-if="selectedEvidence.type === 'image'"
                :src="mediaUrl(selectedEvidence.url)"
                :alt="selectedEvidence.description"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full relative">
                <video
                  :src="mediaUrl(selectedEvidence.url)"
                  class="w-full h-full object-cover"
                  controls
                ></video>
                <div
                  v-if="selectedEvidence.watermarkText"
                  class="absolute right-2 bottom-2 bg-black/35 text-white text-xs px-2 py-1 rounded"
                >
                  {{ selectedEvidence.watermarkText }}
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-500">证据ID</p>
                <p class="font-medium">{{ selectedEvidence.id }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">哈希值</p>
                <p class="font-medium text-xs break-all">{{ selectedEvidence.hash }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">上传时间</p>
                <p class="font-medium">{{ formatDate(selectedEvidence.timestamp) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">定位</p>
                <p class="font-medium">{{ selectedEvidence.location }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">分类</p>
                <p class="font-medium">{{ getCategoryName(selectedEvidence.category) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">楼栋</p>
                <p class="font-medium">{{ selectedEvidence.building || '-' }}</p>
              </div>
            </div>
            
            <div>
              <p class="text-sm text-gray-500">描述</p>
              <p class="font-medium">{{ selectedEvidence.description || '无' }}</p>
            </div>
            
            <div>
              <p class="text-sm text-gray-500">状态</p>
              <span
                :class="[
                  'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                  selectedEvidence.hidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                ]"
              >
                {{ selectedEvidence.hidden ? '已隐藏' : '正常' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api'

const router = useRouter()

const evidenceList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const selectedFilter = ref('')
const hasMore = ref(false)
const page = ref(1)
const stats = ref({ total: 0, normal: 0, hidden: 0, today: 0 })
const showDetailModal = ref(false)
const selectedEvidence = ref(null)

const categories = [
  { id: '', name: '全部' },
  { id: 'corridor', name: '楼道/电梯卫生' },
  { id: 'garbage', name: '垃圾堆积' },
  { id: 'greenery', name: '绿化缺失' },
  { id: 'facility', name: '设施损坏' },
  { id: 'fire', name: '消防通道堵塞' },
  { id: 'lighting', name: '照明/监控缺失' },
  { id: 'other', name: '其他问题' }
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
    const response = await adminApi.listAll({
      page: page.value,
      category: selectedFilter.value || undefined
    })
    
    if (reset) {
      evidenceList.value = response.data
      stats.value = response.stats
    } else {
      evidenceList.value = [...evidenceList.value, ...response.data]
    }
    
    hasMore.value = response.hasMore
  } catch (error) {
    if (error.response?.status === 401) {
      router.push('/admin/login')
    }
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

const viewDetail = (evidence) => {
  selectedEvidence.value = evidence
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedEvidence.value = null
}

const hideEvidence = async (id) => {
  try {
    await adminApi.hideEvidence(id)
    const evidence = evidenceList.value.find(e => e.id === id)
    if (evidence) evidence.hidden = true
    stats.value.hidden++
    stats.value.normal--
  } catch (error) {
    alert('操作失败')
  }
}

const showEvidence = async (id) => {
  try {
    await adminApi.showEvidence(id)
    const evidence = evidenceList.value.find(e => e.id === id)
    if (evidence) evidence.hidden = false
    stats.value.hidden--
    stats.value.normal++
  } catch (error) {
    alert('操作失败')
  }
}

const exportExcel = async () => {
  try {
    const blob = await adminApi.exportExcel()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `证据清单_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('导出失败')
  }
}

const downloadAll = async () => {
  try {
    const blob = await adminApi.downloadAll()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `证据文件_${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('下载失败')
  }
}

const logout = () => {
  localStorage.removeItem('adminToken')
  router.push('/admin/login')
}

const mediaUrl = (url) => {
  const token = localStorage.getItem('adminToken')
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}

onMounted(() => {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    router.push('/admin/login')
    return
  }
  loadEvidence(true)
})
</script>
