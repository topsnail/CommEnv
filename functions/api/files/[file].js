import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'

/**
 * 原图直链：仅管理员可用（HttpOnly Cookie `admin_session`）。
 * 公开展示与 /api/preview 一致（均直出 R2 original，不压缩）；批量归档用「打包下载」。
 */
export async function onRequestGet(context) {
  const { request, env, params } = context

  const ok = await requireAdminSession(request, env)
  if (!ok) {
    return new Response(JSON.stringify({ error: '需要管理员权限才能访问原图' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

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
    )
      .bind(evidenceId)
      .first()
    if (!evidence) {
      return new Response('证据不存在', { status: 404 })
    }

    const object = await env.R2.get(String(evidence.original_key))

    if (!object) {
      return new Response('文件不存在', { status: 404 })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Content-Type', evidence.original_mime || 'application/octet-stream')
    headers.set('etag', object.httpEtag)

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
