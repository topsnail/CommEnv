import type { Env } from "../../types";
import { requireSettingsAuth } from "../auth/_helpers";

type Kind = "deviceName" | "deviceModel" | "technician";

const KIND_WHITELIST: Kind[] = ["deviceName", "deviceModel", "technician"];

function isKindValid(kind: unknown): kind is Kind {
  return typeof kind === "string" && KIND_WHITELIST.includes(kind as Kind);
}

interface SettingRow {
  id: number;
  value: string;
}

function getTableByKind(kind: Kind) {
  switch (kind) {
    case "deviceName":
      return "device_names";
    case "deviceModel":
      return "device_models";
    case "technician":
      return "technicians";
    default:
      throw new Error("unsupported kind");
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const authErr = await requireSettingsAuth(context);
  if (authErr) return authErr;
  const { env } = context;
  const deviceNamesStmt = env.DB.prepare(
    "SELECT id, value FROM device_names ORDER BY value ASC"
  );
  const deviceModelsStmt = env.DB.prepare(
    "SELECT id, value FROM device_models ORDER BY value ASC"
  );
  const techniciansStmt = env.DB.prepare(
    "SELECT id, value FROM technicians ORDER BY value ASC"
  );

  const [deviceNamesRes, deviceModelsRes, techniciansRes] = await Promise.all([
    deviceNamesStmt.all(),
    deviceModelsStmt.all(),
    techniciansStmt.all(),
  ]);

  return new Response(
    JSON.stringify({
      deviceNames: deviceNamesRes.results || [],
      deviceModels: deviceModelsRes.results || [],
      technicians: techniciansRes.results || [],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authErr = await requireSettingsAuth(context);
  if (authErr) return authErr;
  const { env, request } = context;
  try {
    const body = (await request.json()) as { kind?: unknown; value?: unknown };
    const kind = body.kind as Kind;
    const value = (body.value as string | undefined)?.trim();
    if (!kind || !value) {
      return new Response(JSON.stringify({ message: "缺少 kind 或 value" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isKindValid(kind)) {
      return new Response(JSON.stringify({ message: "kind 不支持，仅允许 deviceName、deviceModel、technician" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const table = getTableByKind(kind);
    const stmt = env.DB.prepare(
      `INSERT INTO ${table} (value) VALUES (?)`
    ).bind(value);
    const res: any = await stmt.run();
    const id = Number(res.meta?.last_row_id ?? res.lastInsertRowId ?? 0);

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: "保存失败", error: e?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const authErr = await requireSettingsAuth(context);
  if (authErr) return authErr;
  const { env, request } = context;
  try {
    const body = (await request.json()) as { kind?: unknown; id?: unknown; value?: unknown };
    const kind = body.kind as Kind;
    const id = Number(body.id);
    const value = (body.value as string | undefined)?.trim();

    if (!kind || !id || !value) {
      return new Response(JSON.stringify({ message: "缺少参数" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isKindValid(kind)) {
      return new Response(JSON.stringify({ message: "kind 不支持，仅允许 deviceName、deviceModel、technician" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const table = getTableByKind(kind);
    const stmt = env.DB.prepare(
      `UPDATE ${table} SET value = ? WHERE id = ?`
    ).bind(value, id);
    await stmt.run();

    return new Response(JSON.stringify({ message: "更新成功" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: "更新失败", error: e?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const authErr = await requireSettingsAuth(context);
  if (authErr) return authErr;
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") as Kind | null;
    const idParam = url.searchParams.get("id");
    const id = idParam ? Number(idParam) : 0;

    if (!kind || !id) {
      return new Response(JSON.stringify({ message: "缺少 kind 或 id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isKindValid(kind)) {
      return new Response(JSON.stringify({ message: "kind 不支持，仅允许 deviceName、deviceModel、technician" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const table = getTableByKind(kind);
    const stmt = env.DB.prepare(
      `DELETE FROM ${table} WHERE id = ?`
    ).bind(id);
    await stmt.run();

    return new Response(JSON.stringify({ message: "删除成功" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: "删除失败", error: e?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

