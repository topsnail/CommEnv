import { ensureSchema } from '../../db/schema.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  
  const category = url.searchParams.get('category')
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const pageSize = 20
  
  try {
    await ensureSchema(env)
    const { list, hasMore } = await getEvidenceList(env, category, page, pageSize)
    
    return new Response(JSON.stringify({
      success: true,
      data: list,
      hasMore
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('List error:', error)
    return new Response(JSON.stringify({ error: '获取列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function getEvidenceList(env, category, page, pageSize) {
  const offset = (page - 1) * pageSize
  const where = category ? 'WHERE status = ? AND category = ?' : 'WHERE status = ?'
  const binds = category ? ['normal', category, pageSize, offset] : ['normal', pageSize, offset]

  const sql = `
    SELECT id, category, description, upload_time, hash_sha256, original_key,
           make, model, datetime_original, image_width, image_height,
           gps_lat, gps_lon
    FROM evidence
    ${where}
    ORDER BY upload_time DESC
    LIMIT ? OFFSET ?
  `
  const rows = await env.DB.prepare(sql).bind(...binds).all()
  const list = (rows.results || []).map((r) => ({
    id: r.id,
    type: 'image',
    category: r.category,
    description: r.description || '',
    timestamp: r.upload_time,
    hash: r.hash_sha256,
    url: `/api/preview/${r.id}?kind=small`,
    previewUrl: `/api/preview/${r.id}?kind=preview`,
    exif: {
      make: r.make || null,
      model: r.model || null,
      datetimeOriginal: r.datetime_original || null,
      imageWidth: Number.isFinite(Number(r.image_width)) ? Number(r.image_width) : null,
      imageHeight: Number.isFinite(Number(r.image_height)) ? Number(r.image_height) : null,
      hasGps: Number.isFinite(Number(r.gps_lat)) && Number.isFinite(Number(r.gps_lon)),
      gps: (Number.isFinite(Number(r.gps_lat)) && Number.isFinite(Number(r.gps_lon)))
        ? { lat: Number(r.gps_lat), lon: Number(r.gps_lon) }
        : null,
    },
    hidden: false,
  }))

  const countSql = `SELECT COUNT(*) AS c FROM evidence ${where}`
  const countRow = category
    ? await env.DB.prepare(countSql).bind('normal', category).first()
    : await env.DB.prepare(countSql).bind('normal').first()
  const total = Number(countRow?.c || 0)

  return { list, hasMore: offset + list.length < total }
}
