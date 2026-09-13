import Link from "next/link";
import { formatYuan } from "@/lib/format-money";
import type { DealListItem } from "@/lib/api/deal.types";

interface DealCardProps {
  deal: DealListItem;
}

/**
 * 首页商品卡片（原型 .card）
 *
 * 用 background-image 而不是 next/image：图片来自外部 CDN，
 * next.config.ts 没配 remotePatterns，统一走 <img> 之外的背景图方案。
 */
export default function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/${deal.slug}`} className="cq-card">
      <div className="cq-photo" style={{ backgroundImage: `url('${deal.cover}')` }}>
        <div className="cq-badge">{deal.category}</div>
        {deal.save > 0 && <div className="cq-save">SAVE {formatYuan(deal.save)}</div>}
      </div>
      <div className="cq-body">
        <div className="cq-title">{deal.title}</div>
        <div className="cq-meta">{deal.summary}</div>
        <span className="cq-price">{formatYuan(deal.price)}</span>
        <span className="cq-old">{formatYuan(deal.originalPrice)}</span>
      </div>
    </Link>
  );
}
