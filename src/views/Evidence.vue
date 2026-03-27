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
        <img :src="selectedImage?.previewUrl || selectedImage?.url" :alt="selectedImage?.description" class="max-w-full max-h-[75vh] object-contain" />
        <div class="mt-3 w-full max-w-3xl bg-white/95 rounded-lg p-3 text-xs text-gray-700">
          <p><strong>EXIF拍摄时间：</strong>{{ formatExifTime(selectedImage?.exif?.datetimeOriginal) }}</p>
          <p><strong>设备型号：</strong>{{ formatDevice(selectedImage?.exif) }}</p>
          <p><strong>是否包含定位：</strong>{{ formatGpsPresence(selectedImage?.exif) }}</p>
          <p><strong>尺寸：</strong>{{ formatSize(selectedImage?.exif) }}</p>
          <p><strong>文件哈希：</strong>{{ selectedImage?.hash || '-' }}</p>
        </div>
      </div>
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
  { id: 'CAT01', name: '环境卫生脏乱，绿化养护缺失', icon: '🧹' },
  { id: 'CAT02', name: '垃圾清运不及时，异味油污严重', icon: '🗑️' },
  { id: 'CAT03', name: '楼道堆物占道，小广告泛滥', icon: '📌' },
  { id: 'CAT04', name: '电梯故障频发，维保记录缺失', icon: '🛗' },
  { id: 'CAT05', name: '公共设施破损，路灯监控失效', icon: '📷' },
  { id: 'CAT06', name: '道路积水破损，供水水质异常', icon: '💧' },
  { id: 'CAT07', name: '外墙脱落渗水，建筑本体破损', icon: '🏚️' },
  { id: 'CAT08', name: '消防通道堵塞，消防器材过期', icon: '🧯' },
  { id: 'CAT09', name: '门禁安保松懈，外来人员随意进出', icon: '🚪' },
  { id: 'CAT10', name: '电动车乱停，飞线充电隐患', icon: '⚡' },
  { id: 'CAT11', name: '车辆无序停放，僵尸车占用公共资源', icon: '🅿️' },
  { id: 'CAT12', name: '私搭乱建，违规拆改承重墙', icon: '🏗️' },
  { id: 'CAT13', name: '养宠不文明，宠物粪便、噪音扰民', icon: '🐾' },
  { id: 'CAT14', name: '商贩占道经营，底商油烟噪音扰民', icon: '🍢' },
  { id: 'CAT15', name: '物业通知滞后，信息公示不透明', icon: '📣' },
  { id: 'CAT16', name: '公共收益不明，账目未公开', icon: '💰' },
  { id: 'CAT17', name: '维修质量差，报修响应迟缓', icon: '🧰' },
  { id: 'CAT18', name: '巡检记录缺失或造假', icon: '🧾' },
  { id: 'CAT19', name: '应急物资不足，安全演练流于形式', icon: '🚨' },
  { id: 'CAT20', name: '其他物业服务与管理问题', icon: '🧩' },
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
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return formatDate(v)
}

const formatGpsPresence = (exif) => {
  if (!exif || typeof exif !== 'object') return '未知'
  return exif.hasGps ? '是（已记录原始坐标，仅后台使用）' : '否'
}

const formatDevice = (exif) => {
  if (!exif || typeof exif !== 'object') return '-'
  const make = String(exif.make || '').trim()
  const model = String(exif.model || '').trim()
  const text = [make, model].filter(Boolean).join(' ')
  return text || '-'
}

const formatSize = (exif) => {
  if (!exif || typeof exif !== 'object') return '-'
  const w = Number(exif.imageWidth)
  const h = Number(exif.imageHeight)
  if (!Number.isFinite(w) || !Number.isFinite(h)) return '-'
  return `${w} x ${h}`
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
  showImageModal.value = true
}

const closeImageModal = () => {
  showImageModal.value = false
  selectedImage.value = null
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
