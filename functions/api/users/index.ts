import type { Env } from "../../types";
import { PERMISSIONS, VALID_ROLES } from "../../lib/permissions";
import { PERMISSIONS as PERM_DEF, type PermissionKey } from "../../../shared/permissions";
import { hashPassword } from "../../lib/password";
import { writeOperationLog } from "../../lib/operationLog";
import { requireSession, requirePermission } from "../auth/_helpers";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MIGRATION_0011_HINT =
  "尚未创建 users 表。请在项目根目录执行：npm run d1:migrate（会执行 migrations/main.sql）";
const MIGRATION_0013_HINT =
  "users 表缺少 permissions_json 字段。请在项目根目录执行：npm run d1:migrate（会执行 migrations/main.sql）";

const VALID_PERMISSION_KEYS = new Set<PermissionKey>(Object.values(PERM_DEF));

function isMissingPermissionsJsonColumn(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return msg.includes("permissions_json") && (msg.includes("no such column") || msg.includes("has no column named"));
}

function parsePermissionsInput(raw: unknown): { ok: true; value: string[] | null } | { ok: false; message: string } {
  if (raw === undefined) return { ok: true, value: null };
  if (raw === null) return { ok: true, value: null };
  if (!Array.isArray(raw)) return { ok: false, message: "permissions 必须为数组或 null" };
  const list = raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(list));
  if (uniq.includes("*")) return { ok: true, value: ["*"] };
  for (const p of uniq) {
    if (!VALID_PERMISSION_KEYS.has(p as PermissionKey)) {
      return { ok: false, message: `无效权限：${p}` };
    }
  }
  return { ok: true, value: uniq };
}

async function usersTableExists(env: Env): Promise<boolean> {
  try {
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1"
    ).first<{ name: string }>();
    return !!row?.name;
  } catch {
    return false;
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.USERS_MANAGE);
  if (denied) return denied;

  try {
    let rows: any[] = [];
    let hasPermissionsJson = true;
    try {
      const res = await context.env.DB.prepare(
        "SELECT id, username, display_name, role, permissions_json, created_at, updated_at FROM users ORDER BY id ASC"
      ).all<any>();
      rows = res.results || [];
    } catch (e: unknown) {
      if (!isMissingPermissionsJsonColumn(e)) throw e;
      hasPermissionsJson = false;
      const res = await context.env.DB.prepare(
        "SELECT id, username, display_name, role, created_at, updated_at FROM users ORDER BY id ASC"
      ).all<any>();
      rows = res.results || [];
    }

    const list = rows.map((row) => {
      let permissions: string[] | null = null;
      try {
        if (hasPermissionsJson && row.permissions_json) {
          const parsed = JSON.parse(String(row.permissions_json));
          if (Array.isArray(parsed)) permissions = parsed.map((x) => String(x));
        }
      } catch {}
      return {
        ...row,
        permissions,
      };
    });
    return json({ list });
  } catch (e) {
    console.error("GET /api/users (users 表可能未迁移):", e);
    const m = String((e as Error)?.message || e || "").toLowerCase();
    if (m.includes("no such column") && m.includes("permissions_json")) {
      return json({ list: [], migrationHint: MIGRATION_0013_HINT }, 503);
    }
    return json({
      list: [],
      migrationHint: MIGRATION_0011_HINT,
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.USERS_MANAGE);
  if (denied) return denied;

  let body: { username?: string; password?: string; display_name?: string; role?: string; permissions?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ message: "请求体不是有效 JSON" }, 400);
  }

  const username = (body.username != null ? String(body.username) : "").trim().toLowerCase();
  const password = (body.password != null ? String(body.password) : "").trim();
  const displayName = (body.display_name != null ? String(body.display_name) : "").trim() || username;
  const role = (body.role != null ? String(body.role) : "").trim();

  if (!username || !password) {
    return json({ message: "缺少用户名或密码" }, 400);
  }
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return json({ message: "角色无效" }, 400);
  }
  const perms = parsePermissionsInput(body.permissions);
  if (!perms.ok) return json({ message: perms.message }, 400);

  try {
    const exists = await usersTableExists(context.env);
    if (!exists) {
      return json({ message: MIGRATION_0011_HINT }, 503);
    }
  } catch {
    return json({ message: MIGRATION_0011_HINT }, 503);
  }

  try {
    const hash = await hashPassword(password);
    const permJson = perms.value ? JSON.stringify(perms.value) : null;
    let res: { meta?: { last_row_id?: number }; lastInsertRowId?: number };
    try {
      res = await context.env.DB.prepare(
        `INSERT INTO users (username, password_hash, display_name, role, permissions_json) VALUES (?, ?, ?, ?, ?)`
      )
        .bind(username, hash, displayName, role, permJson)
        .run();
    } catch (e: unknown) {
      if (!isMissingPermissionsJsonColumn(e)) throw e;
      // 兼容旧库：缺少 permissions_json 列时，降级创建用户（权限跟随角色默认）
      res = await context.env.DB.prepare(
        `INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)`
      )
        .bind(username, hash, displayName, role)
        .run();
    }
    const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);
    await writeOperationLog(context.env, context.request, s.user, {
      action: "user.create",
      resourceType: "user",
      resourceId: id,
      summary: `新增登录账号「${username}」`,
    });
    return json({ id }, 201);
  } catch (e: unknown) {
    const msg = (e as Error)?.message || "";
    if (msg.includes("UNIQUE")) {
      return json({ message: "用户名已存在" }, 409);
    }
    const full = `${msg} ${String(e)}`.toLowerCase();
    if (full.includes("no such table") || full.includes("doesn't exist")) {
      return json({ message: MIGRATION_0011_HINT }, 503);
    }
    if (full.includes("no such column") && full.includes("permissions_json")) {
      return json({ message: MIGRATION_0013_HINT }, 503);
    }
    return json({ message: "创建失败", error: msg }, 500);
  }
};
