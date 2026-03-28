import type { Env } from "../../types";
import { PERMISSIONS, VALID_ROLES, permissionsForRole } from "../../lib/permissions";
import { PERMISSIONS as PERM_DEF } from "../../../shared/permissions";
import { hashPassword } from "../../lib/password";
import { writeOperationLog } from "../../lib/operationLog";
import { requireSession, requirePermission } from "../auth/_helpers";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function noTableResponse() {
  return json(
    { message: "数据库未包含 users 表，请先执行 npm run d1:migrate（会执行 migrations/main.sql）" },
    503
  );
}

const VALID_PERMISSION_KEYS = new Set<string>(Object.values(PERM_DEF));

function parsePermissionsInput(raw: unknown): { ok: true; value: string[] | null | undefined } | { ok: false; message: string } {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null) return { ok: true, value: null };
  if (!Array.isArray(raw)) return { ok: false, message: "permissions 必须为数组、null 或省略" };
  const list = raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(list));
  if (uniq.includes("*")) return { ok: true, value: ["*"] };
  for (const p of uniq) {
    if (!VALID_PERMISSION_KEYS.has(p)) return { ok: false, message: `无效权限：${p}` };
  }
  return { ok: true, value: uniq };
}

function isMissingUsersTable(e: unknown): boolean {
  const m = String((e as Error)?.message || e || "").toLowerCase();
  return m.includes("no such table") || m.includes("doesn't exist");
}

function isMissingPermissionsJsonColumn(e: unknown): boolean {
  const m = String((e as Error)?.message || e || "").toLowerCase();
  return m.includes("permissions_json") && (m.includes("no such column") || m.includes("has no column named"));
}

