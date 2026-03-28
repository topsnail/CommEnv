import type { Hono } from "hono";
import type { Env } from "../../types";
import { invokePagesHandler } from "../lib/pagesAdapter";
import { onRequestGet as checkGet } from "../auth/check";
import { onRequestGet as meGet } from "../auth/me";
import { onRequestPost as loginPost } from "../auth/login";
import { onRequestPost as logoutPost } from "../auth/logout";
import { onRequestGet as settingsGet, onRequestPost as settingsPost } from "../auth/settings/index";

export function registerAuthRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get("/auth/check", async (c) => invokePagesHandler(c, checkGet));
  app.get("/auth/me", async (c) => invokePagesHandler(c, meGet));
  app.post("/auth/login", async (c) => invokePagesHandler(c, loginPost));
  app.post("/auth/logout", async (c) => invokePagesHandler(c, logoutPost));
  app.get("/auth/settings", async (c) => invokePagesHandler(c, settingsGet));
  app.post("/auth/settings", async (c) => invokePagesHandler(c, settingsPost));
}
