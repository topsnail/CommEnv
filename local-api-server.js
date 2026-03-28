import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 8787

// 模拟数据存储
const evidenceStore = []
let evidenceId = 1

const server = http.createServer(async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  console.log(`${req.method} ${pathname}`)

  try {
    // 证据列表
    if (pathname === '/api/evidence/list' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        data: evidenceStore,
        hasMore: false
      }))
      return
    }

    // 上传接口
    if (pathname === '/api/upload' && req.method === 'POST') {
      // 模拟上传处理
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks)

      // 解析 multipart/form-data（简化处理）
      const boundary = req.headers['content-type']?.split('boundary=')[1]
      if (boundary) {
        const parts = body.toString().split(`--${boundary}`)
        let category = ''
        let description = ''

        for (const part of parts) {
          if (part.includes('name="category"')) {
            category = part.split('\r\n\r\n')[1]?.split('\r\n')[0] || ''
          }
          if (part.includes('name="description"')) {
            description = part.split('\r\n\r\n')[1]?.split('\r\n')[0] || ''
          }
        }

        const id = `test-${evidenceId++}`
        const evidence = {
          id,
          type: 'image',
          category,
          description,
          timestamp: new Date().toISOString(),
          hash: 'mock-hash',
          url: `/api/preview/${id}?kind=small`,
          previewUrl: `/api/preview/${id}?kind=preview`,
          exif: {
            make: null,
            model: null,
            datetimeOriginal: null,
            imageWidth: null,
            imageHeight: null,
            hasGps: false,
            gps: null
          },
          hidden: false
        }

        evidenceStore.push(evidence)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          data: [evidence],
          message: '上传成功'
        }))
        return
      }

      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid request' }))
      return
    }

    // 预览图接口
    if (pathname.startsWith('/api/preview/') && req.method === 'GET') {
      const id = pathname.split('/')[3]
      const kind = url.searchParams.get('kind') || 'thumb'

      // 返回一个占位图
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#f3f4f6"/>
        <text x="200" y="150" font-size="14" text-anchor="middle" fill="#9ca3af">预览图 ${id} (${kind})</text>
      </svg>`

      res.writeHead(200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=604800'
      })
      res.end(placeholderSvg)
      return
    }

    // 统计接口
    if (pathname === '/api/evidence/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        data: {
          total: evidenceStore.length,
          byCategory: {}
        }
      }))
      return
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))

  } catch (error) {
    console.error('Error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

server.listen(PORT, () => {
  console.log(`Local API server running at http://localhost:${PORT}`)
  console.log('Available endpoints:')
  console.log('  GET  /api/evidence/list')
  console.log('  POST /api/upload')
  console.log('  GET  /api/preview/:id?kind=small|preview')
  console.log('  GET  /api/evidence/stats')
})
