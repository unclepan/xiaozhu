import { NextRequest, NextResponse } from "next/server";
import { getOrderDetail, saveOrderEmail } from "@/lib/deals";
import { isMailConfigured, MailError, sendMail } from "@/lib/mail";
import {
  renderVoucherHtml,
  renderVoucherSubject,
  renderVoucherText,
} from "@/lib/mail-template";

// 券码邮件：POST /api/deal/order/email  body: { code, email }
//
// 邮件内容一律由服务端按券码查库组装（客户端只给 code + email），
// 避免有人伪造金额 / 商品信息群发。

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── 内存限流（单实例足够，防止公开接口被用来刷 SMTP） ──────────
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_CODE = 5;
const MAX_PER_IP = 15;
const hits = new Map<string, { count: number; resetAt: number }>();

function limited(key: string, max: number): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!isMailConfigured()) {
      return NextResponse.json(
        { error: "MAIL_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const body = await req.json();
    const code = String(body?.code ?? "").trim();
    const email = String(body?.email ?? "").trim();

    if (!code) {
      return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (
      limited(`code:${code}`, MAX_PER_CODE) ||
      limited(`ip:${clientIp(req)}`, MAX_PER_IP)
    ) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    const order = await getOrderDetail(code);
    if (!order) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    await sendMail({
      to: email,
      subject: renderVoucherSubject(order),
      html: renderVoucherHtml(order),
      text: renderVoucherText(order),
    });

    // 回填收件邮箱；落库失败不影响「已发送」这个结果
    try {
      await saveOrderEmail(code, email);
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MailError) {
      const status = e.message === "MAIL_NOT_CONFIGURED" ? 503 : 502;
      return NextResponse.json({ error: e.message }, { status });
    }
    const msg = e instanceof Error ? e.message : "SEND_EMAIL_FAILED";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
