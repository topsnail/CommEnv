import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'

export async function onRequestGet(context) {
  const { request, env, params } = context
  
  try {
    const rawFileName = String(params.file || '')
    const match = rawFileName.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|jpeg|png)$/i
    )
    if (!match) {
      return new Response('文件不存在', { status: 404 })
    }
    const evidenceId = match[1]
    await ensureSchema(env)
    const evidence = await env.DB.prepare(
      `SELECT status, original_key, original_mime FROM evidence WHERE id = ? LIMIT 1`
    ).bind(evidenceId).first()
    if (!evidence) {
      return new Response('证据不存在', { status: 404 })
    }
    if (evidence.status !== 'normal') {
      const ok = await requireAdminSession(request, env)
      if (!ok) return new Response('证据已隐藏', { status: 403, headers: { 'Cache-Control': 'no-store' } })
    }
    const object = await env.R2.get(String(evidence.original_key))
    
    if (!object) {
      return new Response('文件不存在', { status: 404 })
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Content-Type', evidence.original_mime || 'application/octet-stream')
    headers.set('etag', object.httpEtag)

    // 隐私文件：强制不缓存，避免 token 泄漏后被代理/浏览器复用
    headers.set('Cache-Control', 'private, no-store, max-age=0')
    headers.set('Pragma', 'no-cache')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    
    return new Response(object.body, { headers })
    
  } catch (error) {
    console.error('File access error:', error)
    return new Response('获取文件失败', { status: 500 })
  }
}
