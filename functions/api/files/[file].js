export async function onRequestGet(context) {
  const { request, env, params } = context
  
  try {
    const fileName = params.file
    const evidenceId = String(fileName || '').split('.')[0]
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) {
      return new Response('证据不存在', { status: 404 })
    }
    const evidence = JSON.parse(evidenceData)
    if (evidence.fileName && evidence.fileName !== fileName) {
      return new Response('文件不存在', { status: 404 })
    }

    if (evidence.hidden) {
      const url = new URL(request.url)
      const authHeader = request.headers.get('Authorization')
      const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
      const tokenFromQuery = url.searchParams.get('token') || ''
      const token = tokenFromHeader || tokenFromQuery
      if (!token) {
        return new Response('证据已隐藏', { status: 403 })
      }
      const tokenData = await env.KV.get(`admin:token:${token}`)
      if (!tokenData) {
        return new Response('证据已隐藏', { status: 403 })
      }
    }

    const object = await env.R2.get(fileName)
    
    if (!object) {
      return new Response('文件不存在', { status: 404 })
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    
    return new Response(object.body, { headers })
    
  } catch (error) {
    console.error('File access error:', error)
    return new Response('获取文件失败', { status: 500 })
  }
}
