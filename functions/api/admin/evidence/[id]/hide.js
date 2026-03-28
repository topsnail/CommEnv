import { ensureSchema } from '../../../../db/schema.js'
import { json, newId } from '../../../../db/utils.js'
import { requireAdminSession } from '../../../../lib/adminAuth.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  
  const ok = await requireAdminSession(request, env)
  if (!ok) return json({ error: '未授权' }, 401)
  
  try {
    const evidenceId = String(params.id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evidenceId)) {
      return json({ error: 'evidenceId 不合法' }, 400)
    }
    await ensureSchema(env)
    const row = await env.DB.prepare('SELECT status FROM evidence WHERE id = ? LIMIT 1').bind(evidenceId).first()
    if (!row) return json({ error: '证据不存在' }, 404)
    if (row.status !== 'normal') {
      return json({ success: true, message: '已隐藏' })
    }
    const now = new Date().toISOString()
    await env.DB.prepare('UPDATE evidence SET status = ? WHERE id = ?').bind('hidden', evidenceId).run()
    await env.DB.prepare(
      'INSERT INTO admin_logs (id, action, evidence_id, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(newId(), 'hide', evidenceId, row.status, 'hidden', now).run()
    return json({ success: true, message: '已隐藏' })
    
  } catch (error) {
    console.error('Hide error:', error)
    return json({ error: '操作失败' }, 500)
  }
}
