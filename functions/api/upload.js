import * as exifr from 'exifr'
import { ensureSchema } from '../db/schema.js'
import { json, newId, roundGps3, sha256Hex } from '../db/utils.js'

const ALLOWED_CATEGORIES = new Set([
  'CAT01', 'CAT02', 'CAT03', 'CAT04', 'CAT05',
  'CAT06', 'CAT07', 'CAT08', 'CAT09', 'CAT10',
  'CAT11', 'CAT12', 'CAT13', 'CAT14', 'CAT15',
  'CAT16', 'CAT17', 'CAT18', 'CAT19', 'CAT20',
])

const MAX_FILE_BYTES = 10 * 1024 * 1024
// 提高清晰度：缩略图尺寸与质量上调；同时更换 keyPrefix 以便旧缩略图自动失效重建
const PRESET_THUMB = { maxW: 720, maxH: 720, quality: 0.86, keyPrefix: 'thumb2' }
const PRESET_PREVIEW = { maxW: 1600, maxH: 1600, quality: 0.82, keyPrefix: 'preview' }

function getExtAndMime(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  if (type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  if (type === 'image/png' || name.endsWith('.png')) {
    return { ext: 'png', mime: 'image/png' }
  }
  return null
}

async function parseExif(buffer) {
  try {
    const parsed = await exifr.parse(buffer)
    const exif = parsed && typeof parsed === 'object' ? parsed : {}
    const { lat: gpsLatRaw, lon: gpsLonRaw } = extractGpsDecimal(exif)
    const gpsLat = roundGps3(gpsLatRaw)
    const gpsLon = roundGps3(gpsLonRaw)

    const datetimeOriginal = normalizeExifDateTimeOriginal(exif.DateTimeOriginal)

    return {
      exifJson: JSON.stringify(exif),
      make: exif.Make ? String(exif.Make) : null,
      model: exif.Model ? String(exif.Model) : null,
      // IMPORTANT: EXIF DateTimeOriginal 通常不含时区；这里以“本地时间”语义保存，
      // 避免 new Date(...).toISOString() 引入的时区偏移。
      datetimeOriginal,
      imageWidth: Number.isFinite(Number(exif.ImageWidth)) ? Number(exif.ImageWidth) : null,
      imageHeight: Number.isFinite(Number(exif.ImageHeight)) ? Number(exif.ImageHeight) : null,
      gpsLat,
      gpsLon,
    }
  } catch {
    return {
      exifJson: JSON.stringify({}),
      make: null,
      model: null,
      datetimeOriginal: null,
      imageWidth: null,
      imageHeight: null,
      gpsLat: null,
      gpsLon: null,
    }
  }
}

function dmsToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null
  const deg = Number(dms[0])
  const min = Number(dms[1])
  const sec = Number(dms[2])
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return null
  let v = deg + min / 60 + sec / 3600
  const r = String(ref || '').toUpperCase()
  if (r === 'S' || r === 'W') v = -v
  return v
}

function extractGpsDecimal(exif) {
  // 1) 优先使用 exifr 的派生字段（通常是十进制）
  const lat1 = exif?.latitude ?? exif?.lat ?? null
  const lon1 = exif?.longitude ?? exif?.lon ?? null
  const nlat1 = Number(lat1)
  const nlon1 = Number(lon1)
  if (Number.isFinite(nlat1) && Number.isFinite(nlon1)) return { lat: nlat1, lon: nlon1 }

  // 2) 常见 EXIF: GPSLatitude/GPSLongitude 为 DMS 数组 + Ref
  const lat2 = dmsToDecimal(exif?.GPSLatitude, exif?.GPSLatitudeRef)
  const lon2 = dmsToDecimal(exif?.GPSLongitude, exif?.GPSLongitudeRef)
  if (Number.isFinite(lat2) && Number.isFinite(lon2)) return { lat: lat2, lon: lon2 }

  // 3) 兜底：如果本来就是数值
  const nlat3 = Number(exif?.GPSLatitude)
  const nlon3 = Number(exif?.GPSLongitude)
  if (Number.isFinite(nlat3) && Number.isFinite(nlon3)) return { lat: nlat3, lon: nlon3 }

  return { lat: null, lon: null }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

// 返回形如 "YYYY-MM-DDTHH:mm:ss"（不带 Z）以表达“拍摄地本地时间”
function normalizeExifDateTimeOriginal(v) {
  if (!v) return null

  // exifr 可能返回 Date
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    const y = v.getFullYear()
    const m = pad2(v.getMonth() + 1)
    const d = pad2(v.getDate())
    const hh = pad2(v.getHours())
    const mm = pad2(v.getMinutes())
    const ss = pad2(v.getSeconds())
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
  }

  const s = String(v).trim()

  // 常见 EXIF: "YYYY:MM:DD HH:mm:ss"
  const m1 = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (m1) {
    const [, yy, mo, dd, hh, mi, ss] = m1
    return `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}`
  }

  // 兼容 "YYYY-MM-DD HH:mm:ss"
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (m2) {
    const [, yy, mo, dd, hh, mi, ss] = m2
    return `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}`
  }

  // 最后尝试：如果是可解析的 ISO 且不带时区，也直接存；带时区则转成本地时间字符串
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const dd = pad2(d.getDate())
    const hh = pad2(d.getHours())
    const mi = pad2(d.getMinutes())
    const ss = pad2(d.getSeconds())
    return `${y}-${m}-${dd}T${hh}:${mi}:${ss}`
  }

  return null
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

