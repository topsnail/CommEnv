// 处理 path 格式：/api/media/media/image/xxx.png
import type { Env } from "../../../../types";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const part1 = (params.part1 as string) || "";
  const part2 = (params.part2 as string) || "";
  const part3 = (params.part3 as string) || "";
  const key = `${part1}/${part2}/${part3}`;

  if (!key || key.includes("..") || key.startsWith("/")) {
    return new Response("无效路径", { status: 400 });
  }

  try {
    const object = await env.R2_BUCKET.get(key);

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
