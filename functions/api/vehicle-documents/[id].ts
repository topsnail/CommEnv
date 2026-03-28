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

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.DOCUMENTS_DELETE);
  if (denied) return denied;

  const id = Number(context.params.id);
  if (!id) return json({ message: "无效 ID" }, 400);

  const row = await context.env.DB.prepare("SELECT r2_key FROM vehicle_documents WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ r2_key: string }>();
  if (!row) return json({ message: "未找到" }, 404);

  await context.env.DB.prepare("DELETE FROM vehicle_documents WHERE id = ?").bind(id).run();
  try {
    if (row.r2_key) await context.env.R2_BUCKET.delete(row.r2_key);
  } catch {
    /* ignore */
  }

  await writeOperationLog(context.env, context.request, s.user, {
    action: "vehicle_document.delete",
    resourceType: "vehicle_document",
    resourceId: id,
    summary: `删除车辆附件记录，编号 ${id}`,
  });
  return json({ message: "删除成功" });
};
