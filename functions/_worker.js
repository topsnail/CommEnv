export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    if (pathname === '/api/upload') {
      const mod = await import('./api/upload.js')
      return mod.onRequestPost({ request, env })
    }
    if (pathname.startsWith('/api/evidence/upload')) {
      const mod = await import('./api/evidence/upload.js')
      return mod.onRequestPost({ request, env })
    }
    if (pathname.startsWith('/api/evidence/list')) {
      const mod = await import('./api/evidence/list.js')
      return mod.onRequestGet({ request, env })
    }
    if (pathname === '/api/evidence/stats') {
      const mod = await import('./api/evidence/stats.js')
      return mod.onRequestGet({ request, env })
    }
    if (pathname.startsWith('/api/evidence/verify')) {
      const mod = await import('./api/evidence/verify.js')
      return mod.onRequestPost({ request, env })
    }
    if (/^\/api\/evidence\/[^/]+$/.test(pathname)) {
      const mod = await import('./api/evidence/[id].js')
      const id = pathname.split('/').pop()
      return mod.onRequestGet({ request, env, params: { id } })
    }

    if (pathname.startsWith('/api/admin/login')) {
      const mod = await import('./api/admin/login.js')
      return mod.onRequestPost({ request, env })
    }
    if (pathname.startsWith('/api/admin/logout')) {
      const mod = await import('./api/admin/logout.js')
      return mod.onRequestPost({ request, env })
    }
    if (/^\/api\/admin\/evidence\/[^/]+\/hide$/.test(pathname)) {
      const mod = await import('./api/admin/evidence/[id]/hide.js')
      const id = pathname.split('/')[4]
      return mod.onRequestPost({ request, env, params: { id } })
    }
    if (/^\/api\/admin\/evidence\/[^/]+\/show$/.test(pathname)) {
      const mod = await import('./api/admin/evidence/[id]/show.js')
      const id = pathname.split('/')[4]
      return mod.onRequestPost({ request, env, params: { id } })
    }
    if (pathname.startsWith('/api/admin/evidence')) {
      const mod = await import('./api/admin/evidence.js')
      return mod.onRequestGet({ request, env })
    }
    if (pathname.startsWith('/api/admin/export/excel')) {
      const mod = await import('./api/admin/export/excel.js')
      return mod.onRequestGet({ request, env })
    }
    if (pathname.startsWith('/api/admin/download/all')) {
      const mod = await import('./api/admin/download/all.js')
      if (request.method === 'POST') return mod.onRequestPost({ request, env })
      return mod.onRequestGet({ request, env })
    }

    if (pathname.startsWith('/api/files/')) {
      const mod = await import('./api/files/[file].js')
      const file = pathname.split('/').pop()
      return mod.onRequestGet({ request, env, params: { file } })
    }
    if (/^\/api\/preview\/[^/]+$/.test(pathname)) {
      const mod = await import('./api/preview/[id].js')
      const id = pathname.split('/').pop()
      return mod.onRequestGet({ request, env, params: { id } })
    }

    return new Response('Not Found', { status: 404 })
  },
}

