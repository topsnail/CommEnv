import type { Env } from "../../types";

/** 与 migrations/0007 一致，用于识别系统固定根分类 */
export const DEFAULT_ROOT_CATEGORY_KEY = "default-root-weibao-xiang-mu";
export const DEFAULT_ROOT_CATEGORY_LABEL = "维保项目";

export async function ensureDefaultRootCategory(env: Env): Promise<number> {
  const found = await env.DB.prepare("SELECT id FROM custom_categories WHERE key = ? LIMIT 1")
    .bind(DEFAULT_ROOT_CATEGORY_KEY)
    .first<{ id: number }>();
  if (found?.id) return found.id;

  const insert = env.DB.prepare(
    "INSERT INTO custom_categories (label, key, parent_category_id, bind_to) VALUES (?, ?, NULL, NULL)"
  ).bind(DEFAULT_ROOT_CATEGORY_LABEL, DEFAULT_ROOT_CATEGORY_KEY);
  const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await insert.run();
  return Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);
}

export async function getDefaultRootCategoryId(env: Env): Promise<number | null> {
  const row = await env.DB.prepare("SELECT id FROM custom_categories WHERE key = ? LIMIT 1")
    .bind(DEFAULT_ROOT_CATEGORY_KEY)
    .first<{ id: number }>();
  return row?.id ?? null;
}
