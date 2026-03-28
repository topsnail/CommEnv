/**
 * 列表缩略图 / 中等预览图统一字节上限（与产品要求一致）
 */
export const MAX_DERIVED_IMAGE_BYTES = 200 * 1024

function safeCloseBitmap(bitmap) {
  try {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close()
  } catch {
    // 部分运行时无 close 或已释放
  }
}

function calcFitSize(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH) return { width: maxW, height: maxH }
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
  }
}

function get2dOrThrow(canvas) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
  return ctx
}

async function jpegBlobFromCanvas(canvas, quality) {
  try {
    const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    return outBlob.arrayBuffer()
  } catch {
    throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
  }
}

/**
 * 将位图按目标尺寸绘制到 canvas 并编码为 JPEG，在 maxBytes 内通过降低质量、必要时缩小尺寸实现。
 */
export async function buildJpegVariantUnderBudget(bytes, options) {
  const {
    maxW,
    maxH,
    maxBytes = MAX_DERIVED_IMAGE_BYTES,
    startQuality = 0.82,
    minQuality = 0.35,
    minEdge = 48,
  } = options

  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(new Blob([bytes]))
  } catch {
    throw new Error('IMAGE_DECODE_FAILED')
  }
  try {
    let { width: w, height: h } = calcFitSize(bitmap.width, bitmap.height, maxW, maxH)
    const floor = Math.max(32, minEdge)

    for (let round = 0; round < 18; round++) {
      const canvas = new OffscreenCanvas(w, h)
      const ctx = get2dOrThrow(canvas)
      try {
        ctx.drawImage(bitmap, 0, 0, w, h)
      } catch {
        throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
      }

      let q = startQuality
      while (q >= minQuality - 1e-6) {
        const buf = await jpegBlobFromCanvas(canvas, q)
        if (buf.byteLength <= maxBytes) return buf
        q -= 0.055
      }

      const nw = Math.max(floor, Math.round(w * 0.87))
      const nh = Math.max(floor, Math.round(h * 0.87))
      if (nw >= w && nh >= h) break
      w = nw
      h = nh
    }

    let fw = Math.max(floor, w)
    let fh = Math.max(floor, h)
    for (let i = 0; i < 14; i++) {
      const canvas = new OffscreenCanvas(fw, fh)
      const ctx = get2dOrThrow(canvas)
      try {
        ctx.drawImage(bitmap, 0, 0, fw, fh)
      } catch {
        throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
      }
      const buf = await jpegBlobFromCanvas(canvas, minQuality)
      if (buf.byteLength <= maxBytes) return buf
      fw = Math.max(32, Math.round(fw * 0.72))
      fh = Math.max(32, Math.round(fh * 0.72))
    }
    const last = new OffscreenCanvas(32, 32)
    const lctx = get2dOrThrow(last)
    try {
      lctx.drawImage(bitmap, 0, 0, 32, 32)
    } catch {
      throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
    }
    return await jpegBlobFromCanvas(last, minQuality)
  } finally {
    safeCloseBitmap(bitmap)
  }
}

/**
 * /api/preview 按需生成：统一 JPEG（Workers 对 WebP 编码支持不一致，避免 500）
 */
export async function buildPreviewVariantUnderBudget(bytes, options) {
  const buf = await buildJpegVariantUnderBudget(bytes, {
    maxW: options.maxW,
    maxH: options.maxH,
    maxBytes: options.maxBytes ?? MAX_DERIVED_IMAGE_BYTES,
    startQuality: options.startQuality ?? 0.78,
    minQuality: options.minQuality ?? 0.32,
    minEdge: options.minEdge ?? 48,
  })
  return { buffer: buf, contentType: 'image/jpeg' }
}
