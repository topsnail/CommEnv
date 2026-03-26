export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  
  const category = url.searchParams.get('category')
  const page = parseInt(url.searchParams.get('page')) || 1
  const pageSize = 20
  
  try {
    const { list, hasMore } = await getEvidenceList(env, category, page, pageSize)
    
    return new Response(JSON.stringify({
      success: true,
      data: list,
      hasMore
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('List error:', error)
    return new Response(JSON.stringify({ error: '获取列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function getEvidenceList(env, category, page, pageSize) {
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
  
  for (const key of keys) {
    const evidenceId = await env.KV.get(key)
    if (!evidenceId) continue
    
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) continue
    
    const evidence = JSON.parse(evidenceData)
    
    if (evidence.hidden) continue
    if (category && evidence.category !== category) continue
    
    count++
    if (count > start && evidenceList.length < pageSize) {
      evidenceList.push(evidence)
    }
    
    if (evidenceList.length >= pageSize) break
  }
  
  const hasMore = count > start + pageSize
  
  return { list: evidenceList, hasMore }
}
