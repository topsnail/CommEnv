import type { Env } from "../../types";

export const onRequestPost: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
