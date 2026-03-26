export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    }
    
    if (url.pathname.startsWith('/api/evidence/upload')) {
      return handleUpload(request, env)
    } else if (url.pathname.startsWith('/api/evidence/list')) {
      return handleList(request, env)
    } else if (url.pathname.match(/^\/api\/evidence\/[^\/]+$/)) {
      return handleDetail(request, env, url.pathname.split('/').pop())
    } else if (url.pathname.startsWith('/api/admin/login')) {
      return handleAdminLogin(request, env)
    } else if (url.pathname.startsWith('/api/admin/evidence')) {
      return handleAdminEvidence(request, env, url)
    } else if (url.pathname.startsWith('/api/admin/export/excel')) {
      return handleExportExcel(request, env)
    } else if (url.pathname.startsWith('/api/admin/download/all')) {
      return handleDownloadAll(request, env)
    } else if (url.pathname.startsWith('/api/files/')) {
      return handleFile(request, env, url.pathname.split('/').pop())
    }
    
    return new Response('Not Found', { status: 404 })
  }
}

async function handleUpload(request, env) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files')
    const category = formData.get('category')
    const description = formData.get('description')
    const building = formData.get('building')
    const timestamp = formData.get('timestamp')
    const location = formData.get('location')
    
    if (!files || files.length === 0) {
      return jsonResponse({ error: '请选择文件' }, 400)
    }
    
    if (!category) {
      return jsonResponse({ error: '请选择分类' }, 400)
    }
    
    const evidenceList = []
    
    for (const file of files) {
      const evidenceId = generateEvidenceId()
      const fileExt = file.name.split('.').pop()
      const fileName = `${evidenceId}.${fileExt}`
      
      const fileBuffer = await file.arrayBuffer()
      const hash = await generateHash(fileBuffer)
      
      const watermarkedBuffer = await addWatermark(fileBuffer, fileExt, timestamp, location, evidenceId)
      
      await env.R2.put(fileName, watermarkedBuffer, {
        httpMetadata: {
          contentType: file.type
        }
      })
      
      const evidence = {
        id: evidenceId,
        type: file.type.startsWith('image') ? 'image' : 'video',
        category,
        description,
        building,
        timestamp,
        location,
        hash,
        url: `/api/files/${fileName}`,
        hidden: false,
        createdAt: new Date().toISOString()
      }
      
      await env.KV.put(`evidence:${evidenceId}`, JSON.stringify(evidence))
      await env.KV.put(`evidence:byTime:${Date.now()}`, evidenceId)
      
      evidenceList.push(evidence)
    }
    
    return jsonResponse({ 
      success: true, 
      data: evidenceList,
      message: '上传成功'
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return jsonResponse({ error: '上传失败' }, 500)
  }
}

async function handleList(request, env) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const page = parseInt(url.searchParams.get('page')) || 1
  const pageSize = 20
  
  try {
    const { list, hasMore } = await getEvidenceList(env, category, page, pageSize)
    return jsonResponse({ success: true, data: list, hasMore })
  } catch (error) {
    console.error('List error:', error)
    return jsonResponse({ error: '获取列表失败' }, 500)
  }
}

async function handleDetail(request, env, id) {
  try {
    const evidenceData = await env.KV.get(`evidence:${id}`)
    
    if (!evidenceData) {
      return jsonResponse({ error: '证据不存在' }, 404)
    }
    
    const evidence = JSON.parse(evidenceData)
    
    if (evidence.hidden) {
      return jsonResponse({ error: '证据已被隐藏' }, 403)
    }
    
    return jsonResponse({ success: true, data: evidence })
  } catch (error) {
    console.error('Detail error:', error)
    return jsonResponse({ error: '获取详情失败' }, 500)
  }
}

async function handleAdminLogin(request, env) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return jsonResponse({ error: '请输入密码' }, 400)
    }
    
    if (password !== env.ADMIN_PASSWORD) {
      return jsonResponse({ error: '密码错误' }, 401)
    }
    
    const token = generateToken()
    await env.KV.put(`admin:token:${token}`, Date.now().toString(), {
      expirationTtl: 86400
    })
    
    return jsonResponse({ success: true, token })
  } catch (error) {
    console.error('Login error:', error)
    return jsonResponse({ error: '登录失败' }, 500)
  }
}

