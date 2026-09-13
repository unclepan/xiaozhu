import { notFound } from "next/navigation";
import { getDetail } from "@/lib/deals";
import DetailView from "../components/DetailView";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * 详情页 layout
 *
 * /[slug] 与 /[slug]/pay 共用：本层取数并渲染详情，
 * 支付面板作为 children 覆盖在当前页上（对应原型 #pay 的 overlay）。
 */
export default async function DealDetailLayout({ children, params }: LayoutProps) {
  const { slug } = await params;

  const deal = await getDetail(slug);

  if (!deal) notFound();

  return <DetailView deal={deal}>{children}</DetailView>;
}
