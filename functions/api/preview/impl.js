import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'
import { MAX_DERIVED_IMAGE_BYTES, buildPreviewVariantUnderBudget } from '../../lib/imageBudget.js'

const PRESETS = {
  small: { maxW: 400, maxH: 400, startQuality: 0.7, keyPrefix: 'small', minEdge: 40 },
  thumb: { maxW: 720, maxH: 720, startQuality: 0.86, keyPrefix: 'thumb2', minEdge: 44 },
  preview: { maxW: 1600, maxH: 1600, startQuality: 0.78, keyPrefix: 'preview', minEdge: 48 },
}

/** 与 upload.js 派生图路径一致；D1 未写回 *_key 时仍能从 R2 命中，避免走 Worker 图像 API → 503 */
function conventionalDerivativeKey(kind, id) {
  const p = PRESETS[kind]
  return `${p.keyPrefix}/${id}.jpg`
}

/** 同一 id 下约定派生路径（仅 JPEG）；顺序按当前 kind 优先，避免 preview 请求误用 small */
function conventionalDerivativeKeysForKind(kind, id) {
  const s = `small/${id}.jpg`
  const t = `thumb2/${id}.jpg`
  const p = `preview/${id}.jpg`
  if (kind === 'small') return [s, t, p]
  if (kind === 'thumb') return [t, p, s]
  return [p, t, s]
}

function buildCacheKeyCandidates(kind, id, row) {
  const currentPrefix = `${PRESETS[kind].keyPrefix}/`
  let primaryKeyRaw = null
  if (kind === 'preview') primaryKeyRaw = row.preview_key
  else if (kind === 'small') primaryKeyRaw = row.small_key
  else primaryKeyRaw = row.thumb_key
  const primaryKey = primaryKeyRaw && String(primaryKeyRaw).startsWith(currentPrefix) ? primaryKeyRaw : null
  let secondaryKey = null
  if (kind === 'thumb') secondaryKey = row.preview_key
  else if (kind === 'small') secondaryKey = row.preview_key
  else if (kind === 'preview') {
    secondaryKey = row.thumb_key && String(row.thumb_key).startsWith('thumb2/') ? row.thumb_key : null
  }
  const conventional = conventionalDerivativeKeysForKind(kind, id)
  return [...new Set([primaryKey, secondaryKey, ...conventional].filter(Boolean))]
}

const KIND_TO_DB_COLUMN = {
  preview: 'preview_key',
  small: 'small_key',
  thumb: 'thumb_key',
}

/** 用 arrayBuffer 再组装 Response，避免部分环境下直接传 R2 body 流导致未捕获异常 → 外层 503 */
async function responseFromCached(cached, extraHeaders = {}) {
  const headers = new Headers()
  try {
    cached.writeHttpMetadata(headers)
  } catch {
    headers.set('Content-Type', String(cached.httpMetadata?.contentType || 'image/jpeg'))
  }
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', String(cached.httpMetadata?.contentType || 'application/octet-stream'))
  }
  headers.set('Cache-Control', 'public, max-age=604800')
  headers.set('X-Content-Type-Options', 'nosniff')
  Object.entries(extraHeaders).forEach(([k, v]) => headers.set(k, v))
  try {
    const buf = await cached.arrayBuffer()
    return new Response(buf, { headers })
  } catch {
    if (cached.body) return new Response(cached.body, { headers })
    throw new Error('R2 object has no body')
  }
}

