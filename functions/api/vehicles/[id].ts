import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { writeOperationLog } from "../../lib/operationLog";
import { requireSession, requirePermission } from "../auth/_helpers";
import {
  jsonResponse,
  parseVehicleBody,
  validateVehiclePayload,
  vehicleSchemaHintFromError,
  d1Text,
  d1NumberOrNull,
  d1IntOrNull,
} from "./_helpers";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.VEHICLES_READ);
  if (denied) return denied;
  const id = Number(context.params.id);
  if (!id) return jsonResponse({ message: "无效 id" }, 400);
  try {
    const row: Record<string, unknown> | null = await context.env.DB.prepare(
      "SELECT * FROM vehicles WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return jsonResponse({ message: "未找到车辆信息" }, 404);
    return jsonResponse(row);
  } catch (e: unknown) {
    const hint = vehicleSchemaHintFromError(e);
    const msg = String((e as { message?: string })?.message ?? e ?? "");
    return jsonResponse(
      { message: hint || "读取车辆失败", error: msg, code: hint ? "SCHEMA_OUTDATED" : undefined },
      500
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.VEHICLES_WRITE);
  if (denied) return denied;
  const id = Number(context.params.id);
  if (!id) return jsonResponse({ message: "无效 id" }, 400);
  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const payload = parseVehicleBody(body);
    const validation = validateVehiclePayload(payload);
    if (!validation.ok) return jsonResponse({ message: validation.message }, validation.status);
    const now = new Date().toISOString();
    await context.env.DB.prepare(
      `UPDATE vehicles SET
        vehicle_code = ?, license_plate = ?, brand = ?, model = ?, vin = ?, engine_no = ?, vehicle_type = ?,
        owner_name = ?, owner_address = ?, usage_nature = ?,
        registration_date = ?, issue_date = ?,
        approved_passengers = ?, curb_weight = ?, overall_dimensions = ?, mandatory_scrap_date = ?,
        purchase_date = ?, responsible_person = ?, current_status = ?,
        insurance_mandatory_start = ?, insurance_mandatory_end = ?, insurance_commercial_start = ?, insurance_commercial_end = ?,
        insurance_types = ?, insurance_premium = ?, insurer = ?,
        insurance_mandatory_policy_no = ?, insurance_commercial_policy_no = ?,
        annual_inspection_due = ?, environmental_test_date = ?, driving_license_valid_until = ?, road_transport_certificate_valid_until = ?,
        warning_days = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      d1Text(payload.vehicle_code),
      d1Text(payload.license_plate),
      d1Text(payload.brand),
      d1Text(payload.model),
      d1Text(payload.vin),
      d1Text(payload.engine_no),
      d1Text(payload.vehicle_type),
      d1Text(payload.owner_name),
      d1Text(payload.owner_address),
      d1Text(payload.usage_nature),
      d1Text(payload.registration_date),
      d1Text(payload.issue_date),
      d1IntOrNull(payload.approved_passengers),
      d1Text(payload.curb_weight),
      d1Text(payload.overall_dimensions),
      d1Text(payload.mandatory_scrap_date),
      d1Text(payload.purchase_date),
      d1Text(payload.responsible_person),
      d1Text(payload.current_status),
      d1Text(payload.insurance_mandatory_start),
      d1Text(payload.insurance_mandatory_end),
      d1Text(payload.insurance_commercial_start),
      d1Text(payload.insurance_commercial_end),
      d1Text(payload.insurance_types),
      d1NumberOrNull(payload.insurance_premium),
      d1Text(payload.insurer),
      d1Text(payload.insurance_mandatory_policy_no),
      d1Text(payload.insurance_commercial_policy_no),
      d1Text(payload.annual_inspection_due),
      d1Text(payload.environmental_test_date),
      d1Text(payload.driving_license_valid_until),
      d1Text(payload.road_transport_certificate_valid_until),
      d1NumberOrNull(payload.warning_days) ?? 30,
      d1Text(payload.notes),
      now,
      id
    ).run();
    await writeOperationLog(context.env, context.request, s.user, {
      action: "vehicle.update",
      resourceType: "vehicle",
      resourceId: id,
      summary: `编辑车辆档案，编号 ${id}`,
    });
    return jsonResponse({ message: "更新成功" });
  } catch (e: any) {
    const hint = vehicleSchemaHintFromError(e);
    return jsonResponse(
      { message: hint || "更新失败", error: e?.message, code: hint ? "SCHEMA_OUTDATED" : undefined },
      hint ? 503 : 500
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.VEHICLES_DELETE);
  if (denied) return denied;
  const id = Number(context.params.id);
  if (!id) return jsonResponse({ message: "无效 id" }, 400);
  await context.env.DB.prepare("DELETE FROM vehicles WHERE id = ?").bind(id).run();
  await writeOperationLog(context.env, context.request, s.user, {
    action: "vehicle.delete",
    resourceType: "vehicle",
    resourceId: id,
    summary: `删除车辆档案，编号 ${id}`,
  });
  return jsonResponse({ message: "删除成功" });
};
