export async function onRequestGet(context) {
  const { request, env } = context
  
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const token = authHeader.substring(7)
  const tokenData = await env.KV.get(`admin:token:${token}`)
  if (!tokenData) {
    return new Response(JSON.stringify({ error: 'token无效' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    const evidenceList = await getAllEvidence(env)
    
    let csv = '证据ID,类型,分类,楼栋,上传时间,定位,描述,哈希值,状态\n'
    
    for (const evidence of evidenceList) {
      const categoryNames = {
        corridor: '楼道/电梯卫生',
        garbage: '垃圾堆积',
        greenery: '绿化缺失',
        facility: '设施损坏',
        fire: '消防通道堵塞',
        lighting: '照明/监控缺失',
        other: '其他问题'
      }
      
      const row = [
        evidence.id,
        evidence.type === 'image' ? '图片' : '视频',
        categoryNames[evidence.category] || '未知',
        evidence.building || '',
        evidence.timestamp,
        evidence.location,
        evidence.description || '',
        evidence.hash,
        evidence.hidden ? '已隐藏' : '正常'
      ].map(field => `"${(field || '').replace(/"/g, '""')}"`).join(',')
      
      csv += row + '\n'
    }
    
    const bom = '\uFEFF'
    const buffer = new TextEncoder().encode(bom + csv)
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="证据清单_${new Date().toISOString().slice(0, 10)}.csv"`
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

async function getAllEvidence(env) {
  const keys = []
  let cursor = null
  
  do {
    const result = await env.KV.list({
      prefix: 'evidence:byTime:',
      limit: 1000,
      cursor
    })
    keys.push(...result.keys.map(k => k.name))
    cursor = result.cursor
  } while (cursor)
  
  keys.reverse()
  
  const evidenceList = []
  
  for (const key of keys) {
    const evidenceId = await env.KV.get(key)
    if (!evidenceId) continue
    
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) continue
    
    evidenceList.push(JSON.parse(evidenceData))
  }
  
  return evidenceList
}
