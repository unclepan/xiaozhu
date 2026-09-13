import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import DealForm from "../../deal-form";
import type { DealEditValues } from "@/lib/admin/constants";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export const metadata = { title: "编辑 Deal · CQ LOCAL Admin" };

export default async function EditDealPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { created } = await searchParams;

  const dealId = Number(id);
  if (!Number.isInteger(dealId)) notFound();

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { _count: { select: { orders: true } } },
  });
  if (!deal) notFound();

  const initial: DealEditValues = {
    id: deal.id,
    slug: deal.slug,
    title: deal.title,
    summary: deal.summary ?? "",
    category: deal.category,
    cover: deal.cover,
    price: deal.price,
    originalPrice: deal.originalPrice,
    description: deal.description ?? "",
    includes: deal.includes,
    address: deal.address ?? "",
    area: deal.area ?? "",
    lng: deal.lng,
    lat: deal.lat,
    sortOrder: deal.sortOrder,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">
          编辑 Deal
          <span className="ml-2 text-sm font-normal text-slate-400">#{deal.id}</span>
        </h1>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-700">
          ← 返回列表
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-slate-400">{deal._count.orders} 个订单</span>
          <Link
            href={`/${deal.slug}`}
            target="_blank"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
          >
            前台查看 ↗
          </Link>
        </div>
      </div>

      {created && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          已创建，继续完善内容即可。
        </div>
      )}

      {/* slug 一经创建即锁定：编辑时只读，避免已发出的链接失效 */}
      <DealForm initial={initial} slugLocked />
    </div>
  );
}
