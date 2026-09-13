import { notFound } from "next/navigation";
import { getDetail, getConfig } from "@/lib/deals";
import PaySheet from "../../components/PaySheet";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * 支付页（原型 #pay）
 *
 * 详情页由同级 layout.tsx 渲染在下面，这里在服务端取好详情 + 收款码配置，
 * 让面板首屏就是正确金额，客户端只负责建单与出券。
 */
export default async function PayPage({ params }: PageProps) {
  const { slug } = await params;

  const [deal, config] = await Promise.all([
    getDetail(slug),
    getConfig(),
  ]);

  if (!deal) notFound();

  return <PaySheet deal={deal} qrUrl={config?.qrUrl ?? "/images/wechat-qr.jpeg"} />;
}
