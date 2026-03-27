export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

export function newId(prefix = '') {
  // evidence/log 都可用 UUID v4（3.3.MD 要求）
  return prefix + crypto.randomUUID()
}

export async function sha256Hex(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function roundGps3(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 1000) / 1000
}

