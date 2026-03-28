 <template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
    <div class="max-w-4xl mx-auto page-shell">
      <div class="text-center section-gap">
        <h1 class="page-title mb-2">宏光合园公共环境存证归集</h1>
        <p class="text-gray-600 text-sm sm:text-base">合法留存证据 · 维护业主权益</p>
      </div>

      <div class="bg-red-50 border-l-4 border-red-500 p-4 section-gap rounded-r-lg shadow-md">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700 font-medium">
              普通人维权时，证据不是最重要的，但没有证据你连资格都没有！
              <button @click="goToPhotoGuide" class="ml-1 underline hover:text-red-900">查看拍照取证规范→</button>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 section-gap rounded-r-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              <strong>法律合规提示：</strong>仅允许拍摄小区公共区域，严禁拍摄住户室内、门窗内、清晰人脸、车牌、个人隐私。上传前请仔细检查。
            </p>
          </div>
        </div>
      </div>

      <div class="section-gap">
        <div v-if="loadingStats" class="text-center text-sm text-gray-600 py-4">
          正在加载统计信息...
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          <div class="bg-white rounded-lg shadow card-pad">
            <p class="text-gray-500 text-sm">总图片数</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-800">{{ stats.total }}</p>
          </div>
          <div class="bg-white rounded-lg shadow card-pad">
            <p class="text-gray-500 text-sm">正常图片</p>
            <p class="text-2xl sm:text-3xl font-bold text-green-600">{{ stats.normal }}</p>
          </div>
          <div class="bg-white rounded-lg shadow card-pad">
            <p class="text-gray-500 text-sm">待审核</p>
            <p class="text-2xl sm:text-3xl font-bold text-amber-600">{{ stats.pending }}</p>
            <p class="text-xs text-gray-500 mt-1">已隐藏 {{ stats.hidden }}</p>
          </div>
          <div class="bg-white rounded-lg shadow card-pad">
            <p class="text-gray-500 text-sm">本月新增</p>
            <p class="text-2xl sm:text-3xl font-bold text-blue-600">{{ stats.month }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:gap-4 section-gap">
        <div class="bg-white rounded-xl shadow-lg card-pad hover:shadow-xl transition-shadow">
          <div class="flex items-center mb-2">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 class="text-base sm:text-lg font-bold text-gray-800">我要上传</h2>
          </div>
          <p class="text-gray-600 text-xs sm:text-sm mb-2">拍摄上传小区公共环境问题</p>
          <button @click="goToUpload" class="w-full btn-primary !py-2 !text-sm">
            立即上传
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg card-pad hover:shadow-xl transition-shadow">
          <div class="flex items-center mb-2">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 class="text-base sm:text-lg font-bold text-gray-800">查看证据</h2>
          </div>
          <p class="text-gray-600 text-xs sm:text-sm mb-2">浏览已上传的图片列表</p>
          <button @click="goToEvidence" class="w-full bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors py-2 px-4 text-sm">
            查看列表
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h3 class="section-title !text-sm">证据用途</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <div class="text-center p-2.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <div class="text-xl mb-1">💬</div>
            <p class="text-xs font-medium text-gray-700">物业沟通</p>
            <p class="text-[10px] text-gray-500 mt-0.5">向物业反馈问题要求整改</p>
          </div>
          <div class="text-center p-2.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <div class="text-xl mb-1">🏢</div>
            <p class="text-xs font-medium text-gray-700">行政投诉</p>
            <p class="text-[10px] text-gray-500 mt-0.5">向住建、城管等部门投诉</p>
          </div>
          <div class="text-center p-2.5 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
            <div class="text-xl mb-1">🏛️</div>
            <p class="text-xs font-medium text-gray-700">信访维权</p>
            <p class="text-[10px] text-gray-500 mt-0.5">通过信访渠道反映问题</p>
          </div>
          <div class="text-center p-2.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <div class="text-xl mb-1">⚖️</div>
            <p class="text-xs font-medium text-gray-700">司法诉讼</p>
            <p class="text-[10px] text-gray-500 mt-0.5">作为起诉物业的证据材料</p>
          </div>
          <div class="text-center p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            <div class="text-xl mb-1">💰</div>
            <p class="text-xs font-medium text-gray-700">费用协商</p>
            <p class="text-[10px] text-gray-500 mt-0.5">主张减免物业费依据</p>
          </div>
          <div class="text-center p-2.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            <div class="text-xl mb-1">👥</div>
            <p class="text-xs font-medium text-gray-700">业委会筹备</p>
            <p class="text-[10px] text-gray-500 mt-0.5">证明物业履职不到位</p>
          </div>
        </div>
      </div>

      <!-- 平台介绍 -->
      <div class="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 card-pad section-gap rounded-xl shadow-sm">
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-4">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <h2 class="section-title !mb-2 !text-sm !text-gray-600">关于本站</h2>
            <p class="text-xs text-gray-500 leading-relaxed">
              本站为非盈利公益工具，仅用于客观记录小区公共环境问题，倡导住户主动上传原始图片，统一分类、安全留存。平台不收集个人隐私、不从事商业经营、不宣称具有司法效力，仅作为资料存储与展示使用，旨在为物业整改、投诉维权提供真实素材，共同监督物业服务，营造整洁、安全、有序的居住环境。
            </p>
          </div>
        </div>
      </div>

      <!-- 法律声明链接 -->
      <div class="text-center pt-3 border-t border-gray-200">
        <div class="flex items-center justify-center gap-4 flex-wrap">
          <button @click="goToTutorial" class="text-gray-500 hover:text-gray-700 underline text-xs">
            使用说明
          </button>
          <button @click="goToPhotoGuide" class="text-gray-500 hover:text-gray-700 underline text-xs">
            拍照取证规范
          </button>
          <button @click="goToLegal" class="text-gray-500 hover:text-gray-700 underline text-xs">
            法律声明与用户协议
          </button>
          <button @click="goToAdmin" class="text-gray-500 hover:text-gray-700 underline text-xs">
            后台管理
          </button>          
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { evidenceApi } from '@/api'

const router = useRouter()

const loadingStats = ref(true)
const stats = ref({ total: 0, normal: 0, pending: 0, hidden: 0, month: 0 })

onMounted(async () => {
  try {
    const res = await evidenceApi.stats({ period: 'month' })
    if (res?.success && res?.data) stats.value = res.data
  } catch (e) {
    console.error('Load stats failed:', e)
  } finally {
    loadingStats.value = false
  }
})

const goToUpload = () => {
  router.push('/upload')
}

const goToEvidence = () => {
  router.push('/evidence')
}

const goToLegal = () => {
  router.push('/legal')
}

const goToTutorial = () => {
  router.push('/tutorial')
}

const goToPhotoGuide = () => {
  router.push('/photo-guide')
}

const goToAdmin = () => {
  router.push('/admin')
}
</script>
