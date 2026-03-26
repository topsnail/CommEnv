<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="mb-6">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">法律声明与用户协议</h1>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">一、平台宗旨</h2>
        <p class="text-gray-700 leading-relaxed mb-4">
          本平台旨在为小区业主提供合法、合规的证据留存服务，用于维护业主合法权益。平台仅用于客观记录小区公共环境问题，严禁用于非法目的。
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">二、法律合规要求</h2>
        <div class="space-y-4">
          <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <h3 class="font-bold text-red-800 mb-2">禁止拍摄内容</h3>
            <ul class="text-red-700 text-sm space-y-1">
              <li>• 严禁拍摄住户室内、门窗内</li>
              <li>• 严禁拍摄清晰人脸</li>
              <li>• 严禁拍摄车牌号</li>
              <li>• 严禁拍摄个人隐私信息</li>
            </ul>
          </div>
          <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <h3 class="font-bold text-green-800 mb-2">允许拍摄内容</h3>
            <ul class="text-green-700 text-sm space-y-1">
              <li>• 小区公共区域环境</li>
              <li>• 楼道、电梯卫生状况</li>
              <li>• 公共设施损坏情况</li>
              <li>• 绿化、照明等公共设施</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">三、证据法律效力</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 证据真实性：</strong>平台自动生成精确时间戳、GPS定位、唯一编号和不可篡改哈希值，确保证据链完整。</p>
          <p><strong>2. 法院认可：</strong>所有证据符合《民事诉讼法》证据标准，可直接作为起诉物业的有效证据使用。</p>
          <p><strong>3. 不可篡改：</strong>证据一旦上传，用户不可删除、不可修改，仅管理员可审核隐藏（保留原始记录）。</p>
          <p><strong>4. 水印保护：</strong>所有媒体文件自动添加时间、小区名称、证据编号水印，防止篡改。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">四、隐私保护</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 匿名上传：</strong>默认开启匿名模式，不收集手机号、身份证、完整房号等个人信息。</p>
          <p><strong>2. 粗略定位：</strong>GPS定位仅精确到小区/楼栋级别，不暴露具体位置。</p>
          <p><strong>3. 数据安全：</strong>所有数据存储在安全云端，严格访问控制，防止数据泄露。</p>
          <p><strong>4. 禁止人脸识别：</strong>平台不进行任何形式的人脸识别技术。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">五、用户权利与义务</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 合法使用：</strong>用户承诺仅将证据用于合法维权用途，不得用于诽谤、勒索等非法目的。</p>
          <p><strong>2. 真实性保证：</strong>用户保证上传的内容真实、客观，不得伪造、篡改证据。</p>
          <p><strong>3. 隐私尊重：</strong>用户不得上传侵犯他人隐私的内容，违者承担法律责任。</p>
          <p><strong>4. 禁止滥用：</strong>禁止辱骂、人身攻击、造谣、曝光他人隐私。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">六、免责条款</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 平台中立：</strong>平台仅提供证据存储服务，不参与任何纠纷，不对证据内容负责。</p>
          <p><strong>2. 用户责任：</strong>用户因使用证据产生的一切法律后果由用户自行承担。</p>
          <p><strong>3. 技术限制：</strong>因网络、设备等不可抗力因素导致的服务中断，平台不承担责任。</p>
          <p><strong>4. 合规使用：</strong>用户应遵守相关法律法规，因违法使用导致的损失由用户自行承担。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">七、证据使用指南</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 投诉物业：</strong>可导出证据清单，向物业公司投诉。</p>
          <p><strong>2. 信访举报：</strong>可作为信访材料附件，向相关部门举报。</p>
          <p><strong>3. 法院起诉：</strong>证据符合法院证据标准，可直接作为诉讼证据。</p>
          <p><strong>4. 成立业委会：</strong>可作为物业不作为的证据，支持成立业委会。</p>
          <p><strong>5. 减免物业费：</strong>可作为物业服务不达标的证据，申请减免物业费。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">八、争议解决</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 适用法律：</strong>本协议适用中华人民共和国法律。</p>
          <p><strong>2. 争议管辖：</strong>因本协议产生的争议，由平台所在地人民法院管辖。</p>
          <p><strong>3. 协议修改：</strong>平台有权根据法律法规变化修改本协议，修改后即生效。</p>
        </div>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <p class="text-sm text-yellow-700">
          <strong>重要提示：</strong>使用本平台即表示您已阅读、理解并同意本协议的全部内容。如有疑问，请咨询专业律师。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
</script>
