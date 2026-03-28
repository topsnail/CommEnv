import type { Env } from "../../../types";
import { PERMISSIONS } from "../../../lib/permissions";
import { requireSession, requirePermission, requireSettingsAuth } from "../../auth/_helpers";
import { DEFAULT_ROOT_CATEGORY_KEY } from "../_rootCategory";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.RECORDS_READ);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const categoryId = Number(url.searchParams.get("category_id") || "0");
  if (!categoryId) {
    return new Response(JSON.stringify({ message: "缺少 category_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res: any = await context.env.DB.prepare(
    "SELECT id, category_id, label, parent_option_id FROM custom_options WHERE category_id = ? ORDER BY label ASC"
  ).bind(categoryId).all();

  return new Response(JSON.stringify({ list: res.results || [] }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const err = await requireSettingsAuth(context);
  if (err) return err;

  let body: { category_id?: number; label?: string; parent_option_id?: number | null };
  try {
    body = (await context.request.json()) as any;
  } catch {
    return new Response(JSON.stringify({ message: "请求体不是有效 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const categoryId = Number(body.category_id || 0);
  const label = (body.label != null ? String(body.label) : "").trim();
  if (!categoryId || !label) {
    return new Response(JSON.stringify({ message: "缺少 category_id 或 label" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const catRes: any = await context.env.DB.prepare(
    "SELECT id, parent_category_id FROM custom_categories WHERE id = ? LIMIT 1"
  ).bind(categoryId).first();
  if (!catRes) {
    return new Response(JSON.stringify({ message: "category_id 不存在" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parentCategoryId: number | null = catRes.parent_category_id != null ? Number(catRes.parent_category_id) : null;
  const parentOptionId = body.parent_option_id != null ? (Number(body.parent_option_id) || null) : null;
  let parentIsDefaultRoot = false;
  if (parentCategoryId != null) {
    const parentRow: any = await context.env.DB.prepare(
      "SELECT key FROM custom_categories WHERE id = ? LIMIT 1"
    ).bind(parentCategoryId).first();
    parentIsDefaultRoot = parentRow?.key === DEFAULT_ROOT_CATEGORY_KEY;
  }

  if (parentCategoryId != null && !parentIsDefaultRoot) {
    // 子分类：必须绑定父分类选项
    if (!parentOptionId) {
      return new Response(JSON.stringify({ message: "该分类有父分类，必须填写 parent_option_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const parentOptionRes: any = await context.env.DB.prepare(
      "SELECT id FROM custom_options WHERE id = ? AND category_id = ? LIMIT 1"
    ).bind(parentOptionId, parentCategoryId).first();
    if (!parentOptionRes) {
      return new Response(JSON.stringify({ message: "parent_option_id 不属于该父分类" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    // 根分类（或父为固定根分类）：parent_option_id 必须为空
    if (parentOptionId != null) {
      return new Response(JSON.stringify({ message: "当前分类不应填写 parent_option_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const insert = context.env.DB.prepare(
    "INSERT INTO custom_options (category_id, label, parent_option_id) VALUES (?, ?, ?)"
  ).bind(categoryId, label, parentOptionId);

  const res: { meta?: { last_row_id?: number }; lastInsertRowId?: number } = await insert.run();
  const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);

  if (!id) {
    return new Response(JSON.stringify({ message: "创建失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

