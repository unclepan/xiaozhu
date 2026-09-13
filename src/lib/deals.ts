import { prisma } from "@/lib/db";
import type {
  DealCategory,
  DealCategoryKey,
  DealConfig,
  DealDetail,
  DealListItem,
  DealOrder,
  DealOrderDetail,
  DealOrderStatus,
} from "@/lib/api/deal.types";

// ─────────────────────────────────────────────────────────────
// CQ LOCAL 本地后端（在工程中用 Prisma 直读 MySQL 实现）
//   替代原外部 deal 服务的 HTTP 调用。
// ─────────────────────────────────────────────────────────────

const ALL_KEYS: DealCategoryKey[] = ["TOP", "FOOD", "SPA", "EXPLORE"];

const DEFAULT_CATEGORIES: DealCategory[] = [
  { key: "TOP", label: "Top Picks" },
  { key: "FOOD", label: "Food" },
  { key: "SPA", label: "Spa" },
  { key: "EXPLORE", label: "Explore" },
];

function toListItem(d: {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  cover: string;
  price: number;
  originalPrice: number;
}): DealListItem {
  const save = Math.max(0, d.originalPrice - d.price);
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    summary: d.summary ?? "",
    category: d.category,
    cover: d.cover,
    price: d.price,
    originalPrice: d.originalPrice,
    save,
  };
}

function toDetail(d: {
  id: number;
  slug: string;
  title: string;
  category: string;
  cover: string;
  price: number;
  originalPrice: number;
  description: string | null;
  includes: string;
  address: string | null;
  area: string | null;
  lng: number | null;
  lat: number | null;
}): DealDetail {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    category: d.category,
    cover: d.cover,
    price: d.price,
    originalPrice: d.originalPrice,
    description: d.description ?? "",
    includes: splitLines(d.includes),
    address: d.address ?? "",
    area: d.area ?? "",
    lng: d.lng,
    lat: d.lat,
  };
}

function splitLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getCategories(): Promise<DealCategory[]> {
  return DEFAULT_CATEGORIES;
}

export async function getList(
  category: DealCategoryKey,
): Promise<DealListItem[]> {
  const rows = await prisma.deal.findMany({
    where: category === "TOP" ? {} : { category },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toListItem);
}

export async function getDetail(slug: string): Promise<DealDetail | null> {
  const row = await prisma.deal.findUnique({ where: { slug } });
  return row ? toDetail(row) : null;
}

export async function getConfig(): Promise<DealConfig> {
  return { qrUrl: "/images/wechat-qr.jpeg" };
}

// ─── 订单（demo：会话内建单 + 自报已付） ─────────────────────

function makeCode(): string {
  // 8 位大写字母+数字券码
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export async function createOrder(dealId: number): Promise<DealOrder> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error("DEAL_NOT_FOUND");

  const code = makeCode();
  await prisma.dealOrder.create({
    data: { code, dealId, status: "PENDING" },
  });

  return {
    code,
    status: "PENDING",
    dealTitle: deal.title,
  };
}

export async function getOrder(code: string): Promise<DealOrder | null> {
  const row = await prisma.dealOrder.findUnique({
    where: { code },
    include: { deal: true },
  });
  if (!row) return null;
  return {
    code: row.code,
    status: row.status as DealOrderStatus,
    dealTitle: row.deal.title,
  };
}

/** 订单 + 商品快照（用于服务端组装邮件，不信任客户端传来的商品信息） */
export async function getOrderDetail(
  code: string,
): Promise<DealOrderDetail | null> {
  const row = await prisma.dealOrder.findUnique({
    where: { code },
    include: { deal: true },
  });
  if (!row) return null;
  return {
    code: row.code,
    status: row.status as DealOrderStatus,
    dealTitle: row.deal.title,
    price: row.deal.price,
    originalPrice: row.deal.originalPrice,
    address: row.deal.address ?? "",
    area: row.deal.area ?? "",
    includes: splitLines(row.deal.includes),
    email: row.email,
  };
}

/** 回填收件邮箱，便于商家在 /admin/orders 核对 */
export async function saveOrderEmail(
  code: string,
  email: string,
): Promise<void> {
  await prisma.dealOrder.update({ where: { code }, data: { email } });
}

export async function markPaid(code: string): Promise<DealOrder> {
  const row = await prisma.dealOrder.update({
    where: { code },
    data: { status: "PAID" },
    include: { deal: true },
  });
  return {
    code: row.code,
    status: row.status as DealOrderStatus,
    dealTitle: row.deal.title,
  };
}

// ─── 核销（商家侧：PAID ⇄ REDEEMED） ─────────────────────────

export type RedeemErrorCode =
  | "ORDER_NOT_FOUND"
  | "ALREADY_REDEEMED"
  | "ONLY_PAID_CAN_REDEEM"
  | "NOT_REDEEMED";

export type RedeemResult =
  | {
      ok: true;
      code: string;
      status: DealOrderStatus;
      dealTitle: string;
    }
  | { ok: false; error: RedeemErrorCode };

/** 核销：PAID → REDEEMED。未支付 / 已取消 / 已核销都拒绝 */
export async function markRedeemed(code: string): Promise<RedeemResult> {
  const row = await prisma.dealOrder.findUnique({
    where: { code },
    include: { deal: { select: { title: true } } },
  });
  if (!row) return { ok: false, error: "ORDER_NOT_FOUND" };
  if (row.status === "REDEEMED") return { ok: false, error: "ALREADY_REDEEMED" };
  if (row.status !== "PAID") return { ok: false, error: "ONLY_PAID_CAN_REDEEM" };

  // updateMany + status 条件：避免读判与写入之间的并发重复核销
  const { count } = await prisma.dealOrder.updateMany({
    where: { id: row.id, status: "PAID" },
    data: { status: "REDEEMED" },
  });
  if (count === 0) return { ok: false, error: "ONLY_PAID_CAN_REDEEM" };

  return {
    ok: true,
    code: row.code,
    status: "REDEEMED",
    dealTitle: row.deal.title,
  };
}

/** 撤销核销：REDEEMED → PAID（核销错了可回退） */
export async function undoRedeem(code: string): Promise<RedeemResult> {
  const row = await prisma.dealOrder.findUnique({
    where: { code },
    include: { deal: { select: { title: true } } },
  });
  if (!row) return { ok: false, error: "ORDER_NOT_FOUND" };
  if (row.status !== "REDEEMED") return { ok: false, error: "NOT_REDEEMED" };

  const { count } = await prisma.dealOrder.updateMany({
    where: { id: row.id, status: "REDEEMED" },
    data: { status: "PAID" },
  });
  if (count === 0) return { ok: false, error: "NOT_REDEEMED" };

  return { ok: true, code: row.code, status: "PAID", dealTitle: row.deal.title };
}

export { ALL_KEYS };
