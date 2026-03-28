import type { Hono } from "hono";
import type { Env } from "../../types";
import { invokePagesHandler } from "../lib/pagesAdapter";
import { onRequestGet as usersGet, onRequestPost as usersPost } from "../users/index";
import { onRequestPut as userPut, onRequestDelete as userDelete } from "../users/[id]";

export function registerUserRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get("/users", async (c) => invokePagesHandler(c, usersGet));
  app.post("/users", async (c) => invokePagesHandler(c, usersPost));
  app.put("/users/:id", async (c) => invokePagesHandler(c, userPut, ["id"]));
  app.delete("/users/:id", async (c) => invokePagesHandler(c, userDelete, ["id"]));
}
