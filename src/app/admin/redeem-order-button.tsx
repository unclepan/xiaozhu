"use client";

import { useActionState, useState } from "react";
import { redeemOrderAction, undoRedeemOrderAction } from "./actions";
import { IDLE_STATE } from "@/lib/admin/action-state";
import type { ActionState } from "@/lib/admin/action-state";

/**
 * 订单核销 / 撤销核销按钮
 *   自定义确认弹窗，不用原生 confirm
 *   mode=redeem  → PAID 行的「核销」
 *   mode=undo    → REDEEMED 行的「撤销」
 */
export default function RedeemOrderButton({
  code,
  dealTitle,
  mode = "redeem",
}: {
  code: string;
  dealTitle: string;
  mode?: "redeem" | "undo";
}) {
  const isRedeem = mode === "redeem";
  const [open, setOpen] = useState(false);
  // 成功后收起弹窗：放在 action 回调里，而不是 effect 里 setState
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const res = await (isRedeem ? redeemOrderAction : undoRedeemOrderAction)(
        prev,
        formData,
      );
      if (res.ok) setOpen(false);
      return res;
    },
    IDLE_STATE,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-md px-2 py-1 text-xs ${
          isRedeem
            ? "font-medium text-emerald-700 hover:bg-emerald-50"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        {isRedeem ? "核销" : "撤销核销"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-slate-900">
              {isRedeem ? "核销确认" : "撤销核销确认"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isRedeem ? "确定核销" : "确定撤销核销"}「{dealTitle}」？
            </p>
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-base tracking-[0.2em] text-slate-900 break-all">
              {code}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {isRedeem
                ? "核销后该券将标记为已使用。"
                : "状态将回退为「已支付」。"}
            </p>

            {state.error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {state.error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <form action={formAction}>
                <input type="hidden" name="code" value={code} />
                <button
                  type="submit"
                  disabled={pending}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                    isRedeem
                      ? "bg-slate-900 hover:bg-slate-800"
                      : "bg-slate-500 hover:bg-slate-600"
                  }`}
                >
                  {pending
                    ? isRedeem
                      ? "核销中…"
                      : "撤销中…"
                    : isRedeem
                      ? "确认核销"
                      : "确认撤销"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
