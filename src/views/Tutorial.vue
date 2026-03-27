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

      <h1 class="page-title section-gap text-center">使用说明</h1>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">上传前先看</h2>
        <ul class="list-disc list-inside space-y-1 body-text">
          <li>仅拍摄小区公共区域问题，避免拍到人脸、车牌、室内和其他隐私信息。</li>
          <li>仅支持图片上传：jpg / jpeg / png，单文件不超过 10MB。</li>
          <li>上传内容会先进入审核，管理员通过后才会在前台显示。</li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">如何上传</h2>
        <ol class="list-decimal list-inside space-y-1 body-text">
          <li>进入“我要上传”。</li>
          <li>选择问题分类（必选）。</li>
          <li>点击或拖拽上传图片（可多选）。</li>
          <li>可填写 100 字内描述（选填）。</li>
          <li>勾选合规确认后点击“确认上传”。</li>
        </ol>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">上传后会记录什么</h2>
        <ul class="list-disc list-inside space-y-1 body-text">
          <li>证据编号（UUID）与上传时间。</li>
          <li>文件哈希（SHA-256）用于完整性校验。</li>
          <li>原图 EXIF 元数据（系统留存，原图不改动）。</li>
        </ul>
      </div>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3.5 rounded-r-lg">
        <p class="text-sm text-yellow-800">
          <strong>提示：</strong>公众页面不展示精确 GPS 坐标，仅展示是否包含GPS信息。
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
