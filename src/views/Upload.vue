<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
    <div class="max-w-2xl mx-auto page-shell">
      <div class="section-gap">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <h1 class="page-title section-gap text-center">上传证据</h1>

      <div class="bg-red-50 border-l-4 border-red-400 p-3.5 section-gap rounded-r-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">
              <strong>重要提示：</strong>请勿拍摄人脸、车牌、住户室内、门窗内等隐私内容。仅拍摄小区公共区域。
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">问题分类（单选）</h2>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openCategoryPicker"
            class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-left hover:border-blue-500 transition-colors"
          >
            <p class="text-xs text-gray-500 mb-0.5">当前分类</p>
            <p class="text-sm font-semibold text-gray-800">
              {{ selectedCategoryName || '请选择问题分类（必选）' }}
            </p>
          </button>
          <button
            type="button"
            @click="openCategoryPicker"
            class="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg"
          >
            选择
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h2 class="section-title !mb-0">选择文件</h2>
          <button
            type="button"
            @click="$refs.fileInput.click()"
            class="shrink-0 btn-primary !py-2 !px-3 !text-sm"
          >
            选择文件
          </button>
        </div>

        <div
          class="border-2 border-dashed rounded-lg p-3.5 text-center transition-colors cursor-pointer"
          :class="dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'"
          @click="$refs.fileInput.click()"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            @change="handleFileSelect"
            class="hidden"
          />

          <div class="flex items-center justify-center gap-3">
            <div class="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div class="text-left">
              <p class="text-gray-700 text-sm font-medium">点击选择文件（支持拖拽）</p>
              <p class="text-xs text-gray-500 mt-0.5">jpg/jpeg/png，≤10MB（原图直传：不压缩、不加水印、不修改EXIF）</p>
            </div>
          </div>
        </div>

        <div v-if="selectedFiles.length > 0" class="mt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-700">已选择 {{ selectedFiles.length }} 个文件</h3>
            <button type="button" class="text-sm text-blue-600 hover:text-blue-800" @click="$refs.fileInput.click()">
              继续添加
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(file, index) in selectedFiles" :key="index" class="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
              <div class="flex items-center min-w-0">
                <span class="text-lg mr-2.5">{{ file.type.startsWith('image') ? '🖼️' : '🎬' }}</span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ file.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
                </div>
              </div>
              <button type="button" @click="removeFile(index)" class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">情况描述（选填）</h2>
        <textarea
          v-model="description"
          maxlength="100"
          rows="2"
          class="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="简单描述一下情况，100字以内"
        ></textarea>
        <p class="text-sm text-gray-500 mt-1">{{ description.length }}/100</p>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3.5 section-gap rounded-r-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              <strong>最后确认：</strong>请再次确认没有拍摄人脸、车牌、室内等隐私内容。证据一旦上传不可删除。
            </p>
          </div>
        </div>
      </div>

      <button
        @click="requestUpload"
        :disabled="!canUpload || uploading"
        class="w-full btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ uploading ? `上传中 ${uploadProgress}%` : '确认上传' }}
      </button>

      <div v-if="uploading || uploadProgress > 0" class="mt-3 bg-white rounded-lg border border-gray-200 p-3">
        <div class="flex items-center justify-between text-xs text-gray-600 mb-1.5">
          <span>{{ uploadStatusText }}</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-600 transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- 强制合规确认（ZHILING 要求：上传前必须弹窗并需用户确认） -->
      <div
        v-if="showComplianceModal"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        @click="closeComplianceModal"
      >
        <div class="bg-white rounded-xl max-w-lg w-full p-4" @click.stop>
          <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-3">上传合规确认</h3>
          <div class="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p class="flex items-center gap-1.5 font-semibold">
              <span aria-hidden="true">⚠️</span>
              审核提醒
            </p>
            <p class="mt-1 text-amber-800">
              为避免上传涉黄、暴力、隐私等不合规图片，上传内容需经管理员审核通过后才会在前台显示。
            </p>
          </div>
          <div class="text-sm text-gray-700 space-y-2">
            <p><strong>1.</strong> 仅拍摄小区公共区域，不要拍住户室内、门窗内景、人脸、车牌及个人隐私。</p>
            <p><strong>2.</strong> 上传后证据将进入不可删除的留存链条（管理员仅可隐藏不合规的无效内容，不会删除）。</p>
            <p><strong>3.</strong> 本站会读取并留存原图 EXIF（如拍摄时间、GPS），但不会修改原图文件内容。</p>
          </div>

          <label class="mt-4 flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" v-model="complianceChecked" class="mt-1" />
            <span>我已确认以上内容，愿意继续上传。</span>
          </label>

          <div class="mt-4 flex gap-2.5">
            <button
              class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg text-sm font-medium"
              @click="closeComplianceModal"
            >
              取消
            </button>
            <button
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!complianceChecked || uploading"
              @click="confirmAndUpload"
            >
              确认上传
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showCategoryPicker"
        class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        @click="closeCategoryPicker"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[80vh] overflow-hidden" @click.stop>
          <div class="p-3.5 border-b">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-base sm:text-lg font-bold text-gray-800">选择问题分类</h3>
              <button class="text-gray-500 hover:text-gray-700" @click="closeCategoryPicker">关闭</button>
            </div>
            <input
              v-model="categoryKeyword"
              type="text"
              placeholder="搜索分类关键词..."
              class="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="overflow-y-auto p-3 space-y-1.5">
            <button
              v-for="cat in filteredCategories"
              :key="cat.id"
              type="button"
              @click="selectCategory(cat.id)"
              :class="[
                'w-full text-left border rounded-lg px-3 py-2 transition-colors',
                selectedCategory === cat.id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 hover:border-blue-300'
              ]"
            >
              <div class="text-sm font-semibold leading-snug">{{ cat.icon }} {{ cat.name }}</div>
            </button>
            <p v-if="filteredCategories.length === 0" class="text-sm text-gray-500 text-center py-4">没有匹配的分类</p>
          </div>
        </div>
      </div>

      <div v-if="uploadSuccess" class="mt-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
        <p class="text-sm text-green-700">
          <strong>上传成功！</strong>为避免上传涉黄、暴力、隐私等不合规图片，图片将有管理员通过审核后显示。
        </p>
      </div>

      <div v-if="uploadError" class="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
        <p class="text-sm text-red-700">
          <strong>上传失败：</strong>{{ uploadError }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { evidenceApi } from '@/api'

const router = useRouter()

const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024

const selectedFiles = ref([])
const selectedCategory = ref('')
const description = ref('')
const dragging = ref(false)
const showComplianceModal = ref(false)
const showCategoryPicker = ref(false)
const complianceChecked = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatusText = ref('')
const uploadSuccess = ref(false)
const uploadError = ref('')
const categoryKeyword = ref('')

const categories = [
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

const canUpload = computed(() => {
  return selectedFiles.value.length > 0 && selectedCategory.value
})
const selectedCategoryName = computed(() => {
  const c = categories.find((v) => v.id === selectedCategory.value)
  return c ? `${c.icon} ${c.name}` : ''
})
const filteredCategories = computed(() => {
  const kw = categoryKeyword.value.trim()
  if (!kw) return categories
  return categories.filter((c) => c.name.includes(kw) || c.id.toLowerCase().includes(kw.toLowerCase()))
})

const openCategoryPicker = () => {
  showCategoryPicker.value = true
}
const closeCategoryPicker = () => {
  showCategoryPicker.value = false
}
const selectCategory = (id) => {
  selectedCategory.value = id
  showCategoryPicker.value = false
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  appendFiles(files)
}

const handleDrop = (event) => {
  dragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  appendFiles(files)
}

const appendFiles = (files) => {
  const validFiles = files.filter(file => {
    const name = String(file?.name || '').toLowerCase()
    const type = String(file?.type || '').toLowerCase()
    const isImage = type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png' || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')
    const isSizeValid = isImage ? file.size <= MAX_INPUT_IMAGE_BYTES : false
    
    if (!isImage) {
      alert('仅支持 jpg、jpeg、png 格式')
      return false
    }
    if (!isSizeValid) {
      alert('图片大小不能超过10MB')
      return false
    }
    return true
  })
  
  selectedFiles.value = [...selectedFiles.value, ...validFiles]
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const requestUpload = () => {
  if (!canUpload.value) return
  showComplianceModal.value = true
  complianceChecked.value = false
}

const closeComplianceModal = () => {
  showComplianceModal.value = false
}

const PRESET_THUMB_CLIENT = { maxW: 360, maxH: 360, quality: 0.72 }
const PRESET_PREVIEW_CLIENT = { maxW: 1600, maxH: 1600, quality: 0.82 }

function calcFitSize(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH) return { width: maxW, height: maxH }
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
  }
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('IMAGE_LOAD_FAILED'))
    }
    img.src = url
  })
}

