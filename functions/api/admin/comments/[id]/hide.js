export async function onRequestPost(context) {
  return new Response(JSON.stringify({ error: '留言功能已移除' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  })
}
