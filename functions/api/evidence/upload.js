export async function onRequestPost(context) {
  const { request, env } = context
  
  try {
    const formData = await request.formData()
    const files = formData.getAll('files')
    const category = formData.get('category')
    const description = formData.get('description')
    const building = formData.get('building')
    const timestamp = formData.get('timestamp')
    const location = formData.get('location')
    
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: '请选择文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (!category) {
      return new Response(JSON.stringify({ error: '请选择分类' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const evidenceList = []
    const communityName = env.COMMUNITY_NAME || '小区'
    
    for (const file of files) {
      const validation = validateUploadFile(file)
      if (!validation.ok) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const evidenceId = generateEvidenceId()
      const uploadTs = timestamp || new Date().toISOString()
      const watermarkText = buildWatermarkText(uploadTs, communityName, evidenceId)
      
      const fileBuffer = await file.arrayBuffer()
      const originalHash = await generateHash(fileBuffer)
      const transformed = await addWatermark(fileBuffer, file, uploadTs, communityName, evidenceId, location)
      const hash = await generateHash(transformed.buffer)
      const fileName = `${evidenceId}.${transformed.ext}`
      
      await env.R2.put(fileName, transformed.buffer, {
        httpMetadata: {
          contentType: transformed.contentType
        },
        customMetadata: {
          evidenceId,
          watermarkText,
          isVideoWatermarkOverlay: transformed.type === 'video' ? '1' : '0'
        },
      })
      
      const evidence = {
        id: evidenceId,
        type: transformed.type,
        category,
        description,
        building,
        timestamp: uploadTs,
        location,
        // hash：以“最终入库文件内容”为准（含图片水印）
        hash,
        // originalHash：以“用户原始上传内容”为准（不含图片水印）
        originalHash,
        url: `/api/files/${fileName}`,
        fileName,
        fileExt: transformed.ext,
        fileMimeType: transformed.contentType,
        watermarkText,
        watermarkMode: transformed.type === 'video' ? 'overlay' : 'embedded',
        hidden: false,
        createdAt: new Date().toISOString()
      }
      
      await env.KV.put(`evidence:${evidenceId}`, JSON.stringify(evidence))
      await env.KV.put(`evidence:byTime:${Date.now()}`, evidenceId)
      
      evidenceList.push(evidence)
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: evidenceList,
      message: '上传成功'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ error: '上传失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function validateUploadFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  const size = Number(file?.size || 0)
  const isImage = type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png' || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')
  const isVideo = type === 'video/mp4' || name.endsWith('.mp4')

  if (!isImage && !isVideo) {
    return { ok: false, error: '仅支持 jpg、jpeg、png、mp4 格式' }
  }
  if (isImage && size > 10 * 1024 * 1024) {
    return { ok: false, error: '图片大小不能超过10MB' }
  }
  if (isVideo && size > 50 * 1024 * 1024) {
    return { ok: false, error: '视频大小不能超过50MB' }
  }
  return { ok: true }
}

function generateEvidenceId() {
  return `EV${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

async function generateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function buildWatermarkText(timestamp, communityName, evidenceId) {
  const date = new Date(timestamp || Date.now())
  const dateStr = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${dateStr} | ${communityName} | ${evidenceId}`
}

async function addWatermark(buffer, file, timestamp, communityName, evidenceId, location) {
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || ''
  const isVideo = file.type === 'video/mp4' || ext === 'mp4'
  if (isVideo) {
    // Worker 侧不进行视频转码烧录，采用前端播放叠加方式显示水印文本。
    return {
      buffer,
      ext: 'mp4',
      contentType: 'video/mp4',
      type: 'video',
    }
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
  
  const watermarkText = buildWatermarkText(timestamp, communityName, evidenceId)
  
  const textMetrics = ctx.measureText(watermarkText)
  const padding = 10
  const x = imageBitmap.width - textMetrics.width - padding
  const y = imageBitmap.height - padding
  
  ctx.strokeText(watermarkText, x, y)
  ctx.fillText(watermarkText, x, y)
  
  // 统一输出 jpeg，避免后续打包/读取时扩展名与内容类型不一致
  const watermarkedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  return {
    buffer: await watermarkedBlob.arrayBuffer(),
    ext: 'jpg',
    contentType: 'image/jpeg',
    type: 'image',
  }
}
