import type { Env } from "../../types";
import { PERMISSIONS } from "../../lib/permissions";
import { requireSession, requirePermission } from "../auth/_helpers";
import { escapeCsv } from "../../lib/csv";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.EXPORT_DATA);
  if (denied) return denied;

  const { results } = await context.env.DB.prepare(`SELECT * FROM vehicles ORDER BY id ASC LIMIT 10000`).all<
    Record<string, unknown>
  >();

  const rows = results ?? [];
  if (rows.length === 0) {
    const csv = "\uFEFF" + ["ID", "号牌号码"].map(escapeCsv).join(",");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=vehicles_${Date.now()}.csv`,
      },
    });
  }

  const cols = Object.keys(rows[0]);
  const headerZh: Record<string, string> = {
    id: "ID",
    vehicle_code: "内部编号",
    license_plate: "号牌号码",
    brand: "品牌",
    model: "型号",
    vin: "车辆识别代号",
    engine_no: "发动机号码",
    vehicle_type: "车辆类型",
    owner_name: "所有人",
    owner_address: "住址",
    usage_nature: "使用性质",
    registration_date: "注册日期",
    issue_date: "发证日期",
    approved_passengers: "核定载人数",
    curb_weight: "整备质量",
    overall_dimensions: "外廓尺寸",
    mandatory_scrap_date: "强制报废期",
    purchase_date: "购置日期",
    responsible_person: "负责人",
    current_status: "状态",
    insurance_mandatory_start: "交强险起",
    insurance_mandatory_end: "交强险止",
    insurance_commercial_start: "商业险起",
    insurance_commercial_end: "商业险止",
    insurance_types: "险种",
    insurance_premium: "保费",
    insurer: "保险公司",
    insurance_mandatory_policy_no: "交强险保单号",
    insurance_commercial_policy_no: "商业险保单号",
    annual_inspection_due: "年检到期",
    environmental_test_date: "环检日期",
    driving_license_valid_until: "行驶证到期",
    road_transport_certificate_valid_until: "运输证到期",
    warning_days: "预警天数",
    notes: "备注",
    created_at: "创建时间",
    updated_at: "更新时间",
  };

  const headers = cols.map((c) => headerZh[c] || c);
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => cols.map((c) => escapeCsv(r[c])).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=vehicles_${Date.now()}.csv`,
    },
  });
};
