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

const WARNING_ONLY_SQL_BASE = `(
        (insurance_mandatory_end IS NOT NULL AND insurance_mandatory_end != '' AND julianday(insurance_mandatory_end) - julianday(date('now')) <= warning_days)
        OR (insurance_commercial_end IS NOT NULL AND insurance_commercial_end != '' AND julianday(insurance_commercial_end) - julianday(date('now')) <= warning_days)
        OR (annual_inspection_due IS NOT NULL AND annual_inspection_due != '' AND julianday(annual_inspection_due) - julianday(date('now')) <= warning_days)
        OR (environmental_test_date IS NOT NULL AND environmental_test_date != '' AND julianday(environmental_test_date) - julianday(date('now')) <= warning_days)
        OR (driving_license_valid_until IS NOT NULL AND driving_license_valid_until != '' AND julianday(driving_license_valid_until) - julianday(date('now')) <= warning_days)
        OR (road_transport_certificate_valid_until IS NOT NULL AND road_transport_certificate_valid_until != '' AND julianday(road_transport_certificate_valid_until) - julianday(date('now')) <= warning_days)`;

const WARNING_ONLY_SCRAP_LINE = `
        OR (mandatory_scrap_date IS NOT NULL AND mandatory_scrap_date != '' AND julianday(mandatory_scrap_date) - julianday(date('now')) <= warning_days)`;

async function runVehicleListQuery(
  env: Env,
  url: URL,
  opts: { ownerInSearch: boolean; scrapInWarn: boolean }
): Promise<unknown[]> {
  const search = (url.searchParams.get("search") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const warningOnly = url.searchParams.get("warningOnly") === "1";

  const whereParts: string[] = [];
  const params: unknown[] = [];
  if (search) {
    if (opts.ownerInSearch) {
      whereParts.push(
        "(license_plate LIKE ? OR brand LIKE ? OR model LIKE ? OR responsible_person LIKE ? OR owner_name LIKE ? OR owner_address LIKE ? OR vehicle_code LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
    } else {
      whereParts.push(
        "(license_plate LIKE ? OR brand LIKE ? OR model LIKE ? OR responsible_person LIKE ? OR vehicle_code LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
  }
  if (status) {
    whereParts.push("current_status = ?");
    params.push(status);
  }
  if (warningOnly) {
    const tail = opts.scrapInWarn ? `${WARNING_ONLY_SCRAP_LINE}\n      )` : "\n      )";
    whereParts.push(WARNING_ONLY_SQL_BASE + tail);
  }
  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  let stmt = env.DB.prepare(`SELECT * FROM vehicles ${whereSql} ORDER BY updated_at DESC, id DESC`);
  if (params.length) stmt = stmt.bind(...params);
  const res = await stmt.all();
  return res.results || [];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.VEHICLES_READ);
  if (denied) return denied;
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const searchQ = (url.searchParams.get("search") || "").trim();
    let useOwnerCols = true;
    let useScrapWarn = true;
    let list: unknown[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        list = await runVehicleListQuery(env, url, {
          ownerInSearch: useOwnerCols,
          scrapInWarn: useScrapWarn,
        });
        break;
      } catch (e: unknown) {
        const msg = String((e as { message?: string })?.message ?? e ?? "");
        // 仅在确实用到对应列时降级（仪表盘 warningOnly 无搜索，只可能缺 mandatory_scrap_date）
        if (useOwnerCols && searchQ && /owner_name|owner_address/i.test(msg)) {
          useOwnerCols = false;
          continue;
        }
        if (useScrapWarn && /mandatory_scrap_date/i.test(msg)) {
          useScrapWarn = false;
          continue;
        }
        const hint = vehicleSchemaHintFromError(e);
        return jsonResponse(
          { message: hint || "查询失败", error: msg, code: hint ? "SCHEMA_OUTDATED" : undefined },
          500
        );
      }
    }
    return jsonResponse({ list });
  } catch (e: any) {
    const hint = vehicleSchemaHintFromError(e);
    return jsonResponse(
      { message: hint || "查询失败", error: e?.message, code: hint ? "SCHEMA_OUTDATED" : undefined },
      500
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.VEHICLES_WRITE);
  if (denied) return denied;
  const { env, request } = context;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const payload = parseVehicleBody(body);
    const validation = validateVehiclePayload(payload);
    if (!validation.ok) return jsonResponse({ message: validation.message }, validation.status);

    const now = new Date().toISOString();
    const stmt = env.DB.prepare(
      `INSERT INTO vehicles (
        vehicle_code, license_plate, brand, model, vin, engine_no, vehicle_type,
        owner_name, owner_address, usage_nature,
        registration_date, issue_date,
        approved_passengers, curb_weight, overall_dimensions, mandatory_scrap_date,
        purchase_date, responsible_person, current_status,
        insurance_mandatory_start, insurance_mandatory_end, insurance_commercial_start, insurance_commercial_end,
        insurance_types, insurance_premium, insurer,
        insurance_mandatory_policy_no, insurance_commercial_policy_no,
        annual_inspection_due, environmental_test_date, driving_license_valid_until, road_transport_certificate_valid_until,
        warning_days, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      now
    );
    const res: any = await stmt.run();
    const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);
    await writeOperationLog(env, request, s.user, {
      action: "vehicle.create",
      resourceType: "vehicle",
      resourceId: id,
      summary: `新增车辆档案，编号 ${id}`,
    });
    return jsonResponse({ id }, 201);
  } catch (e: any) {
    const hint = vehicleSchemaHintFromError(e);
    return jsonResponse(
      { message: hint || "保存失败", error: e?.message, code: hint ? "SCHEMA_OUTDATED" : undefined },
      hint ? 503 : 500
    );
  }
};
