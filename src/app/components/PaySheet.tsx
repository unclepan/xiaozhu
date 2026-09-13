"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatYuan } from "@/lib/format-money";
import type { DealDetail, DealOrder } from "@/lib/api/deal.types";

/** 同一商品复用订单，避免每次打开支付页都新建一条 */
const orderKey = (slug: string) => `cq:order:${slug}`;
/** 记住上次发送成功的邮箱，弹窗自动回填 */
const emailKey = "cq:last-email";
/** 券码缓存有效期：超过就当没有，重新建单（避免陈旧订单被复活） */
const ORDER_TTL = 24 * 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 读取缓存券码：带 24h 时间戳，兼容旧格式（纯券码字符串） */
function readCachedOrder(slug: string): string | null {
  try {
    const raw = localStorage.getItem(orderKey(slug));
    if (!raw) return null;

    let code: string | null = null;
    let ts = 0;
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { code?: string; ts?: number };
      code = parsed.code ?? null;
      ts = typeof parsed.ts === "number" ? parsed.ts : 0;
    } else {
      code = raw;
      ts = Date.now();
    }

    if (!code) return null;
    if (!ts || Date.now() - ts > ORDER_TTL) {
      localStorage.removeItem(orderKey(slug));
      return null;
    }
    return code;
  } catch {
    // 隐私模式禁用 localStorage / 脏数据：当作没有缓存
    return null;
  }
}

function writeCachedOrder(slug: string, code: string) {
  try {
    localStorage.setItem(
      orderKey(slug),
      JSON.stringify({ code, ts: Date.now() }),
    );
  } catch {
    // 写不进去不影响主流程
  }
}

interface PaySheetProps {
  deal: DealDetail;
  /** 微信收款码地址，来自 /deal/config */
  qrUrl: string;
}

/**
 * 支付面板（原型 #pay）
 *
 * 挂在 /[slug]/pay 上，由 [slug]/layout.tsx 的详情层承载，
 * 视觉上是覆盖在详情页之上的 sheet。
 *
 * 商品详情与收款码由服务端组件传入（首屏就是正确金额），
 * 这里只负责「建单 → 自报已付 → 出券码 → 发券码到邮箱」，
 * 通过本地 Route Handler 操作订单。
 */
