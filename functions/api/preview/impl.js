import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'

/**
 * 用 arrayBuffer 再组装 Response，避免部分环境下直接传 R2 body 流导致异常。
 * 直出原文件字节，不做任何重编码；仅拒绝超过单张上传上限的异常对象。
 */
async function responseFromCached(cached, extraHeaders = {}) {
  const headers = new Headers()
  try {
    cached.writeHttpMetadata(headers)
  } catch {
    headers.set('Content-Type', String(cached.httpMetadata?.contentType || 'application/octet-stream'))
  }
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', String(cached.httpMetadata?.contentType || 'application/octet-stream'))
  }
  headers.set('Cache-Control', 'public, max-age=604800')
  headers.set('X-Content-Type-Options', 'nosniff')
  Object.entries(extraHeaders).forEach(([k, v]) => headers.set(k, v))
  const sz = cached.size
  if (typeof sz === 'number' && sz > 10 * 1024 * 1024) {
    throw new Error('OBJECT_TOO_LARGE')
  }
  const buf = await cached.arrayBuffer()
  return new Response(buf, { headers })
}

function previewUnavailableResponse() {
  return new Response('预览暂不可用', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Preview-Fallback': 'unavailable',
    },
  })
}

function previewErrorResponse(logPrefix, err) {
  console.error(logPrefix, err)
  return previewUnavailableResponse()
}

export async function onRequest(context) {
  const { request } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  return onRequestGet(context)
}

/**
 * 公开展示用图片：始终直出 R2 original（与上传文件一致），不压缩、不缩放。
 * `kind` 参数保留仅为兼容旧链接，不影响响应内容。
 */
export async function onRequestGet(context) {
  const { request, env } = context
  try {
    if (!env?.R2 || typeof env.R2.get !== 'function') {
      return new Response('R2 未绑定', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
    const id = String(context.params?.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return new Response('证据不存在', { status: 404 })
    }

    try {
      await ensureSchema(env)
    } catch (schemaErr) {
      return previewErrorResponse('preview ensureSchema:', schemaErr)
    }

    let row
    try {
      row = await env.DB.prepare('SELECT status, original_key FROM evidence WHERE id = ? LIMIT 1').bind(id).first()
    } catch (dbErr) {
      return previewErrorResponse('preview DB:', dbErr)
    }

    if (!row) return new Response('证据不存在', { status: 404 })

    if (row.status !== 'normal') {
      try {
        const ok = await requireAdminSession(request, env)
        if (!ok) return new Response('证据已隐藏', { status: 403 })
      } catch (authErr) {
        return previewErrorResponse('preview admin session:', authErr)
      }
    }

    const originalKey = String(row.original_key || '')
    if (!originalKey) return new Response('文件不存在', { status: 404 })

    let obj
    try {
      obj = await env.R2.get(originalKey)
    } catch (r2Err) {
      return previewErrorResponse('preview R2 get original:', r2Err)
    }

    if (!obj) return new Response('文件不存在', { status: 404 })

    try {
      return await responseFromCached(obj, { 'X-Preview-Source': 'original' })
    } catch (e) {
      return previewErrorResponse('preview response:', e)
    }
  } catch (e) {
    return previewErrorResponse('Preview unexpected:', e)
  }
}
