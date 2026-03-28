<template>
  <div class="min-h-screen bg-gray-100">
    <div class="max-w-6xl mx-auto page-shell">
      <div class="flex justify-between items-center section-gap">
        <h1 class="page-title">管理后台</h1>
        <div class="flex items-center gap-2">
          <button @click="goHome" class="bg-blue-600 text-white px-3.5 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold">
            返回首页
          </button>
          <button @click="logout" class="bg-red-600 text-white px-3.5 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold">
            退出登录
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow section-gap">
        <div class="flex border-b">
          <button class="px-5 py-2.5 font-medium text-sm border-b-2 border-blue-600 text-blue-600">
            图片管理
          </button>
        </div>
      </div>

      <div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 section-gap">
          <div class="bg-white rounded-lg shadow p-4">
            <p class="text-gray-500 text-sm">总图片数</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-800">{{ stats.total }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <p class="text-gray-500 text-sm">正常图片</p>
            <p class="text-2xl sm:text-3xl font-bold text-green-600">{{ stats.normal }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <p class="text-gray-500 text-sm">待审核</p>
            <p class="text-2xl sm:text-3xl font-bold text-amber-600">{{ stats.pending }}</p>
            <p class="text-xs text-gray-500 mt-1">已隐藏 {{ stats.hidden }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <p class="text-gray-500 text-sm">本月新增</p>
            <p class="text-2xl sm:text-3xl font-bold text-blue-600">{{ stats.month }}</p>
          </div>
        </div>

        <!-- 统计图表 -->
        <StatsChart 
          :category-stats="categoryStats" 
          :trend-stats="trendStats" 
        />


        <div class="bg-white rounded-lg shadow p-4 section-gap">
          <div class="flex flex-wrap gap-2 items-center justify-between">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="cat in categories"
                :key="cat.id"
                @click="filterCategory(cat.id)"
                :class="[
                  'chip',
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
                class="bg-green-600 text-white px-3.5 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm font-semibold"
              >
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出Excel
              </button>
              <button
                @click="downloadAll"
                class="bg-blue-600 text-white px-3.5 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm font-semibold"
              >
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                打包下载{{ selectedIds.length > 0 ? `（已选${selectedIds.length}）` : '（全部）' }}
              </button>
              <span class="text-sm text-gray-500 flex items-center">
                👈原图通过此处下载！
              </span>
            </div>
          </div>
        </div>

        <div v-if="loading" class="text-center py-10">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          <p class="mt-3 text-sm text-gray-600">加载中...</p>
        </div>

        <div v-else-if="filteredEvidence.length === 0" class="text-center py-10">
          <div class="text-5xl mb-3">📭</div>
          <p class="text-gray-600 text-base">暂无数据</p>
          <p class="text-gray-500 text-sm mt-2">当前筛选条件下没有找到证据</p>
          <button @click="filterCategory('')" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold">
            查看全部数据
          </button>
        </div>

        <div v-else class="bg-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <input type="checkbox" :checked="allSelected" @change="toggleSelectAll($event)" />
                </th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">类型</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">分类</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">拍摄时间</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">上传时间</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">GPS</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">文件大小</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-lg z-10">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="evidence in filteredEvidence" :key="evidence.id">
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  <input type="checkbox" :value="evidence.id" v-model="selectedIds" />
                </td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900 font-mono">{{ evidence.id.slice(-8) }}</td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                  图片
                </td>
                <td
                  class="px-2 py-2 whitespace-nowrap text-xs text-gray-900"
                  :title="getCategoryName(evidence.category)"
                >
                  {{ getCategoryName(evidence.category).length > 7 ? getCategoryName(evidence.category).slice(0, 7) + '...' : getCategoryName(evidence.category) }}
                </td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{{ formatDate(evidence.exif?.datetimeOriginal || evidence.timestamp) }}</td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900">{{ formatDate(evidence.timestamp) }}</td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900 truncate max-w-[120px]" :title="formatGps(evidence.exif?.gps)">{{ formatGps(evidence.exif?.gps) }}</td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-900 truncate" :title="`${evidence.originalSize} bytes`">{{ formatFileSize(evidence.originalSize) }}</td>
                <td class="px-2 py-2 whitespace-nowrap">
                  <span
                    :class="[
                      'px-1.5 py-0.5 inline-flex text-xs leading-4 font-medium rounded',
                      evidence.status === 'normal'
                        ? 'bg-green-100 text-green-800'
                        : evidence.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ evidence.status === 'normal' ? '正常' : (evidence.status === 'pending' ? '待审核' : '已隐藏') }}
                  </span>
                </td>
                <td class="px-2 py-2 whitespace-nowrap text-xs font-medium sticky right-0 bg-white shadow-lg z-10">
                  <div class="flex items-center gap-1">
                    <button
                      @click="viewDetail(evidence)"
                      class="inline-flex items-center px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                    >
                      查看
                    </button>
                    <button
                      v-if="!evidence.hidden"
                      @click="hideEvidence(evidence.id)"
                      class="inline-flex items-center px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium"
                    >
                      隐藏
                    </button>
                    <button
                      v-else
                      @click="showEvidence(evidence.id)"
                      class="inline-flex items-center px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium"
                    >
                      {{ evidence.status === 'pending' ? '通过' : '恢复' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div v-if="hasMore" class="text-center mt-8">
          <button
            @click="loadMore"
            :disabled="loadingMore"
          class="btn-secondary !text-blue-600 disabled:opacity-50"
          >
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
        </div>
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
            <h3 class="text-xl font-bold">图片详情</h3>
            <button @click="closeDetailModal" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="selectedEvidence" class="space-y-4">
            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                :src="mediaUrl(selectedEvidence.previewUrl)"
                :alt="selectedEvidence.description"
                class="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                @error="onImageError"
              />
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
                <p class="font-medium">{{ formatDate(selectedEvidence.uploadedAt || selectedEvidence.timestamp) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">拍摄时间（EXIF）</p>
                <p class="font-medium">{{ formatDate(selectedEvidence.exif?.datetimeOriginal || selectedEvidence.timestamp) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">GPS（来自图片EXIF信息）</p>
                <p class="font-medium">{{ formatGps(selectedEvidence.exif?.gps) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">分类</p>
                <p class="font-medium">{{ getCategoryName(selectedEvidence.category) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">设备型号（EXIF）</p>
                <p class="font-medium">{{ selectedEvidence.exif?.make || '-' }} {{ selectedEvidence.exif?.model || '' }}</p>
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
                  selectedEvidence.status === 'normal'
                    ? 'bg-green-100 text-green-800'
                    : selectedEvidence.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                ]"
              >
                {{ selectedEvidence.status === 'normal' ? '正常' : (selectedEvidence.status === 'pending' ? '待审核' : '已隐藏') }}
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
import { flatCategories as categories, STATUS, MESSAGES } from '@/constants'
import StatsChart from '@/components/StatsChart.vue'

const router = useRouter()

const evidenceList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const selectedFilter = ref('')
const hasMore = ref(false)
const page = ref(1)
const stats = ref({ total: 0, normal: 0, pending: 0, hidden: 0, month: 0 })
const categoryStats = ref([])
const trendStats = ref([])
const showDetailModal = ref(false)
const selectedEvidence = ref(null)
const selectedIds = ref([])
const operationLoading = ref(false)
const operationMessage = ref('')
const operationSuccess = ref(false)

const filteredEvidence = computed(() => {
  if (!selectedFilter.value) return evidenceList.value
  return evidenceList.value.filter(e => e.category === selectedFilter.value)
})
const allSelected = computed(() => {
  if (filteredEvidence.value.length === 0) return false
  return filteredEvidence.value.every((e) => selectedIds.value.includes(e.id))
})

const loadEvidence = async (reset = false) => {
  if (reset) {
    page.value = 1
    evidenceList.value = []
    selectedIds.value = []
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
  selectedIds.value = []
  loadEvidence(true)
}

const toggleSelectAll = (event) => {
  const checked = Boolean(event?.target?.checked)
  if (checked) {
    const ids = filteredEvidence.value.map((e) => e.id)
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...ids]))
  } else {
    const remove = new Set(filteredEvidence.value.map((e) => e.id))
    selectedIds.value = selectedIds.value.filter((id) => !remove.has(id))
  }
}

const getCategoryName = (categoryId) => {
  const cat = categories.find(c => c.id === categoryId)
  if (cat) return cat.name
  const legacy = {
    corridor: '楼道堆物占道，小广告泛滥',
    garbage: '垃圾清运不及时，异味油污严重',
    greenery: '环境卫生脏乱，绿化养护缺失',
    facility: '公共设施破损，路灯监控失效',
    fire: '消防通道堵塞，消防器材过期',
    lighting: '公共设施破损，路灯监控失效',
    other: '其他问题',
  }
  return legacy[categoryId] || '未知'
}

const parseLocalDateTimeLike = (v) => {
  if (!v) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const s = String(v).trim()
  // 兼容旧数据：曾把 EXIF 本地时间保存成带 Z 的 ISO（当 UTC 展示会 +8 小时）
  if (/Z$/i.test(s)) {
    const d0 = new Date(s)
    if (Number.isNaN(d0.getTime())) return null
    return new Date(d0.getTime() + d0.getTimezoneOffset() * 60_000)
  }
  // "YYYY-MM-DDTHH:mm:ss"（不带时区）按本地时间构造，避免不同浏览器当 UTC 解析
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m) {
    const [, yy, mo, dd, hh, mi, ss] = m
    const d = new Date(Number(yy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss || '0'))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatDate = (timestamp) => {
  const date = parseLocalDateTimeLike(timestamp)
  if (!date) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatGps = (gps) => {
  if (!gps || typeof gps !== 'object') return '-'
  const lat = Number(gps.lat)
  const lon = Number(gps.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '-'
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`
}

const formatHashShort = (hash) => {
  const s = String(hash || '')
  if (!s) return '-'
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}…${s.slice(-6)}`
}

const formatFileSize = (size) => {
  const s = Number(size)
  if (!Number.isFinite(s) || s < 0) return '-'
  if (s === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(s) / Math.log(k))
  return `${(s / Math.pow(k, i)).toFixed(2)} ${units[i]}`
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
  operationLoading.value = true
  operationMessage.value = ''
  try {
    await adminApi.hideEvidence(id)
    const evidence = evidenceList.value.find(e => e.id === id)
    if (evidence) {
      if (evidence.status === 'normal') stats.value.normal = Math.max(0, stats.value.normal - 1)
      if (evidence.status === 'pending') stats.value.pending = Math.max(0, stats.value.pending - 1)
      evidence.status = 'hidden'
      evidence.hidden = true
      stats.value.hidden++
    }
    operationMessage.value = '隐藏成功'
    operationSuccess.value = true
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } catch (error) {
    operationMessage.value = '操作失败'
    operationSuccess.value = false
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } finally {
    operationLoading.value = false
  }
}

const showEvidence = async (id) => {
  operationLoading.value = true
  operationMessage.value = ''
  try {
    await adminApi.showEvidence(id)
    const evidence = evidenceList.value.find(e => e.id === id)
    if (evidence) {
      if (evidence.status === 'hidden') stats.value.hidden = Math.max(0, stats.value.hidden - 1)
      if (evidence.status === 'pending') stats.value.pending = Math.max(0, stats.value.pending - 1)
      evidence.status = 'normal'
      evidence.hidden = false
      stats.value.normal++
    }
    operationMessage.value = '操作成功'
    operationSuccess.value = true
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } catch (error) {
    operationMessage.value = '操作失败'
    operationSuccess.value = false
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } finally {
    operationLoading.value = false
  }
}

const exportExcel = async () => {
  operationLoading.value = true
  operationMessage.value = ''
  try {
    const blob = await adminApi.exportExcel({
      category: selectedFilter.value || undefined,
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `证据清单_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    operationMessage.value = '导出成功'
    operationSuccess.value = true
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } catch (error) {
    operationMessage.value = '导出失败'
    operationSuccess.value = false
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } finally {
    operationLoading.value = false
  }
}

const downloadAll = async () => {
  operationLoading.value = true
  operationMessage.value = ''
  try {
    const blob = await adminApi.downloadAll({
      ids: selectedIds.value.length > 0 ? selectedIds.value.join(',') : undefined,
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `证据文件_${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    window.URL.revokeObjectURL(url)
    operationMessage.value = '下载成功'
    operationSuccess.value = true
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } catch (error) {
    operationMessage.value = '下载失败'
    operationSuccess.value = false
    setTimeout(() => {
      operationMessage.value = ''
    }, 3000)
  } finally {
    operationLoading.value = false
  }
}

const logout = () => {
  adminApi.logout().finally(() => {
    router.push('/admin/login')
  })
}

const goHome = () => {
  router.push('/')
}

const mediaUrl = (url) => {
  return url
}

const onImageError = (event) => {
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%" y="50%" font-family="Arial" font-size="16" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3E图片加载失败%3C/text%3E%3C/svg%3E'
  event.target.alt = '图片加载失败'
}

const loadStats = async () => {
  try {
    const response = await adminApi.stats()
    categoryStats.value = response.categoryStats || []
    trendStats.value = response.trendStats || []
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onMounted(() => {
  loadEvidence(true)
  loadStats()
})
</script>
