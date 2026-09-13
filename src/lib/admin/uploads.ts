import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// ─────────────────────────────────────────────────────────────
// Deal 封面图上传
//
//   物理目录：public/uploads/deals/
//   访问 URL ：/uploads/deals/<uuid>.<ext>
//
//   选型说明（为什么写 public）：
//     - 项目是单容器部署（compose 里只有 app 一个服务），没有对象存储
//     - Deal.cover 本身是字符串 URL，本地路径与外部 CDN 链接可混用，零迁移成本
//     - 不需要额外的读取路由，Next 直接静态直出
//
//   注意事项：
//     - 容器重建会丢失，docker-compose 已把宿主的 ./public/uploads 挂到容器
//       /app/public/uploads（本地=项目根 public/uploads，服务器=~/app/xiaozhu/public/uploads）
//     - 已在 .gitignore 中忽略 public/uploads/*，避免混入仓库与镜像
//     - 若将来要改到 public 之外，只需改本文件的 UPLOAD_DIR / URL_PREFIX，
//       并补一个读取路由即可，调用方无需变动
// ─────────────────────────────────────────────────────────────

/** 落盘目录（绝对路径） */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "deals");

/** 对外可访问的 URL 前缀 */
export const URL_PREFIX = "/uploads/deals";

/** 单文件体积上限：5MB */
export const MAX_BYTES = 5 * 1024 * 1024;

/** 允许的图片类型 → 扩展名 */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const ACCEPTED_TYPES = Object.keys(EXT_BY_MIME);

export class UploadError extends Error {}

/**
 * 保存一张封面图，返回可访问的 URL（如 /uploads/deals/xxx.webp）
 * 文件名由服务端用 randomUUID 生成，杜绝路径穿越与覆盖。
 */
export async function saveDealCover(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new UploadError("EMPTY_FILE");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("FILE_TOO_LARGE");
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    throw new UploadError("UNSUPPORTED_TYPE");
  }

  const filename = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return `${URL_PREFIX}/${filename}`;
}

/** 给定 cover 值判断是否本地上传产物（用于展示"本地文件"标记） */
export function isLocalUpload(cover: string): boolean {
  return cover.startsWith(`${URL_PREFIX}/`);
}
