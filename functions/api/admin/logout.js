import { buildClearAdminCookie, readAdminSession } from '../../lib/adminAuth.js'
import { ensureSchema } from '../../db/schema.js'

export async function onRequestPost(context) {
  const { request, env } = context
  try {
    await ensureSchema(env)
    const session = await readAdminSession(request, env)
    if (session) {
      await env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(session.token).run()
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildClearAdminCookie(),
      },
    })
  } catch (e) {
    console.error('Logout error:', e)
    return new Response(JSON.stringify({ error: '退出失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

