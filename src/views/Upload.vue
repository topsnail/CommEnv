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

      <h1 class="page-title section-gap text-center">上传证据</h1>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg mb-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              <strong>法律合规提示：</strong>仅允许拍摄小区公共区域，严禁拍摄住户室内、门窗内、清晰人脸、车牌、个人隐私。上传前请仔细检查。
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="section-title !mb-0">问题分类（单选）</h2>
          <span v-if="!selectedCategory" class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            必选
          </span>
          <span v-else class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            已选择
          </span>
        </div>
        <div class="space-y-2 sm:space-y-4">
          <div v-for="(group, index) in categories" :key="group.group" :class="[
            'space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg',
            index % 2 === 0 ? 'bg-gray-50/50' : 'bg-blue-50/30'
          ]">
            <h3 class="text-xs font-medium text-gray-600 uppercase tracking-wider flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full" :class="index % 2 === 0 ? 'bg-gray-400' : 'bg-blue-400'"></span>
              {{ group.group }}
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <button
                v-for="cat in group.items"
                :key="cat.id"
                type="button"
                @click="selectedCategory = cat.id"
                :class="[
                  'w-full text-left border rounded-lg px-2 sm:px-3 py-1.5 transition-all duration-200 min-h-[2rem] sm:h-10',
                  selectedCategory === cat.id 
                    ? 'border-blue-600 bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-300' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                ]"
              >
                <span class="text-xs sm:text-sm font-medium leading-tight">{{ cat.icon }} {{ cat.name }}</span>
              </button>
            </div>
          </div>
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
          class="border-2 border-dashed rounded-lg p-2 text-center transition-colors cursor-pointer"
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
          <div class="text-3xl mb-1">📁</div>
          <p class="text-sm text-gray-600 mb-0.5">点击或拖拽图片到此处</p>
          <p class="text-xs text-gray-500">支持 JPG、PNG 格式，单个文件不超过 10MB</p>
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
              <button
                type="button"
                @click="removeFile(index)"
                class="text-red-500 hover:text-red-700 ml-2 shrink-0"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">问题描述（可选）</h2>
        <textarea
          v-model="description"
          placeholder="请简要描述问题情况（选填）"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows="2"
        ></textarea>
      </div>

      <button
        @click="handleUploadClick"
        :disabled="uploading"
        class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed section-gap"
      >
        <span v-if="uploading">
          <span class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
          {{ uploadStatusText || '上传中...' }}
        </span>
        <span v-else>
          确认上传 {{ selectedFiles.length > 0 ? `(${selectedFiles.length}个文件)` : '' }}
        </span>
      </button>

      <div
        v-if="showComplianceModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click="closeComplianceModal"
      >
        <div class="bg-white rounded-xl max-w-md w-full p-5" @click.stop>
          <h3 class="text-lg font-bold mb-3">上传前确认</h3>
          <div class="space-y-2 text-sm text-gray-700 mb-4">
            <p>请确认您上传的内容符合以下要求：</p>
            <ul class="list-disc list-inside space-y-1 text-gray-600">
              <li>拍摄的是小区公共环境问题</li>
              <li>不包含住户室内、门窗内场景</li>
              <li>不包含清晰可辨识的人脸</li>
              <li>不包含清晰可辨识的车牌</li>
              <li>不涉及个人隐私信息</li>
            </ul>
          </div>
          <label class="flex items-start gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              v-model="complianceChecked"
              class="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">我已确认以上内容符合要求</span>
          </label>
          <div class="flex gap-3">
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
const complianceChecked = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatusText = ref('')
const uploadSuccess = ref(false)
const uploadError = ref('')

