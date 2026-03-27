<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
    <div class="max-w-3xl mx-auto page-shell">
      <div class="section-gap">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <h1 class="page-title section-gap text-center">法律声明与用户协议</h1>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">一、本站性质与定位</h2>
        <div class="space-y-3 text-gray-700">
          <p>
            <strong>平台定位：</strong>本站为小区业主提供公共环境问题的记录、归集、保存服务，旨在帮助业主客观记录小区公共环境问题，为整改沟通、投诉维权提供真实素材。
          </p>
          <p>
            <strong>功能说明：</strong>本站仅作为存储与展示空间，提供证据的客观记录和保存功能，<span class="text-red-600 font-semibold">不保证具备"司法存证"法律效力</span>。具体法律效力以相关法律法规及司法机关认定为准。
          </p>
          <p>
            <strong>责任声明：</strong>本站依法履行平台管理义务，对接到明确通知或自行发现的违法、侵权内容，将依法及时审核处置。用户对其上传内容自行负责，本站不对用户之间的纠纷承担补充责任或连带责任，但会依法配合主管部门和司法机关调查取证。
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">二、法律合规要求</h2>
        <div class="space-y-4">
          <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <h3 class="font-bold text-red-800 mb-2">禁止拍摄内容</h3>
            <ul class="text-red-700 text-sm space-y-1">
              <li>• 严禁拍摄住户室内、门窗内</li>
              <li>• 严禁拍摄清晰人脸</li>
              <li>• 严禁拍摄车牌号</li>
              <li>• 严禁拍摄个人隐私信息</li>
              <li>• 严禁拍摄其他侵犯他人隐私的内容</li>
            </ul>
          </div>
          <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <h3 class="font-bold text-green-800 mb-2">允许拍摄内容</h3>
            <ul class="text-green-700 text-sm space-y-1">
              <li>• 小区公共区域环境（道路、广场、绿地等）</li>
              <li>• 楼道、电梯等公共部位卫生状况</li>
              <li>• 公共设施损坏、缺失情况</li>
              <li>• 照明、安防等公共设施运行状态</li>
              <li>• 其他小区公共环境问题</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">三、证据保存说明</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 原图留存：</strong>上传后完整保存原始文件，不压缩、不裁剪、不加水印、不修改 EXIF 信息；系统自动记录上传时间、证据编号与文件哈希，便于长期留存与追溯。</p>
          <p><strong>2. EXIF信息：</strong>本站自动读取并留存图片原始EXIF信息（如拍摄时间、GPS经纬度），增强证据的客观性。</p>
          <p><strong>3. 不可篡改：</strong>证据一旦上传，用户不可删除、不可修改，仅管理员可审核隐藏（保留原始记录）。</p>
          <p><strong>4. 匿名上传：</strong>默认匿名上传，不归集手机号、身份证、完整房号等个人敏感信息。</p>
          <p><strong>5. 数据安全：</strong>所有数据存储在安全云端，严格访问控制，防止数据泄露。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">四、证据用途说明</h2>
        <div class="space-y-3 text-gray-700">
          <p>用户可将证据用于以下合法用途：</p>
          <ul class="list-disc list-inside space-y-1 ml-4">
            <li><strong>物业沟通：</strong>向物业公司反馈问题，要求整改</li>
            <li><strong>行政投诉：</strong>向住建、城管等政府部门投诉</li>
            <li><strong>信访维权：</strong>通过信访渠道反映问题</li>
            <li><strong>司法诉讼：</strong>作为起诉物业的证据材料（具体效力以法院认定为准）</li>
            <li><strong>费用协商：</strong>主张减免物业费的依据</li>
            <li><strong>业委会筹备：</strong>证明物业履职不到位，支持成立业委会</li>
          </ul>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">五、用户权利与义务</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 合法使用：</strong>用户承诺仅将证据用于合法维权用途，不得用于诽谤、勒索、造谣等非法目的。</p>
          <p><strong>2. 真实性保证：</strong>用户保证上传的内容真实、客观，不得伪造、篡改证据。</p>
          <p><strong>3. 隐私尊重：</strong>用户不得上传侵犯他人隐私的内容，违者承担相应法律责任。</p>
          <p><strong>4. 合规承诺：</strong>用户应遵守《民法典》《个人信息保护法》等相关法律法规。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">六、免责条款</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 中立立场：</strong>本站仅提供证据存储服务，不参与任何纠纷，不对证据内容的真实性、合法性负责。</p>
          <p><strong>2. 用户责任：</strong>用户因使用证据产生的一切法律后果由用户自行承担。</p>
          <p><strong>3. 技术限制：</strong>因网络、设备、不可抗力等因素导致的服务中断或数据丢失，本站不承担责任。</p>
          <p><strong>4. 效力声明：</strong>本站不保证证据具备司法存证效力，具体证据效力以司法机关认定为准。</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">七、争议解决</h2>
        <div class="space-y-3 text-gray-700">
          <p><strong>1. 适用法律：</strong>本协议适用中华人民共和国法律。</p>
          <p><strong>2. 争议管辖：</strong>因本协议产生的争议，由双方协商解决；协商不成的，提交本站所在地人民法院管辖。</p>
          <p><strong>3. 协议修改：</strong>本站有权根据法律法规变化修改本协议，修改后将在页面公示。</p>
        </div>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3.5 rounded-r-lg">
        <p class="text-sm text-yellow-700">
          <strong>重要提示：</strong>使用本站即表示您已阅读、理解并同意本协议的全部内容。本站仅提供记录、归集、保存功能，不保证具备司法存证法律效力。如有疑问，请咨询专业律师。
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
