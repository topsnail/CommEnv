import { ensureSchema } from '../../../db/schema.js'
import { requireAdminSession } from '../../../lib/adminAuth.js'
import ExcelJS from 'exceljs'

export async function onRequestGet(context) {
  const { request, env } = context
  
  const ok = await requireAdminSession(request, env)
  if (!ok) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    await ensureSchema(env)
    const url = new URL(request.url)
    const category = String(url.searchParams.get('category') || '')
    const allowed = new Set([
      'CAT01','CAT02','CAT03','CAT04','CAT05','CAT06','CAT07','CAT08','CAT09','CAT10',
      'CAT11','CAT12','CAT13','CAT14','CAT15','CAT16','CAT17','CAT18','CAT19','CAT20',
    ])
    const useCategory = allowed.has(category) ? category : ''
    const MAX_EXPORT_EVIDENCE = 1000
    const sql = `SELECT id, category, description, status, upload_time, hash_sha256, gps_lat, gps_lon,
                        make, model, datetime_original, image_width, image_height, original_key, original_mime
       FROM evidence
       ${useCategory ? 'WHERE category = ?' : ''}
       ORDER BY upload_time DESC
       LIMIT ?`
    const rows = useCategory
      ? await env.DB.prepare(sql).bind(useCategory, MAX_EXPORT_EVIDENCE).all()
      : await env.DB.prepare(sql).bind(MAX_EXPORT_EVIDENCE).all()
    
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('证据清单')
    sheet.columns = [
      { header: '证据ID', key: 'id', width: 40 },
      { header: '类型', key: 'type', width: 10 },
      { header: '分类', key: 'category', width: 30 },
      { header: '拍摄时间', key: 'shoot_time', width: 24 },
      { header: '上传时间', key: 'upload_time', width: 24 },
      { header: '描述', key: 'description', width: 40 },
      { header: 'GPS', key: 'gps', width: 20 },
      { header: '设备型号', key: 'device', width: 28 },
      { header: '图片尺寸', key: 'size', width: 16 },
      { header: '入库文件名', key: 'file_name', width: 40 },
      { header: '入库MIME', key: 'mime', width: 20 },
      { header: '哈希(入库文件)', key: 'hash', width: 70 },
      { header: '状态', key: 'status', width: 12 },
    ]

    for (const evidence of rows.results || []) {
      const categoryNames = {
        CAT01: '环境卫生脏乱，绿化养护缺失',
        CAT02: '垃圾清运不及时，异味油污严重',
        CAT03: '楼道堆物占道，小广告泛滥',
        CAT04: '电梯故障频发，维保记录缺失',
        CAT05: '公共设施破损，路灯监控失效',
        CAT06: '道路积水破损，供水水质异常',
        CAT07: '外墙脱落渗水，建筑本体破损',
        CAT08: '消防通道堵塞，消防器材过期',
        CAT09: '门禁安保松懈，外来人员随意进出',
        CAT10: '电动车乱停，飞线充电隐患',
        CAT11: '车辆无序停放，僵尸车占用公共资源',
        CAT12: '私搭乱建，违规拆改承重墙',
        CAT13: '养宠不文明，宠物粪便、噪音扰民',
        CAT14: '商贩占道经营，底商油烟噪音扰民',
        CAT15: '物业通知滞后，信息公示不透明',
        CAT16: '公共收益不明，账目未公开',
        CAT17: '维修质量差，报修响应迟缓',
        CAT18: '巡检记录缺失或造假',
        CAT19: '应急物资不足，安全演练流于形式',
        CAT20: '其他物业服务与管理问题',
      }

      sheet.addRow({
        id: evidence.id,
        type: '图片',
        category: categoryNames[evidence.category] || evidence.category || '未知',
        shoot_time: evidence.datetime_original || '',
        upload_time: evidence.upload_time || '',
        description: evidence.description || '',
        gps:
          Number.isFinite(Number(evidence.gps_lat)) && Number.isFinite(Number(evidence.gps_lon))
            ? `${evidence.gps_lat},${evidence.gps_lon}`
            : '',
        device: [evidence.make || '', evidence.model || ''].join(' ').trim(),
        size:
          Number.isFinite(Number(evidence.image_width)) && Number.isFinite(Number(evidence.image_height))
            ? `${evidence.image_width}x${evidence.image_height}`
            : '',
        file_name: String(evidence.original_key || '').split('/').pop(),
        mime: evidence.original_mime || '',
        hash: evidence.hash_sha256 || '',
        status: evidence.status === 'normal' ? '正常' : '已隐藏',
      })
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="证据清单_${new Date().toISOString().slice(0, 10)}.xlsx"`
      }
    })
    
  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: '导出失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
