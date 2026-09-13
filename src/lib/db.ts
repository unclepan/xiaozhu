import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma v7：必须显式传入数据库 adapter。
// 直接传 DATABASE_URL 字符串，由 adapter 内部创建连接池，避免与项目 mariadb 版本类型冲突。
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

// 复用单例，避免 Next.js 开发模式 HMR 下反复 new PrismaClient 耗尽连接
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
