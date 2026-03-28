import type { Env } from "../../../types";
import { PERMISSIONS } from "../../../lib/permissions";
import {
  requireSession,
  requirePermission,
  requireSettingsAuth,
} from "../_helpers";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const err = await requireSettingsAuth(context);
  if (err) return err;

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context);
  if (!session.ok) return session.response;

  const denied = requirePermission(session.user, PERMISSIONS.SETTINGS_WRITE);
  if (denied) return denied;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

