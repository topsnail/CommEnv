import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  
  const ok = await requireAdminSession(request, env)
  if (!ok) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const category = url.searchParams.get('category')
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const pageSize = 20
  
  try {
    await ensureSchema(env)
    const { list, stats, hasMore } = await getAdminEvidenceList(env, category, page, pageSize)
    
    return new Response(JSON.stringify({
      success: true,
      data: list,
      stats,
      hasMore
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Admin list error:', error)
    return new Response(JSON.stringify({ error: '获取列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function getAdminEvidenceList(env, category, page, pageSize) {
  const allowedCategories = new Set([
    'CAT01','CAT02','CAT03','CAT04','CAT05','CAT06','CAT07','CAT08','CAT09','CAT10',
    'CAT11','CAT12','CAT13','CAT14','CAT15','CAT16','CAT17','CAT18','CAT19','CAT20',
  ])
  if (category && !allowedCategories.has(String(category))) {
    category = null
  }

  const offset = (page - 1) * pageSize
  const where = category ? 'WHERE category = ?' : ''
  const listSql = `
    SELECT id, category, description, status, upload_time, hash_sha256, exif_json, original_key, gps_lat, gps_lon
    FROM evidence
    ${where}
    ORDER BY upload_time DESC
    LIMIT ? OFFSET ?
  `
  const listRows = category
    ? await env.DB.prepare(listSql).bind(category, pageSize, offset).all()
    : await env.DB.prepare(listSql).bind(pageSize, offset).all()
  const list = (listRows.results || []).map((r) => ({
    exif: normalizeExif(safeJson(r.exif_json), r),
    id: r.id,
    type: 'image',
    category: r.category,
    description: r.description || '',
    timestamp: r.upload_time,
    uploadedAt: r.upload_time,
    url: `/api/preview/${r.id}?kind=preview`,
    thumbUrl: `/api/preview/${r.id}?kind=thumb`,
    hash: r.hash_sha256,
    status: r.status || 'normal',
    hidden: r.status !== 'normal',
  }))

  const totalRow = await env.DB.prepare('SELECT COUNT(*) AS c FROM evidence').first()
  const normalRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence WHERE status = 'normal'").first()
  const pendingRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence WHERE status = 'pending'").first()
  const hiddenRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM evidence WHERE status = 'hidden'").first()
  const month = new Date()
  month.setDate(1)
  month.setHours(0, 0, 0, 0)
  const monthIso = month.toISOString()
  const monthRow = await env.DB.prepare('SELECT COUNT(*) AS c FROM evidence WHERE upload_time >= ?').bind(monthIso).first()
  const filterTotalRow = category
    ? await env.DB.prepare('SELECT COUNT(*) AS c FROM evidence WHERE category = ?').bind(category).first()
    : totalRow

  return {
    list,
    stats: {
      total: Number(totalRow?.c || 0),
      normal: Number(normalRow?.c || 0),
      pending: Number(pendingRow?.c || 0),
      hidden: Number(hiddenRow?.c || 0),
      month: Number(monthRow?.c || 0),
    },
    hasMore: offset + list.length < Number(filterTotalRow?.c || 0),
  }
}

function safeJson(raw) {
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function normalizeExif(exif, row = {}) {
  const out = exif && typeof exif === 'object' ? { ...exif } : {}
  const rowLat = Number(row?.gps_lat)
  const rowLon = Number(row?.gps_lon)
  const lat = Number.isFinite(rowLat) ? rowLat : Number(out.GPSLatitude ?? out.latitude ?? out.lat)
  const lon = Number.isFinite(rowLon) ? rowLon : Number(out.GPSLongitude ?? out.longitude ?? out.lon)
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    out.gps = { lat, lon }
  } else {
    out.gps = null
  }
  out.datetimeOriginal = out.DateTimeOriginal || out.CreateDate || out.datetimeOriginal || null
  return out
}
