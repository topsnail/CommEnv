import bcrypt from 'bcryptjs'
import { buildAdminCookie, newSessionToken } from '../../lib/adminAuth.js'
import { ensureSchema } from '../../db/schema.js'

async function matchesAnyPassword(inputPassword, hashedList, plainList) {
  const password = String(inputPassword)
  for (const h of hashedList) {
    if (!h || typeof h !== 'string') continue
    if (await bcrypt.compare(password, String(h))) return true
  }
  for (const p of plainList) {
    if (!p || typeof p !== 'string') continue
    if (password === String(p)) return true
  }
  return false
}

export async function onRequestPost(context) {
  const { request, env } = context
  
  try {
    await ensureSchema(env)
    const { password } = await request.json()
    
    if (!password) {
      return new Response(JSON.stringify({ error: '请输入密码' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const hashedPasswords = [
      env.ADMIN_PASSWORD_HASH,
      env.ADMIN_PASSWORD_HASH_2,
    ].filter((v) => typeof v === 'string' && v.length > 0)
    const plainPasswordsRaw = [
      env.ADMIN_PASSWORD,
      env.ADMIN_PASSWORD_2,
    ].filter((v) => typeof v === 'string' && v.length > 0)

    const hasHashed = hashedPasswords.length > 0
    const plainPasswords = hasHashed ? [] : plainPasswordsRaw

    if (!hasHashed && plainPasswords.length === 0) {
      return new Response(JSON.stringify({ error: '服务器未配置管理员密码' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isPasswordMatch = await matchesAnyPassword(password, hashedPasswords, plainPasswords)

    if (!isPasswordMatch) {
      return new Response(JSON.stringify({ error: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const token = newSessionToken()
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000)
    await env.DB.prepare(
      'INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)'
    ).bind(token, createdAt.toISOString(), expiresAt.toISOString()).run()
    
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildAdminCookie(token),
      }
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return new Response(JSON.stringify({
      error: '登录失败',
      message: String(error?.message || 'unknown error'),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
