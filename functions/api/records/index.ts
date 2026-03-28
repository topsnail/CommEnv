import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { writeOperationLog } from "../../lib/operationLog";
import { requireSession, requirePermission } from "../auth/_helpers";
import {
  parseRecordBody,
  validateRecordPayload,
  jsonResponse,
  isValidRepairStatus,
  generateShareToken,
} from "./_helpers";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_READ);
  if (denied) return denied;
  const { request, env } = context;

  try {
    const url = new URL(request.url);

    const search = url.searchParams.get("search") || "";
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const vehicleId = url.searchParams.get("vehicleId");
    const repairStatus = (url.searchParams.get("repairStatus") || "").trim();
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const sort = url.searchParams.get("sort") || "desc";

    const offset = (page - 1) * pageSize;

    const whereParts: string[] = [];
    const params: any[] = [];

    if (search) {
      whereParts.push(
        "(device_code LIKE ? ESCAPE '\\' OR device_name LIKE ? ESCAPE '\\' OR device_model LIKE ? ESCAPE '\\' OR fault_description LIKE ? ESCAPE '\\')"
      );
      const escaped = search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
      const like = `%${escaped}%`;
      params.push(like, like, like, like);
    }

    if (startDate) {
      whereParts.push("maintenance_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      whereParts.push("maintenance_date <= ?");
      params.push(endDate);
    }
    if (vehicleId) {
      const vid = Number(vehicleId);
      if (Number.isFinite(vid) && vid > 0) {
        whereParts.push("vehicle_id = ?");
        params.push(vid);
      }
    }
    if (repairStatus && isValidRepairStatus(repairStatus)) {
      whereParts.push("repair_status = ?");
      params.push(repairStatus);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    let countStmt = env.DB.prepare(
      `SELECT COUNT(*) as total FROM maintenance_records ${whereSql}`
    );
    if (params.length > 0) {
      countStmt = countStmt.bind(...params);
    }
    const countRes: any = await countStmt.first();
    const total = countRes?.total || 0;

    let listStmt = env.DB.prepare(
      `SELECT * FROM maintenance_records
       ${whereSql}
       ORDER BY maintenance_date ${sort === "asc" ? "ASC" : "DESC"}, id DESC
       LIMIT ? OFFSET ?`
    );
    if (params.length > 0) {
      listStmt = listStmt.bind(...params, pageSize, offset);
    } else {
      listStmt = listStmt.bind(pageSize, offset);
    }

    const records = await listStmt.all();
    const list = (records.results || []) as Record<string, unknown>[];

    for (const row of list) {
      if (row.share_token == null || String(row.share_token).trim() === "") {
        const token = generateShareToken();
        await env.DB.prepare(
          "UPDATE maintenance_records SET share_token = ? WHERE id = ?"
        )
          .bind(token, row.id)
          .run();
        row.share_token = token;
      }
    }

    return jsonResponse({
      total,
      list,
    });
  } catch (e: any) {
    console.error("GET /api/records error:", e);
    return jsonResponse({ message: "查询失败", error: e?.message }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_WRITE);
  if (denied) return denied;
  const { request, env } = context;

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ message: "请求体不是有效 JSON" }, 400);
    }

    const payload = parseRecordBody(body);
    const validation = validateRecordPayload(payload);
    if (!validation.ok) {
      return jsonResponse({ message: validation.message }, validation.status);
    }

    const {
      device_code,
      device_name,
      device_model,
      fault_description,
      process: processText,
      solution,
      maintenance_date,
      technician,
      vehicle_id,
      labor_hours,
      labor_cost,
      material_cost,
      other_cost,
      total_cost,
      meter_reading,
      repair_status,
      root_cause,
      parts,
      media,
      custom_fields,
    } = payload;

    const now = new Date().toISOString();
    const shareToken = generateShareToken();
    const vehicleIdVal = vehicle_id && vehicle_id > 0 ? vehicle_id : null;

    const insertRecord = env.DB.prepare(
      `INSERT INTO maintenance_records
       (device_code, device_name, device_model, fault_description, process, solution, maintenance_date, technician, vehicle_id,
        labor_hours, labor_cost, material_cost, other_cost, total_cost, meter_reading, repair_status, root_cause,
        share_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      device_code,
      device_name,
      device_model,
      fault_description,
      processText,
      solution,
      maintenance_date,
      technician,
      vehicleIdVal,
      labor_hours,
      labor_cost,
      material_cost,
      other_cost,
      total_cost,
      meter_reading,
      repair_status,
      root_cause,
      shareToken,
      now,
      now
    );

    const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await insertRecord.run();
    const recordId = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);

    if (recordId <= 0) {
      return jsonResponse({ message: "插入记录失败，未获取到新记录 ID" }, 500);
    }

    if (Array.isArray(custom_fields) && custom_fields.length > 0) {
      const batchStmts: ReturnType<Env["DB"]["prepare"]>[] = [];
      for (const v of custom_fields) {
        if (!v?.category_id || !v?.option_id) continue;
        // 确保 option_id 属于 category_id，避免写脏数据
        const ok = await env.DB.prepare(
          "SELECT id FROM custom_options WHERE id = ? AND category_id = ? LIMIT 1"
        )
          .bind(v.option_id, v.category_id)
          .first<{ id: number }>();
        if (!ok?.id) continue;
        batchStmts.push(
          env.DB.prepare(
            "INSERT INTO custom_record_values (record_id, category_id, option_id) VALUES (?, ?, ?)"
          ).bind(recordId, v.category_id, v.option_id)
        );
      }
      if (batchStmts.length > 0) await env.DB.batch(batchStmts);
    }

    if (Array.isArray(parts) && parts.length > 0) {
      for (const p of parts) {
        const stmt = env.DB.prepare(
          `INSERT INTO parts (record_id, part_name, part_model, quantity, unit_price, supplier)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          recordId,
          p.part_name,
          p.part_model || "",
          p.quantity,
          p.unit_price,
          p.supplier || ""
        );
        await stmt.run();
      }
    }

    if (Array.isArray(media) && media.length > 0) {
      for (const m of media) {
        if (!m.url || !m.type || !m.r2_key) continue;
        const stmt = env.DB.prepare(
          `INSERT INTO media (record_id, type, url, r2_key)
           VALUES (?, ?, ?, ?)`
        ).bind(recordId, m.type, m.url, m.r2_key);
        await stmt.run();
      }
    }

    await writeOperationLog(env, request, s.user, {
      action: "record.create",
      resourceType: "maintenance_record",
      resourceId: recordId,
      summary: `新增维保记录，编号 ${recordId}`,
    });
    return jsonResponse({ id: recordId, share_token: shareToken }, 201);
  } catch (e: unknown) {
    console.error("POST /api/records error:", e);
    return jsonResponse(
      { message: "服务器错误", error: (e as Error)?.message },
      500
    );
  }
};

