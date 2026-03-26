 <template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">宏光合园小区公共环境证存平台</h1>
        <p class="text-gray-600 text-lg">合法留存证据 · 维护业主权益</p>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg">
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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800">我要上传</h2>
          </div>
          <p class="text-gray-600 mb-4">拍摄小区公共环境问题，上传保存证据</p>
          <button @click="goToUpload" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg">
            立即上传
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800">查看证据</h2>
          </div>
          <p class="text-gray-600 mb-4">浏览已上传的证据列表</p>
          <button @click="goToEvidence" class="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg">
            查看列表
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h3 class="text-xl font-bold text-gray-800 mb-4">证据用途</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-3xl mb-2">📝</div>
            <p class="text-sm text-gray-600">投诉物业</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-3xl mb-2">🏛️</div>
            <p class="text-sm text-gray-600">信访举报</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-3xl mb-2">⚖️</div>
            <p class="text-sm text-gray-600">法院起诉</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-3xl mb-2">👥</div>
            <p class="text-sm text-gray-600">成立业委会</p>
          </div>
        </div>
      </div>

      <div class="text-center">
        <button @click="goToLegal" class="text-blue-600 hover:text-blue-800 underline">
          查看法律声明与用户协议
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToUpload = () => {
  router.push('/upload')
}

const goToEvidence = () => {
  router.push('/evidence')
}

const goToLegal = () => {
  router.push('/legal')
}
</script>
