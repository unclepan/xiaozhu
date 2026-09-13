import { randomUUID } from "node:crypto";
import Link from "next/link";
import DealForm from "../../deal-form";
import { BLANK_DEAL } from "@/lib/admin/constants";

export const metadata = { title: "新建 Deal · CQ LOCAL Admin" };

// slug 每次进入都新生成一个 36 位 UUID，不能被静态预渲染固化
export const dynamic = "force-dynamic";

export default function NewDealPage() {
  const slug = randomUUID();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">新建 Deal</h1>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-700">
          ← 返回列表
        </Link>
      </div>
      <DealForm initial={{ ...BLANK_DEAL, slug }} slugLocked />
    </div>
  );
}
