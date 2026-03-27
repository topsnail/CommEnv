import { ensureSchema } from '../../db/schema.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const period = url.searchParams.get('period')

  try {
    await ensureSchema(env)

    const calcMonthStartIso = () => {
      const d = new Date()
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }

    const monthStartIso = calcMonthStartIso()

    // 公共区域只返回计数：不包含任何原图/EXIF/坐标等敏感内容
    const totalRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence").first()
    const normalRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence WHERE status = 'normal'").first()
    const pendingRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence WHERE status = 'pending'").first()
    const hiddenRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence WHERE status = 'hidden'").first()

    // “新增”按 upload_time >= 本月第一天计算（不区分审核状态）
    const monthWhere = period === 'month' || !period ? 'upload_time >= ?' : 'upload_time >= ?'
    const monthRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM evidence WHERE ${monthWhere}`)
      .bind(monthStartIso)
      .first()

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total: Number(totalRow?.c || 0),
          normal: Number(normalRow?.c || 0),
          pending: Number(pendingRow?.c || 0),
          hidden: Number(hiddenRow?.c || 0),
          month: Number(monthRow?.c || 0),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Evidence stats error:', error)
    return new Response(JSON.stringify({ error: '获取统计失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

