import type { Env } from "../types";
import { requireSession } from "./auth/_helpers";

function isPrivateIp(ip: string): boolean {
  const t = (ip || "").trim();
  if (!t || t === "未知") return true;
  if (t === "::1" || t === "127.0.0.1") return true;
  if (t.startsWith("127.")) return true;
  if (t.startsWith("10.")) return true;
  if (t.startsWith("192.168.")) return true;
  if (t.startsWith("172.")) {
    const parts = t.split(".");
    const s2 = Number(parts[1] || "0");
    if (s2 >= 16 && s2 <= 31) return true;
  }
  // IPv6 唯一本地地址
  if (t.includes(":") && (t.toLowerCase().startsWith("fc") || t.toLowerCase().startsWith("fd"))) return true;
  return false;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * 查询公网 IP 归属地（中文），供操作日志等展示；内网 IP 不请求外网。
 * 数据源：ip-api.com（与 SmartWMS 一致）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const s = await requireSession(context);
  if (!s.ok) return s.response;

  const url = new URL(context.request.url);
  const raw = (url.searchParams.get("ip") || "").trim();
  if (!raw || isPrivateIp(raw)) {
    return json({ ip: raw || "", location: null });
  }

  async function queryIpApi(proto: "https" | "http"): Promise<string | null> {
    const u = `${proto}://ip-api.com/json/${encodeURIComponent(raw)}?fields=status,country,regionName,city&lang=zh-CN`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4000);
    try {
      const res = await fetch(u, { signal: ac.signal });
      const data = (await res.json()) as {
        status?: string;
        country?: string;
        regionName?: string;
        city?: string;
      };
      if (data?.status !== "success") return null;
      const parts = [data.country, data.regionName, data.city].filter(Boolean);
      return parts.length ? parts.join(" ") : null;
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    let location = await queryIpApi("https").catch(() => null);
    if (!location) location = await queryIpApi("http").catch(() => null);
    return json({ ip: raw, location });
  } catch {
    return json({ ip: raw, location: null });
  }
};
