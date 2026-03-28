/**
 * 全局响应头：安全策略与静态资源缓存（借鉴 SmartWMS）
 * 适用于 Cloudflare Pages Functions
 */
function withSecurityHeaders(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  // CSP：当前仅同源 + data/blob。若前端直连第三方 API/CDN/埋点，请在此扩展：
  // - connect-src：fetch/XHR/WebSocket 目标域
  // - img-src：外链图片、统计像素等
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  // 仅 HTTPS 下发 HSTS；本地 http://127.0.0.1 不应带此头，避免个别环境异常缓存行为
  const url = new URL(req.url);
  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function withCacheHeaders(req: Request, res: Response): Response {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const headers = new Headers(res.headers);

  if (pathname === "/" || pathname.endsWith(".html")) {
    headers.set("Cache-Control", "no-store");
  }

  if (pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const onRequest: PagesFunction = async (context) => {
  const res = await context.next();
  return withSecurityHeaders(context.request, withCacheHeaders(context.request, res));
};
