import type { Context } from "hono";
import type { Env } from "../../types";

type PagesCtx = {
  request: Request;
  env: Env;
  functionPath: string;
  params: Record<string, string>;
  data: Record<string, unknown>;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: () => Promise<Response>;
};

type PagesHandler = (context: any) => Promise<Response> | Response;

function getParams(c: Context, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) {
    const v = c.req.param(n);
    if (typeof v === "string") out[n] = v;
  }
  return out;
}

export async function invokePagesHandler(
  c: Context<{ Bindings: Env }>,
  handler: PagesHandler,
  paramNames: string[] = []
): Promise<Response> {
  const params = getParams(c, paramNames);
  return await handler({
    request: c.req.raw,
    env: c.env,
    functionPath: c.req.path,
    params,
    waitUntil: (_promise: Promise<unknown>) => {
      // no-op for local adapter
    },
    passThroughOnException: () => {
      // no-op for local adapter
    },
    data: {},
    next: async () => new Response("Not Implemented", { status: 501 }),
  });
}
