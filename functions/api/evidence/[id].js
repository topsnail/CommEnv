export async function onRequestGet(context) {
  const { request, env, params } = context
  
  try {
    const evidenceId = params.id
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    
    if (!evidenceData) {
      return new Response(JSON.stringify({ error: '证据不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const evidence = JSON.parse(evidenceData)
    
    if (evidence.hidden) {
      return new Response(JSON.stringify({ error: '证据已被隐藏' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: evidence
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Detail error:', error)
    return new Response(JSON.stringify({ error: '获取详情失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
