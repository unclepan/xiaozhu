/**
 * Prisma 配置（Prisma v7）
 *
 * 关键点（v7 的破坏性变化）：
 *   1. `datasource.url` 不再允许出现在 schema 文件中，必须迁移到本文件
*      的 `datasource.url` 字段里，供 Prisma CLI（migrate / studio 等）使用。
 *   2. `import "dotenv/config"` 让 Prisma CLI 执行命令前先自动加载项目根目录
 *      的 `.env`，从而读取到 `DATABASE_URL`。
 *   3. 运行时（Next.js 应用）通过 `@prisma/adapter-mariadb` 适配器连接 MySQL，
 *      在 `src/server/db/prisma.ts` 中的 `new PrismaClient({ adapter })` 传入。
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // 供 Prisma CLI（migrate / studio / validate 等）使用的连接串
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
