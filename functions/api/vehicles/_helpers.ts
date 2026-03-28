import { validateVehicleFormattedFields } from "./_fieldValidators";

export interface VehiclePayload {
  vehicle_code: string;
  license_plate: string;
  brand: string;
  model: string;
  vin: string;
  engine_no: string;
  vehicle_type: string;
  owner_name: string;
  owner_address: string;
  usage_nature: string;
  registration_date: string;
  issue_date: string;
  approved_passengers: number | null;
  curb_weight: string;
  overall_dimensions: string;
  mandatory_scrap_date: string;
  purchase_date: string;
  responsible_person: string;
  current_status: "in_use" | "idle" | "repair" | "scrapped";
  insurance_mandatory_start: string;
  insurance_mandatory_end: string;
  insurance_commercial_start: string;
  insurance_commercial_end: string;
  insurance_types: string;
  insurance_premium: number | null;
  insurer: string;
  insurance_mandatory_policy_no: string;
  insurance_commercial_policy_no: string;
  annual_inspection_due: string;
  environmental_test_date: string;
  driving_license_valid_until: string;
  road_transport_certificate_valid_until: string;
  warning_days: number;
  notes: string;
}

/** D1 部分字段可能为 bigint，直接 JSON.stringify 会抛错 */
function jsonStringifySafe(data: unknown): string {
  return JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(jsonStringifySafe(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

/** D1 不支持 bind(undefined)，否则整句 UPDATE/INSERT 会失败（常表现为 500） */
export function d1Text(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

/** 可空数值：INTEGER / REAL，undefined → null */
export function d1NumberOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 可空整数（核定载人数等） */
export function d1IntOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** 未执行 migrations/0012 等时的典型 SQLite / D1 报错 */
export function vehicleSchemaHintFromError(err: unknown): string | undefined {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  if (!msg) return undefined;
  const lower = msg.toLowerCase();
  const isNoCol = lower.includes("no such column") || lower.includes("has no column named");
  const isNoVehiclesTable =
    lower.includes("no such table") && (lower.includes("vehicles") || lower.includes("maintenance_records"));
  if (!isNoCol && !isNoVehiclesTable) return undefined;

  // 任意缺列 / 缺表均提示补迁移（D1 报错文案可能不包含具体列名）
  if (isNoVehiclesTable) {
    return "本地数据库缺少车辆相关表（vehicles 可能未初始化）。请在项目根目录执行：npm run d1:migrate，然后重启 wrangler pages dev。若仍失败，可删除本地 .wrangler 后再执行 npm run d1:migrate（会清空本地 D1 数据）。";
  }
  return "本地数据库表结构与当前代码不一致（缺少列）。请在项目根目录执行：npm run d1:migrate，然后重启 wrangler pages dev。若仍失败，可删除本地 .wrangler 后再执行 npm run d1:migrate（会清空本地 D1 数据）。";
}

export function parseVehicleBody(body: Record<string, unknown>): VehiclePayload {
  const status = String(body.current_status ?? "in_use").trim() as VehiclePayload["current_status"];
  const premiumRaw = body.insurance_premium;
  const premium =
    premiumRaw == null || String(premiumRaw).trim() === "" ? null : Number(premiumRaw);
  const warningRaw = Number(body.warning_days ?? 30);
  const license_plate = String(body.license_plate ?? "").trim();
  const vehicle_code_in = String(body.vehicle_code ?? "").trim();
  const approvedRaw = body.approved_passengers;
  let approved_passengers: number | null = null;
  if (approvedRaw != null && String(approvedRaw).trim() !== "") {
    const n = Number(approvedRaw);
    if (Number.isFinite(n) && n >= 0) approved_passengers = Math.floor(n);
  }
  return {
    vehicle_code: vehicle_code_in || license_plate,
    license_plate,
    brand: String(body.brand ?? "").trim(),
    model: String(body.model ?? "").trim(),
    vin: String(body.vin ?? "").trim(),
    engine_no: String(body.engine_no ?? "").trim(),
    vehicle_type: String(body.vehicle_type ?? "").trim(),
    owner_name: String(body.owner_name ?? "").trim(),
    owner_address: String(body.owner_address ?? "").trim(),
    usage_nature: String(body.usage_nature ?? "").trim(),
    registration_date: String(body.registration_date ?? "").trim(),
    issue_date: String(body.issue_date ?? "").trim(),
    approved_passengers,
    curb_weight: String(body.curb_weight ?? "").trim(),
    overall_dimensions: String(body.overall_dimensions ?? "").trim(),
    mandatory_scrap_date: String(body.mandatory_scrap_date ?? "").trim(),
    purchase_date: String(body.purchase_date ?? "").trim(),
    responsible_person: String(body.responsible_person ?? "").trim(),
    current_status: status,
    insurance_mandatory_start: String(body.insurance_mandatory_start ?? "").trim(),
    insurance_mandatory_end: String(body.insurance_mandatory_end ?? "").trim(),
    insurance_commercial_start: String(body.insurance_commercial_start ?? "").trim(),
    insurance_commercial_end: String(body.insurance_commercial_end ?? "").trim(),
    insurance_types: String(body.insurance_types ?? "").trim(),
    insurance_premium: Number.isFinite(premium as number) ? premium : null,
    insurer: String(body.insurer ?? "").trim(),
    insurance_mandatory_policy_no: String(body.insurance_mandatory_policy_no ?? "").trim(),
    insurance_commercial_policy_no: String(body.insurance_commercial_policy_no ?? "").trim(),
    annual_inspection_due: String(body.annual_inspection_due ?? "").trim(),
    environmental_test_date: String(body.environmental_test_date ?? "").trim(),
    driving_license_valid_until: String(body.driving_license_valid_until ?? "").trim(),
    road_transport_certificate_valid_until: String(body.road_transport_certificate_valid_until ?? "").trim(),
    warning_days: Number.isFinite(warningRaw) && warningRaw > 0 ? Math.floor(warningRaw) : 30,
    notes: String(body.notes ?? "").trim(),
  };
}

export function validateVehiclePayload(
  payload: VehiclePayload
): { ok: true } | { ok: false; message: string; status: number } {
  if (!payload.license_plate) {
    return { ok: false, message: "号牌号码为必填", status: 400 };
  }
  if (!["in_use", "idle", "repair", "scrapped"].includes(payload.current_status)) {
    return { ok: false, message: "当前状态不合法", status: 400 };
  }
  const fmt = validateVehicleFormattedFields({
    license_plate: payload.license_plate,
    vin: payload.vin,
    engine_no: payload.engine_no,
  });
  if (!fmt.ok) {
    return { ok: false, message: fmt.message, status: 400 };
  }
  return { ok: true };
}
