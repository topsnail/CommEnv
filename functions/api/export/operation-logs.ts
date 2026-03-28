import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { requireSession, requirePermission } from "../auth/_helpers";
import { escapeCsv } from "../../lib/csv";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.EXPORT_DATA);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const usernameRaw = (url.searchParams.get("username") || "").trim();
  const username = usernameRaw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const keywordRaw = (url.searchParams.get("keyword") || "").trim();
  const keyword = keywordRaw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const start = (url.searchParams.get("startDate") || "").trim();
  const end = (url.searchParams.get("endDate") || "").trim();

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
  if (start) {
    conds.push("date(created_at) >= date(?)");
    binds.push(start);
  }
  if (end) {
    conds.push("date(created_at) <= date(?)");
    binds.push(end);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  try {
    let stmt = context.env.DB.prepare(
      `SELECT id, created_at, user_id, username, action, resource_type, resource_id, summary, detail_json, ip
       FROM operation_logs ${where}
       ORDER BY id DESC LIMIT 5000`
    );
    if (binds.length) stmt = stmt.bind(...binds);
    const { results } = await stmt.all<Record<string, unknown>>();
    const rows = results ?? [];
    const headers = ["ID", "时间", "用户ID", "用户名", "操作", "资源类型", "资源ID", "摘要", "详情JSON", "IP"];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.created_at,
          r.user_id ?? "",
          r.username ?? "",
          r.action,
          r.resource_type ?? "",
          r.resource_id ?? "",
          r.summary ?? "",
          r.detail_json ?? "",
          r.ip ?? "",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];
    const csv = "\uFEFF" + lines.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=operation_logs_${Date.now()}.csv`,
      },
    });
  } catch (e) {
    console.error("export operation-logs:", e);
    return new Response(JSON.stringify({ message: "导出失败，请确认已执行数据库迁移" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
