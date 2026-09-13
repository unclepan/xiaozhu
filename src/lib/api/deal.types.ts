// CQ LOCAL —— 业务类型定义（本地 Prisma 后端实现）

export type DealCategoryKey = "TOP" | "FOOD" | "SPA" | "EXPLORE";

export interface DealCategory {
  key: DealCategoryKey;
  label: string;
}

export interface DealListItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  cover: string;
  price: number;
  originalPrice: number;
  save: number;
}

export interface DealDetail {
  id: number;
  slug: string;
  title: string;
  category: string;
  cover: string;
  price: number;
  originalPrice: number;
  description: string;
  includes: string[];
  address: string;
  area: string;
  /** 高德 GCJ-02 坐标，可能为空（历史数据未回填） */
  lng: number | null;
  lat: number | null;
}

export interface DealConfig {
  qrUrl: string;
}

export type DealOrderStatus = "PENDING" | "PAID" | "REDEEMED" | "CANCELLED";

export interface DealOrder {
  code: string;
  status: DealOrderStatus;
  dealTitle: string;
}

/** 订单 + 商品快照，供「发送券码到邮箱」在服务端组装邮件内容 */
export interface DealOrderDetail extends DealOrder {
  price: number;
  originalPrice: number;
  address: string;
  area: string;
  includes: string[];
  /** 收件邮箱，用户发送成功后回填 */
  email: string | null;
}
