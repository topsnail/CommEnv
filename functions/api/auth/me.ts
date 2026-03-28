import type { Env } from "../../types";
import { requireSession } from "./_helpers";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const r = await requireSession(context);
  if (!r.ok) return r.response;
  return new Response(
    JSON.stringify({
      user: {
        id: r.user.sub,
        username: r.user.username,
        displayName: r.user.displayName,
        role: r.user.role,
        permissions: r.user.permissions,
      },
      authMode: "jwt",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
