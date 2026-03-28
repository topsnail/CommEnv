import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { requireSession, requirePermission } from "../auth/_helpers";
import { escapeCsv } from "../../lib/csv";

/**
 * 导出设备名称 / 型号 / 维修人 字典为 CSV（类型 + 值）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.EXPORT_DATA);
  if (denied) return denied;

  const [dn, dm, tech] = await Promise.all([
    context.env.DB.prepare("SELECT value FROM device_names ORDER BY value").all<{ value: string }>(),
    context.env.DB.prepare("SELECT value FROM device_models ORDER BY value").all<{ value: string }>(),
    context.env.DB.prepare("SELECT value FROM technicians ORDER BY value").all<{ value: string }>(),
  ]);

  const lines: string[] = ["类型,值"];
  for (const r of dn.results || []) lines.push([escapeCsv("deviceName"), escapeCsv(r.value)].join(","));
  for (const r of dm.results || []) lines.push([escapeCsv("deviceModel"), escapeCsv(r.value)].join(","));
  for (const r of tech.results || []) lines.push([escapeCsv("technician"), escapeCsv(r.value)].join(","));

  const csv = "\uFEFF" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=settings_dict_${Date.now()}.csv`,
    },
  });
};