export async function onRequestPost(context) {
  const { request, env } = context
  try {
    if (!env?.DB) return json({ error: '服务未配置 D1（DB）绑定' }, 500)
    if (!env?.R2 || typeof env.R2.put !== 'function') {
      return json({ error: '服务未配置 R2 绑定' }, 500)
    }
    await ensureSchema(env)
    const formData = await request.formData()
    const files = formData.getAll('files')
    // 派生图（仅用于展示缩略图/预览），不会影响 original 与 EXIF 读取
    const thumbs = formData.getAll('thumbs')
    const previews = formData.getAll('previews')
    const category = String(formData.get('category') || '')
    const description = String(formData.get('description') || '')

    if (!files || files.length === 0) return json({ error: '请选择文件' }, 400)
    if (!ALLOWED_CATEGORIES.has(category)) return json({ error: '分类不合法' }, 400)
    if (description.length > 100) return json({ error: '描述不能超过100字符' }, 400)

    const uploadTime = new Date().toISOString()
    const out = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileSpec = getExtAndMime(file)
      if (!fileSpec) return json({ error: '仅支持 jpg、jpeg、png 格式' }, 400)
      const size = Number(file?.size || 0)
      if (size <= 0 || size > MAX_FILE_BYTES) return json({ error: '图片大小不能超过10MB' }, 400)

      const id = newId()
      const bytes = await file.arrayBuffer()
      const hash = await sha256Hex(bytes)
      const exif = await parseExif(bytes)

      const originalKey = `original/${id}.${fileSpec.ext}`
      await env.R2.put(originalKey, bytes, {
        httpMetadata: { contentType: fileSpec.mime },
      })

      await env.DB.prepare(
        `INSERT INTO evidence (
          id, category, description, status, upload_time, hash_sha256,
          gps_lat, gps_lon, exif_json, make, model, datetime_original,
          image_width, image_height, original_key, original_mime, original_size,
          preview_key, thumb_key
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
      ).bind(
        id, category, description, uploadTime, hash,
        exif.gpsLat, exif.gpsLon, exif.exifJson, exif.make, exif.model, exif.datetimeOriginal,
        exif.imageWidth, exif.imageHeight, originalKey, fileSpec.mime, size
      ).run()

      // 写入预览图与缩略图（优先使用前端派生图；服务器不依赖图像变换能力）
      try {
        const thumbKey = `${PRESET_THUMB.keyPrefix}/${id}.jpg`
        const previewKey = `${PRESET_PREVIEW.keyPrefix}/${id}.jpg`
        
        const clientThumbFile = thumbs?.[i]
        const clientPreviewFile = previews?.[i]
        const needThumb = !clientThumbFile
        const needPreview = !clientPreviewFile

        // 1) 如果前端已经提供派生图，直接落盘
        if (clientThumbFile) {
          const thumbBytes = await clientThumbFile.arrayBuffer()
          await env.R2.put(thumbKey, thumbBytes, { httpMetadata: { contentType: 'image/jpeg' } })
          await env.DB.prepare('UPDATE evidence SET thumb_key = ? WHERE id = ?').bind(thumbKey, id).run()
        }
        if (clientPreviewFile) {
          const previewBytes = await clientPreviewFile.arrayBuffer()
          await env.R2.put(previewKey, previewBytes, { httpMetadata: { contentType: 'image/jpeg' } })
          await env.DB.prepare('UPDATE evidence SET preview_key = ? WHERE id = ?').bind(previewKey, id).run()
        }

        // 2) 缺少派生图时，才尝试服务器端生成（兼容本地/部分运行时）
        if (needThumb || needPreview) {
          const [thumbBytes, previewBytes] = await Promise.all([
            needThumb ? buildJpegVariant(bytes, PRESET_THUMB) : Promise.resolve(null),
            needPreview ? buildJpegVariant(bytes, PRESET_PREVIEW) : Promise.resolve(null),
          ])

          if (thumbBytes) {
            await env.R2.put(thumbKey, thumbBytes, { httpMetadata: { contentType: 'image/jpeg' } })
            await env.DB.prepare('UPDATE evidence SET thumb_key = ? WHERE id = ?').bind(thumbKey, id).run()
          }
          if (previewBytes) {
            await env.R2.put(previewKey, previewBytes, { httpMetadata: { contentType: 'image/jpeg' } })
            await env.DB.prepare('UPDATE evidence SET preview_key = ? WHERE id = ?').bind(previewKey, id).run()
          }
        }
      } catch (previewErr) {
        // 派生图失败不影响 original 入库与 EXIF 解析；前台会降级到 preview 或提示稍后重试
        if (!String(previewErr?.message || '').includes('IMAGE_TRANSFORM_UNAVAILABLE')) console.warn('preview warmup failed:', id, previewErr)
      }

      out.push({
        id,
        category,
        description,
        timestamp: uploadTime,
        upload_time: uploadTime,
        hash,
        url: `/api/files/${id}.${fileSpec.ext}`,
      })
    }

    return json({ success: true, data: out, message: '上传成功' })
  } catch (e) {
    console.error('Upload error:', e)
    const detail = String(e?.message || '')
    return json({ error: '上传失败', message: detail || 'unknown error' }, 500)
  }
}