async function handleAdminEvidence(request, env, url) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: '未授权' }, 401)
  }
  
  const token = authHeader.substring(7)
  const tokenData = await env.KV.get(`admin:token:${token}`)
  if (!tokenData) {
    return jsonResponse({ error: 'token无效' }, 401)
  }
  
  const category = url.searchParams.get('category')
  const page = parseInt(url.searchParams.get('page')) || 1
  const pageSize = 20
  
  try {
    const { list, stats, hasMore } = await getAdminEvidenceList(env, category, page, pageSize)
    return jsonResponse({ success: true, data: list, stats, hasMore })
  } catch (error) {
    console.error('Admin list error:', error)
    return jsonResponse({ error: '获取列表失败' }, 500)
  }
}

async function handleExportExcel(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: '未授权' }, 401)
  }
  
  const token = authHeader.substring(7)
  const tokenData = await env.KV.get(`admin:token:${token}`)
  if (!tokenData) {
    return jsonResponse({ error: 'token无效' }, 401)
  }
  
  try {
    const evidenceList = await getAllEvidence(env)
    
    let csv = '证据ID,类型,分类,楼栋,上传时间,定位,描述,哈希值,状态\n'
    
    for (const evidence of evidenceList) {
      const categoryNames = {
        corridor: '楼道/电梯卫生',
        garbage: '垃圾堆积',
        greenery: '绿化缺失',
        facility: '设施损坏',
        fire: '消防通道堵塞',
        lighting: '照明/监控缺失',
        other: '其他问题'
      }
      
      const row = [
        evidence.id,
        evidence.type === 'image' ? '图片' : '视频',
        categoryNames[evidence.category] || '未知',
        evidence.building || '',
        evidence.timestamp,
        evidence.location,
        evidence.description || '',
        evidence.hash,
        evidence.hidden ? '已隐藏' : '正常'
      ].map(field => `"${(field || '').replace(/"/g, '""')}"`).join(',')
      
      csv += row + '\n'
    }
    
    const bom = '\uFEFF'
    const buffer = new TextEncoder().encode(bom + csv)
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="证据清单_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return jsonResponse({ error: '导出失败' }, 500)
  }
}

