export async function onRequestGet() {
  return new Response(JSON.stringify({ error: '留言功能已移除' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestPost() {
  return new Response(JSON.stringify({ error: '留言功能已移除' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  })
}
