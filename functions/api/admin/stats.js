import { ensureSchema } from '../../db/schema.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)

  try {
    await ensureSchema(env)

    // 获取分类统计数据
    const categoryRows = await env.DB.prepare(`
      SELECT category, COUNT(*) as count
      FROM evidence
      GROUP BY category
      ORDER BY count DESC
    `).all()

    const categoryStats = categoryRows.results.map(row => ({
      category: row.category,
      count: row.count
    }))

    // 获取最近7天的趋势数据
    const trendStats = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const startDate = date.toISOString()
      
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const endDate = nextDay.toISOString()
      
      const countRow = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM evidence
        WHERE upload_time >= ? AND upload_time < ?
      `).bind(startDate, endDate).first()
      
      trendStats.push({
        date: date.toISOString().split('T')[0],
        count: Number(countRow?.count || 0)
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        categoryStats,
        trendStats
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Admin stats error:', error)
    return new Response(JSON.stringify({ error: '获取统计数据失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}