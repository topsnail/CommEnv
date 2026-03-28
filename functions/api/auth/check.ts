import type { Env } from "../../types";
import { requireSession } from "./_helpers";

/** 探测登录态：JWT only，始终返回 200。 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const jwtSecret = String(context.env.JWT_SECRET ?? "").trim();
  if (!jwtSecret) {
    return new Response(JSON.stringify({ ok: false, authMode: "none" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let ok = false;
  try {
    const session = await requireSession({ request: context.request, env: context.env });
    ok = session.ok;
  } catch {
    ok = false;
  }
  return new Response(JSON.stringify({ ok, authMode: "jwt" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
