import type { Env } from "../../../types";
import { requireSettingsAuth } from "../../auth/_helpers";

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

  let body: { label?: string };
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

  await env.DB.prepare(
    "UPDATE custom_options SET label = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(label, id)
    .run();

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

  await env.DB.prepare("DELETE FROM custom_options WHERE id = ?").bind(id).run();
  return new Response(JSON.stringify({ message: "删除成功" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

