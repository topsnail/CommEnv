export const MAX_IMAGES = 10;
export const MAX_VIDEOS = 3;

/** 32 位十六进制，与 16 字节随机一致 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const REPAIR_STATUS_VALUES = ["pending", "in_progress", "done", "waiting_parts"] as const;
const REPAIR_STATUS_SET = new Set<string>(REPAIR_STATUS_VALUES);

export function isValidRepairStatus(s: string): boolean {
  return REPAIR_STATUS_SET.has(s);
}

function parseOptionalFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export interface ParsedPartRow {
  part_name: string;
  part_model: string;
  quantity: number;
  unit_price: number | null;
  supplier: string;
}

export interface ParsedRecordBody {
  device_code: string;
  device_name: string;
  device_model: string;
  fault_description: string;
  process: string;
  solution: string;
  maintenance_date: string;
  technician: string;
  vehicle_id?: number | null;
  labor_hours: number | null;
  labor_cost: number | null;
  material_cost: number | null;
  other_cost: number | null;
  total_cost: number | null;
  meter_reading: number | null;
  repair_status: string;
  root_cause: string;
  parts: ParsedPartRow[];
  media: { type?: string; url?: string; r2_key?: string }[];
  custom_fields: { category_id?: number; option_id?: number }[];
}

export function parsePartsArray(raw: unknown): ParsedPartRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedPartRow[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const part_name = p.part_name != null ? String(p.part_name).trim() : "";
    if (!part_name) continue;
    const qty = Number(p.quantity);
    const quantity = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
    out.push({
      part_name,
      part_model: p.part_model != null ? String(p.part_model).trim() : "",
      quantity,
      unit_price: parseOptionalFiniteNumber(p.unit_price),
      supplier: p.supplier != null ? String(p.supplier).trim() : "",
    });
  }
  return out;
}

export function parseRecordBody(body: Record<string, unknown>): ParsedRecordBody {
  const rawCustomFields = Array.isArray(body.custom_fields) ? body.custom_fields : [];
  const custom_fields = rawCustomFields
    .map((v) => {
      if (v == null || typeof v !== "object") return null;
      const obj = v as Record<string, unknown>;
      const category_id = obj.category_id != null ? Number(obj.category_id) : undefined;
      const option_id = obj.option_id != null ? Number(obj.option_id) : undefined;
      return {
        category_id: typeof category_id === "number" && !Number.isNaN(category_id) ? category_id : undefined,
        option_id: typeof option_id === "number" && !Number.isNaN(option_id) ? option_id : undefined,
      };
    })
    .filter(Boolean) as { category_id?: number; option_id?: number }[];

  let vehicle_id: number | null = null;
  if (body.vehicle_id != null) {
    const v = Number(body.vehicle_id);
    vehicle_id = Number.isFinite(v) && v > 0 ? v : null;
  }

  const labor_hours = parseOptionalFiniteNumber(body.labor_hours);
  const labor_cost = parseOptionalFiniteNumber(body.labor_cost);
  const material_cost = parseOptionalFiniteNumber(body.material_cost);
  const other_cost = parseOptionalFiniteNumber(body.other_cost);
  let total_cost = parseOptionalFiniteNumber(body.total_cost);
  if (total_cost == null && (labor_cost != null || material_cost != null || other_cost != null)) {
    total_cost = (labor_cost ?? 0) + (material_cost ?? 0) + (other_cost ?? 0);
  }
  const meter_reading = parseOptionalFiniteNumber(body.meter_reading);

  let repair_status = "done";
  if (body.repair_status != null && String(body.repair_status).trim() !== "") {
    repair_status = String(body.repair_status).trim();
  }

  const root_cause =
    body.root_cause != null ? String(body.root_cause).trim().slice(0, 500) : "";

  return {
    device_code: body.device_code != null ? String(body.device_code).trim() : "",
    device_name: body.device_name != null ? String(body.device_name).trim() : "",
    device_model: body.device_model != null ? String(body.device_model).trim() : "",
    fault_description: body.fault_description != null ? String(body.fault_description).trim() : "",
    process: body.process != null ? String(body.process).trim() : "",
    solution: body.solution != null ? String(body.solution).trim() : "",
    maintenance_date: body.maintenance_date != null ? String(body.maintenance_date).trim() : "",
    technician: body.technician != null ? String(body.technician).trim() : "",
    vehicle_id,
    labor_hours,
    labor_cost,
    material_cost,
    other_cost,
    total_cost,
    meter_reading,
    repair_status,
    root_cause,
    parts: parsePartsArray(body.parts),
    media: Array.isArray(body.media) ? body.media : [],
    custom_fields,
  };
}

export function countMediaByType(media: { type?: string }[]): { images: number; videos: number } {
  let images = 0;
  let videos = 0;
  for (const m of media) {
    if (m?.type === "image") images++;
    else if (m?.type === "video") videos++;
  }
  return { images, videos };
}

export function validateRecordPayload(
  payload: ParsedRecordBody
): { ok: true } | { ok: false; message: string; status: number } {
  const { device_code, device_name, fault_description, maintenance_date, technician, media, repair_status } =
    payload;
  if (!device_code || !device_name || !fault_description || !maintenance_date || !technician) {
    return { ok: false, message: "缺少必填字段", status: 400 };
  }
  if (!REPAIR_STATUS_SET.has(repair_status)) {
    return { ok: false, message: "维修状态不合法", status: 400 };
  }
  const { images, videos } = countMediaByType(media);
  if (images > MAX_IMAGES || videos > MAX_VIDEOS) {
    return {
      ok: false,
      message: `最多 ${MAX_IMAGES} 张图片、${MAX_VIDEOS} 个视频`,
      status: 400,
    };
  }
  return { ok: true };
}

/** 维保记录自定义下拉：服务端拼好分类/选项文案（详情与分享共用） */
export type CustomFieldDisplayRow = {
  category_id: number;
  option_id: number;
  category_label: string;
  option_label: string;
};

export async function queryCustomFieldDisplay(
  db: {
    prepare: (sql: string) => {
      bind: (...args: unknown[]) => { all: () => Promise<{ results?: unknown[] | null }> };
    };
  },
  recordId: number
): Promise<CustomFieldDisplayRow[]> {
  const customValuesRes = await db
    .prepare(
      `SELECT v.category_id AS category_id, v.option_id AS option_id,
              COALESCE(c.label, '（分类已删除）') AS category_label,
              COALESCE(o.label, '（选项已删除）') AS option_label
       FROM custom_record_values v
       LEFT JOIN custom_categories c ON c.id = v.category_id
       LEFT JOIN custom_options o ON o.id = v.option_id
       WHERE v.record_id = ?`
    )
    .bind(recordId)
    .all();
  return (customValuesRes.results || []) as CustomFieldDisplayRow[];
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