async function handleDownloadAll(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: '未授权' }, 401)
  }
  
  const token = authHeader.substring(7)
  const tokenData = await env.KV.get(`admin:token:${token}`)
  if (!tokenData) {
    return jsonResponse({ error: 'token无效' }, 401)
  }
  
  try {
    const evidenceList = await getAllEvidence(env)
    
    const files = []
    
    for (const evidence of evidenceList) {
      if (evidence.hidden) continue
      
      const fileName = `${evidence.id}.${evidence.type === 'image' ? 'jpg' : 'mp4'}`
      const object = await env.R2.get(fileName)
      
      if (object) {
        const buffer = await object.arrayBuffer()
        files.push({
          name: `${evidence.category}_${evidence.id}.${evidence.type === 'image' ? 'jpg' : 'mp4'}`,
          buffer
        })
      }
    }
    
    if (files.length === 0) {
      return jsonResponse({ error: '没有可下载的文件' }, 404)
    }
    
    const zipBuffer = await createZip(files)
    
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="证据文件_${new Date().toISOString().slice(0, 10)}.zip"`
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return jsonResponse({ error: '下载失败' }, 500)
  }
}

async function handleFile(request, env, fileName) {
  try {
    const object = await env.R2.get(fileName)
    
    if (!object) {
      return new Response('文件不存在', { status: 404 })
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    
    return new Response(object.body, { headers })
  } catch (error) {
    console.error('File access error:', error)
    return new Response('获取文件失败', { status: 500 })
  }
}

function generateEvidenceId() {
  return `EV${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

async function generateHash(buffer) {
  const msgBuffer = new TextEncoder().encode(new Uint8Array(buffer))
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function addWatermark(buffer, ext, timestamp, location, evidenceId) {
  if (ext === 'mp4') {
    return buffer
  }
  
  const imageBitmap = await createImageBitmap(new Blob([buffer]))
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')
  
  ctx.drawImage(imageBitmap, 0, 0)
  
  const fontSize = Math.max(16, Math.floor(imageBitmap.width / 30))
  ctx.font = `${fontSize}px Arial`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.lineWidth = 2
  
  const date = new Date(timestamp)
  const dateStr = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const watermarkText = `${dateStr} | ${location} | ${evidenceId.slice(-8)}`
  
  const textMetrics = ctx.measureText(watermarkText)
  const padding = 10
  const x = imageBitmap.width - textMetrics.width - padding
  const y = imageBitmap.height - padding
  
  ctx.strokeText(watermarkText, x, y)
  ctx.fillText(watermarkText, x, y)
  
  const watermarkedBlob = await canvas.convertToBlob()
  return await watermarkedBlob.arrayBuffer()
}

async function getEvidenceList(env, category, page, pageSize) {
  const keys = []
  let cursor = null
  
  do {
    const result = await env.KV.list({
      prefix: 'evidence:byTime:',
      limit: 1000,
      cursor
    })
    keys.push(...result.keys.map(k => k.name))
    cursor = result.cursor
  } while (cursor)
  
  keys.reverse()
  
  const evidenceList = []
  let count = 0
  const start = (page - 1) * pageSize
  
  for (const key of keys) {
    const evidenceId = await env.KV.get(key)
    if (!evidenceId) continue
    
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) continue
    
    const evidence = JSON.parse(evidenceData)
    
    if (evidence.hidden) continue
    if (category && evidence.category !== category) continue
    
    count++
    if (count > start && evidenceList.length < pageSize) {
      evidenceList.push(evidence)
    }
    
    if (evidenceList.length >= pageSize) break
  }
  
  const hasMore = count > start + pageSize
  
  return { list: evidenceList, hasMore }
}

async function getAdminEvidenceList(env, category, page, pageSize) {
  const keys = []
  let cursor = null
  
  do {
    const result = await env.KV.list({
      prefix: 'evidence:byTime:',
      limit: 1000,
      cursor
    })
    keys.push(...result.keys.map(k => k.name))
    cursor = result.cursor
  } while (cursor)
  
  keys.reverse()
  
  const evidenceList = []
  let count = 0
  const start = (page - 1) * pageSize
  
  const stats = {
    total: 0,
    normal: 0,
    hidden: 0,
    today: 0
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (const key of keys) {
    const evidenceId = await env.KV.get(key)
    if (!evidenceId) continue
    
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) continue
    
    const evidence = JSON.parse(evidenceData)
    
    stats.total++
    if (evidence.hidden) stats.hidden++
    else stats.normal++
    
    const evidenceDate = new Date(evidence.timestamp)
    if (evidenceDate >= today) stats.today++
    
    if (category && evidence.category !== category) continue
    
    count++
    if (count > start && evidenceList.length < pageSize) {
      evidenceList.push(evidence)
    }
    
    if (evidenceList.length >= pageSize) break
  }
  
  const hasMore = count > start + pageSize
  
  return { list: evidenceList, stats, hasMore }
}

async function getAllEvidence(env) {
  const keys = []
  let cursor = null
  
  do {
    const result = await env.KV.list({
      prefix: 'evidence:byTime:',
      limit: 1000,
      cursor
    })
    keys.push(...result.keys.map(k => k.name))
    cursor = result.cursor
  } while (cursor)
  
  keys.reverse()
  
  const evidenceList = []
  
  for (const key of keys) {
    const evidenceId = await env.KV.get(key)
    if (!evidenceId) continue
    
    const evidenceData = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceData) continue
    
    evidenceList.push(JSON.parse(evidenceData))
  }
  
  return evidenceList
}

async function createZip(files) {
  const encoder = new TextEncoder()
  const parts = []
  
  let offset = 0
  
  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const data = new Uint8Array(file.buffer)
    
    const header = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(header.buffer)
    
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 0x000a, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint32(14, 0, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)
    
    header.set(nameBytes, 30)
    
    parts.push(header)
    parts.push(data)
    offset += header.length + data.length
  }
  
  const centralDir = new Uint8Array(22)
  const cdView = new DataView(centralDir.buffer)
  cdView.setUint32(0, 0x06054b50, true)
  cdView.setUint16(4, 0, true)
  cdView.setUint16(6, 0, true)
  cdView.setUint16(8, files.length, true)
  cdView.setUint16(10, files.length, true)
  cdView.setUint32(12, offset, true)
  cdView.setUint32(16, 0, true)
  
  parts.push(centralDir)
  
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  
  let position = 0
  for (const part of parts) {
    result.set(part, position)
    position += part.length
  }
  
  return result.buffer
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
