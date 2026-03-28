import { ensureSchema } from '../db/schema.js'

function parseCookie(header) {
  const out = {}
  const raw = String(header || '')
  if (!raw) return out
  const parts = raw.split(';')
  for (const part of parts) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    out[k] = decodeURIComponent(v)
  }
  return out
}

export function newSessionToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${crypto.randomUUID()}${hex}`
}

export function buildAdminCookie(token, maxAgeSec = 8 * 60 * 60) {
  return `admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}; Secure`
}

export function buildClearAdminCookie() {
  return 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure'
}

export async function readAdminSession(request, env) {
  await ensureSchema(env)
  const cookies = parseCookie(request.headers.get('Cookie'))
  const token = cookies.admin_session
  if (!token) return null
  const nowIso = new Date().toISOString()
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(nowIso).run()
  const row = await env.DB.prepare(
    'SELECT token, created_at, expires_at FROM admin_sessions WHERE token = ? AND expires_at > ? LIMIT 1'
  ).bind(token, nowIso).first()
  if (!row) return null
  return { token: row.token, createdAt: row.created_at, expiresAt: row.expires_at }
}

export async function requireAdminSession(request, env) {
  const s = await readAdminSession(request, env)
  return Boolean(s)
}