export default function PaySheet({ deal, qrUrl }: PaySheetProps) {
  const router = useRouter();

  const [creating, setCreating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<DealOrder | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 24h 内已有订单直接复用（刷新、关掉页面再回来都不会重复下单）
        const cached = readCachedOrder(deal.slug);
        if (cached) {
          try {
            const res = await fetch(
              `/api/deal/order?code=${encodeURIComponent(cached)}`,
            );
            if (res.ok) {
              const existing: DealOrder = await res.json();
              if (cancelled) return;
              if (existing.status !== "CANCELLED") {
                setOrder(existing);
                return;
              }
            }
          } catch {
            // 券码失效 / 服务重启：落到下面重新下单
          }
        }

        const res = await fetch("/api/deal/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId: deal.id }),
        });
        if (!res.ok) throw new Error("CREATE_ORDER_FAILED");
        const created: DealOrder = await res.json();
        if (cancelled) return;
        writeCachedOrder(deal.slug, created.code);
        setOrder(created);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Network error, please try again later",
          );
        }
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deal.id, deal.slug]);

  const paid = !!order && (order.status === "PAID" || order.status === "REDEEMED");

  async function handlePaid() {
    if (!order) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/deal/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: order.code }),
      });
      if (!res.ok) throw new Error("MARK_PAID_FAILED");
      const updated: DealOrder = await res.json();
      setOrder(updated);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Submission failed, please try again later",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEmail() {
    setEmailError("");
    setSentTo("");
    try {
      setEmail(localStorage.getItem(emailKey) ?? "");
    } catch {
      setEmail("");
    }
    setEmailOpen(true);
  }

  function closeEmail() {
    if (sending) return;
    setEmailOpen(false);
  }

  async function handleSendEmail() {
    if (!order) return;
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    setEmailError("");
    try {
      const res = await fetch("/api/deal/order/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: order.code, email: to }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(
          data.error === "MAIL_NOT_CONFIGURED"
            ? "Email delivery is not configured yet."
            : data.error === "RATE_LIMITED"
              ? "Too many requests. Please try again later."
              : "Something went wrong. Please try again.",
        );
        return;
      }
      setSentTo(to);
      try {
        localStorage.setItem(emailKey, to);
      } catch {
        // 记不住就算了
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="cq-paypanel"
      onClick={() => router.push(`/${deal.slug}`)}
      role="presentation"
    >
      <div
        className="cq-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="cq-sheet-top">
          <strong>CQ LOCAL Checkout</strong>
          <button
            type="button"
            className="cq-close"
            aria-label="Close"
            onClick={() => router.push(`/${deal.slug}`)}
          >
            ×
          </button>
        </div>

        <div className="cq-pay-title">Amount to pay</div>
        <div className="cq-pay-amount">{formatYuan(deal.price)}</div>
        <div className="cq-wechat">● WeChat Pay</div>

        <div className="cq-qrwrap">
          {/* 收款码是本地静态资源 / 后端配置地址，不走 next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="WeChat Pay QR code" />
        </div>

        <div className="cq-note">
          Open WeChat → Scan → enter the amount shown above → complete payment.
        </div>

        <div className="cq-demo">
          Demo flow: clicking “I&apos;ve Paid” does not verify a real payment. For
          production, use WeChat Pay merchant APIs so the amount and payment status are
          generated and confirmed automatically.
        </div>

        {error && (
          <p className="cq-note" style={{ color: "#c0392b", marginTop: 10 }}>
            {error}
          </p>
        )}

        {!paid && (
          <button
            type="button"
            className="cq-btn cq-primary"
            onClick={handlePaid}
            disabled={creating || submitting || !order}
          >
            {creating ? "Preparing..." : submitting ? "Submitting..." : "I've Paid"}
          </button>
        )}

        {paid && (
          <div className="cq-success">
            <div className="cq-check">✓</div>
            <h2>Payment submitted</h2>
            <div className="cq-small">Your voucher</div>
            <div className="cq-code">{order?.code}</div>
            <div style={{ fontWeight: 800 }}>{order?.dealTitle ?? deal.title}</div>
            <p className="cq-note">
              Show this screen to reception or the merchant for manual confirmation and
              redemption.
            </p>
            <div className="cq-success-actions">
              <button
                type="button"
                className="cq-btn cq-secondary"
                onClick={() => router.push("/")}
              >
                Back to deals
              </button>
              <button
                type="button"
                className="cq-btn cq-primary"
                onClick={openEmail}
              >
                Send to Email
              </button>
            </div>
            {sentTo && (
              <p className="cq-small" style={{ marginTop: 10 }}>
                Sent to {sentTo}
              </p>
            )}
          </div>
        )}
      </div>

      {emailOpen && (
        <div
          className="cq-dialog-backdrop"
          onClick={closeEmail}
          role="presentation"
        >
          <div
            className="cq-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Email this voucher"
          >
            {sentTo ? (
              <>
                <h3>Email sent</h3>
                <p>
                  We&apos;ve sent voucher <b>{order?.code}</b> to <b>{sentTo}</b>.
                  It may take a minute to arrive — check your spam folder if you
                  don&apos;t see it.
                </p>
                <div className="cq-dialog-actions">
                  <button
                    type="button"
                    className="cq-btn cq-primary"
                    onClick={closeEmail}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Email this voucher</h3>
                <p className="cq-dialog-hint">
                  We&apos;ll send your voucher code and redemption details to:
                </p>
                <input
                  className="cq-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-label="Email address"
                  value={email}
                  disabled={sending}
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSendEmail();
                  }}
                />
                {emailError && <p className="cq-dialog-error">{emailError}</p>}
                <div className="cq-dialog-actions">
                  <button
                    type="button"
                    className="cq-btn cq-secondary"
                    onClick={closeEmail}
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cq-btn cq-primary"
                    onClick={handleSendEmail}
                    disabled={sending}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
