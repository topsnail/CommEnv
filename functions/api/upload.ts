import type { Env } from "../types";
import { PERMISSIONS } from "../lib/permissions";
import { writeOperationLog } from "../lib/operationLog";
import { requireSession, requirePermission } from "./auth/_helpers";

/** Workers 类型定义里 getAll 常为 string[]，运行时 multipart 下实为 File */
function getUploadedFiles(formData: FormData, field: string): File[] {
  return formData.getAll(field) as unknown as File[];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context);
  if (!session.ok) return session.response;

  const { request, env } = context;

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response(JSON.stringify({ message: "Content-Type 必须为 multipart/form-data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  const scope = (formData.get("scope") as string | null) || "record_media";

  if (scope === "vehicle_document") {
    const denied = requirePermission(session.user, PERMISSIONS.DOCUMENTS_WRITE);
    if (denied) return denied;

    const vehicleId = Number(formData.get("vehicle_id") || 0);
    const category = String(formData.get("category") || "").trim();
    if (!vehicleId || !category) {
      return new Response(JSON.stringify({ message: "车辆附件上传需要 vehicle_id 与 category" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const v = await env.DB.prepare("SELECT id FROM vehicles WHERE id = ? LIMIT 1")
      .bind(vehicleId)
      .first<{ id: number }>();
    if (!v) {
      return new Response(JSON.stringify({ message: "车辆不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const files = getUploadedFiles(formData, "files");
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ message: "未找到 files 字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (files.length > 1) {
      return new Response(JSON.stringify({ message: "车辆附件请单次上传 1 个文件" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    const file = files[0];
    const mime = file.type || "";
    const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = mime.startsWith("image/");
    if (!isPdf && !isImage) {
      return new Response(JSON.stringify({ message: "仅支持 PDF 或图片" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ message: "文件不能超过 20MB" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "bin");
    const key = `vehicle-docs/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: mime || "application/octet-stream" },
    });

    const urlObj = new URL(request.url);
    const url = `${urlObj.origin}/api/media/${key}`;

    await writeOperationLog(env, request, session.user, {
      action: "upload.vehicle_document",
      resourceType: "vehicle",
      resourceId: vehicleId,
      summary: `上传车辆附件文件「${file.name}」，车辆编号 ${vehicleId}`,
    });

    return new Response(
      JSON.stringify({
        files: [
          {
            type: isPdf ? "pdf" : "image",
            url,
            r2_key: key,
            filename: file.name,
            size: file.size,
            mime,
            vehicle_id: vehicleId,
            category,
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const denied = requirePermission(session.user, PERMISSIONS.RECORDS_WRITE);
  if (denied) return denied;

  const files = getUploadedFiles(formData, "files");

  if (!files || files.length === 0) {
    return new Response(JSON.stringify({ message: "未找到 files 字段" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
  const MAX_FILES_PER_REQUEST = 15;

  if (files.length > MAX_FILES_PER_REQUEST) {
    return new Response(JSON.stringify({ message: `单次最多上传 ${MAX_FILES_PER_REQUEST} 个文件` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: Array<{ type: string; url: string; r2_key: string; filename: string; size: number }> = [];
  for (const file of files) {
    const mime = file.type || "";
    const isVideo = mime.startsWith("video/");
    const isImage = mime.startsWith("image/");
    if (!isImage && !isVideo) {
      return new Response(JSON.stringify({ message: "不支持的文件类型，仅允许图片或视频" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ message: isVideo ? "视频不能超过 50MB" : "图片不能超过 15MB" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "";
    const type = mime.startsWith("video/") ? "video" : "image";
    const key = `media/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: mime || "application/octet-stream",
      },
    });

    const urlObj = new URL(request.url);
    const url = `${urlObj.origin}/api/media/${key}`;

    results.push({
      type,
      url,
      r2_key: key,
      filename: file.name,
      size: file.size,
    });
  }

  await writeOperationLog(env, request, session.user, {
    action: "upload.record_media",
    summary: `上传维保现场图片/视频，共 ${results.length} 个文件`,
  });

  return new Response(JSON.stringify({ files: results }), {
    headers: { "Content-Type": "application/json" },
  });
};
