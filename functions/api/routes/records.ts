import type { Hono } from "hono";
import type { Env } from "../../types";
import { invokePagesHandler } from "../lib/pagesAdapter";
import { onRequestGet as recordsGet, onRequestPost as recordsPost } from "../records/index";
import {
  onRequestGet as recordDetailGet,
  onRequestPut as recordDetailPut,
  onRequestDelete as recordDetailDelete,
} from "../records/[id]";
import { onRequestGet as shareGet } from "../share/[id]";

export function registerRecordRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get("/records", async (c) => invokePagesHandler(c, recordsGet));
  app.post("/records", async (c) => invokePagesHandler(c, recordsPost));
  app.get("/records/:id", async (c) => invokePagesHandler(c, recordDetailGet, ["id"]));
  app.put("/records/:id", async (c) => invokePagesHandler(c, recordDetailPut, ["id"]));
  app.delete("/records/:id", async (c) => invokePagesHandler(c, recordDetailDelete, ["id"]));
  app.get("/share/:id", async (c) => invokePagesHandler(c, shareGet, ["id"]));
}
