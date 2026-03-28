<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
    <div class="max-w-4xl mx-auto page-shell">
      <div class="flex items-center gap-4 mb-4">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 flex items-center gap-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
      </div>

      <h1 class="page-title section-gap text-center">拍照规范指南</h1>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">一、通用核心取证规范（强化法律效力）</h2>
        <div class="space-y-3 text-sm text-gray-700">
          <p>1. 全程使用<strong>手机原生相机</strong>拍摄，关闭美颜、滤镜、拼图、修图，保证原图原始真实，不篡改</p>
          <p>2. 可开启手机<strong>日期时间水印+地理位置水印</strong>，锁定取证时间、楼栋点位，固化基础证据链</p>
          <p>3. 仅限拍摄<strong>小区公共共有区域</strong>，规避私人室内、清晰人脸、完整车牌、私密特写，杜绝隐私侵权</p>
          <p>4. 统一采用「<strong>远景定位+近景细节</strong>」双拍法：远景拍楼栋/标识定位置，近景拍问题瑕疵留实据</p>
          <p>5. 原图<strong>本地+云端双重备份</strong>，不压缩、不删除、不转发闲聊，留存原始元数据便于存证保全</p>
          <p>6. 每张照片随手文字备注：XX楼栋+日期+问题简述，匹配网站分类，后期归档调取一目了然</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg card-pad section-gap">
        <h2 class="section-title">二、分品类专项精细化拍照实操</h2>
        
        <div class="space-y-4">
          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-2">1. 环境卫生与绿化类</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>楼道电梯脏乱、小广告：正对污渍、广告特写，纳入楼层门牌、墙体标识固定场景</li>
              <li>垃圾满溢异味、大件堆放：全景拍摄垃圾桶站位及满溢状态，定格大件垃圾长期堆放原貌</li>
              <li>绿化荒芜、树木失修：定点俯拍裸露黄土、杂草丛，仰拍枯枝、未修剪影响采光苗木</li>
              <li>隐蔽卫生死角：地下室、天台取景，带入管道、墙体地标，佐证长期未深度保洁事实</li>
            </ul>
          </div>

          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-2">2. 基础设施与公共设备类</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>电梯故障、维保缺失：拍摄轿厢故障界面、抖动数字，特写空白/过期/造假维保公示栏</li>
              <li>路灯监控、公区设施失修：近拍破损设备细节，远景收纳周边参照物，证明公共归属</li>
              <li>路面积水开裂、供排水异常：聚焦破损地砖、积水点位，特写堵塞反味井口、供水老化部件</li>
              <li>外墙脱落、屋面渗水：安全仰拍外立面脱落空鼓处，室内实拍墙面渗水水渍痕迹</li>
              <li>门禁道闸、核心设备缺保养：实拍失灵门禁、故障车场道闸，定格机房设备积灰老化现状</li>
            </ul>
          </div>

          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-2">3. 公共安全与消防隐患类</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>消防通道堵塞、器材失效：全景拍车辆杂物占道，特写过期灭火器、缺损消火栓箱体</li>
              <li>门禁失控、安保缺位：拍摄岗亭空岗、门禁随意放行画面，记录无巡逻值守实景</li>
              <li>电动车入户、飞线充电：远距离全景抓拍，规避住户隐私，留存消防安全隐患证据</li>
              <li>私搭乱建、侵占绿地：广角划定公共用地边界，拍摄违建、私自占用绿化全貌</li>
              <li>应急物资不足、预案滞后：实拍空置物资储备柜、无防汛融雪物资、空白应急公示</li>
              <li>安全演练流于形式：拍摄公告栏长期无演练通知、存档空白，佐证未常态化开展</li>
            </ul>
          </div>

          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-2">4. 居民行为与公共秩序类</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>车辆乱停、占用公区：取景包含楼栋号、消防标识，定格僵尸车、占道、压绿停放状态</li>
              <li>不文明养犬、扰民：远距离抓拍粪便残留、不牵绳行为，严禁特写业主面部肖像</li>
              <li>占道经营、油烟噪音：实拍商铺占道点位、排烟管道、外机设备，留存扰民实景</li>
              <li>楼道私物堆放：广角拍摄鞋柜杂物，凸显占用通行空间、遮挡消防通道的隐患</li>
            </ul>
          </div>

          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-2">5. 物业管理与服务品质类</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>通知公示不及时：拍摄陈旧空白公告栏，佐证停水检修未提前公示告知</li>
              <li>公共费用、收益不透明：特写模糊账目、长期未更新的物业费及公共收益公示板</li>
              <li>工作人员服务不规范：远景抓拍脱岗、玩手机、无工装工牌场景，不恶意近距离怼拍人像</li>
              <li>报修渠道不畅、响应滞后：留存值班电话拨打截图、线上诉求已读不回聊天记录</li>
              <li>维修劣质、问题反复：拍摄维修破损原状及返修痕迹，证明维修不到位、治标不治本</li>
              <li>无回访、疑难问题无方案：实拍无满意度登记台账、物业未公示整改时限与处理方案</li>
              <li>巡检造假、设备缺养护：特写空白代签巡检表、老化核心设备无维保记录</li>
              <li>公区耗能浪费、档案混乱：实拍白天长明灯耗能场景，存档残缺杂乱的设备物业台账</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-red-50 rounded-xl shadow-lg card-pad section-gap border-l-4 border-red-500">
        <h2 class="section-title text-red-800">三、法律红线&避坑优化（降低风险，合规取证）</h2>
        <div class="space-y-3 text-sm text-red-700">
          <p>1. 严禁偷拍私域、抓拍路人正脸、完整车牌、居家私密场景，避免侵犯隐私权、肖像权</p>
          <p>2. 绝不P图、涂改、拼接、伪造画面，篡改素材直接丧失全部法律举证效力</p>
          <p>3. 顽固性长期问题，按<strong>7天、15天、30天分周期复拍对比</strong>，佐证物业持续不作为、拒不整改</p>
          <p>4. 仅用于邻里沟通、物业协商、合规投诉维权，禁止网络散播、恶意曝光他人隐私</p>
        </div>
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
