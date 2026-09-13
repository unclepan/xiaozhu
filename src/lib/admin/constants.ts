import type { DealCategoryKey, DealOrderStatus } from "@/lib/api/deal.types";

// 客户端组件也要用到的纯常量（不 import prisma / node 内置模块）

export interface CategoryOption {
  key: DealCategoryKey;
  label: string;
}

/** 与 src/lib/deals.ts 的 DEFAULT_CATEGORIES 保持一致 */
export const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: "TOP", label: "Top Picks" },
  { key: "FOOD", label: "Food" },
  { key: "SPA", label: "Spa" },
  { key: "EXPLORE", label: "Explore" },
];

export const CATEGORY_KEYS = CATEGORY_OPTIONS.map((c) => c.key);

export function isCategoryKey(v: string): v is DealCategoryKey {
  return (CATEGORY_KEYS as string[]).includes(v);
}

export function categoryLabel(key: string): string {
  return CATEGORY_OPTIONS.find((c) => c.key === key)?.label ?? key;
}

/** 订单状态：用于展示、筛选与后台核销（PENDING / CANCELLED 不可核销） */
export const ORDER_STATUS_OPTIONS: DealOrderStatus[] = [
  "PENDING",
  "PAID",
  "REDEEMED",
  "CANCELLED",
];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  REDEEMED: "已核销",
  CANCELLED: "已取消",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

/** 编辑表单的数据形状（新建时 id 为 null） */
export interface DealEditValues {
  id: number | null;
  slug: string;
  title: string;
  summary: string;
  category: string;
  cover: string;
  price: number;
  originalPrice: number;
  description: string;
  /** 换行分隔的原始字符串（表单里按行编辑） */
  includes: string;
  address: string;
  area: string;
  /** 高德 GCJ-02 坐标，空 = 详情页不显示「Open the map」 */
  lng: number | null;
  lat: number | null;
  sortOrder: number;
}

export const BLANK_DEAL: DealEditValues = {
  id: null,
  slug: "",
  title: "",
  summary: "",
  category: "TOP",
  cover: "",
  price: 0,
  originalPrice: 0,
  description: "",
  includes: "",
  address: "",
  area: "",
  lng: null,
  lat: null,
  sortOrder: 0,
};