function previewUnavailableResponse() {
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

/** 预览失败时统一 503，避免前端看到 500（原因写入日志） */
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

export async function onRequestGet(context) {
  const { request, env, params, waitUntil } = context
  try {
    if (!env?.R2 || typeof env.R2.get !== 'function') {
      return new Response('R2 未绑定', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
    const id = String(params?.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return new Response('证据不存在', { status: 404 })
    }

    const kindParam = new URL(request.url).searchParams.get('kind')
    const kind = kindParam === 'preview' ? 'preview' : kindParam === 'small' ? 'small' : 'thumb'
    const preset = PRESETS[kind]
    if (!preset) {
      return new Response('参数 kind 无效', { status: 400 })
    }

    try {
      await ensureSchema(env)
    } catch (schemaErr) {
      return previewErrorResponse('preview ensureSchema:', schemaErr)
    }

    let row
    try {
      row = await env.DB.prepare(
        'SELECT status, original_key, preview_key, thumb_key, small_key FROM evidence WHERE id = ? LIMIT 1'
      )
        .bind(id)
        .first()
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

    const conventionalKey = conventionalDerivativeKey(kind, id)
    const keyCandidates = buildCacheKeyCandidates(kind, id, row)

    for (const keyCandidate of keyCandidates) {
      try {
        const cached = await env.R2.get(String(keyCandidate))
        if (!cached) continue
        const extra = {}
        if (kind === 'thumb' && row.preview_key && String(keyCandidate) === String(row.preview_key)) {
          extra['X-Preview-Fallback'] = 'preview-cached'
        }
        if (String(keyCandidate) !== conventionalKey && conventionalDerivativeKeysForKind(kind, id).includes(String(keyCandidate))) {
          extra['X-Preview-Fallback'] = 'derivative-cross'
          extra['X-Preview-Source'] = 'r2-conventional'
        } else if (String(keyCandidate) === conventionalKey) {
          extra['X-Preview-Source'] = 'r2-conventional'
        }
        const dbCol = KIND_TO_DB_COLUMN[kind]
        const curDb = dbCol ? row[dbCol] : null
        if (dbCol && String(keyCandidate) === conventionalKey && (!curDb || String(curDb) !== String(keyCandidate))) {
          const p = env.DB.prepare(`UPDATE evidence SET ${dbCol} = ? WHERE id = ?`).bind(conventionalKey, id).run().catch((e) => {
            console.error('preview backfill db:', id, kind, e)
          })
          if (typeof waitUntil === 'function') waitUntil(p)
          else void p
        }
        return await responseFromCached(cached, extra)
      } catch (cacheErr) {
        console.error('preview cache skip:', keyCandidate, cacheErr)
      }
    }

    let original
    try {
      original = await env.R2.get(String(row.original_key || ''))
    } catch (r2Err) {
      return previewErrorResponse('preview R2 get original:', r2Err)
    }

    if (!original) return new Response('文件不存在', { status: 404 })

    let bytes
    try {
      bytes = await original.arrayBuffer()
    } catch (bufErr) {
      return previewErrorResponse('preview original.arrayBuffer:', bufErr)
    }

    let variantBytes
    let contentType
    try {
      const built = await buildPreviewVariantUnderBudget(bytes, {
        maxW: preset.maxW,
        maxH: preset.maxH,
        startQuality: preset.startQuality,
        minEdge: preset.minEdge,
        maxBytes: MAX_DERIVED_IMAGE_BYTES,
      })
      variantBytes = built.buffer
      contentType = built.contentType
    } catch (err) {
      console.error('preview generate:', id, kind, err)
      try {
        const origFallback = await env.R2.get(String(row.original_key || ''))
        if (origFallback) {
          const ct = String(origFallback.httpMetadata?.contentType || '')
          const keyLower = String(row.original_key || '').toLowerCase()
          const okPath = String(row.original_key || '').startsWith('original/')
          const looksImage =
            ct.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(keyLower) ||
            okPath
          if (looksImage) {
            return await responseFromCached(origFallback, {
              'X-Preview-Fallback': 'original',
              'Cache-Control': 'public, max-age=3600',
            })
          }
        }
      } catch (fallbackErr) {
        console.error('preview original fallback:', id, fallbackErr)
      }
      return previewUnavailableResponse()
    }

    const variantKey = `${preset.keyPrefix}/${id}.jpg`
    try {
      await env.R2.put(variantKey, variantBytes, { httpMetadata: { contentType } })
      if (kind === 'preview') {
        await env.DB.prepare('UPDATE evidence SET preview_key = ? WHERE id = ?').bind(variantKey, id).run()
      } else if (kind === 'small') {
        await env.DB.prepare('UPDATE evidence SET small_key = ? WHERE id = ?').bind(variantKey, id).run()
      } else {
        await env.DB.prepare('UPDATE evidence SET thumb_key = ? WHERE id = ?').bind(variantKey, id).run()
      }
    } catch (storeErr) {
      console.error('preview store failed:', id, kind, storeErr)
    }

    return new Response(variantBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    return previewErrorResponse('Preview unexpected:', e)
  }
}
