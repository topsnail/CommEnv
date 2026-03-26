function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function isAdminTokenValid(request, env) {
  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return false
  const token = authHeader.substring(7)
  if (!token) return false
  const tokenData = await env.KV.get(`admin:token:${token}`)
  return Boolean(tokenData)
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const form = await request.formData()
    const evidenceId = String(form.get('evidenceId') || '').trim()
    const file = form.get('file')
    if (!evidenceId) return json({ error: '缺少 evidenceId' }, 400)
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: '缺少文件 file' }, 400)

    const evidenceRaw = await env.KV.get(`evidence:${evidenceId}`)
    if (!evidenceRaw) return json({ error: '证据不存在' }, 404)
    const evidence = JSON.parse(evidenceRaw)

    // 若证据已隐藏，仅管理员可复核（避免对外探测隐藏内容）
    if (evidence.hidden) {
      const ok = await isAdminTokenValid(request, env)
      if (!ok) return json({ error: '证据已隐藏' }, 403)
    }

    const buf = await file.arrayBuffer()
    const computed = await sha256Hex(buf)

    const matchStored = Boolean(evidence.hash && computed === evidence.hash)
    const matchOriginal = Boolean(evidence.originalHash && computed === evidence.originalHash)

    return json({
      success: true,
      evidenceId,
      computedSha256: computed,
      storedSha256: evidence.hash || '',
      originalSha256: evidence.originalHash || '',
      match: matchStored || matchOriginal,
      matchType: matchStored ? 'stored' : matchOriginal ? 'original' : 'none',
      watermarkMode: evidence.watermarkMode || '',
      fileName: evidence.fileName || '',
      fileMimeType: evidence.fileMimeType || '',
    })
  } catch (e) {
    console.error('Verify error:', e)
    return json({ error: '复核失败' }, 500)
  }
}

