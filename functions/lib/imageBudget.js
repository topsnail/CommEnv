/**
 * 列表缩略图 / 中等预览图统一字节上限（与产品要求一致）
 */
export const MAX_DERIVED_IMAGE_BYTES = 200 * 1024

function calcFitSize(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH) return { width: maxW, height: maxH }
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
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

  const bitmap = await createImageBitmap(new Blob([bytes]))
  try {
    let { width: w, height: h } = calcFitSize(bitmap.width, bitmap.height, maxW, maxH)
    const floor = Math.max(32, minEdge)

    for (let round = 0; round < 18; round++) {
      const canvas = new OffscreenCanvas(w, h)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, w, h)

      let q = startQuality
      while (q >= minQuality - 1e-6) {
        const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: q })
        const buf = await outBlob.arrayBuffer()
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
      canvas.getContext('2d').drawImage(bitmap, 0, 0, fw, fh)
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: minQuality })
      const buf = await blob.arrayBuffer()
      if (buf.byteLength <= maxBytes) return buf
      fw = Math.max(32, Math.round(fw * 0.72))
      fh = Math.max(32, Math.round(fh * 0.72))
    }
    const last = new OffscreenCanvas(32, 32)
    last.getContext('2d').drawImage(bitmap, 0, 0, 32, 32)
    return await (await last.convertToBlob({ type: 'image/jpeg', quality: minQuality })).arrayBuffer()
  } finally {
    bitmap.close()
  }
}

/**
 * WebP（优先）或 JPEG，用于 /api/preview 按需生成；同样受 maxBytes 约束。
 */
export async function buildWebpOrJpegUnderBudget(bytes, options) {
  const {
    maxW,
    maxH,
    preferWebp = true,
    maxBytes = MAX_DERIVED_IMAGE_BYTES,
    startQuality = 0.78,
    minQuality = 0.32,
    minEdge = 48,
  } = options

  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('IMAGE_TRANSFORM_UNAVAILABLE')
  }

  const bitmap = await createImageBitmap(new Blob([bytes]))
  try {
    let { width: w, height: h } = calcFitSize(bitmap.width, bitmap.height, maxW, maxH)
    const floor = Math.max(32, minEdge)

    const tryEncode = async (canvas, type, quality) => {
      const outBlob = await canvas.convertToBlob({ type, quality })
      return outBlob.arrayBuffer()
    }

    for (let round = 0; round < 18; round++) {
      const canvas = new OffscreenCanvas(w, h)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, w, h)

      const types = preferWebp
        ? [
            ['image/webp', startQuality],
            ['image/jpeg', Math.min(0.9, startQuality + 0.04)],
          ]
        : [['image/jpeg', Math.min(0.9, startQuality + 0.04)]]

      for (const [mime, baseQ] of types) {
        let q = baseQ
        while (q >= minQuality - 1e-6) {
          try {
            const buf = await tryEncode(canvas, mime, q)
            if (buf.byteLength <= maxBytes) {
              return { buffer: buf, contentType: mime }
            }
          } catch {
            // 部分运行时可能不支持 webp 编码，换 JPEG
            if (mime === 'image/webp') break
          }
          q -= 0.05
        }
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
      canvas.getContext('2d').drawImage(bitmap, 0, 0, fw, fh)
      const buf = await tryEncode(canvas, 'image/jpeg', minQuality)
      if (buf.byteLength <= maxBytes) return { buffer: buf, contentType: 'image/jpeg' }
      fw = Math.max(32, Math.round(fw * 0.72))
      fh = Math.max(32, Math.round(fh * 0.72))
    }
    const last = new OffscreenCanvas(32, 32)
    last.getContext('2d').drawImage(bitmap, 0, 0, 32, 32)
    const buf = await tryEncode(last, 'image/jpeg', minQuality)
    return { buffer: buf, contentType: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}
