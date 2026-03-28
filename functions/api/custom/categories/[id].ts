import type { Env } from "../../../types";
import { requireSettingsAuth } from "../../auth/_helpers";
import {
  ensureDefaultRootCategory,
  getDefaultRootCategoryId,
  DEFAULT_ROOT_CATEGORY_KEY,
  DEFAULT_ROOT_CATEGORY_LABEL,
} from "../_rootCategory";

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const err = await requireSettingsAuth(context);
  if (err) return err;

  const { params, request, env } = context;
  const id = Number(params.id);
  if (!id) {
    return new Response(JSON.stringify({ message: "无效 id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { label?: string; parent_category_id?: number | null; bind_to?: string | null };
  try {
    body = (await request.json()) as any;
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

  await ensureDefaultRootCategory(env);
  const rootId = await getDefaultRootCategoryId(env);

  const existingRow: any = await env.DB.prepare("SELECT key FROM custom_categories WHERE id = ? LIMIT 1")
    .bind(id)
    .first();

  let parentCategoryId =
    body.parent_category_id != null ? (Number(body.parent_category_id) || null) : null;

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

  if (existingRow?.key === DEFAULT_ROOT_CATEGORY_KEY) {
    if (label !== DEFAULT_ROOT_CATEGORY_LABEL) {
      return new Response(JSON.stringify({ message: "固定根分类名称不可修改" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (bindToNormalized != null) {
      return new Response(JSON.stringify({ message: "固定根分类不可绑定维保字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    parentCategoryId = null;
  } else {
    if (parentCategoryId == null && rootId != null) {
      parentCategoryId = rootId;
    }
    if (parentCategoryId === id) {
      return new Response(JSON.stringify({ message: "父分类不能为自身" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (parentCategoryId != null) {
    const parentRes: any = await env.DB.prepare(
      "SELECT id FROM custom_categories WHERE id = ? LIMIT 1"
    ).bind(parentCategoryId).first();
    if (!parentRes) {
      return new Response(JSON.stringify({ message: "parent_category_id 不存在" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  await env.DB.prepare(
    "UPDATE custom_categories SET label = ?, parent_category_id = ?, bind_to = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(label, parentCategoryId, bindToNormalized, id).run();

  return new Response(JSON.stringify({ message: "更新成功" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const err = await requireSettingsAuth(context);
  if (err) return err;

  const { params, env } = context;
  const id = Number(params.id);
  if (!id) {
    return new Response(JSON.stringify({ message: "无效 id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const row: any = await env.DB.prepare("SELECT key FROM custom_categories WHERE id = ? LIMIT 1")
    .bind(id)
    .first();
  if (row?.key === DEFAULT_ROOT_CATEGORY_KEY) {
    return new Response(JSON.stringify({ message: "系统固定根分类「维保项目」不可删除" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await env.DB.prepare("DELETE FROM custom_categories WHERE id = ?").bind(id).run();
  return new Response(JSON.stringify({ message: "删除成功" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

