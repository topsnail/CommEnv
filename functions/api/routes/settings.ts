import type { Hono } from "hono";
import type { Env } from "../../types";
import { invokePagesHandler } from "../lib/pagesAdapter";
import { onRequestGet as settingsGet, onRequestPost as settingsPost, onRequestPut as settingsPut, onRequestDelete as settingsDelete } from "../settings/index";
import { onRequestGet as categoriesGet, onRequestPost as categoriesPost } from "../custom/categories/index";
import { onRequestPut as categoryPut, onRequestDelete as categoryDelete } from "../custom/categories/[id]";
import { onRequestGet as optionsGet, onRequestPost as optionsPost } from "../custom/options/index";
import { onRequestPut as optionPut, onRequestDelete as optionDelete } from "../custom/options/[id]";
import { onRequestPost as importSettingsPost } from "../import/settings-dict";
import { onRequestGet as exportSettingsGet } from "../export/settings-dict";

export function registerSettingRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get("/settings", async (c) => invokePagesHandler(c, settingsGet));
  app.post("/settings", async (c) => invokePagesHandler(c, settingsPost));
  app.put("/settings", async (c) => invokePagesHandler(c, settingsPut));
  app.delete("/settings", async (c) => invokePagesHandler(c, settingsDelete));

  app.get("/custom/categories", async (c) => invokePagesHandler(c, categoriesGet));
  app.post("/custom/categories", async (c) => invokePagesHandler(c, categoriesPost));
  app.put("/custom/categories/:id", async (c) => invokePagesHandler(c, categoryPut, ["id"]));
  app.delete("/custom/categories/:id", async (c) => invokePagesHandler(c, categoryDelete, ["id"]));

  app.get("/custom/options", async (c) => invokePagesHandler(c, optionsGet));
  app.post("/custom/options", async (c) => invokePagesHandler(c, optionsPost));
  app.put("/custom/options/:id", async (c) => invokePagesHandler(c, optionPut, ["id"]));
  app.delete("/custom/options/:id", async (c) => invokePagesHandler(c, optionDelete, ["id"]));

  app.post("/import/settings-dict", async (c) => invokePagesHandler(c, importSettingsPost));
  app.get("/export/settings-dict", async (c) => invokePagesHandler(c, exportSettingsGet));
}
