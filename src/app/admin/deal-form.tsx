"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { saveDealAction, uploadCoverAction } from "./actions";
import { IDLE_STATE } from "@/lib/admin/action-state";
import { CATEGORY_OPTIONS, type DealEditValues } from "@/lib/admin/constants";
import { buildAmapMarkerUrl } from "@/lib/amap";
import DeleteDealButton from "./delete-deal-button";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-500";

/** Deal 新建 / 编辑共用表单。slugLocked = slug 不可编辑（新建自动生成、编辑锁定原值） */
export default function DealForm({
  initial,
  slugLocked = false,
}: {
  initial: DealEditValues;
  slugLocked?: boolean;
}) {
  const isNew = initial.id === null;
  const [state, formAction, pending] = useActionState(saveDealAction, IDLE_STATE);
  const [cover, setCover] = useState(initial.cover);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slug, setSlug] = useState(initial.slug);
  const [lng, setLng] = useState(initial.lng === null ? "" : String(initial.lng));
  const [lat, setLat] = useState(initial.lat === null ? "" : String(initial.lat));

  const mapUrl =
    lng && lat ? buildAmapMarkerUrl(Number(lng), Number(lat), initial.title) : null;

  async function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadCoverAction(fd);
    setUploading(false);
    if (res.ok) setCover(res.url);
    else setUploadError(res.error);
  }

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {initial.id !== null && (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <div className="space-y-4">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="title">
                标题 *
              </label>
              <input
                id="title"
                name="title"
                defaultValue={initial.title}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="slug">
                slug *（URL 上的唯一标识）
              </label>
              {slugLocked ? (
                <div className="flex items-center gap-2">
                  <input type="hidden" name="slug" value={slug} />
                  <code className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                    {slug}
                  </code>
                  {isNew && (
                    <button
                      type="button"
                      onClick={() => setSlug(crypto.randomUUID())}
                      className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      换一个
                    </button>
                  )}
                </div>
              ) : (
                <input
                  id="slug"
                  name="slug"
                  defaultValue={initial.slug}
                  required
                  placeholder="hotpot-feast"
                  className={inputCls}
                />
              )}
              {slugLocked && (
                <p className="mt-1 text-xs text-slate-400">
                  {isNew
                    ? "自动生成 36 位 ID，不可手工输入"
                    : "创建后不可修改，避免已发出的链接与历史订单失效"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls} htmlFor="summary">
              一句话简介
            </label>
            <input
              id="summary"
              name="summary"
              defaultValue={initial.summary}
              className={inputCls}
            />
          </div>

          <div className="mt-4">
            <label className={labelCls} htmlFor="description">
             详细介绍
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={initial.description}
              rows={5}
              className={inputCls}
            />
          </div>

          <div className="mt-4">
            <label className={labelCls} htmlFor="includes">
              包含项（一行一项）
            </label>
            <textarea
              id="includes"
              name="includes"
              defaultValue={initial.includes}
              rows={5}
              placeholder={"Unlimited vegetables & tofu\n2 signature broths"}
              className={inputCls}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="address">
                地址
              </label>
              <input
                id="address"
                name="address"
                defaultValue={initial.address}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="area">
                商圈 / 区域
              </label>
              <input
                id="area"
                name="area"
                defaultValue={initial.area}
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="lng">
                经度 lng（高德 GCJ-02）
              </label>
              <input
                id="lng"
                name="lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="106.5516"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="lat">
                纬度 lat（高德 GCJ-02）
              </label>
              <input
                id="lat"
                name="lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="29.5630"
                className={inputCls}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {mapUrl ? (
              <>
                留空则详情页不显示「Open the map」。
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-slate-600 underline"
                >
                  预览地图 ↗
                </a>
              </>
            ) : (
              "留空则详情页不显示「Open the map」。两个坐标都填了才能生成地图链接。"
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="price">
                售价（元）
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                step={1}
                defaultValue={initial.price}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="originalPrice">
                原价（元）
              </label>
              <input
                id="originalPrice"
                name="originalPrice"
                type="number"
                min={0}
                step={1}
                defaultValue={initial.originalPrice}
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="category">
                分类
              </label>
              <select
                id="category"
                name="category"
                defaultValue={initial.category}
                className={inputCls}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="sortOrder">
                排序（越小越靠前）
              </label>
              <input
                id="sortOrder"
                name="sortOrder"
                type="number"
                step={1}
                defaultValue={initial.sortOrder}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <span className={labelCls}>封面图</span>
          <div
            className="mb-3 flex h-36 w-full items-center justify-center rounded-lg bg-slate-100 bg-cover bg-center text-xs text-slate-400"
            style={cover ? { backgroundImage: `url('${cover}')` } : undefined}
          >
            {!cover && "尚未设置封面"}
          </div>

          <input
            type="text"
            name="cover"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="/uploads/deals/xxx.webp 或 https://..."
            className={inputCls}
          />

          <div className="mt-2 flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              {uploading ? "上传中…" : "上传本地图片"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                onChange={handlePickFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {cover && (
              <button
                type="button"
                onClick={() => setCover("")}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                清空
              </button>
            )}
          </div>
          {uploadError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {uploadError}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            支持 jpeg / png / webp / avif / gif，≤ 5MB，上传至 public/uploads/deals/
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          {state.error && (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="mb-3 text-sm text-emerald-700">{state.message}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "保存中…" : "保存"}
            </button>
            <Link
              href="/admin"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              返回
            </Link>
          </div>
          {initial.id !== null && (
            <div className="mt-3 border-t border-slate-100 pt-3 text-right">
              <DeleteDealButton id={initial.id} title={initial.title || "该 Deal"} />
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
