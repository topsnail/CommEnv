import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'

const PRESETS = {
  // 小缩略图：用于列表展示，控制在200KB以下
  small: { maxW: 400, maxH: 400, quality: 0.7, keyPrefix: 'small' },
  // 提高清晰度：缩略图尺寸与质量上调；同时更换 keyPrefix 以便旧缩略图自动失效重建
  thumb: { maxW: 720, maxH: 720, quality: 0.86, keyPrefix: 'thumb2' },
  preview: { maxW: 1600, maxH: 1600, quality: 0.82, keyPrefix: 'preview' },
}

function calcFitSize(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH) return { width: maxW, height: maxH }
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
  }
}

async function buildImageVariant(bytes, preset, format = 'webp') {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
  }
  const blob = new Blob([bytes])
  const bitmap = await createImageBitmap(blob)
  const { width, height } = calcFitSize(bitmap.width, bitmap.height, preset.maxW, preset.maxH)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const outBlob = await canvas.convertToBlob({
    type: format === 'webp' ? 'image/webp' : 'image/jpeg',
    quality: format === 'webp' ? Math.max(0.6, preset.quality - 0.1) : preset.quality
  })
  return outBlob.arrayBuffer()
}

export async function onRequestGet(context) {
  const { request, env, params } = context
  try {
    const id = String(params.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return new Response('证据不存在', { status: 404 })
    }

    const kindParam = new URL(request.url).searchParams.get('kind')
    const kind = kindParam === 'preview' ? 'preview' : (kindParam === 'small' ? 'small' : 'thumb')
    const preset = PRESETS[kind]
    const acceptHeader = request.headers.get('accept') || ''
    const supportsWebP = acceptHeader.includes('image/webp')
    const format = supportsWebP ? 'webp' : 'jpeg'
    await ensureSchema(env)

    const row = await env.DB.prepare(
      'SELECT status, original_key, preview_key, thumb_key, small_key FROM evidence WHERE id = ? LIMIT 1'
    ).bind(id).first()
    if (!row) return new Response('证据不存在', { status: 404 })

    if (row.status !== 'normal') {
      const ok = await requireAdminSession(request, env)
      if (!ok) return new Response('证据已隐藏', { status: 403 })
    }

    // 仅信任与当前预设匹配的 key，避免一直命中旧的低清缩略图
    const currentPrefix = `${preset.keyPrefix}/`
    let primaryKeyRaw = null
    if (kind === 'preview') {
      primaryKeyRaw = row.preview_key
    } else if (kind === 'small') {
      primaryKeyRaw = row.small_key
    } else {
      primaryKeyRaw = row.thumb_key
    }
    const primaryKey = (primaryKeyRaw && String(primaryKeyRaw).startsWith(currentPrefix)) ? primaryKeyRaw : null
    const secondaryKey = kind === 'thumb' ? row.preview_key : (kind === 'small' ? row.preview_key : null)
    const selectedKey = [primaryKey, secondaryKey].find((key) => key)
    if (selectedKey) {
      const cached = await env.R2.get(String(selectedKey))
      if (cached) {
        const headers = new Headers()
        cached.writeHttpMetadata(headers)
        // 不要强行覆盖 Content-Type，避免 WebP 被标成 jpeg
        if (!headers.get('Content-Type')) {
          headers.set('Content-Type', String(cached.httpMetadata?.contentType || 'application/octet-stream'))
        }
        headers.set('Cache-Control', 'public, max-age=604800')
        headers.set('X-Content-Type-Options', 'nosniff')
        if (kind === 'thumb' && primaryKey !== selectedKey) {
          headers.set('X-Preview-Fallback', 'preview-cached')
        }
        return new Response(cached.body, { headers })
      }
    }

    const original = await env.R2.get(String(row.original_key || ''))
    if (!original) return new Response('文件不存在', { status: 404 })
    const bytes = await original.arrayBuffer()
    try {
      const variantBytes = await buildImageVariant(bytes, preset, format)
      const variantKey = `${preset.keyPrefix}/${id}.${format}`

      await env.R2.put(variantKey, variantBytes, { httpMetadata: { contentType: format === 'webp' ? 'image/webp' : 'image/jpeg' } })
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
          'Content-Type': format === 'webp' ? 'image/webp' : 'image/jpeg',
          'Cache-Control': 'public, max-age=604800',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch (err) {
      // 本地/部分运行时不支持图像处理 API，回退原图以保证联调可用。
      if (String(err?.message || '').includes('IMAGE_TRANSFORM_UNAVAILABLE')) {
        if (kind === 'thumb') {
          return new Response('缩略图暂不可用', {
            status: 503,
            headers: {
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
              'X-Preview-Fallback': 'unavailable',
            },
          })
        }
        const headers = new Headers()
        original.writeHttpMetadata(headers)
        headers.set('Cache-Control', 'public, max-age=600')
        headers.set('X-Content-Type-Options', 'nosniff')
        headers.set('X-Preview-Fallback', 'original')
        return new Response(bytes, { status: 200, headers })
      }
      throw err
    }
  } catch (e) {
    console.error('Preview error:', e)
    return new Response('获取预览失败', { status: 500 })
  }
}

