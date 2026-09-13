import Link from "next/link";
import { prisma } from "@/lib/db";
import { ORDER_STATUS_OPTIONS, orderStatusLabel } from "@/lib/admin/constants";
import type { DealOrderStatus } from "@/lib/api/deal.types";
import RedeemOrderButton from "../redeem-order-button";

export const metadata = { title: "订单 · CQ LOCAL Admin" };

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  REDEEMED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const keyword = (q ?? "").trim();
  const activeStatus =
    status && (ORDER_STATUS_OPTIONS as string[]).includes(status) ? status : "";

  const [orders, grouped] = await Promise.all([
    prisma.dealOrder.findMany({
      where: {
        ...(activeStatus ? { status: activeStatus } : {}),
        ...(keyword
          ? {
              OR: [
                { code: { contains: keyword } },
                { email: { contains: keyword } },
                { deal: { title: { contains: keyword } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { deal: { select: { id: true, title: true, slug: true } } },
    }),
    prisma.dealOrder.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countOf = (s: string) =>
    grouped.find((g) => g.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">
          订单
          <span className="ml-2 text-sm font-normal text-slate-400">
            最近 {orders.length} 条
          </span>
        </h1>
        <Link
          href="/admin/redeem"
          className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          券码核销
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            activeStatus
              ? "bg-white text-slate-600 ring-1 ring-slate-200"
              : "bg-slate-900 text-white"
          }`}
        >
          全部 {grouped.reduce((n, g) => n + g._count._all, 0)}
        </Link>
        {ORDER_STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              activeStatus === s
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {orderStatusLabel(s)} {countOf(s)}
          </Link>
        ))}
      </div>

      <form
        action="/admin/orders"
        method="get"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
      >
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <input
          type="text"
          name="q"
          defaultValue={keyword}
          placeholder="搜索券码 / 邮箱 / 商品标题"
          className="w-64 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          搜索
        </button>
        {keyword && (
          <Link
            href={activeStatus ? `/admin/orders?status=${activeStatus}` : "/admin/orders"}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            重置
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">券码</th>
              <th className="px-3 py-2 font-medium">商品</th>
              <th className="px-3 py-2 font-medium">收件邮箱</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">下单时间</th>
              <th className="px-3 py-2 font-medium">更新时间</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  没有匹配的订单
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs text-slate-900">
                  {order.code}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/deals/${order.deal.id}`}
                    className="text-slate-900 hover:underline"
                  >
                    {order.deal.title}
                  </Link>
                  <div className="text-xs text-slate-400">{order.deal.slug}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {order.email ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      STATUS_CLASS[order.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {orderStatusLabel(order.status as DealOrderStatus)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                  {order.createdAt.toLocaleString("zh-CN", { hour12: false })}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">
                  {order.updatedAt.toLocaleString("zh-CN", { hour12: false })}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link
                    href={`/${order.deal.slug}`}
                    target="_blank"
                    className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    查看
                  </Link>
                  {order.status === "PAID" && (
                    <RedeemOrderButton code={order.code} dealTitle={order.deal.title} />
                  )}
                  {order.status === "REDEEMED" && (
                    <RedeemOrderButton
                      code={order.code}
                      dealTitle={order.deal.title}
                      mode="undo"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        核销只改订单状态（已支付 ⇄ 已核销），不涉及退款；建单与支付仍由前台 /api/deal/order
        流程驱动。
      </p>
    </div>
  );
}
