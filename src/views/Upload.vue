<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="mb-6">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">上传证据</h1>

      <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
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

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">选择文件</h2>
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png,video/mp4"
            multiple
            @change="handleFileSelect"
            class="hidden"
          />
          <button @click="$refs.fileInput.click()" class="mb-4">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p class="text-gray-600">点击选择文件或拖拽文件到此处</p>
            <p class="text-sm text-gray-400 mt-2">支持 jpg、png、mp4 格式</p>
            <p class="text-sm text-gray-400">图片≤10MB，视频≤50MB</p>
          </button>
        </div>

        <div v-if="selectedFiles.length > 0" class="mt-4">
          <h3 class="font-semibold text-gray-700 mb-2">已选择 {{ selectedFiles.length }} 个文件</h3>
          <div class="space-y-2">
            <div v-for="(file, index) in selectedFiles" :key="index" class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div class="flex items-center">
                <span class="text-2xl mr-3">{{ file.type.startsWith('image') ? '🖼️' : '🎬' }}</span>
                <div>
                  <p class="text-sm font-medium text-gray-800">{{ file.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
                </div>
              </div>
              <button @click="removeFile(index)" class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">问题分类</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="category in categories"
            :key="category.id"
            @click="selectCategory(category.id)"
            :class="[
              'p-4 rounded-lg text-left transition-all',
              selectedCategory === category.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            ]"
          >
            <div class="text-2xl mb-2">{{ category.icon }}</div>
            <p class="font-medium text-gray-800">{{ category.name }}</p>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">情况描述（选填）</h2>
        <textarea
          v-model="description"
          maxlength="100"
          rows="3"
          class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="简单描述一下情况，100字以内"
        ></textarea>
        <p class="text-sm text-gray-500 mt-1">{{ description.length }}/100</p>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">楼栋信息</h2>
        <input
          v-model="building"
          type="text"
          class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="例如：1栋、2栋3单元"
        />
        <p class="text-sm text-gray-500 mt-1">仅显示楼栋，保护隐私</p>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">自动获取信息</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600">上传时间</p>
            <p class="font-medium text-gray-800">{{ currentTime }}</p>
          </div>
          <div class="text-right">
            <p class="text-gray-600">定位</p>
            <p class="font-medium text-gray-800">不采集（无需定位）</p>
          </div>
        </div>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
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
        @click="handleUpload"
        :disabled="!canUpload || uploading"
        class="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ uploading ? '上传中...' : '确认上传' }}
      </button>

      <div v-if="uploadSuccess" class="mt-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
        <p class="text-sm text-green-700">
          <strong>上传成功！</strong>证据已保存，可用于维权。
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { evidenceApi } from '@/api'

const router = useRouter()

const selectedFiles = ref([])
const selectedCategory = ref('')
const description = ref('')
const building = ref('')
const currentTime = ref('')
const uploading = ref(false)
const uploadSuccess = ref(false)
const uploadError = ref('')

const categories = [
  { id: 'corridor', name: '楼道/电梯卫生', icon: '🧹' },
  { id: 'garbage', name: '垃圾堆积', icon: '🗑️' },
  { id: 'greenery', name: '绿化缺失', icon: '🌿' },
  { id: 'facility', name: '设施损坏', icon: '🔧' },
  { id: 'fire', name: '消防通道堵塞', icon: '🚒' },
  { id: 'lighting', name: '照明/监控缺失', icon: '💡' },
  { id: 'other', name: '其他问题', icon: '📋' }
]

const canUpload = computed(() => {
  return selectedFiles.value.length > 0 && selectedCategory.value
})

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  const validFiles = files.filter(file => {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type === 'video/mp4'
    const isSizeValid = isImage ? file.size <= 10 * 1024 * 1024 : file.size <= 50 * 1024 * 1024
    
    if (!isImage && !isVideo) {
      alert('仅支持 jpg、png、mp4 格式')
      return false
    }
    if (!isSizeValid) {
      alert(isImage ? '图片大小不能超过10MB' : '视频大小不能超过50MB')
      return false
    }
    return true
  })
  
  selectedFiles.value = [...selectedFiles.value, ...validFiles]
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const selectCategory = (id) => {
  selectedCategory.value = id
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const handleUpload = async () => {
  if (!canUpload.value) return
  
  uploading.value = true
  uploadSuccess.value = false
  uploadError.value = ''

  try {
    const formData = new FormData()
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })
    formData.append('category', selectedCategory.value)
    formData.append('description', description.value)
    formData.append('building', building.value)
    formData.append('timestamp', new Date().toISOString())

    await evidenceApi.upload(formData)
    
    uploadSuccess.value = true
    selectedFiles.value = []
    selectedCategory.value = ''
    description.value = ''
    building.value = ''
    
    setTimeout(() => {
      uploadSuccess.value = false
      router.push('/evidence')
    }, 2000)
  } catch (error) {
    uploadError.value = error.response?.data?.message || '上传失败，请重试'
  } finally {
    uploading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 1000)
})
</script>
