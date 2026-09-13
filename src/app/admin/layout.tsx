import Link from "next/link";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin/auth";
import { logoutAction } from "./actions";
import AdminLogin from "./login-form";
import type { ReactNode } from "react";

export const metadata = {
  title: "CQ LOCAL · Admin",
  robots: { index: false, follow: false },
};

// 整个 /admin/** 强制运行时动态渲染（SSR），禁止在 next build 阶段静态预渲染。
// 原因：子页面（如 /admin/redeem）会在渲染时直接查数据库（prisma），而 build 环境连不到库，
// 一旦被判定为静态路由就会在构建期执行查询并触发连接池超时（P2039）导致 build 失败。
// 后台页本就不该被缓存，每次请求实时取数才正确。此项会向所有 admin 子段传播。
export const dynamic = "force-dynamic";

/**
 * /admin 门禁
 *
 * 未通过校验时，整个 /admin/** 只渲染一个输入框，不吐出任何业务数据。
 * 校验状态存在 httpOnly cookie 里（只存口令的 sha256 摘要，见 lib/admin/auth.ts）。
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const configured = isAdminConfigured();
  const authed = configured && (await isAdminAuthed());

  return (
    // cq-root 是深色产品页容器，这里显式覆盖成浅色后台底
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      {!authed ? (
        <main className="flex min-h-screen items-center justify-center p-6">
          {configured ? (
            <AdminLogin />
          ) : (
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-medium text-slate-900">/admin 未启用</div>
              <p className="mt-2 text-sm text-slate-500">
                请在 <code className="rounded bg-slate-100 px-1">.env</code> 中配置{" "}
                <code className="rounded bg-slate-100 px-1">ADMIN_SESSION_TOKEN</code>{" "}
                后重启服务。
              </p>
            </div>
          )}
        </main>
      ) : (
        <>
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
              <span className="text-sm font-semibold tracking-wide text-slate-900">
                CQ LOCAL
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                  admin
                </span>
              </span>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/admin" className="text-slate-600 hover:text-slate-900">
                  Deals
                </Link>
                <Link
                  href="/admin/orders"
                  className="text-slate-600 hover:text-slate-900"
                >
                  订单
                </Link>
                <Link
                  href="/admin/redeem"
                  className="text-slate-600 hover:text-slate-900"
                >
                  核销
                </Link>
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/"
                  target="_blank"
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  前台 ↗
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    退出
                  </button>
                </form>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        </>
      )}
    </div>
  );
}
