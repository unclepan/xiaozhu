"use client";

import { useState } from "react";
import { deleteDealAction } from "./actions";

/** 删除按钮：自定义确认弹窗，不用原生 confirm */
export default function DeleteDealButton({
  id,
  title,
}: {
  id: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        删除
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
            <h2 className="text-sm font-semibold text-slate-900">删除确认</h2>
            <p className="mt-2 text-sm text-slate-600">
              确定删除「{title}」？该操作不可撤销，其下订单会一并删除。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <form action={deleteDealAction}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  确认删除
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
