import type { Env } from "../../types";
import { jsonResponse, queryCustomFieldDisplay } from "../records/_helpers";

/** 与生成逻辑一致：16 字节 → 32 位十六进制 */
const SHARE_TOKEN_RE = /^[a-f0-9]{32}$/i;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const token = decodeURIComponent(String(params.id || "").trim());

  if (!token || !SHARE_TOKEN_RE.test(token)) {
    return jsonResponse({ message: "无效的分享链接" }, 400);
  }

  const recordStmt = env.DB.prepare(
    "SELECT * FROM maintenance_records WHERE share_token = ?"
  ).bind(token);
  const record = (await recordStmt.first()) as Record<string, unknown> | null;

  if (!record) {
    return jsonResponse({ message: "未找到记录" }, 404);
  }

  const recordId = Number(record.id);

  const partsStmt = env.DB.prepare(
    "SELECT * FROM parts WHERE record_id = ?"
  ).bind(recordId);
  const mediaStmt = env.DB.prepare(
    "SELECT * FROM media WHERE record_id = ?"
  ).bind(recordId);

  const partsRes = await partsStmt.all();
  const mediaRes = await mediaStmt.all();

  const customFieldDisplay = await queryCustomFieldDisplay(env.DB, recordId);

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
