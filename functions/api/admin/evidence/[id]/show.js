export async function onRequestPost(context) {
  const { request, env, params } = context
  
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
    const evidenceId = params.id
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    
    if (!evidenceData) {
      return new Response(JSON.stringify({ error: '证据不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const evidence = JSON.parse(evidenceData)
    evidence.hidden = false
    evidence.shownAt = new Date().toISOString()
    
    await env.KV.put(`evidence:${evidenceId}`, JSON.stringify(evidence))
    
    await env.KV.put(`admin:log:${Date.now()}`, JSON.stringify({
      action: 'show',
      evidenceId,
      timestamp: new Date().toISOString()
    }))
    
    return new Response(JSON.stringify({
      success: true,
      message: '已显示'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Show error:', error)
    return new Response(JSON.stringify({ error: '操作失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
