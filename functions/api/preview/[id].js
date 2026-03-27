import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'

const PRESETS = {
  thumb: { maxW: 360, maxH: 360, quality: 0.72, keyPrefix: 'thumb' },
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

async function buildJpegVariant(bytes, preset) {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
  }
  const blob = new Blob([bytes])
  const bitmap = await createImageBitmap(blob)
  const { width, height } = calcFitSize(bitmap.width, bitmap.height, preset.maxW, preset.maxH)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: preset.quality })
  return outBlob.arrayBuffer()
}

export async function onRequestGet(context) {
  const { request, env, params } = context
  try {
    const id = String(params.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return new Response('证据不存在', { status: 404 })
    }

    const kind = new URL(request.url).searchParams.get('kind') === 'preview' ? 'preview' : 'thumb'
    const preset = PRESETS[kind]
    await ensureSchema(env)

    const row = await env.DB.prepare(
      'SELECT status, original_key, preview_key, thumb_key FROM evidence WHERE id = ? LIMIT 1'
    ).bind(id).first()
    if (!row) return new Response('证据不存在', { status: 404 })

    if (row.status !== 'normal') {
      const ok = await requireAdminSession(request, env)
      if (!ok) return new Response('证据已隐藏', { status: 403 })
    }

    const primaryKey = kind === 'preview' ? row.preview_key : row.thumb_key
    const secondaryKey = kind === 'thumb' ? row.preview_key : null
    const selectedKey = [primaryKey, secondaryKey].find((key) => key)
    if (selectedKey) {
      const cached = await env.R2.get(String(selectedKey))
      if (cached) {
        const headers = new Headers()
        cached.writeHttpMetadata(headers)
        headers.set('Content-Type', 'image/jpeg')
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
      const variantBytes = await buildJpegVariant(bytes, preset)
      const variantKey = `${preset.keyPrefix}/${id}.jpg`

      await env.R2.put(variantKey, variantBytes, { httpMetadata: { contentType: 'image/jpeg' } })
      if (kind === 'preview') {
        await env.DB.prepare('UPDATE evidence SET preview_key = ? WHERE id = ?').bind(variantKey, id).run()
      } else {
        await env.DB.prepare('UPDATE evidence SET thumb_key = ? WHERE id = ?').bind(variantKey, id).run()
      }

      return new Response(variantBytes, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
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

