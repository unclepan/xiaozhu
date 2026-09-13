import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatYuan } from "@/lib/format-money";
import {
  CATEGORY_OPTIONS,
  categoryLabel,
  isCategoryKey,
} from "@/lib/admin/constants";
import { isLocalUpload } from "@/lib/admin/uploads";
import DeleteDealButton from "./delete-deal-button";
import { duplicateDealAction } from "./actions";

export const metadata = { title: "Deals · CQ LOCAL Admin" };

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; deleted?: string }>;
}

function CoverThumb({ cover, title }: { cover: string; title: string }) {
  if (!cover) {
    return (
      <div className="flex h-11 w-16 items-center justify-center rounded bg-slate-100 text-[11px] text-slate-400">
        无图
      </div>
    );
  }
  return (
    <div
      className="h-11 w-16 rounded bg-slate-100 bg-cover bg-center"
      style={{ backgroundImage: `url('${cover}')` }}
      role="img"
      aria-label={title}
    />
  );
}

export default async function AdminDealsPage({ searchParams }: PageProps) {
  const { category, q, deleted } = await searchParams;
  const keyword = (q ?? "").trim();
  const activeCategory = isCategoryKey(category ?? "") ? category! : "";

  const deals = await prisma.deal.findMany({
    where: {
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(keyword
        ? { OR: [{ title: { contains: keyword } }, { slug: { contains: keyword } }] }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">
          Deals
          <span className="ml-2 text-sm font-normal text-slate-400">
            {deals.length} 条
          </span>
        </h1>
        <div className="ml-auto">
          <Link
            href="/admin/deals/new"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + 新建 Deal
          </Link>
        </div>
      </div>

      {deleted && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          已删除。
        </div>
      )}

      <form
        action="/admin"
        method="get"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
      >
        <select
          name="category"
          defaultValue={activeCategory}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">全部分类</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="q"
          defaultValue={keyword}
          placeholder="搜索标题 / slug"
          className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          筛选
        </button>
        {(activeCategory || keyword) && (
          <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-700">
            重置
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">封面</th>
              <th className="px-3 py-2 font-medium">标题 / slug</th>
              <th className="px-3 py-2 font-medium">分类</th>
              <th className="px-3 py-2 font-medium">价格</th>
              <th className="px-3 py-2 font-medium">排序</th>
              <th className="px-3 py-2 font-medium">订单</th>
              <th className="px-3 py-2 font-medium">更新时间</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deals.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                  没有匹配的 Deal
                </td>
              </tr>
            )}
            {deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <CoverThumb cover={deal.cover} title={deal.title} />
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/deals/${deal.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <div className="text-xs text-slate-400">{deal.slug}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                    {categoryLabel(deal.category)}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-medium">{formatYuan(deal.price)}</span>
                  <span className="ml-1 text-xs text-slate-400 line-through">
                    {formatYuan(deal.originalPrice)}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{deal.sortOrder}</td>
                <td className="px-3 py-2 text-slate-500">{deal._count.orders}</td>
                <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">
                  {deal.updatedAt.toLocaleString("zh-CN", { hour12: false })}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Link
                      href={`/admin/deals/${deal.id}`}
                      className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      编辑
                    </Link>
                    <form action={duplicateDealAction}>
                      <input type="hidden" name="id" value={deal.id} />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        复制
                      </button>
                    </form>
                    <Link
                      href={`/${deal.slug}`}
                      target="_blank"
                      className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      查看
                    </Link>
                    <DeleteDealButton id={deal.id} title={deal.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deals.some((d) => isLocalUpload(d.cover)) && (
        <p className="text-xs text-slate-400">
          含本地上传图片的条目，图片存于 public/uploads/deals/，容器重建前请确认已挂载
          volume 持久化。
        </p>
      )}
    </div>
  );
}
