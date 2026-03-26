export async function onRequestGet(context) {
  const { request, env } = context
  
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const token = authHeader.substring(7)
  const tokenData = await env.KV.get(`admin:token:${token}`)
  if (!tokenData) {
    return new Response(JSON.stringify({ error: 'token无效' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    const evidenceList = await getAllEvidence(env)
    
    const files = []
    
    for (const evidence of evidenceList) {
      if (evidence.hidden) continue

      const fileName = evidence.fileName || `${evidence.id}.${evidence.type === 'image' ? 'jpg' : 'mp4'}`
      const object = await env.R2.get(fileName)
      
      if (object) {
        const buffer = await object.arrayBuffer()
        const outExt = evidence.fileExt || (evidence.type === 'image' ? 'jpg' : 'mp4')
        files.push({
          name: `${evidence.category}_${evidence.id}.${outExt}`,
          buffer
        })
      }
    }
    
    if (files.length === 0) {
      return new Response(JSON.stringify({ error: '没有可下载的文件' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
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
    return new Response(JSON.stringify({ error: '下载失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
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
