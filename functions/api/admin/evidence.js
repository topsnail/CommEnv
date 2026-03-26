export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  
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
  
  const category = url.searchParams.get('category')
  const page = parseInt(url.searchParams.get('page')) || 1
  const pageSize = 20
  
  try {
    const { list, stats, hasMore } = await getAdminEvidenceList(env, category, page, pageSize)
    
    return new Response(JSON.stringify({
      success: true,
      data: list,
      stats,
      hasMore
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Admin list error:', error)
    return new Response(JSON.stringify({ error: '获取列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function getAdminEvidenceList(env, category, page, pageSize) {
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
  let count = 0
  const start = (page - 1) * pageSize
  
  const stats = {
    total: 0,
    normal: 0,
    hidden: 0,
    today: 0
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (const key of keys) {
    const evidenceId = await env.KV.get(key)
    if (!evidenceId) continue
    
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) continue
    
    const evidence = JSON.parse(evidenceData)
    
    stats.total++
    if (evidence.hidden) stats.hidden++
    else stats.normal++
    
    const evidenceDate = new Date(evidence.timestamp)
    if (evidenceDate >= today) stats.today++
    
    if (category && evidence.category !== category) continue
    
    count++
    if (count > start && evidenceList.length < pageSize) {
      evidenceList.push(evidence)
    }
    
    if (evidenceList.length >= pageSize) break
  }
  
  const hasMore = count > start + pageSize
  
  return { list: evidenceList, stats, hasMore }
}
