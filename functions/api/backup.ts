import type { Env } from "../types";
import { PERMISSIONS } from "../lib/permissions";
import { requireSession, requirePermission } from "./auth/_helpers";

function escSql(v: unknown): string {
  if (v == null) return "NULL";
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

/**
 * D1 全库逻辑备份为 INSERT 语句（借鉴 SmartWMS）。
 * 需权限 backup.db（仅 admin 默认具备）。
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.BACKUP_DB);
  if (denied) return denied;

  const tables = [
    "device_names",
    "device_models",
    "technicians",
    "custom_categories",
    "custom_options",
    "custom_record_values",
    "vehicles",
    "maintenance_records",
    "parts",
    "media",
    "users",
    "operation_logs",
    "pm_schedules",
    "vehicle_documents",
  ];

  const lines: string[] = [
    "-- 维保系统 D1 数据备份",
    `-- 导出时间: ${new Date().toISOString()}`,
    "-- ⚠️ 机密：本文件含业务数据；users 表含 password_hash（密码哈希），勿提交到公开仓库或聊天工具",
    "-- ⚠️ 请加密存储、限制下载权限；泄漏后请轮换 JWT_SECRET 并让用户改密",
    "",
  ];

  for (const table of tables) {
    try {
      const { results } = await context.env.DB.prepare(`SELECT * FROM ${table}`).all<Record<string, unknown>>();
      const rows = results ?? [];
      if (rows.length === 0) continue;
      if (table === "users") {
        lines.push(`-- >>> 表 ${table}：含 password_hash，仅用于可信环境恢复 <<<`);
      }
      const cols = Object.keys(rows[0]);
      for (const row of rows) {
        const vals = cols.map((col) => escSql(row[col]));
        lines.push(`INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
      }
      lines.push("");
    } catch {
      // 表不存在则跳过（迁移未完成）
    }
  }

  const sql = lines.join("\n");
  const filename = `maintenance_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.sql`;
  return new Response(sql, {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
