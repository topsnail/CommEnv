import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'
import { MAX_DERIVED_IMAGE_BYTES, buildWebpOrJpegUnderBudget } from '../../lib/imageBudget.js'

const PRESETS = {
  small: { maxW: 400, maxH: 400, startQuality: 0.7, keyPrefix: 'small', minEdge: 40 },
  thumb: { maxW: 720, maxH: 720, startQuality: 0.86, keyPrefix: 'thumb2', minEdge: 44 },
  preview: { maxW: 1600, maxH: 1600, startQuality: 0.78, keyPrefix: 'preview', minEdge: 48 },
}

function responseFromCached(cached, extraHeaders = {}) {
  const headers = new Headers()
  cached.writeHttpMetadata(headers)
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', String(cached.httpMetadata?.contentType || 'application/octet-stream'))
  }
  headers.set('Cache-Control', 'public, max-age=604800')
  headers.set('X-Content-Type-Options', 'nosniff')
  Object.entries(extraHeaders).forEach(([k, v]) => headers.set(k, v))
  return new Response(cached.body, { headers })
}

export async function onRequestGet(context) {
  const { request, env, params } = context
  try {
    const id = String(params.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return new Response('证据不存在', { status: 404 })
    }

    const kindParam = new URL(request.url).searchParams.get('kind')
    const kind = kindParam === 'preview' ? 'preview' : kindParam === 'small' ? 'small' : 'thumb'
    const preset = PRESETS[kind]
    const acceptHeader = request.headers.get('accept') || ''
    const supportsWebP = acceptHeader.includes('image/webp')
    await ensureSchema(env)

    const row = await env.DB.prepare(
      'SELECT status, original_key, preview_key, thumb_key, small_key FROM evidence WHERE id = ? LIMIT 1'
    )
      .bind(id)
      .first()
    if (!row) return new Response('证据不存在', { status: 404 })

    if (row.status !== 'normal') {
      const ok = await requireAdminSession(request, env)
      if (!ok) return new Response('证据已隐藏', { status: 403 })
    }

    const currentPrefix = `${preset.keyPrefix}/`
    let primaryKeyRaw = null
    if (kind === 'preview') {
      primaryKeyRaw = row.preview_key
    } else if (kind === 'small') {
      primaryKeyRaw = row.small_key
    } else {
      primaryKeyRaw = row.thumb_key
    }
    const primaryKey = primaryKeyRaw && String(primaryKeyRaw).startsWith(currentPrefix) ? primaryKeyRaw : null
    const secondaryKey = kind === 'thumb' ? row.preview_key : kind === 'small' ? row.preview_key : null

    for (const keyCandidate of [primaryKey, secondaryKey].filter(Boolean)) {
      const cached = await env.R2.get(String(keyCandidate))
      if (!cached) continue
      const sz = cached.size
      if (typeof sz === 'number' && sz > MAX_DERIVED_IMAGE_BYTES) continue
      const extra = {}
      if (kind === 'thumb' && row.preview_key && String(keyCandidate) === String(row.preview_key)) {
        extra['X-Preview-Fallback'] = 'preview-cached'
      }
      return responseFromCached(cached, extra)
    }

    const original = await env.R2.get(String(row.original_key || ''))
    if (!original) return new Response('文件不存在', { status: 404 })
    const bytes = await original.arrayBuffer()

    try {
      const { buffer: variantBytes, contentType } = await buildWebpOrJpegUnderBudget(bytes, {
        maxW: preset.maxW,
        maxH: preset.maxH,
        startQuality: preset.startQuality,
        minEdge: preset.minEdge,
        preferWebp: supportsWebP,
        maxBytes: MAX_DERIVED_IMAGE_BYTES,
      })
      const ext = contentType.includes('webp') ? 'webp' : 'jpg'
      const variantKey = `${preset.keyPrefix}/${id}.${ext}`

      await env.R2.put(variantKey, variantBytes, { httpMetadata: { contentType } })
      if (kind === 'preview') {
        await env.DB.prepare('UPDATE evidence SET preview_key = ? WHERE id = ?').bind(variantKey, id).run()
      } else if (kind === 'small') {
        await env.DB.prepare('UPDATE evidence SET small_key = ? WHERE id = ?').bind(variantKey, id).run()
      } else {
        await env.DB.prepare('UPDATE evidence SET thumb_key = ? WHERE id = ?').bind(variantKey, id).run()
      }

      return new Response(variantBytes, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch (err) {
      if (String(err?.message || '').includes('IMAGE_TRANSFORM_UNAVAILABLE')) {
        return new Response('预览暂不可用（服务端无法生成压缩图）', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Preview-Fallback': 'unavailable',
          },
        })
      }
      throw err
    }
  } catch (e) {
    console.error('Preview error:', e)
    return new Response('获取预览失败', { status: 500 })
  }
}
