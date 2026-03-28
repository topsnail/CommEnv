<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
    <div class="max-w-4xl mx-auto page-shell">
      <div class="section-gap">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <h1 class="page-title section-gap text-center">证据列表</h1>

      <div class="bg-white rounded-xl shadow-lg p-3.5 section-gap">
        <!-- 搜索框 -->
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索证据描述..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              @input="handleSearch"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <!-- 分类筛选 -->
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
            {{ cat.icon }} {{ cat.name }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-3 text-sm text-gray-600">加载中...</p>
      </div>

      <div v-else-if="filteredEvidence.length === 0" class="text-center py-10">
        <div class="text-5xl mb-3">📭</div>
        <p class="text-gray-600 text-base">暂无证据</p>
        <button @click="goToUpload" class="mt-3 btn-primary">
          立即上传
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div
          v-for="evidence in filteredEvidence"
          :key="evidence.id"
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
        >
          <div class="relative">
            <div class="aspect-video bg-gray-100">
              <img
                :src="evidence.url"
                :alt="evidence.description"
                class="w-full h-full object-cover cursor-pointer"
                loading="lazy"
                decoding="async"
                @error="onThumbError(evidence, $event)"
                @click="showImage(evidence)"
              />
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p class="text-white text-sm font-medium">{{ getCategoryName(evidence.category) }}</p>
            </div>
          </div>
          
          <div class="p-3.5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs sm:text-sm text-gray-500">{{ formatDate(evidence.timestamp) }}</span>
            </div>
            <p v-if="evidence.description" class="text-gray-700 text-sm mb-2">{{ evidence.description }}</p>
            <div class="text-xs text-gray-500 mb-2">
              <p class="truncate">EXIF：{{ formatExifSummary(evidence.exif) }}</p>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>🆔 {{ evidence.id.slice(-8) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="text-center mt-6">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="btn-secondary !text-blue-600 disabled:opacity-50"
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
      <div class="max-w-full max-h-full flex flex-col items-center" @click.stop>
        <img
          :src="selectedImage?.previewUrl || selectedImage?.url"
          :alt="selectedImage?.description"
          class="max-w-full max-h-[75vh] object-contain"
          decoding="async"
          @load="onModalImgLoad"
        />
        <div class="mt-3 w-full max-w-3xl bg-white/95 rounded-lg p-3 text-xs text-gray-700">
          <p><strong>EXIF拍摄时间：</strong>{{ formatExifTime(selectedImage?.exif?.datetimeOriginal) }}</p>
          <p><strong>设备型号：</strong>{{ formatDevice(selectedImage?.exif) }}</p>
          <p><strong>是否包含GPS：</strong>{{ formatGpsPresence(selectedImage?.exif) }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { evidenceApi } from '@/api'
import { categories as allCategories, getCategoryName } from '@/constants/categories'

const router = useRouter()

const evidenceList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const selectedFilter = ref('')
const searchQuery = ref('')
const hasMore = ref(false)
const page = ref(1)
const showImageModal = ref(false)
const selectedImage = ref(null)
const modalImgSize = ref({ w: null, h: null })

// 构建带图标的分类列表
const categories = [
  { id: '', name: '全部', icon: '📋' },
  ...allCategories.flatMap(group => group.items)
]

const filteredEvidence = computed(() => {
  let result = evidenceList.value
  
  // 分类筛选
  if (selectedFilter.value) {
    result = result.filter(e => e.category === selectedFilter.value)
  }
  
  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e => {
      return (
        e.description?.toLowerCase().includes(query) ||
        getCategoryName(e.category).toLowerCase().includes(query)
      )
    })
  }
  
  return result
})

const handleSearch = () => {
  // 搜索自动触发，不需要额外操作
}

const clearSearch = () => {
  searchQuery.value = ''
}

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

const formatExifTime = (v) => {
  const d = parseExifDate(v)
  if (!d) return '-'
  return formatDate(d)
}

// 后端保存的 EXIF 时间通常为 "YYYY-MM-DDTHH:mm:ss"（不带 Z），表达本地时间语义；
// 这里做兼容解析，避免浏览器/环境差异导致的错误或偏移。
const parseExifDate = (v) => {
  if (!v) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const s = String(v).trim()
  // 兼容旧数据：曾经把“本地时间”错误保存为带 Z 的 ISO（被当成 UTC），展示会 +8 小时。
  // 这里将其按“本地时间语义”还原（相当于减去当前时区偏移）。
  if (/Z$/i.test(s)) {
    const d0 = new Date(s)
    if (Number.isNaN(d0.getTime())) return null
    return new Date(d0.getTime() + d0.getTimezoneOffset() * 60_000)
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m) {
    const [, yy, mo, dd, hh, mi, ss] = m
    const d = new Date(Number(yy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss || '0'))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatGpsPresence = (exif) => {
  if (!exif || typeof exif !== 'object') return '未知'
  return exif.hasGps ? '是' : '否'
}

const formatDevice = (exif) => {
  if (!exif || typeof exif !== 'object') return '-'
  const make = String(exif.make || '').trim()
  const model = String(exif.model || '').trim()
  const text = [make, model].filter(Boolean).join(' ')
  return text || '-'
}

const formatSize = (exif, runtimeSizeRef) => {
  const w = Number(exif?.imageWidth)
  const h = Number(exif?.imageHeight)
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return `${w} x ${h}`
  const rw = Number(runtimeSizeRef?.value?.w)
  const rh = Number(runtimeSizeRef?.value?.h)
  if (Number.isFinite(rw) && Number.isFinite(rh) && rw > 0 && rh > 0) return `${rw} x ${rh}`
  return '-'
}

const formatExifSummary = (exif) => {
  if (!exif || typeof exif !== 'object') return '-'
  const parts = []
  const t = formatExifTime(exif.datetimeOriginal)
  if (t !== '-') parts.push(t)
  const d = formatDevice(exif)
  if (d !== '-') parts.push(d)
  return parts.length > 0 ? parts.join(' · ') : '-'
}

const showImage = (evidence) => {
  selectedImage.value = evidence
  modalImgSize.value = { w: null, h: null }
  showImageModal.value = true
}

const closeImageModal = () => {
  showImageModal.value = false
  selectedImage.value = null
  modalImgSize.value = { w: null, h: null }
}

const onModalImgLoad = (e) => {
  const img = e?.target
  const w = Number(img?.naturalWidth)
  const h = Number(img?.naturalHeight)
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    modalImgSize.value = { w, h }
  }
}

// 列表缩略图如果由于服务端生成失败返回 503，会触发 onerror。
// 这里降级到 preview（一般仍比原图小；若 preview 也失败，最终用户仍能看到兜底内容而不是空白）。
const onThumbError = (evidence, event) => {
  console.log('Thumb error:', evidence, event)
  const next = evidence?.previewUrl
  if (!next) {
    // 没有预览 URL，显示占位符
    if (event?.target && typeof event.target === 'object' && 'src' in event.target) {
      event.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f3f4f6"/><text x="200" y="150" font-size="14" text-anchor="middle" fill="#9ca3af">预览暂不可用</text></svg>`
    }
    return
  }
  if (evidence.url === next) {
    // 所有预览图都失败了，显示占位符
    if (event?.target && typeof event.target === 'object' && 'src' in event.target) {
      event.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f3f4f6"/><text x="200" y="150" font-size="14" text-anchor="middle" fill="#9ca3af">预览暂不可用</text></svg>`
    }
    return
  }
  evidence.url = next
  if (event?.target && typeof event.target === 'object' && 'src' in event.target) {
    event.target.src = next
  }
}

// 3.3.MD 要求：移除公开留言/评论/互动功能

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
