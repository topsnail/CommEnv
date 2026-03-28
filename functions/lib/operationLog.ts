import type { Env } from "../types";
import type { SessionPayload } from "./jwt";

function clientIp(request: Request): string {
  const h = request.headers;
  const cf = h.get("CF-Connecting-IP")?.trim();
  if (cf) return cf;
  const trueClient = h.get("True-Client-IP")?.trim();
  if (trueClient) return trueClient;
  const xReal = h.get("X-Real-IP")?.trim();
  if (xReal) return xReal;
  const xff = h.get("X-Forwarded-For");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "";
}

export async function writeOperationLog(
  env: Env,
  request: Request,
  user: SessionPayload | null,
  opts: {
    action: string;
    resourceType?: string;
    resourceId?: string | number;
    summary?: string;
    detail?: unknown;
  }
): Promise<void> {
  try {
    const detailJson =
      opts.detail !== undefined
        ? JSON.stringify(opts.detail).slice(0, 8000)
        : null;
    await env.DB.prepare(
      `INSERT INTO operation_logs (user_id, username, action, resource_type, resource_id, summary, detail_json, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user?.sub ?? null,
        user?.username ?? null,
        opts.action,
        opts.resourceType ?? null,
        opts.resourceId != null ? String(opts.resourceId) : null,
        opts.summary ?? null,
        detailJson,
        clientIp(request) || null,
        request.headers.get("User-Agent")?.slice(0, 500) ?? null
      )
      .run();
  } catch (e) {
    console.error("writeOperationLog failed", e);
  }
}
