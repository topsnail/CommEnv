import { ensureSchema } from '../../../db/schema.js'
import { requireAdminSession } from '../../../lib/adminAuth.js'

export async function onRequestGet(context) {
  return handleDownload(context)
}

export async function onRequestPost(context) {
  return handleDownload(context)
}

async function handleDownload(context) {
  const { request, env } = context
  
  const ok = await requireAdminSession(request, env)
  if (!ok) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    await ensureSchema(env)
    const selectedIds = await parseSelectedIds(request)
    const MAX_ZIP_FILES = 800
    const MAX_ZIP_TOTAL_BYTES = 100 * 1024 * 1024 // 100MB
    const evidenceList = selectedIds.length > 0
      ? await env.DB.prepare(
        `SELECT id, category, status, original_key FROM evidence
         WHERE id IN (${selectedIds.map(() => '?').join(',')})
         ORDER BY upload_time DESC`
      ).bind(...selectedIds).all()
      : await env.DB.prepare(
        `SELECT id, category, status, original_key FROM evidence ORDER BY upload_time DESC LIMIT 2000`
      ).all()
    
    const files = []
    let totalBytes = 0
    
    for (const evidence of evidenceList.results || []) {
      if (evidence.status !== 'normal') continue
      const fileName = String(evidence.original_key || '')
      if (!fileName) continue
      const object = await env.R2.get(fileName)
      
      if (object) {
        const buffer = await object.arrayBuffer()
        totalBytes += buffer.byteLength
        if (files.length >= MAX_ZIP_FILES || totalBytes > MAX_ZIP_TOTAL_BYTES) {
          return new Response(JSON.stringify({ error: `下载内容过大，本次限制 ${MAX_ZIP_FILES} 文件 / ${MAX_ZIP_TOTAL_BYTES} 字节` }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        const outExt = String(fileName).toLowerCase().endsWith('.png') ? 'png' : 'jpg'
        files.push({
          // zip slip 防护：去除路径分隔符，避免嵌套目录/回溯路径
          name: sanitizeZipEntryName(`${evidence.category}_${evidence.id}.${outExt}`),
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

async function parseSelectedIds(request) {
  const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  if (request.method === 'POST') {
    try {
      const body = await request.json()
      const ids = Array.isArray(body?.ids) ? body.ids : []
      return ids.map((s) => String(s).trim()).filter(isUuid)
    } catch {
      return []
    }
  }
  const url = new URL(request.url)
  const idsRaw = String(url.searchParams.get('ids') || '')
  return idsRaw.split(',').map((s) => s.trim()).filter(isUuid)
}

function sanitizeZipEntryName(name) {
  let s = String(name || '')
  // 防止写入 zip 内部路径（/ 或 \）
  s = s.replace(/[/\\]/g, '_')
  // 避免生成类似 ../ 的条目
  s = s.replace(/\.\./g, '.._')
  return s
}

async function createZip(files) {
  const encoder = new TextEncoder()
  const parts = []
  const centralParts = []

  // ZIP spec requires CRC-32 +中央目录(central directory).很多解压软件不会容忍“缺中央目录/CRC=0”。
  const CRC32_TABLE = getCrc32Table()
  const utf8Flag = 0x0800
  const compressionMethod = 0 // 0 = store（直接存储已是 jpg/png 的字节，不再二次压缩）
  const versionNeeded = 20 // 2.0

  let localOffset = 0
  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = new Uint8Array(file.buffer)
    const dataLen = dataBytes.length
    const crc = crc32(dataBytes, CRC32_TABLE)

    // Local file header: 30 bytes + filename
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, versionNeeded, true) // version needed to extract
    lv.setUint16(6, utf8Flag, true) // general purpose bit flag (UTF-8 filenames)
    lv.setUint16(8, compressionMethod, true) // compression method
    lv.setUint16(10, 0, true) // last mod file time
    lv.setUint16(12, 0, true) // last mod file date
    lv.setUint32(14, crc, true) // CRC-32
    lv.setUint32(18, dataLen, true) // compressed size
    lv.setUint32(22, dataLen, true) // uncompressed size
    lv.setUint16(26, nameBytes.length, true) // filename length
    lv.setUint16(28, 0, true) // extra field length
    localHeader.set(nameBytes, 30)

    parts.push(localHeader)
    parts.push(dataBytes)

    // Central directory header: 46 bytes + filename
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true) // signature
    cv.setUint16(4, versionNeeded, true) // version made by
    cv.setUint16(6, versionNeeded, true) // version needed to extract
    cv.setUint16(8, utf8Flag, true) // flags
    cv.setUint16(10, compressionMethod, true)
    cv.setUint16(12, 0, true) // last mod file time
    cv.setUint16(14, 0, true) // last mod file date
    cv.setUint32(16, crc, true)
    cv.setUint32(20, dataLen, true)
    cv.setUint32(24, dataLen, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true) // extra length
    cv.setUint16(32, 0, true) // file comment length
    cv.setUint16(34, 0, true) // disk number start
    cv.setUint16(36, 0, true) // internal file attributes
    cv.setUint32(38, 0, true) // external file attributes
    cv.setUint32(42, localOffset, true) // relative offset of local header
    centralHeader.set(nameBytes, 46)
    centralParts.push(centralHeader)

    localOffset += localHeader.length + dataLen
  }

  const centralDirStart = localOffset
  const centralDirSize = centralParts.reduce((sum, p) => sum + p.length, 0)

  // End of central directory record: 22 bytes
  const endRecord = new Uint8Array(22)
  const ev = new DataView(endRecord.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true) // disk number
  ev.setUint16(6, 0, true) // disk where central directory starts
  ev.setUint16(8, files.length, true) // number of entries on this disk
  ev.setUint16(10, files.length, true) // total number of entries
  ev.setUint32(12, centralDirSize, true)
  ev.setUint32(16, centralDirStart, true)
  // rest is 0

  parts.push(...centralParts)
  parts.push(endRecord)

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let position = 0
  for (const part of parts) {
    result.set(part, position)
    position += part.length
  }

  return result.buffer
}

let __crc32Table = null
function getCrc32Table() {
  if (__crc32Table) return __crc32Table
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  __crc32Table = table
  return __crc32Table
}

function crc32(dataBytes, table) {
  let crc = 0xffffffff
  for (let i = 0; i < dataBytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ dataBytes[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}
