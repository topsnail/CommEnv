import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { writeOperationLog } from "../../lib/operationLog";
import { requireSession, requirePermission } from "../auth/_helpers";
import {
  parseRecordBody,
  validateRecordPayload,
  jsonResponse,
  generateShareToken,
  queryCustomFieldDisplay,
} from "./_helpers";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_READ);
  if (denied) return denied;
  const { env, params } = context;
  const id = Number(params.id);

  if (!id) {
    return jsonResponse({ message: "无效 ID" }, 400);
  }

  const recordStmt = env.DB.prepare(
    "SELECT * FROM maintenance_records WHERE id = ?"
  ).bind(id);
  const record = (await recordStmt.first()) as Record<string, unknown> | null;

  if (!record) {
    return jsonResponse({ message: "未找到记录" }, 404);
  }

  if (record.share_token == null || String(record.share_token).trim() === "") {
    const token = generateShareToken();
    await env.DB.prepare("UPDATE maintenance_records SET share_token = ? WHERE id = ?").bind(token, id).run();
    record.share_token = token;
  }

  const partsStmt = env.DB.prepare(
    "SELECT * FROM parts WHERE record_id = ?"
  ).bind(id);
  const mediaStmt = env.DB.prepare(
    "SELECT * FROM media WHERE record_id = ?"
  ).bind(id);

  const partsRes = await partsStmt.all();
  const mediaRes = await mediaStmt.all();

  const customFieldDisplay = await queryCustomFieldDisplay(env.DB, id);

  return jsonResponse({
    ...record,
    parts: partsRes.results || [],
    media: mediaRes.results || [],
    customFields: customFieldDisplay.map((r) => ({
      category_id: r.category_id,
      option_id: r.option_id,
    })),
    customFieldDisplay,
  });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_WRITE);
  if (denied) return denied;
  const { env, params, request } = context;
  const id = Number(params.id);

  if (!id) {
    return jsonResponse({ message: "无效 ID" }, 400);
  }

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

  const vehicleIdVal = vehicle_id && vehicle_id > 0 ? vehicle_id : null;

  try {
    const exists = await env.DB.prepare("SELECT id FROM maintenance_records WHERE id = ? LIMIT 1")
      .bind(id)
      .first<{ id: number }>();
    if (!exists?.id) {
      return jsonResponse({ message: "未找到记录" }, 404);
    }

    const now = new Date().toISOString();

    const oldMediaRows = await env.DB.prepare(
      "SELECT r2_key FROM media WHERE record_id = ?"
    )
      .bind(id)
      .all();
    const oldR2Keys = new Set(
      ((oldMediaRows.results || []) as { r2_key: string }[])
        .map((r) => r.r2_key)
        .filter(Boolean)
    );
    const newR2Keys = new Set(
      media.filter((m) => m?.r2_key).map((m) => m.r2_key)
    );
    const keysToDelete = [...oldR2Keys].filter((k) => !newR2Keys.has(k));

    const updateStmt = env.DB.prepare(
      `UPDATE maintenance_records SET
        device_code = ?, device_name = ?, device_model = ?,
        fault_description = ?, process = ?, solution = ?,
        maintenance_date = ?, technician = ?, vehicle_id = ?,
        labor_hours = ?, labor_cost = ?, material_cost = ?, other_cost = ?, total_cost = ?,
        meter_reading = ?, repair_status = ?, root_cause = ?,
        updated_at = ?
       WHERE id = ?`
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
      now,
      id
    );
    await updateStmt.run();

    // 覆盖自定义下拉字段
    await env.DB.prepare("DELETE FROM custom_record_values WHERE record_id = ?").bind(id).run();
    if (Array.isArray(custom_fields) && custom_fields.length > 0) {
      const batchStmts: ReturnType<Env["DB"]["prepare"]>[] = [];
      for (const v of custom_fields) {
        if (!v?.category_id || !v?.option_id) continue;
        const ok = await env.DB.prepare(
          "SELECT id FROM custom_options WHERE id = ? AND category_id = ? LIMIT 1"
        )
          .bind(v.option_id, v.category_id)
          .first<{ id: number }>();
        if (!ok?.id) continue;
        batchStmts.push(
          env.DB.prepare(
            "INSERT INTO custom_record_values (record_id, category_id, option_id) VALUES (?, ?, ?)"
          ).bind(id, v.category_id, v.option_id)
        );
      }
      if (batchStmts.length > 0) await env.DB.batch(batchStmts);
    }

    await env.DB.prepare("DELETE FROM parts WHERE record_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM media WHERE record_id = ?").bind(id).run();

    const batchStmts: ReturnType<Env["DB"]["prepare"]>[] = [];
    if (Array.isArray(parts) && parts.length > 0) {
      for (const p of parts) {
        batchStmts.push(
          env.DB.prepare(
            "INSERT INTO parts (record_id, part_name, part_model, quantity, unit_price, supplier) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(id, p.part_name, p.part_model || "", p.quantity, p.unit_price, p.supplier || "")
        );
      }
    }
    if (Array.isArray(media) && media.length > 0) {
      for (const m of media) {
        if (!m.url || !m.type || !m.r2_key) continue;
        batchStmts.push(
          env.DB.prepare(
            "INSERT INTO media (record_id, type, url, r2_key) VALUES (?, ?, ?, ?)"
          ).bind(id, m.type, m.url, m.r2_key)
        );
      }
    }
    if (batchStmts.length > 0) {
      await env.DB.batch(batchStmts);
    }

    for (const key of keysToDelete) {
      try {
        await env.R2_BUCKET.delete(key);
      } catch (_) {}
    }

    await writeOperationLog(env, request, s.user, {
      action: "record.update",
      resourceType: "maintenance_record",
      resourceId: id,
      summary: `编辑维保记录，编号 ${id}`,
    });
    return jsonResponse({ message: "更新成功" });
  } catch (e: unknown) {
    return jsonResponse(
      { message: "服务器错误", error: (e as Error)?.message },
      500
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_DELETE);
  if (denied) return denied;
  const { env, params } = context;
  const id = Number(params.id);

  if (!id) {
    return jsonResponse({ message: "无效 ID" }, 400);
  }

  const mediaRows = await env.DB.prepare(
    "SELECT r2_key FROM media WHERE record_id = ?"
  )
    .bind(id)
    .all();
  const list = (mediaRows.results || []) as { r2_key: string }[];
  for (const row of list) {
    if (row.r2_key) {
      try {
        await env.R2_BUCKET.delete(row.r2_key);
      } catch (_) {}
    }
  }

  // 显式删子表，避免部分环境下外键未启用时产生孤儿行
  await env.DB.prepare("DELETE FROM custom_record_values WHERE record_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM parts WHERE record_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM media WHERE record_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM maintenance_records WHERE id = ?").bind(id).run();

  await writeOperationLog(env, context.request, s.user, {
    action: "record.delete",
    resourceType: "maintenance_record",
    resourceId: id,
    summary: `删除维保记录，编号 ${id}`,
  });
  return jsonResponse({ message: "删除成功" });
};

