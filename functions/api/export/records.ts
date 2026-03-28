import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { requireSession, requirePermission } from "../auth/_helpers";
import { escapeCsv } from "../../lib/csv";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.EXPORT_DATA);
  if (denied) return denied;

  const { results } = await context.env.DB.prepare(
    `SELECT id, device_code, device_name, device_model, fault_description, maintenance_date, technician,
            vehicle_id, labor_hours, labor_cost, material_cost, other_cost, total_cost, meter_reading,
            repair_status, root_cause, share_token, created_at, updated_at
     FROM maintenance_records ORDER BY id ASC LIMIT 20000`
  ).all<Record<string, unknown>>();

  const rows = results ?? [];
  const headers = [
    "ID",
    "设备编号",
    "设备名称",
    "型号",
    "故障现象",
    "维修日期",
    "维修人",
    "车辆ID",
    "工时",
    "人工费",
    "材料费",
    "其他费用",
    "总费用",
    "表读数",
    "维修状态",
    "故障根因",
    "分享令牌",
    "创建时间",
    "更新时间",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.device_code,
        r.device_name,
        r.device_model ?? "",
        r.fault_description,
        r.maintenance_date,
        r.technician,
        r.vehicle_id ?? "",
        r.labor_hours ?? "",
        r.labor_cost ?? "",
        r.material_cost ?? "",
        r.other_cost ?? "",
        r.total_cost ?? "",
        r.meter_reading ?? "",
        r.repair_status ?? "",
        r.root_cause ?? "",
        r.share_token ?? "",
        r.created_at ?? "",
        r.updated_at ?? "",
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];
  const csv = "\uFEFF" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=maintenance_records_${Date.now()}.csv`,
    },
  });
};
