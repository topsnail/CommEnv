import type { Env } from "../../types";
import { createSessionJwt, verifySessionJwt, type SessionPayload } from "../../lib/jwt";
import { hasPermission, PERMISSIONS, permissionsForRole, type PermissionKey } from "../../lib/permissions";
import { hashPassword, verifyPassword } from "../../lib/password";

const TOKEN_DAYS = 7;

export type { SessionPayload };

export function getAuthBearer(request: Request): string | null {
  const h = request.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1]?.trim();
  return token || null;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function refreshUserFromDb(
  env: Env,
  payload: SessionPayload
): Promise<SessionPayload | null> {
  try {
    const validPermissionSet = new Set<PermissionKey>(Object.values(PERMISSIONS));
    let row:
      | { id: number; username: string; display_name: string; role: string; permissions_json?: string | null }
      | null = null;
    try {
      row = await env.DB.prepare(
        "SELECT id, username, display_name, role, permissions_json FROM users WHERE id = ? LIMIT 1"
      )
        .bind(payload.sub)
        .first<{ id: number; username: string; display_name: string; role: string; permissions_json?: string | null }>();
    } catch (e: unknown) {
      // 兼容旧库：users 表尚未迁移到 permissions_json 列时，降级查询基础字段，保证可登录。
      const msg = String((e as { message?: string })?.message ?? e ?? "").toLowerCase();
      if (msg.includes("permissions_json") && (msg.includes("no such column") || msg.includes("has no column named"))) {
        row = await env.DB.prepare("SELECT id, username, display_name, role FROM users WHERE id = ? LIMIT 1")
          .bind(payload.sub)
          .first<{ id: number; username: string; display_name: string; role: string }>();
      } else {
        throw e;
      }
    }
    if (!row) return null;
    let permissions = permissionsForRole(row.role);
    if (row.permissions_json) {
      try {
        const parsed = JSON.parse(String(row.permissions_json));
        if (Array.isArray(parsed)) {
          const list = parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
          if (list.includes("*")) permissions = ["*"];
          else {
            const filtered = list.filter((p) => validPermissionSet.has(p as PermissionKey));
            permissions = filtered;
          }
        }
      } catch {
        // ignore invalid permissions_json and fallback to role defaults
      }
    }
    return {
      ...payload,
      sub: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      role: row.role,
      permissions,
    };
  } catch {
    return null;
  }
}

/**
 * 解析当前登录用户（JWT only，Bearer）。
 */
export async function requireSession(context: {
  request: Request;
  env: Env;
}): Promise<{ ok: true; user: SessionPayload } | { ok: false; response: Response }> {
  const { request, env } = context;
  const jwtSecret = String(env.JWT_SECRET ?? "").trim();
  if (!jwtSecret) {
    return { ok: false, response: jsonError("系统未配置 JWT_SECRET，无法鉴权", 503) };
  }
  const token = getAuthBearer(request);
  if (!token) {
    return { ok: false, response: jsonError("请先登录", 401) };
  }
  const payload = await verifySessionJwt(token, jwtSecret);
  if (!payload) {
    return { ok: false, response: jsonError("登录已失效，请重新登录", 401) };
  }
  const refreshed = await refreshUserFromDb(env, payload);
  if (!refreshed) {
    return { ok: false, response: jsonError("登录已失效，请重新登录", 401) };
  }
  return { ok: true, user: refreshed };
}

export function requirePermission(user: SessionPayload, required: string): Response | null {
  if (!hasPermission(user.permissions, required)) {
    return jsonError("权限不足", 403);
  }
  return null;
}

/**
 * 若未配置鉴权所需环境变量，返回 503；未登录 401。
 */
export async function requireAuth(context: { request: Request; env: Env }): Promise<Response | null> {
  const r = await requireSession(context);
  return r.ok ? null : r.response;
}

/**
 * 按角色权限 SETTINGS_READ / SETTINGS_WRITE。
 */
export async function requireSettingsAuth(context: { request: Request; env: Env }): Promise<Response | null> {
  const session = await requireSession(context);
  if (!session.ok) return session.response;

  const method = context.request.method.toUpperCase();
  const needWrite = method !== "GET" && method !== "HEAD";
  const perm = needWrite ? PERMISSIONS.SETTINGS_WRITE : PERMISSIONS.SETTINGS_READ;
  return requirePermission(session.user, perm);
}

export async function issueJwtToken(
  env: Env,
  user: { id: number; username: string; displayName: string; role: string }
): Promise<string> {
  const secret = String(env.JWT_SECRET ?? "").trim();
  if (!secret) throw new Error("JWT_SECRET missing");
  return await createSessionJwt(secret, user);
}

/** 首个管理员：users 表为空时用 ADMIN_PASSWORD 创建 admin */
export async function bootstrapAdminIfNeeded(
  env: Env,
  username: string,
  plainPassword: string
): Promise<{ id: number; username: string; displayName: string; role: string } | null> {
  const adminPwd = String(env.ADMIN_PASSWORD ?? "").trim();
  if (!adminPwd || plainPassword !== adminPwd) return null;
  const uname = username.trim().toLowerCase();
  if (uname !== "admin") return null;

  const cnt = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>();
  if ((cnt?.c ?? 0) > 0) return null;

  const hash = await hashPassword(plainPassword);
  const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await env.DB.prepare(
    `INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, 'admin')`
  )
    .bind("admin", hash, "系统管理员")
    .run();
  const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);
  if (!id) return null;
  return { id, username: "admin", displayName: "系统管理员", role: "admin" };
}

export async function verifyUserLogin(
  env: Env,
  username: string,
  plainPassword: string
): Promise<{ id: number; username: string; displayName: string; role: string } | null> {
  const row = await env.DB.prepare(
    "SELECT id, username, password_hash, display_name, role FROM users WHERE username = ? LIMIT 1"
  )
    .bind(username.trim().toLowerCase())
    .first<{
      id: number;
      username: string;
      password_hash: string;
      display_name: string;
      role: string;
    }>();
  if (!row) return null;
  const ok = await verifyPassword(plainPassword, row.password_hash);
  if (!ok) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    role: row.role,
  };
}
