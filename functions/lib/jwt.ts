import { permissionsForRole } from "./permissions";

export type SessionPayload = {
  exp: number;
  iat: number;
  sub: number;
  username: string;
  displayName: string;
  role: string;
  permissions: string[];
};

function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b = btoa(binary);
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(s: string): string {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b.length % 4;
  if (pad) b += "=".repeat(4 - pad);
  const binary = atob(b);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

const TOKEN_DAYS = 7;

export async function createSessionJwt(
  secret: string,
  user: { id: number; username: string; displayName: string; role: string }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_DAYS * 24 * 3600;
  const permissions = permissionsForRole(user.role);
  const payload: SessionPayload = {
    exp,
    iat: now,
    sub: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
    permissions,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(payloadJson);
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifySessionJwt(token: string, secret: string): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(payloadB64, secret);
  if (!timingSafeEqualHex(sig, expected)) return null;
  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    if (typeof payload.sub !== "number" || Number.isNaN(payload.sub) || payload.sub < 0) return null;
    if (!payload.username || typeof payload.username !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
