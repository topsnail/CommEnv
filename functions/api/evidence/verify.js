import { ensureSchema } from '../../db/schema.js'
import { requireAdminSession } from '../../lib/adminAuth.js'
import { sha256Hex } from '../../db/utils.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestPost(context) {
  const { request, env } = context
  try {
    await ensureSchema(env)
    const form = await request.formData()
    const evidenceId = String(form.get('evidenceId') || '').trim()
    const file = form.get('file')

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evidenceId)) {
      return json({ error: 'evidenceId 不合法' }, 400)
    }
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ error: '缺少文件 file' }, 400)
    }
    if (Number(file.size || 0) > 10 * 1024 * 1024) {
      return json({ error: '文件过大' }, 400)
    }

    const row = await env.DB.prepare(
      'SELECT status, hash_sha256, original_mime, original_key FROM evidence WHERE id = ? LIMIT 1'
    ).bind(evidenceId).first()
    if (!row) return json({ error: '证据不存在' }, 404)

    if (row.status !== 'normal') {
      const ok = await requireAdminSession(request, env)
      if (!ok) return json({ error: '证据已隐藏' }, 403)
    }

    const buf = await file.arrayBuffer()
    const computed = await sha256Hex(buf)
    const match = computed === row.hash_sha256

    // 不返回 original_key，避免暴露 R2 路径；原图仅管理后台「打包下载」流出
    return json({
      success: true,
      evidenceId,
      computedSha256: computed,
      storedSha256: row.hash_sha256 || '',
      match,
      fileMimeType: row.original_mime || '',
    })
  } catch (e) {
    console.error('Verify error:', e)
    return json({ error: '复核失败' }, 500)
  }
}

