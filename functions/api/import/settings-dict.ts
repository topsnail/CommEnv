import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { requireSession, requirePermission } from "../auth/_helpers";

type Kind = "deviceName" | "deviceModel" | "technician";

function tableForKind(kind: string): string | null {
  if (kind === "deviceName") return "device_names";
  if (kind === "deviceModel") return "device_models";
  if (kind === "technician") return "technicians";
  return null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * 批量导入字典项（INSERT OR IGNORE）。需 settings.write
 * Body: { items: { kind: "deviceName"|"deviceModel"|"technician", value: string }[] }
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.SETTINGS_WRITE);
  if (denied) return denied;

  let body: { items?: { kind?: string; value?: string }[] };
  try {
    body = await context.request.json();
  } catch {
    return json({ message: "请求体格式错误" }, 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return json({ message: "items 不能为空" }, 400);
  if (items.length > 5000) return json({ message: "单次最多 5000 条" }, 400);

  let inserted = 0;
  let skipped = 0;

  for (const it of items) {
    const kind = String(it.kind || "").trim();
    const value = String(it.value || "").trim();
    if (!value) {
      skipped++;
      continue;
    }
    const table = tableForKind(kind);
    if (!table) {
      skipped++;
      continue;
    }
    try {
      const r = await context.env.DB.prepare(`INSERT OR IGNORE INTO ${table} (value) VALUES (?)`)
        .bind(value)
        .run();
      const meta = r.meta as { changes?: number } | undefined;
      const changes = Number(meta?.changes ?? 0);
      if (changes > 0) inserted++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return json({ ok: true, inserted, skipped, total: items.length });
};
