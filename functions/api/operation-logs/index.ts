import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { requireSession, requirePermission } from "../auth/_helpers";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.LOGS_READ);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "20")));
  const offset = (page - 1) * pageSize;
  const usernameRaw = (url.searchParams.get("username") || "").trim();
  /** SQLite LIKE：转义 \ % _ */
  const username = usernameRaw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const keywordRaw = (url.searchParams.get("keyword") || "").trim();
  const keyword = keywordRaw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const startDate = (url.searchParams.get("startDate") || "").trim();
  const endDate = (url.searchParams.get("endDate") || "").trim();

  const conds: string[] = [];
  const binds: string[] = [];
  if (username) {
    conds.push("username LIKE ? ESCAPE '\\'");
    binds.push(`%${username}%`);
  }
  if (keyword) {
    const k = `%${keyword}%`;
    conds.push(
      "(summary LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\' OR IFNULL(detail_json,'') LIKE ? ESCAPE '\\')"
    );
    binds.push(k, k, k);
  }
  if (startDate) {
    conds.push("date(created_at) >= date(?)");
    binds.push(startDate);
  }
  if (endDate) {
    conds.push("date(created_at) <= date(?)");
    binds.push(endDate);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  try {
    let countStmt = context.env.DB.prepare(`SELECT COUNT(*) as total FROM operation_logs ${where}`);
    if (binds.length) countStmt = countStmt.bind(...binds);
    const totalRow = await countStmt.first<{ total: number }>();
    const total = totalRow?.total ?? 0;

    let listStmt = context.env.DB.prepare(
      `SELECT id, created_at, user_id, username, action, resource_type, resource_id, summary, detail_json, ip
       FROM operation_logs ${where}
       ORDER BY id DESC LIMIT ? OFFSET ?`
    );
    if (binds.length) listStmt = listStmt.bind(...binds, pageSize, offset);
    else listStmt = listStmt.bind(pageSize, offset);

    const res = await listStmt.all();
    return json({ total, list: res.results || [], page, pageSize });
  } catch (e) {
    console.error("GET /api/operation-logs (operation_logs 表可能未迁移):", e);
    return json({
      total: 0,
      list: [],
      page,
      pageSize,
      migrationHint:
        "未找到 operation_logs 表。请在本地执行：npm run d1:migrate（会执行 migrations/main.sql）",
    });
  }
};

/** 清空全部操作日志（仅管理员，借鉴 SmartWMS DELETE /operation-logs） */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  if (s.user.role !== "admin") {
    return json({ message: "仅管理员可清空操作日志" }, 403);
  }
  try {
    await context.env.DB.prepare("DELETE FROM operation_logs").run();
    return json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/operation-logs:", e);
    return json({ message: "清空失败" }, 500);
  }
};