const categories = [
  {
    group: '环境卫生与绿化管理',
    items: [
      { id: 'CAT01', name: '楼道电梯脏乱，小广告乱贴', icon: '🧹' },
      { id: 'CAT02', name: '垃圾满溢异味重，大件长期堆放', icon: '🗑️' },
      { id: 'CAT03', name: '绿化荒芜杂草多，绿植枯萎死亡', icon: '🌿' },
      { id: 'CAT04', name: '卫生死角长期无人清理，无定期深度保洁', icon: '🧽' }
    ]
  },
  {
    group: '基础设施与公共设备',
    items: [
      { id: 'CAT05', name: '电梯故障频发，维保记录缺失或造假', icon: '🏢' },
      { id: 'CAT06', name: '路灯楼道灯监控损坏，公共设施失修', icon: '💡' },
      { id: 'CAT07', name: '路面破损积水，供水排水异常', icon: '🛣️' },
      { id: 'CAT08', name: '外墙脱落渗水，建筑部件老化', icon: '🏚️' },
      { id: 'CAT09', name: '门禁道闸故障，设备缺乏保养', icon: '🚪' }
    ]
  },
  {
    group: '公共安全与消防隐患',
    items: [
      { id: 'CAT10', name: '消防通道堵塞，器材过期失效', icon: '🧯' },
      { id: 'CAT11', name: '门禁失控形同虚设，安保缺位疏于值守', icon: '👮' },
      { id: 'CAT12', name: '电动车进楼，充电区域不规范', icon: '⚡' },
      { id: 'CAT13', name: '私搭乱建，侵占公共绿地空间', icon: '🏗️' },
      { id: 'CAT14', name: '应急物资不足，预案响应迟缓', icon: '🚨' },
      { id: 'CAT15', name: '安全演练缺失或流于形式', icon: '📋' }
    ]
  },
  {
    group: '居民行为与公共秩序',
    items: [
      { id: 'CAT16', name: '车辆乱停占用通道与公共车位', icon: '🚗' },
      { id: 'CAT17', name: '养宠不文明，粪便不清理扰民', icon: '🐾' },
      { id: 'CAT18', name: '占道经营，噪音油烟扰民严重', icon: '🍢' },
      { id: 'CAT19', name: '楼道堆放杂物占用公共空间', icon: '📦' }
    ]
  },
  {
    group: '物业管理与服务品质',
    items: [
      { id: 'CAT20', name: '停水停电未提前告知业主', icon: '💧' },
      { id: 'CAT21', name: '公告信息长期不更新不透明', icon: '📢' },
      { id: 'CAT22', name: '公共收益去向不明未公示', icon: '💰' },
      { id: 'CAT23', name: '工作人员不规范服务态度差', icon: '👥' },
      { id: 'CAT24', name: '报修电话无人接听回复迟缓', icon: '📞' },
      { id: 'CAT25', name: '维修质量差问题反复出现', icon: '🔧' },
      { id: 'CAT26', name: '维修后无回访跟踪机制', icon: '🔄' },
      { id: 'CAT27', name: '疑难问题无方案无解决时限', icon: '❓' },
      { id: 'CAT28', name: '设施缺乏保养巡检记录造假', icon: '📝' },
      { id: 'CAT29', name: '公共照明浪费增加公摊费用', icon: '💡' },
      { id: 'CAT30', name: '各类档案记录残缺管理混乱', icon: '📁' }
    ]
  }
]

const canUpload = computed(() => {
  return selectedFiles.value.length > 0 && selectedCategory.value
})
const selectedCategoryName = computed(() => {
  for (const group of categories) {
    const c = group.items.find((v) => v.id === selectedCategory.value)
    if (c) return `${c.icon} ${c.name}`
  }
  return ''
})

const formatFileSize = (size) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  addFiles(files)
}

const handleDrop = (event) => {
  dragging.value = false
  const files = Array.from(event.dataTransfer.files)
  addFiles(files)
}

const addFiles = (files) => {
  const imageFiles = files.filter(file => 
    file.type.startsWith('image/') && 
    file.size <= MAX_INPUT_IMAGE_BYTES
  )
  
  if (imageFiles.length === 0) {
    alert('请选择有效的图片文件（JPG/PNG，单个不超过10MB）')
    return
  }
  
  selectedFiles.value = [...selectedFiles.value, ...imageFiles]
  uploadSuccess.value = false
  uploadError.value = ''
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const handleUploadClick = () => {
  if (selectedFiles.value.length === 0) {
    alert('请先选择要上传的文件')
    return
  }
  if (!selectedCategory.value) {
    alert('请先选择问题分类')
    return
  }
  openComplianceModal()
}

const openComplianceModal = () => {
  complianceChecked.value = false
  showComplianceModal.value = true
}

const closeComplianceModal = () => {
  showComplianceModal.value = false
  complianceChecked.value = false
}

const confirmAndUpload = async () => {
  if (!complianceChecked.value || !canUpload.value) return
  
  uploading.value = true
  uploadProgress.value = 0
  uploadStatusText.value = '准备上传...'
  uploadSuccess.value = false
  uploadError.value = ''
  
  try {
    const category = selectedCategory.value
    const desc = description.value.trim()
    
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      uploadStatusText.value = `正在上传 ${i + 1}/${selectedFiles.value.length}: ${file.name}`
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      if (desc) formData.append('description', desc)
      
      await evidenceApi.upload(formData, (progress) => {
        const fileProgress = (progress.loaded / progress.total) * 100
        const totalProgress = ((i + fileProgress / 100) / selectedFiles.value.length) * 100
        uploadProgress.value = Math.round(totalProgress)
      })
    }
    
    uploadSuccess.value = true
    selectedFiles.value = []
    selectedCategory.value = ''
    description.value = ''
    closeComplianceModal()
  } catch (error) {
    console.error('上传失败:', error)
    uploadError.value = error.response?.data?.error || '上传失败，请重试'
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    uploadStatusText.value = ''
  }
}

const goBack = () => {
  router.push('/')
}
</script>
