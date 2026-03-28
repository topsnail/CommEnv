import type { Env } from "../../types";
import {
  issueJwtToken,
  bootstrapAdminIfNeeded,
  verifyUserLogin,
} from "./_helpers";
import { permissionsForRole } from "../../lib/permissions";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "请求体格式错误" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jwtSecret = String(env.JWT_SECRET ?? "").trim();
  if (!jwtSecret) {
    return new Response(JSON.stringify({ message: "未配置 JWT_SECRET，无法登录" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const username = (body.username != null ? String(body.username) : "").trim();
  const password = (body.password != null ? String(body.password) : "").trim();
  if (!username || !password) {
    return new Response(JSON.stringify({ message: "请输入用户名和密码" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const adminPwd = String(env.ADMIN_PASSWORD ?? "").trim();
  const userCount = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>();
  if ((userCount?.c ?? 0) === 0 && !adminPwd) {
    return new Response(
      JSON.stringify({ message: "尚未创建用户，请先在环境中配置 ADMIN_PASSWORD 以初始化管理员账号" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let user = await verifyUserLogin(env, username, password);
  if (!user) {
    const boot = await bootstrapAdminIfNeeded(env, username, password);
    if (boot) user = boot;
  }
  if (!user) {
    return new Response(JSON.stringify({ message: "用户名或密码错误" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const token = await issueJwtToken(env, user);
    return new Response(
      JSON.stringify({
        ok: true,
        token,
        authMode: "jwt",
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          permissions: permissionsForRole(user.role),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: "签发登录态失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
