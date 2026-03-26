export async function onRequestPost(context) {
  const { request, env } = context
  
  try {
    const { password } = await request.json()
    
    if (!password) {
      return new Response(JSON.stringify({ error: '请输入密码' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (password !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const token = generateToken()
    await env.KV.put(`admin:token:${token}`, Date.now().toString(), {
      expirationTtl: 86400
    })
    
    return new Response(JSON.stringify({
      success: true,
      token
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return new Response(JSON.stringify({ error: '登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function generateToken() {
  return 'TK' + Date.now() + Math.random().toString(36).substr(2, 32)
}
