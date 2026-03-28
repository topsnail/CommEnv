import type { Env } from "../../../types";
import { PERMISSIONS } from "../../../lib/permissions";
import { requireSession, requirePermission, requireSettingsAuth } from "../../auth/_helpers";
import { ensureDefaultRootCategory, getDefaultRootCategoryId } from "../_rootCategory";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

async function generateUniqueKey(env: Env, baseKey: string): Promise<string> {
  // D1/SQLite 支持 LIMIT
  const existsStmt = env.DB.prepare("SELECT id FROM custom_categories WHERE key = ? LIMIT 1");
  let key = baseKey;
  for (let i = 0; i < 50; i++) {
    const res: any = await existsStmt.bind(key).first();
    if (!res) return key;
    key = `${baseKey}-${i + 1}`;
  }
  return `${baseKey}-${Date.now()}`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_READ);
  if (denied) return denied;

  await ensureDefaultRootCategory(context.env);
  const res: any = await context.env.DB.prepare(
    "SELECT id, label, key, parent_category_id, bind_to FROM custom_categories ORDER BY id ASC"
  ).all();

  return new Response(JSON.stringify({ list: res.results || [] }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const err = await requireSettingsAuth(context);
  if (err) return err;

  let body: { label?: string; parent_category_id?: number | null; bind_to?: string | null };
  try {
    body = (await context.request.json()) as any;
  } catch {
    return new Response(JSON.stringify({ message: "请求体不是有效 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const label = (body.label != null ? String(body.label) : "").trim();
  if (!label) {
    return new Response(JSON.stringify({ message: "缺少 label" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await ensureDefaultRootCategory(context.env);
  const rootId = await getDefaultRootCategoryId(context.env);
  if (rootId == null) {
    return new Response(JSON.stringify({ message: "无法创建根分类，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let parentCategoryId =
    body.parent_category_id != null ? (Number(body.parent_category_id) || null) : null;
  // 未指定父分类时，默认挂在固定根「维保项目」下
  if (parentCategoryId == null) {
    parentCategoryId = rootId;
  }

  const bindToRaw = body.bind_to != null ? String(body.bind_to) : "";
  const bindTo = bindToRaw.trim();
  const bindToNormalized = bindTo === "" || bindTo.toLowerCase() === "null" ? null : bindTo;
  const BINDS: Array<string> = ["device_name", "device_model", "technician"];
  if (bindToNormalized != null && !BINDS.includes(bindToNormalized)) {
    return new Response(JSON.stringify({ message: "bind_to 不支持，仅允许 device_name/device_model/technician" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parentStmt = context.env.DB.prepare("SELECT id FROM custom_categories WHERE id = ? LIMIT 1");
  const parentRes: any = await parentStmt.bind(parentCategoryId).first();
  if (!parentRes) {
    return new Response(JSON.stringify({ message: "parent_category_id 不存在" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseKey = slugify(label) || `category-${Date.now()}`;
  const key = await generateUniqueKey(context.env, baseKey);

  const insert = context.env.DB.prepare(
    "INSERT INTO custom_categories (label, key, parent_category_id, bind_to) VALUES (?, ?, ?, ?)"
  ).bind(label, key, parentCategoryId, bindToNormalized);

  const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await insert.run();
  const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);

  if (!id) {
    return new Response(JSON.stringify({ message: "创建失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id, key }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

