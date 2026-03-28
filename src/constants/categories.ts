// 问题分类配置 - 统一数据源
// 用于 Upload.vue 和 Admin.vue 共享
import type { Category, CategoryGroup } from '@/types'

export const categories: CategoryGroup[] = [
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

// 扁平化分类列表（用于 Admin.vue 筛选）
export const flatCategories = [
  { id: '', name: '全部' },
  ...categories.flatMap(group => group.items.map(item => ({
    id: item.id,
    name: item.name
  })))
]

// 根据ID获取分类名称
export function getCategoryName(categoryId: string): string {
  if (!categoryId) return ''
  const category = flatCategories.find(c => c.id === categoryId)
  return category ? category.name : categoryId
}
