"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buildAmapMarkerUrl } from "@/lib/amap";
import { formatYuan } from "@/lib/format-money";
import type { DealDetail } from "@/lib/api/deal.types";

interface DetailViewProps {
  deal: DealDetail;
  /** 支付面板（/[slug]/pay）作为 children 叠在当前页之上 */
  children?: React.ReactNode;
}

/**
 * 详情页（原型 #detail）
 *
 * 用路由 layout 承载：/[slug] 与 /[slug]/pay 共用这一层，
 * 支付面板作为 children 覆盖上来，和原型 overlay 的观感一致。
 */
export default function DetailView({ deal, children }: DetailViewProps) {
  const pathname = usePathname();
  const [addressOpen, setAddressOpen] = useState(false);
  const payOpen = pathname?.endsWith("/pay") ?? false;
  const amapUrl = buildAmapMarkerUrl(deal.lng, deal.lat, deal.title);

  // 支付面板打开时锁滚动，和原型 document.body.style.overflow 的处理一致
  useEffect(() => {
    if (!payOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [payOpen]);

  return (
    <div className="cq-detail">
      <div
        className="cq-detail-photo"
        style={{ backgroundImage: `url('${deal.cover}')` }}
      >
        <Link href="/" className="cq-back" aria-label="Back">
          ←
        </Link>
      </div>

      <div className="cq-detail-content">
        <div className="cq-eyebrow">{deal.category}</div>
        <h2>{deal.title}</h2>
        <div>
          <span className="cq-price">{formatYuan(deal.price)}</span>
          <span className="cq-old">{formatYuan(deal.originalPrice)}</span>
        </div>
        <p className="cq-sub" style={{ marginTop: 10 }}>
          {deal.description}
        </p>

        <div className="cq-box">
          <h3>WHAT&apos;S INCLUDED</h3>
          <ul>
            {deal.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="cq-box">
          <h3>HOW IT WORKS</h3>
          <p>
            1. Tap <b>Get Deal</b>
            <br />
            2. Scan the WeChat Pay code
            <br />
            3. Complete payment
            <br />
            4. Show the voucher to reception / merchant
          </p>
        </div>

        <div className="cq-box">
          <h3>IMPORTANT</h3>
          <p>
            This demo uses your fixed WeChat collection QR code. The amount is shown
            on the page, but the QR itself does <b>not</b> lock the amount
            automatically.
          </p>
        </div>
      </div>

      <div className="cq-cta">
        <button
          type="button"
          className="cq-btn cq-secondary"
          onClick={() => setAddressOpen(true)}
        >
          Show Address
        </button>
        <Link href={`/${deal.slug}/pay`} className="cq-btn cq-primary">
          Get Deal
        </Link>
      </div>

      {addressOpen && (
        <div
          className="cq-dialog-backdrop"
          onClick={() => setAddressOpen(false)}
          role="presentation"
        >
          <div
            className="cq-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Address"
          >
            <h3>Address</h3>
            <p>Hello driver, please take me to: {deal.address}</p>
            <p style={{ marginBottom: 0, color: "#9aa3af", fontSize: 13 }}>
              {deal.area}
            </p>
            <div className="cq-dialog-actions">
              <button
                type="button"
                className="cq-btn cq-secondary"
                onClick={() => setAddressOpen(false)}
              >
                Close
              </button>
              {amapUrl && (
                <a
                  href={amapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cq-btn cq-primary"
                >
                  Open the map
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
