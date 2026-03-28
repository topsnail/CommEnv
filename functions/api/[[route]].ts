import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import type { Env } from "../types";
import { registerAuthRoutes } from "./routes/auth";
import { registerRecordRoutes } from "./routes/records";
import { registerVehicleRoutes } from "./routes/vehicles";
import { registerUserRoutes } from "./routes/users";
import { registerSettingRoutes } from "./routes/settings";
import { registerOpsRoutes } from "./routes/ops";
import { MIGRATION_0011 } from "../lib/migrationHints";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

let schemaReady: Promise<void> | null = null;

async function hasTable(env: Env, table: string): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1"
  )
    .bind(table)
    .first<{ name: string }>();
  return !!row?.name;
}

async function ensureSchema(env: Env): Promise<void> {
  const required = ["maintenance_records", "vehicles", "users", "operation_logs"];
  for (const t of required) {
    const ok = await hasTable(env, t);
    if (!ok) throw new Error(MIGRATION_0011);
  }
}

app.use("*", async (c, next) => {
  if (!schemaReady) {
    schemaReady = ensureSchema(c.env);
  }
  try {
    await schemaReady;
  } catch (e) {
    const message = (e as { message?: string })?.message || MIGRATION_0011;
    return c.json({ message }, 503);
  }
  return await next();
});

registerAuthRoutes(app);
registerRecordRoutes(app);
registerVehicleRoutes(app);
registerUserRoutes(app);
registerSettingRoutes(app);
registerOpsRoutes(app);

export const onRequest = handle(app);
