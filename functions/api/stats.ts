/**
 * 统计口径见 docs/TIME_AND_TZ.md：`date('now')` / `strftime` 在 D1 上按 UTC 日历解释，
 * 可能与用户本地「自然日」相差约一天。
 */
import type { Env } from "../types";
import { PERMISSIONS } from "../lib/permissions";
import { requireSession, requirePermission } from "./auth/_helpers";

/** D1 可能将 COUNT(*) 等以 bigint 返回，直接 JSON.stringify 会抛错导致 500 */
function jsonStringifySafe(data: unknown): string {
  return JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
}

export type StatsRange = "all" | "today" | "week" | "month";

function parseRange(raw: string | null): StatsRange {
  if (raw === "today" || raw === "week" || raw === "month") return raw;
  return "all";
}

function recordsDateWhere(range: StatsRange): string {
  switch (range) {
    case "today":
      return `date(maintenance_date) = date('now')`;
    case "week":
      return `date(maintenance_date) >= date('now', '-6 days') AND date(maintenance_date) <= date('now')`;
    case "month":
      return `strftime('%Y-%m', maintenance_date) = strftime('%Y-%m', 'now')`;
    default:
      return "1=1";
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;
  const denied = requirePermission(s.user, PERMISSIONS.STATS_READ);
  if (denied) return denied;

  try {
    const url = new URL(context.request.url);
    const range = parseRange(url.searchParams.get("range"));
    const dateCond = recordsDateWhere(range);
    const { env } = context;

    const monthlyPromise =
      range === "all"
        ? env.DB.prepare(
            `SELECT substr(maintenance_date, 1, 7) as month, COUNT(*) as count
             FROM maintenance_records GROUP BY month ORDER BY month ASC`
          ).all()
        : Promise.resolve({ results: [] as { month: string; count: number }[] });

    const timelinePromise =
      range !== "all"
        ? env.DB.prepare(
            `SELECT maintenance_date as label, COUNT(*) as count
             FROM maintenance_records
             WHERE ${dateCond}
             GROUP BY maintenance_date
             ORDER BY maintenance_date ASC`
          ).all()
        : Promise.resolve({ results: [] as { label: string; count: number }[] });

    const faultsPromise = env.DB.prepare(
      `SELECT fault_description as fault, COUNT(*) as count
       FROM maintenance_records
       WHERE ${dateCond}
       GROUP BY fault_description
       ORDER BY count DESC LIMIT 10`
    ).all();

    const partsPromise = env.DB.prepare(
      `SELECT p.part_name, p.part_model, SUM(p.quantity) as total
       FROM parts p
       INNER JOIN maintenance_records r ON r.id = p.record_id
       WHERE ${dateCond.replace(/maintenance_date/g, "r.maintenance_date")}
       GROUP BY p.part_name, p.part_model
       ORDER BY total DESC LIMIT 10`
    ).all();

    const [monthlyRes, timelineRes, faultRes, partsRes] = await Promise.all([
      monthlyPromise,
      timelinePromise,
      faultsPromise,
      partsPromise,
    ]);

    let pmUpcoming: unknown[] = [];
    try {
      const pmRes = await env.DB.prepare(
        `SELECT p.id, p.vehicle_id, p.name, p.next_due_date, p.next_due_meter, p.interval_days,
                v.license_plate, v.vehicle_code
         FROM pm_schedules p
         INNER JOIN vehicles v ON v.id = p.vehicle_id
         WHERE p.active = 1
           AND p.next_due_date IS NOT NULL AND TRIM(p.next_due_date) != ''
           AND julianday(p.next_due_date) <= julianday(date('now')) + 60
         ORDER BY p.next_due_date ASC
         LIMIT 30`
      ).all();
      pmUpcoming = pmRes.results || [];
    } catch (e) {
      console.error("GET /api/stats pmUpcoming (pm_schedules may be missing):", e);
    }

    return new Response(
      jsonStringifySafe({
        range,
        monthly: monthlyRes.results || [],
        timeline: timelineRes.results || [],
        commonFaults: faultRes.results || [],
        commonParts: partsRes.results || [],
        pmUpcoming,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = String((e as { message?: string })?.message ?? e ?? "");
    console.error("GET /api/stats failed:", e);
    return new Response(jsonStringifySafe({ message: "统计查询失败", error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