async function buildJpegVariantBlob(fileOrBlob, preset) {
  const img = await loadImageFromBlob(fileOrBlob)
  const { width, height } = calcFitSize(img.naturalWidth, img.naturalHeight, preset.maxW, preset.maxH)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE')
  ctx.drawImage(img, 0, 0, width, height)

  const outBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error('TO_BLOB_FAILED'))
        resolve(b)
      },
      'image/jpeg',
      preset.quality,
    )
  })
  return outBlob
}

async function buildPlaceholderJpegBlob() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 1, 1)
  const outBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error('TO_BLOB_FAILED'))
        resolve(b)
      },
      'image/jpeg',
      0.7,
    )
  })
  return outBlob
}

const confirmAndUpload = async () => {
  if (!complianceChecked.value) return
  showComplianceModal.value = false
  await doUpload()
}

const doUpload = async () => {
  if (!canUpload.value) return

  uploading.value = true
  uploadProgress.value = 0
  uploadStatusText.value = '准备上传...'
  uploadSuccess.value = false
  uploadError.value = ''

  try {
    const formData = new FormData()

    // 原图必须保持不改动；缩略图/预览图仅用于展示，由前端生成并作为派生文件上传。
    const placeholder = await buildPlaceholderJpegBlob()

    for (let i = 0; i < selectedFiles.value.length; i++) {
      const raw = selectedFiles.value[i]
      formData.append('files', raw)

      // 为了保证服务端按索引一一对应，thumb/preview 这里“必定 append”（失败则用 placeholder 占位）
      try {
        const [thumbBlob, previewBlob] = await Promise.all([
          buildJpegVariantBlob(raw, PRESET_THUMB_CLIENT),
          buildJpegVariantBlob(raw, PRESET_PREVIEW_CLIENT),
        ])
        formData.append('thumbs', thumbBlob, `thumb-${raw.name}.jpg`)
        formData.append('previews', previewBlob, `preview-${raw.name}.jpg`)
      } catch (e) {
        console.warn('client build variant failed:', raw?.name, e)
        formData.append('thumbs', placeholder, `thumb-${raw.name}.jpg`)
        formData.append('previews', placeholder, `preview-${raw.name}.jpg`)
      }
    }

    formData.append('category', selectedCategory.value)
    formData.append('description', description.value)

    await evidenceApi.upload(formData, (progressEvent) => {
      const total = Number(progressEvent?.total || 0)
      const loaded = Number(progressEvent?.loaded || 0)
      if (total > 0) {
        const percent = Math.max(1, Math.min(99, Math.round((loaded / total) * 100)))
        uploadProgress.value = percent
      } else {
        uploadProgress.value = Math.max(uploadProgress.value, 30)
      }
      uploadStatusText.value = '正在上传文件...'
    })

    uploadProgress.value = 100
    uploadStatusText.value = '上传完成，等待管理员审核展示'

    uploadSuccess.value = true
    selectedFiles.value = []
    selectedCategory.value = ''
    description.value = ''

    setTimeout(() => {
      uploadSuccess.value = false
      router.push('/evidence')
    }, 2000)
  } catch (error) {
    uploadError.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error?.message ||
      '上传失败，请重试'
    uploadStatusText.value = '上传失败，请重试'
    uploadProgress.value = 0
  } finally {
    uploading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

</script>
