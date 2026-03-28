// R2 文件访问代理（支持 query key 与 path 两种格式）
import type { Env } from "../../types";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. 优先从 query 取 key
  let key = url.searchParams.get("key");
  // 2. 若无 query，从 path 取：/api/media/media/image/xxx.png → media/image/xxx.png
  if (!key && url.pathname.startsWith("/api/media/")) {
    const pathKey = url.pathname.slice("/api/media/".length);
    if (pathKey) key = decodeURIComponent(pathKey);
  }

  const trimmed = key?.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.startsWith("/")) {
    return new Response("无效参数 key", { status: 400 });
  }

  try {
    const object = await env.R2_BUCKET.get(trimmed);

    if (!object) {
      return new Response("文件不存在", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag || "");

    return new Response(object.body, {
      headers,
    });
  } catch (e: any) {
    return new Response(`读取文件失败: ${e?.message}`, { status: 500 });
  }
};
