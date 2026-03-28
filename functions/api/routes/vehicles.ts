import type { Hono } from "hono";
import type { Env } from "../../types";
import { invokePagesHandler } from "../lib/pagesAdapter";
import { onRequestGet as vehiclesGet, onRequestPost as vehiclesPost } from "../vehicles/index";
import {
  onRequestGet as vehicleDetailGet,
  onRequestPut as vehicleDetailPut,
  onRequestDelete as vehicleDetailDelete,
} from "../vehicles/[id]";
import { onRequestGet as pmGet, onRequestPost as pmPost } from "../pm-schedules/index";
import { onRequestPut as pmPut, onRequestDelete as pmDelete } from "../pm-schedules/[id]";
import { onRequestGet as docsGet, onRequestPost as docsPost } from "../vehicle-documents/index";
import { onRequestDelete as docsDelete } from "../vehicle-documents/[id]";

export function registerVehicleRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get("/vehicles", async (c) => invokePagesHandler(c, vehiclesGet));
  app.post("/vehicles", async (c) => invokePagesHandler(c, vehiclesPost));
  app.get("/vehicles/:id", async (c) => invokePagesHandler(c, vehicleDetailGet, ["id"]));
  app.put("/vehicles/:id", async (c) => invokePagesHandler(c, vehicleDetailPut, ["id"]));
  app.delete("/vehicles/:id", async (c) => invokePagesHandler(c, vehicleDetailDelete, ["id"]));

  app.get("/pm-schedules", async (c) => invokePagesHandler(c, pmGet));
  app.post("/pm-schedules", async (c) => invokePagesHandler(c, pmPost));
  app.put("/pm-schedules/:id", async (c) => invokePagesHandler(c, pmPut, ["id"]));
  app.delete("/pm-schedules/:id", async (c) => invokePagesHandler(c, pmDelete, ["id"]));

  app.get("/vehicle-documents", async (c) => invokePagesHandler(c, docsGet));
  app.post("/vehicle-documents", async (c) => invokePagesHandler(c, docsPost));
  app.delete("/vehicle-documents/:id", async (c) => invokePagesHandler(c, docsDelete, ["id"]));
}
