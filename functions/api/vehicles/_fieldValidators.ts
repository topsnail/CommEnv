/** 与前端 vehicleFieldValidators 规则一致，供 API 校验 */

export type Check = { ok: true } | { ok: false; message: string };

function normalizePlateLike(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function checkLicensePlateApi(raw: string): Check {
  const s = normalizePlateLike(raw);
  if (!s) return { ok: true };
  if (s.length < 7 || s.length > 9) {
    return { ok: false, message: "车牌长度应为 7～9 位（含省份简称）" };
  }
  if (!/^[\u4e00-\u9fa5]/.test(s)) {
    return { ok: false, message: "车牌应以省份简称汉字开头" };
  }
  const tailNorm = s.slice(1).replace(/·/g, "");
  const tailOk =
    /^[A-HJ-NP-Z0-9]{6,8}$/i.test(tailNorm) ||
    /^[A-HJ-NP-Z0-9]{4,7}(学|警|挂|港|澳|试|超)$/i.test(tailNorm);
  if (!tailOk) {
    return { ok: false, message: "车牌序号段格式不符合常见规则" };
  }
  return { ok: true };
}

export function checkVinApi(raw: string): Check {
  const s = normalizePlateLike(raw);
  if (!s) return { ok: true };
  if (s.length !== 17) {
    return { ok: false, message: "车架号须为 17 位" };
  }
  if (/[IOQ]/.test(s)) {
    return { ok: false, message: "车架号不应包含 I、O、Q" };
  }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(s)) {
    return { ok: false, message: "车架号格式无效" };
  }
  return { ok: true };
}

export function checkEngineNoApi(raw: string): Check {
  const s = String(raw || "").trim();
  if (!s) return { ok: true };
  if (s.length < 4) return { ok: false, message: "发动机号过短" };
  if (s.length > 32) return { ok: false, message: "发动机号过长" };
  if (!/^[\w.\-·\u4e00-\u9fa5]+$/i.test(s)) {
    return { ok: false, message: "发动机号含非法字符" };
  }
  return { ok: true };
}

export function validateVehicleFormattedFields(payload: {
  license_plate: string;
  vin: string;
  engine_no: string;
}): Check {
  const a = checkLicensePlateApi(payload.license_plate);
  if (!a.ok) return a;
  const b = checkVinApi(payload.vin);
  if (!b.ok) return b;
  const c = checkEngineNoApi(payload.engine_no);
  if (!c.ok) return c;
  return { ok: true };
}
