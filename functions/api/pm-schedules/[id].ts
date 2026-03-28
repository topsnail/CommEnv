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

  const id = Number(context.params.id);
  if (!id) return json({ message: "无效 ID" }, 400);
  const row = await context.env.DB.prepare("SELECT * FROM pm_schedules WHERE id = ? LIMIT 1")
    .bind(id)
    .first();
  if (!row) return json({ message: "未找到" }, 404);
  return json(row);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.PM_WRITE);
  if (denied) return denied;

  const id = Number(context.params.id);
  if (!id) return json({ message: "无效 ID" }, 400);

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return json({ message: "请求体不是有效 JSON" }, 400);
  }

  const existing = await context.env.DB.prepare("SELECT * FROM pm_schedules WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!existing) return json({ message: "未找到" }, 404);

  const name = body.name != null ? String(body.name).trim() : String(existing.name);
  if (!name) return json({ message: "name 不能为空" }, 400);

  const interval_days = body.interval_days !== undefined ? Number(body.interval_days) : existing.interval_days;
  const interval_km = body.interval_km !== undefined ? Number(body.interval_km) : existing.interval_km;
  const last_service_date =
    body.last_service_date !== undefined ? (body.last_service_date != null ? String(body.last_service_date) : null) : existing.last_service_date;
  const last_meter_reading =
    body.last_meter_reading !== undefined ? Number(body.last_meter_reading) : existing.last_meter_reading;
  const next_due_date =
    body.next_due_date !== undefined ? (body.next_due_date != null ? String(body.next_due_date) : null) : existing.next_due_date;
  const next_due_meter =
    body.next_due_meter !== undefined ? Number(body.next_due_meter) : existing.next_due_meter;
  const notes = body.notes !== undefined ? (body.notes != null ? String(body.notes) : null) : existing.notes;
  const active =
    body.active !== undefined ? (body.active === false || body.active === 0 ? 0 : 1) : Number(existing.active ?? 1);

  await context.env.DB.prepare(
    `UPDATE pm_schedules SET
      name = ?, interval_days = ?, interval_km = ?, last_service_date = ?, last_meter_reading = ?,
      next_due_date = ?, next_due_meter = ?, notes = ?, active = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      name,
      Number.isFinite(interval_days as number) ? interval_days : null,
      Number.isFinite(interval_km as number) ? interval_km : null,
      last_service_date,
      Number.isFinite(last_meter_reading as number) ? last_meter_reading : null,
      next_due_date,
      Number.isFinite(next_due_meter as number) ? next_due_meter : null,
      notes,
      active,
      id
    )
    .run();

  await writeOperationLog(context.env, context.request, s.user, {
    action: "pm.update",
    resourceType: "pm_schedule",
    resourceId: id,
    summary: `更新保养计划，编号 ${id}`,
  });
  return json({ message: "更新成功" });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.PM_WRITE);
  if (denied) return denied;

  const id = Number(context.params.id);
  if (!id) return json({ message: "无效 ID" }, 400);
  await context.env.DB.prepare("DELETE FROM pm_schedules WHERE id = ?").bind(id).run();
  await writeOperationLog(context.env, context.request, s.user, {
    action: "pm.delete",
    resourceType: "pm_schedule",
    resourceId: id,
    summary: `删除保养计划，编号 ${id}`,
  });
  return json({ message: "删除成功" });
};
