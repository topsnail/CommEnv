import { ensureSchema } from '../../db/schema.js'

export async function onRequestGet(context) {
  const { env, params } = context
  
  try {
    const evidenceId = String(params.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evidenceId)) {
      return new Response(JSON.stringify({ error: '证据不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    await ensureSchema(env)
    const row = await env.DB.prepare(
      `SELECT id, category, description, status, upload_time, hash_sha256, original_key,
              make, model, datetime_original, image_width, image_height, gps_lat, gps_lon
       FROM evidence WHERE id = ? LIMIT 1`
    ).bind(evidenceId).first()

    if (!row) {
      return new Response(JSON.stringify({ error: '证据不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (row.status !== 'normal') {
      return new Response(JSON.stringify({ error: '证据已被隐藏' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const publicEvidence = {
      id: row.id,
      type: 'image',
      category: row.category,
      description: row.description || '',
      timestamp: row.upload_time,
      hash: row.hash_sha256,
      // 与 evidence/list 一致：url / previewUrl 均指向 /api/preview（直出 R2 original，不压缩）
      url: `/api/preview/${row.id}?kind=small`,
      previewUrl: `/api/preview/${row.id}?kind=preview`,
      thumbUrl: `/api/preview/${row.id}?kind=small`,
      exif: {
        make: row.make || null,
        model: row.model || null,
        datetimeOriginal: row.datetime_original || null,
        imageWidth: Number.isFinite(Number(row.image_width)) ? Number(row.image_width) : null,
        imageHeight: Number.isFinite(Number(row.image_height)) ? Number(row.image_height) : null,
        hasGps:
          Number.isFinite(Number(row.gps_lat)) && Number.isFinite(Number(row.gps_lon)),
        gps: (Number.isFinite(Number(row.gps_lat)) && Number.isFinite(Number(row.gps_lon)))
          ? { lat: Number(row.gps_lat), lon: Number(row.gps_lon) }
          : null,
      },
      hidden: false,
    }

    return new Response(JSON.stringify({
      success: true,
      data: publicEvidence
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Detail error:', error)
    return new Response(JSON.stringify({ error: '获取详情失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
