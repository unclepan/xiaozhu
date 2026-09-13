"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { loginAction } from "./actions";
import { IDLE_STATE } from "@/lib/admin/action-state";

/** 未通过校验时 /admin 唯一的内容：一个口令输入框 */
export default function AdminLogin() {
  const [state, formAction, pending] = useActionState(loginAction, IDLE_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-base font-semibold text-slate-900">CQ LOCAL Admin</h1>
        <p className="mt-1 text-sm text-slate-500">请输入管理口令以继续。</p>

        <form action={formAction} className="mt-5 space-y-3">
          <input
            type="password"
            name="token"
            autoFocus
            autoComplete="current-password"
            placeholder="ADMIN_SESSION_TOKEN"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "校验中…" : "进入"}
          </button>
        </form>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">
        校验通过后 7 天内免重复输入
      </p>
    </div>
  );
}
