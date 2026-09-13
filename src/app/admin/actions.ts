"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  isAdminAuthed,
  isAdminConfigured,
  isValidToken,
  normalizeTokenInput,
  sessionDigest,
} from "@/lib/admin/auth";
import { UploadError, saveDealCover } from "@/lib/admin/uploads";
import { isCategoryKey } from "@/lib/admin/constants";
import { markRedeemed, undoRedeem } from "@/lib/deals";
import type { RedeemErrorCode, RedeemResult } from "@/lib/deals";
import type { ActionState } from "@/lib/admin/action-state";

// ─────────────────────────────────────────────────────────────
// /admin 的写操作（Server Actions）
//   每个 action 内部都重新校验一次登录态，不依赖调用方
//   注意：redirect() 会抛 NEXT_REDIRECT，必须写在 try 之外
// ─────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface DealInput {
  slug: string;
  title: string;
  summary: string;
  category: string;
  cover: string;
  price: number;
  originalPrice: number;
  description: string;
  includes: string;
  address: string;
  area: string;
  lng: number | null;
  lat: number | null;
  sortOrder: number;
}

/** 解析并校验表单，返回规范化输入或错误文案 */
function readDealForm(formData: FormData): DealInput | { error: string } {
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!slug) return { error: "slug 不能为空" };
  if (!SLUG_RE.test(slug)) {
    return { error: "slug 只能包含小写字母、数字和连字符，如 hotpot-feast" };
  }
  if (!title) return { error: "标题不能为空" };

  const category = String(formData.get("category") ?? "").trim();
  if (!isCategoryKey(category)) return { error: "分类不合法" };

  const price = Number(formData.get("price") ?? 0);
  const originalPrice = Number(formData.get("originalPrice") ?? 0);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!Number.isInteger(price) || price < 0) return { error: "售价需为 ≥ 0 的整数" };
  if (!Number.isInteger(originalPrice) || originalPrice < 0) {
    return { error: "原价需为 ≥ 0 的整数" };
  }
  if (!Number.isInteger(sortOrder)) return { error: "排序需为整数" };

  // 经纬度可留空（留空 = 详情页不显示地图入口）
  const lngRaw = String(formData.get("lng") ?? "").trim();
  const latRaw = String(formData.get("lat") ?? "").trim();
  let lng: number | null = null;
  let lat: number | null = null;
  if (lngRaw) {
    lng = Number(lngRaw);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { error: "经度需在 -180 ~ 180 之间" };
    }
  }
  if (latRaw) {
    lat = Number(latRaw);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { error: "纬度需在 -90 ~ 90 之间" };
    }
  }

  // includes：一行一项，空行丢弃
  const includes = String(formData.get("includes") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");

  return {
    slug,
    title,
    summary: String(formData.get("summary") ?? "").trim(),
    category,
    cover: String(formData.get("cover") ?? "").trim(),
    price,
    originalPrice,
    description: String(formData.get("description") ?? "").trim(),
    includes,
    address: String(formData.get("address") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim(),
    lng,
    lat,
    sortOrder,
  };
}

function isDealInput(v: DealInput | { error: string }): v is DealInput {
  return !("error" in v);
}

function failure(e: unknown, fallback: string): ActionState {
  if (e instanceof UploadError) {
    const map: Record<string, string> = {
      EMPTY_FILE: "文件为空",
      FILE_TOO_LARGE: "图片超过 5MB",
      UNSUPPORTED_TYPE: "仅支持 jpeg / png / webp / avif / gif",
    };
    return { ok: false, error: map[e.message] ?? "上传失败" };
  }
  if ((e as { code?: string } | null)?.code === "P2002") {
    return { ok: false, error: "slug 已存在，请换一个" };
  }
  console.error("[/admin] action failed:", e);
  return { ok: false, error: fallback };
}

/** 让受影响的页面失效：首页、deal 详情页、admin 列表 */
function revalidateDeal(slugs: string[]) {
  revalidatePath("/", "layout");
  for (const s of slugs) {
    if (s) revalidatePath(`/${s}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

// ─── 登录 / 登出 ─────────────────────────────────────────────

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = normalizeTokenInput(String(formData.get("token") ?? ""));
  if (!token) return { ok: false, error: "请输入口令" };
  // 先区分「服务端没配口令」和「口令不对」，否则前者的提示会误导人反复重试
  if (!isAdminConfigured()) {
    return { ok: false, error: "服务端未读到 ADMIN_SESSION_TOKEN：请确认项目根目录 .env 已配置，并重启 dev server" };
  }
  if (!isValidToken(token)) return { ok: false, error: "口令不正确" };

  const digest = sessionDigest();
  if (!digest) return { ok: false, error: "服务端未配置 ADMIN_SESSION_TOKEN" };

  (await cookies()).set(ADMIN_COOKIE_NAME, digest, adminCookieOptions());
  revalidatePath("/admin", "layout");
  return { ok: true, message: "校验通过" };
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE_NAME);
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

// ─── 封面图上传 ───────────────────────────────────────────────

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadCoverAction(formData: FormData): Promise<UploadResult> {
  if (!(await isAdminAuthed())) {
    return { ok: false, error: "登录状态已失效，请重新输入口令" };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "未选择文件" };

  try {
    return { ok: true, url: await saveDealCover(file) };
  } catch (e) {
    return { ok: false, error: failure(e, "上传失败").error ?? "上传失败" };
  }
}

// ─── Deal 新增 / 编辑 / 删除 / 复制 ───────────────────────────

export async function saveDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isAdminAuthed())) {
    return { ok: false, error: "登录状态已失效，请重新输入口令" };
  }

  const parsed = readDealForm(formData);
  if (!isDealInput(parsed)) return { ok: false, error: parsed.error };

  const idRaw = String(formData.get("id") ?? "").trim();
  const id = idRaw ? Number(idRaw) : null;
  if (id !== null && !Number.isInteger(id)) {
    return { ok: false, error: "ID 非法" };
  }

  if (id === null) {
    let createdId = 0;
    try {
      const created = await prisma.deal.create({ data: parsed });
      createdId = created.id;
    } catch (e) {
      return failure(e, "创建失败");
    }
    revalidateDeal([parsed.slug]);
    redirect(`/admin/deals/${createdId}?created=1`);
  }

  try {
    const before = await prisma.deal.findUnique({ where: { id } });
    if (!before) return { ok: false, error: "该 deal 不存在" };
    // slug 一经创建即锁定：以库里的为准，忽略表单里被篡改的 slug
    await prisma.deal.update({
      where: { id },
      data: { ...parsed, slug: before.slug },
    });
    revalidateDeal([before.slug]);
    return { ok: true, message: "已保存" };
  } catch (e) {
    return failure(e, "保存失败");
  }
}

export async function deleteDealAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) redirect("/admin");

  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id)) redirect("/admin");

  let slug = "";
  try {
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (deal) {
      slug = deal.slug;
      await prisma.deal.delete({ where: { id } });
    }
  } catch (e) {
    console.error("[/admin] delete failed:", e);
  }

  revalidateDeal([slug]);
  redirect("/admin?deleted=1");
}

export async function duplicateDealAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthed())) redirect("/admin");

  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isInteger(id)) redirect("/admin");

  let newId = 0;
  let newSlug = "";
  try {
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (deal) {
      // 生成一个未被占用的 slug：xxx-copy / xxx-copy-2 ...
      let slug = `${deal.slug}-copy`;
      for (let i = 2; i < 50; i++) {
        const taken = await prisma.deal.findUnique({ where: { slug } });
        if (!taken) break;
        slug = `${deal.slug}-copy-${i}`;
      }
      const copy = await prisma.deal.create({
        data: {
          slug,
          title: `${deal.title} (copy)`,
          summary: deal.summary,
          category: deal.category,
          cover: deal.cover,
          price: deal.price,
          originalPrice: deal.originalPrice,
          description: deal.description,
          includes: deal.includes,
          address: deal.address,
          area: deal.area,
          lng: deal.lng,
          lat: deal.lat,
          sortOrder: deal.sortOrder,
        },
      });
      newId = copy.id;
      newSlug = copy.slug;
    }
  } catch (e) {
    console.error("[/admin] duplicate failed:", e);
  }

  revalidateDeal([newSlug]);
  if (newId > 0) redirect(`/admin/deals/${newId}?created=1`);
  redirect("/admin");
}

// ─── 订单核销 ─────────────────────────────────────────────────

const REDEEM_ERROR_TEXT: Record<RedeemErrorCode, string> = {
  ORDER_NOT_FOUND: "找不到该券码，请核对后重试",
  ALREADY_REDEEMED: "该券码已核销，无需重复操作",
  ONLY_PAID_CAN_REDEEM: "只有「已支付」的订单才能核销",
  NOT_REDEEMED: "该订单尚未核销",
};

/** 券码是 8 位大写字母+数字，手输时容错空格与小写 */
function readCode(formData: FormData): string {
  return String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
}

function toActionState(res: RedeemResult, verb: string): ActionState {
  if (!res.ok) {
    return { ok: false, error: REDEEM_ERROR_TEXT[res.error] ?? "操作失败" };
  }
  return { ok: true, message: `${verb}成功：${res.dealTitle}（${res.code}）` };
}

function revalidateOrders() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/redeem");
}

/** 核销：PAID → REDEEMED */
export async function redeemOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isAdminAuthed())) {
    return { ok: false, error: "登录状态已失效，请重新输入口令" };
  }

  const code = readCode(formData);
  if (!code) return { ok: false, error: "请输入券码" };

  try {
    const res = await markRedeemed(code);
    const state = toActionState(res, "核销");
    if (state.ok) revalidateOrders();
    return state;
  } catch (e) {
    console.error("[/admin] redeem failed:", e);
    return { ok: false, error: "核销失败，请重试" };
  }
}

/** 撤销核销：REDEEMED → PAID */
export async function undoRedeemOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isAdminAuthed())) {
    return { ok: false, error: "登录状态已失效，请重新输入口令" };
  }

  const code = readCode(formData);
  if (!code) return { ok: false, error: "券码不能为空" };

  try {
    const res = await undoRedeem(code);
    const state = toActionState(res, "撤销核销");
    if (state.ok) revalidateOrders();
    return state;
  } catch (e) {
    console.error("[/admin] undo redeem failed:", e);
    return { ok: false, error: "撤销失败，请重试" };
  }
}
