export async function onRequest(context) {
  const { request, env } = context
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
  
  return new Response('API is running', {
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  })
}
