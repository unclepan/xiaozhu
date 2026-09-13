"use client";

import { useActionState, useState } from "react";
import { redeemOrderAction } from "../actions";
import { IDLE_STATE } from "@/lib/admin/action-state";
import type { ActionState } from "@/lib/admin/action-state";

/** 券码核销：输入券码 → 提交 → 展示结果（成功即清空输入框） */
export default function RedeemForm() {
  const [code, setCode] = useState("");
  // 成功清空、失败保留，便于改一位重输；同样写在 action 回调里
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const res = await redeemOrderAction(prev, formData);
      if (res.ok) setCode("");
      return res;
    },
    IDLE_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <label
        htmlFor="redeem-code"
        className="block text-sm font-medium text-slate-700"
      >
        券码
      </label>
      <input
        id="redeem-code"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        placeholder="如 A2BC3DEF"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none focus:border-slate-900"
      />

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="text-sm text-emerald-700" role="status">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !code.trim()}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "核销中…" : "确认核销"}
      </button>
    </form>
  );
}
