import Link from "next/link";
import { prisma } from "@/lib/db";
import RedeemForm from "./redeem-form";
import RedeemOrderButton from "../redeem-order-button";

export const metadata = { title: "核销 · CQ LOCAL Admin" };

/**
 * 门店核销：输入券码把「已支付」的订单标记为「已核销」。
 * 只有 PAID 能核销，未支付 / 已取消 / 已核销都会被拒绝。
 */
export default async function AdminRedeemPage() {
  const recent = await prisma.dealOrder.findMany({
    where: { status: "REDEEMED" },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: { deal: { select: { id: true, title: true, slug: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">券码核销</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <RedeemForm />
          <p className="mt-3 text-xs text-slate-400">
            仅「已支付」的订单可核销；大小写、空格会自动容错。
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-900">
            最近核销
            <span className="ml-2 text-xs font-normal text-slate-400">
              最近 {recent.length} 条
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">券码</th>
                <th className="px-3 py-2 font-medium">商品</th>
                <th className="px-3 py-2 font-medium">收件邮箱</th>
                <th className="px-3 py-2 font-medium">核销时间</th>
                <th className="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                    还没有核销记录
                  </td>
                </tr>
              )}
              {recent.map((order) => (
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
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {order.updatedAt.toLocaleString("zh-CN", { hour12: false })}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <RedeemOrderButton
                      code={order.code}
                      dealTitle={order.deal.title}
                      mode="undo"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        未记录独立核销时间，上表用订单「更新时间」近似；核销只改状态，不涉及退款。
        全部订单见{" "}
        <Link href="/admin/orders" className="underline hover:text-slate-600">
          /admin/orders
        </Link>
        。
      </p>
    </div>
  );
}
