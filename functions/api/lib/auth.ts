import type { Env } from "../../types";
import { verifySessionJwt, type SessionPayload } from "../../lib/jwt";

export async function requireBearerUser(
  request: Request,
  env: Env
): Promise<{ ok: true; user: SessionPayload } | { ok: false; message: string; status: number }> {
  const secret = String(env.JWT_SECRET ?? "").trim();
  if (!secret) return { ok: false, message: "JWT_SECRET 未配置", status: 503 };
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) return { ok: false, message: "请先登录", status: 401 };
  const payload = await verifySessionJwt(m[1].trim(), secret);
  if (!payload) return { ok: false, message: "登录已失效，请重新登录", status: 401 };
  return { ok: true, user: payload };
}
