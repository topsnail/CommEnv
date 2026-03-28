import type { Hono } from "hono";
import type { Env } from "../../types";
import { invokePagesHandler } from "../lib/pagesAdapter";
import { onRequestGet as statsGet } from "../stats";
import { onRequestGet as logsGet, onRequestDelete as logsDelete } from "../operation-logs/index";
import { onRequestGet as exportRecordsGet } from "../export/records";
import { onRequestGet as exportVehiclesGet } from "../export/vehicles";
import { onRequestGet as exportOpLogsGet } from "../export/operation-logs";
import { onRequestPost as uploadPost } from "../upload";
import { onRequestGet as mediaIndexGet } from "../media/index";
import { onRequestGet as mediaNestedGet } from "../media/[part1]/[part2]/[part3]";
import { onRequestGet as ipGeoGet } from "../ip-geo";
import { onRequestGet as backupGet } from "../backup";

export function registerOpsRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get("/stats", async (c) => invokePagesHandler(c, statsGet));
  app.get("/operation-logs", async (c) => invokePagesHandler(c, logsGet));
  app.delete("/operation-logs", async (c) => invokePagesHandler(c, logsDelete));

  app.get("/export/records", async (c) => invokePagesHandler(c, exportRecordsGet));
  app.get("/export/vehicles", async (c) => invokePagesHandler(c, exportVehiclesGet));
  app.get("/export/operation-logs", async (c) => invokePagesHandler(c, exportOpLogsGet));

  app.post("/upload", async (c) => invokePagesHandler(c, uploadPost));
  app.get("/media", async (c) => invokePagesHandler(c, mediaIndexGet));
  app.get("/media/:part1/:part2/:part3", async (c) => invokePagesHandler(c, mediaNestedGet, ["part1", "part2", "part3"]));

  app.get("/ip-geo", async (c) => invokePagesHandler(c, ipGeoGet));
  app.get("/backup", async (c) => invokePagesHandler(c, backupGet));
}
