/**
 * 浏览器端生成上传用派生图（与后端 imageBudget 一致）。
 * Cloudflare Worker 常无 Canvas 编码能力，故在上传前生成并随表单提交。
 */
export const MAX_DERIVED_BYTES = 10 * 1024 * 1024

/** 与 functions/api/upload.js / preview PRESETS 对齐 */
export const CLIENT_PRESETS = {
  small: { maxW: 400, maxH: 400, startQuality: 0.7, minQuality: 0.32, minEdge: 40 },
  thumb: { maxW: 720, maxH: 720, startQuality: 0.86, minQuality: 0.32, minEdge: 44 },
  preview: { maxW: 1600, maxH: 1600, startQuality: 0.78, minQuality: 0.32, minEdge: 48 },
}

function calcFitSize(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH) return { width: maxW, height: maxH }
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
  }
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality
    )
  })
}

/**
 * @param {File} imageFile
 * @param {{ maxW: number, maxH: number, startQuality?: number, minQuality?: number, minEdge?: number }} options
 * @returns {Promise<Blob>}
 */
export async function buildJpegBlobUnderBudget(imageFile, options) {
  const {
    maxW,
    maxH,
    maxBytes = MAX_DERIVED_BYTES,
    startQuality = 0.82,
    minQuality = 0.32,
    minEdge = 48,
  } = options

  const bitmap = await createImageBitmap(imageFile)
  try {
    let { width: w, height: h } = calcFitSize(bitmap.width, bitmap.height, maxW, maxH)
    const floor = Math.max(32, minEdge)

    for (let round = 0; round < 18; round++) {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      ctx.drawImage(bitmap, 0, 0, w, h)

      let q = startQuality
      while (q >= minQuality - 1e-6) {
        const blob = await canvasToJpegBlob(canvas, q)
        if (blob.size <= maxBytes) return blob
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
      const canvas = document.createElement('canvas')
      canvas.width = fw
      canvas.height = fh
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      ctx.drawImage(bitmap, 0, 0, fw, fh)
      const blob = await canvasToJpegBlob(canvas, minQuality)
      if (blob.size <= maxBytes) return blob
      fw = Math.max(32, Math.round(fw * 0.72))
      fh = Math.max(32, Math.round(fh * 0.72))
    }

    const last = document.createElement('canvas')
    last.width = 32
    last.height = 32
    const lctx = last.getContext('2d')
    if (!lctx) throw new Error('no 2d context')
    lctx.drawImage(bitmap, 0, 0, 32, 32)
    return await canvasToJpegBlob(last, minQuality)
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close()
  }
}

/**
 * 为单张原图生成列表小图、thumb2、preview 三个 JPEG Blob
 * @param {File} file
 */
export async function buildDerivativesForUpload(file) {
  const [small, thumb, preview] = await Promise.all([
    buildJpegBlobUnderBudget(file, CLIENT_PRESETS.small),
    buildJpegBlobUnderBudget(file, CLIENT_PRESETS.thumb),
    buildJpegBlobUnderBudget(file, CLIENT_PRESETS.preview),
  ])
  return { small, thumb, preview }
}
