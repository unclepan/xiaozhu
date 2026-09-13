import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// ─────────────────────────────────────────────────────────────
// /admin 简易鉴权
//
//   口令来源：环境变量 ADMIN_SESSION_TOKEN（.env，服务端可见）
//   Cookie：只存 sha256(口令) 的十六进制摘要，不存明文口令
//   未配置口令时一律拒绝访问（fail-closed）
// ─────────────────────────────────────────────────────────────

export const ADMIN_COOKIE_NAME = "xiaozhu_admin_session";

/** 口令有效期：7 天 */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** 写入 cookie 时的通用选项 */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}

/** 环境变量里是否配置了口令 */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_SESSION_TOKEN?.trim());
}

/** 口令对应的 cookie 值（sha256 摘要）。未配置时返回 null */
export function sessionDigest(): string | null {
  const token = process.env.ADMIN_SESSION_TOKEN?.trim();
  if (!token) return null;
  return createHash("sha256").update(token).digest("hex");
}

/** 恒定时间比较，避免通过响应耗时逐字节猜 cookie */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * 归一化用户输入的口令：
 *   - 去掉首尾空白
 *   - 去掉成对引号（从 .env 里复制时容易带上）
 *   - 支持直接粘贴整行 `ADMIN_SESSION_TOKEN="xxx"`
 */
export function normalizeTokenInput(raw: string): string {
  let s = raw.trim();
  const unquote = (v: string) =>
    (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))
      ? v.slice(1, -1).trim()
      : v;

  const eq = s.indexOf("=");
  if (eq > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s.slice(0, eq))) {
    s = s.slice(eq + 1).trim();
  }
  return unquote(s);
}

/** 用户输入的口令是否与环境配置一致（口令未配置时恒为 false） */
export function isValidToken(input: string): boolean {
  const expected = sessionDigest();
  if (!expected) return false;
  const actual = createHash("sha256")
    .update(normalizeTokenInput(input))
    .digest("hex");
  return safeEqual(expected, actual);
}

/** 当前请求是否已通过校验（读 cookie 比对） */
export async function isAdminAuthed(): Promise<boolean> {
  const expected = sessionDigest();
  if (!expected) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!raw) return false;
  return safeEqual(expected, raw);
}