export const onRequestPut = async (context: { params: Record<string, string>; request: Request; env: Env }) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.USERS_MANAGE);
  if (denied) return denied;

  const id = Number(context.params.id);
  if (!id) return json({ message: "无效 ID" }, 400);

  let body: { password?: string; display_name?: string; role?: string; permissions?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ message: "请求体不是有效 JSON" }, 400);
  }

  try {
    let hasPermissionsJson = true;
    let row: { id: number; role: string; permissions_json?: string | null } | null = null;
    try {
      row = (await context.env.DB.prepare("SELECT id, role, permissions_json FROM users WHERE id = ? LIMIT 1")
        .bind(id)
        .first()) as { id: number; role: string; permissions_json?: string | null } | null;
    } catch (e: unknown) {
      if (!isMissingPermissionsJsonColumn(e)) throw e;
      hasPermissionsJson = false;
      row = (await context.env.DB.prepare("SELECT id, role FROM users WHERE id = ? LIMIT 1")
        .bind(id)
        .first()) as { id: number; role: string } | null;
    }
    if (!row) return json({ message: "用户不存在" }, 404);

    const displayName =
      body.display_name != null ? String(body.display_name).trim() : undefined;
    const role = body.role != null ? String(body.role).trim() : undefined;
    const password = body.password != null ? String(body.password).trim() : "";

    if (role !== undefined && !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return json({ message: "角色无效" }, 400);
    }
    const perms = parsePermissionsInput(body.permissions);
    if (!perms.ok) return json({ message: perms.message }, 400);
    const permissionsJson =
      perms.value === undefined ? undefined : perms.value === null ? null : JSON.stringify(perms.value);
    const hasPermissionsUpdate = perms.value !== undefined;

    // 防止当前登录管理员把自己改到不可管理（自锁死）
    if (id === s.user.sub) {
      const nextRole = role ?? row.role;
      let effectivePerms: string[] = permissionsForRole(nextRole);
      if (hasPermissionsUpdate) {
        effectivePerms = perms.value === null ? permissionsForRole(nextRole) : (perms.value || []);
      } else if (hasPermissionsJson && row.permissions_json) {
        try {
          const parsed = JSON.parse(String(row.permissions_json));
          if (Array.isArray(parsed)) {
            const list = parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
            effectivePerms = list.includes("*") ? ["*"] : list;
          }
        } catch {
          // ignore parse error and fallback to role defaults
        }
      }
      const canManageSelf = effectivePerms.includes("*") || effectivePerms.includes(PERMISSIONS.USERS_MANAGE);
      if (!canManageSelf) {
        return json({ message: "不能移除当前登录用户的“用户管理”权限，避免账号被锁死" }, 400);
      }
    }

    if (password) {
      const hash = await hashPassword(password);
      if (hasPermissionsUpdate && hasPermissionsJson) {
        try {
          await context.env.DB.prepare(
            `UPDATE users SET password_hash = ?, display_name = COALESCE(?, display_name), role = COALESCE(?, role), permissions_json = ?, updated_at = datetime('now') WHERE id = ?`
          )
            .bind(hash, displayName ?? null, role ?? null, permissionsJson, id)
            .run();
        } catch (e: unknown) {
          if (!isMissingPermissionsJsonColumn(e)) throw e;
          await context.env.DB.prepare(
            `UPDATE users SET password_hash = ?, display_name = COALESCE(?, display_name), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`
          )
            .bind(hash, displayName ?? null, role ?? null, id)
            .run();
        }
      } else {
        await context.env.DB.prepare(
          `UPDATE users SET password_hash = ?, display_name = COALESCE(?, display_name), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`
        )
          .bind(hash, displayName ?? null, role ?? null, id)
          .run();
      }
    } else {
      if (hasPermissionsUpdate && hasPermissionsJson) {
        try {
          await context.env.DB.prepare(
            `UPDATE users SET display_name = COALESCE(?, display_name), role = COALESCE(?, role), permissions_json = ?, updated_at = datetime('now') WHERE id = ?`
          )
            .bind(displayName ?? null, role ?? null, permissionsJson, id)
            .run();
        } catch (e: unknown) {
          if (!isMissingPermissionsJsonColumn(e)) throw e;
          await context.env.DB.prepare(
            `UPDATE users SET display_name = COALESCE(?, display_name), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`
          )
            .bind(displayName ?? null, role ?? null, id)
            .run();
        }
      } else {
        await context.env.DB.prepare(
          `UPDATE users SET display_name = COALESCE(?, display_name), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`
        )
          .bind(displayName ?? null, role ?? null, id)
          .run();
      }
    }

    await writeOperationLog(context.env, context.request, s.user, {
      action: "user.update",
      resourceType: "user",
      resourceId: id,
      summary: `编辑登录账号，用户编号 ${id}`,
    });
    return json({ message: "更新成功" });
  } catch (e: unknown) {
    if (isMissingUsersTable(e)) return noTableResponse();
    const m = String((e as Error)?.message || e || "").toLowerCase();
    if (m.includes("no such column") && m.includes("permissions_json")) {
      return json({ message: "数据库未包含 users.permissions_json，请先执行 npm run d1:migrate（会执行 migrations/main.sql）" }, 503);
    }
    return json({ message: "更新失败", error: (e as Error)?.message }, 500);
  }
};

export const onRequestDelete = async (context: { params: Record<string, string>; request: Request; env: Env }) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.USERS_MANAGE);
  if (denied) return denied;

  const id = Number(context.params.id);
  if (!id) return json({ message: "无效 ID" }, 400);

  if (id === s.user.sub) {
    return json({ message: "不能删除当前登录账号" }, 400);
  }

  try {
    const res = await context.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    if (!res.success) {
      return json({ message: "删除失败" }, 500);
    }

  await writeOperationLog(context.env, context.request, s.user, {
    action: "user.delete",
    resourceType: "user",
    resourceId: id,
    summary: `删除登录账号，用户编号 ${id}`,
  });
    return json({ message: "删除成功" });
  } catch (e: unknown) {
    if (isMissingUsersTable(e)) return noTableResponse();
    return json({ message: "删除失败", error: (e as Error)?.message }, 500);
  }
};
