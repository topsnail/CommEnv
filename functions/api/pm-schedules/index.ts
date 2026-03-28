import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { writeOperationLog } from "../../lib/operationLog";
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
  const denied = requirePermission(s.user, PERMISSIONS.PM_READ);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const vehicleId = Number(url.searchParams.get("vehicleId") || "0");
  if (!vehicleId) {
    return json({ message: "缺少 vehicleId" }, 400);
  }

  const res = await context.env.DB.prepare(
    "SELECT * FROM pm_schedules WHERE vehicle_id = ? ORDER BY id ASC"
  )
    .bind(vehicleId)
    .all();
  return json({ list: res.results || [] });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.PM_WRITE);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return json({ message: "请求体不是有效 JSON" }, 400);
  }

  const vehicleId = Number(body.vehicle_id || 0);
  const name = (body.name != null ? String(body.name) : "").trim();
  if (!vehicleId || !name) {
    return json({ message: "缺少 vehicle_id 或 name" }, 400);
  }

  const v = await context.env.DB.prepare("SELECT id FROM vehicles WHERE id = ? LIMIT 1")
    .bind(vehicleId)
    .first<{ id: number }>();
  if (!v) return json({ message: "车辆不存在" }, 404);

  const interval_days = body.interval_days != null ? Number(body.interval_days) : null;
  const interval_km = body.interval_km != null ? Number(body.interval_km) : null;
  const last_service_date = body.last_service_date != null ? String(body.last_service_date) : null;
  const last_meter_reading = body.last_meter_reading != null ? Number(body.last_meter_reading) : null;
  const next_due_date = body.next_due_date != null ? String(body.next_due_date) : null;
  const next_due_meter = body.next_due_meter != null ? Number(body.next_due_meter) : null;
  const notes = body.notes != null ? String(body.notes) : null;
  const active = body.active === false || body.active === 0 ? 0 : 1;

  const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await context.env.DB.prepare(
    `INSERT INTO pm_schedules (
      vehicle_id, name, interval_days, interval_km, last_service_date, last_meter_reading,
      next_due_date, next_due_meter, notes, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  )
    .bind(
      vehicleId,
      name,
      Number.isFinite(interval_days as number) ? interval_days : null,
      Number.isFinite(interval_km as number) ? interval_km : null,
      last_service_date,
      Number.isFinite(last_meter_reading as number) ? last_meter_reading : null,
      next_due_date,
      Number.isFinite(next_due_meter as number) ? next_due_meter : null,
      notes,
      active
    )
    .run();

  const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);
    await writeOperationLog(context.env, context.request, s.user, {
      action: "pm.create",
      resourceType: "pm_schedule",
      resourceId: id,
      summary: `新增保养计划「${name}」，车辆编号 ${vehicleId}`,
    });
  return json({ id }, 201);
};
