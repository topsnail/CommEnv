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
  const denied = requirePermission(s.user, PERMISSIONS.DOCUMENTS_READ);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const vehicleId = Number(url.searchParams.get("vehicleId") || "0");
  if (!vehicleId) {
    return json({ message: "缺少 vehicleId" }, 400);
  }

  const res = await context.env.DB.prepare(
    "SELECT id, vehicle_id, category, title, file_name, mime, r2_key, size, created_at FROM vehicle_documents WHERE vehicle_id = ? ORDER BY id DESC"
  )
    .bind(vehicleId)
    .all();
  return json({ list: res.results || [] });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.DOCUMENTS_WRITE);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return json({ message: "请求体不是有效 JSON" }, 400);
  }

  const vehicleId = Number(body.vehicle_id || 0);
  const category = (body.category != null ? String(body.category) : "").trim();
  const file_name = (body.file_name != null ? String(body.file_name) : "").trim();
  const r2_key = (body.r2_key != null ? String(body.r2_key) : "").trim();
  if (!vehicleId || !category || !file_name || !r2_key) {
    return json({ message: "缺少 vehicle_id、category、file_name 或 r2_key" }, 400);
  }

  const v = await context.env.DB.prepare("SELECT id FROM vehicles WHERE id = ? LIMIT 1")
    .bind(vehicleId)
    .first<{ id: number }>();
  if (!v) return json({ message: "车辆不存在" }, 404);

  const title = body.title != null ? String(body.title) : null;
  const mime = body.mime != null ? String(body.mime) : null;
  const size = body.size != null ? Number(body.size) : null;

  const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await context.env.DB.prepare(
    `INSERT INTO vehicle_documents (vehicle_id, category, title, file_name, mime, r2_key, size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(
      vehicleId,
      category,
      title,
      file_name,
      mime,
      r2_key,
      Number.isFinite(size as number) ? size : null
    )
    .run();

  const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);
    await writeOperationLog(context.env, context.request, s.user, {
      action: "vehicle_document.create",
      resourceType: "vehicle_document",
      resourceId: id,
      summary: `登记车辆附件「${file_name}」，车辆编号 ${vehicleId}`,
    });
  return json({ id }, 201);
};
