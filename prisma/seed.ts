// tsx 独立跑此脚本不会自动读 .env（不像 next dev/build），需手动加载
import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL 未配置：请在 .env 里填写连接串后再执行 pnpm db:seed",
  );
}

// 直接传 DATABASE_URL 字符串，由 adapter 内部创建连接池
const adapter = new PrismaMariaDb(databaseUrl);

const prisma = new PrismaClient({ adapter });

/**
 * 生成 36 位 UUID，形如 83436b1f-3208-4082-9e2e-6aa29e13af3c。
 * seed 里用的是写死的固定值，保证 upsert 幂等；需要新 id 时调用本函数生成。
 */
export function newId(): string {
  return randomUUID();
}

async function main() {
  const deals = [
    {
      slug: "83436b1f-3208-4082-9e2e-6aa29e13af3c",
      title: "Chongqing Hotpot Feast",
      summary: "All-you-can-eat local hotpot for 2, including signature mala broth.",
      category: "FOOD",
      cover:
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=70",
      price: 198,
      originalPrice: 320,
      description:
        "A authentic Chongqing hotpot experience in the heart of the city. Choose your spice level and enjoy unlimited sides.",
      includes: [
        "Unlimited vegetables & tofu",
        "2 signature broths (mala / tomato)",
        "Local draft beer x2",
        "Dessert platter",
      ].join("\n"),
      address: "解放碑步行街 88 号 3F",
      area: "Yuzhong District · 渝中区",
      // TODO 占位：解放碑商圈近似 GCJ-02 坐标，上线前换成实际门店坐标
      lng: 106.5516,
      lat: 29.563,
      sortOrder: 1,
    },
    {
      slug: "d86ff4db-3c71-4377-8f42-5480a2ae5956",
      title: "Yangtze River View Spa",
      summary: "90-min traditional massage with panoramic river view.",
      category: "SPA",
      cover:
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=70",
      price: 268,
      originalPrice: 480,
      description:
        "Relax with a 90-minute full-body massage while overlooking the Yangtze River. Private room included.",
      includes: [
        "90-min full body massage",
        "Foot bath & tea",
        "Private river-view room",
        "Free locker",
      ].join("\n"),
      address: "南滨路 12 号 SPA 中心 18F",
      area: "Nan'an District · 南岸区",
      // TODO 占位：南滨路中段近似 GCJ-02 坐标
      lng: 106.5872,
      lat: 29.5576,
      sortOrder: 2,
    },
    {
      slug: "acd611f9-9b68-4541-8393-293b26feffaa",
      title: "Yangtze Cable Car + Old Town Walk",
      summary: "Round-trip cable car ticket plus guided old town stroll.",
      category: "EXPLORE",
      cover:
        "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=70",
      price: 88,
      originalPrice: 150,
      description:
        "Ride the iconic Yangtze cable car and explore the charming Ciqikou old town with a local guide.",
      includes: [
        "Round-trip cable car",
        "2h guided old town walk",
        "Local snack tasting",
        "Photo stops",
      ].join("\n"),
      address: "新华路 Cable Car Station",
      area: "Yuzhong District · 渝中区",
      // TODO 占位：长江索道北站（新华路）近似 GCJ-02 坐标
      lng: 106.583,
      lat: 29.5659,
      sortOrder: 3,
    },
    {
      slug: "92686dfc-1767-4c9f-8d92-f346fc4fe554",
      title: "Midnight Noodle Crawl",
      summary: "Late-night xiaomian tasting at 3 hidden local spots.",
      category: "FOOD",
      cover:
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=70",
      price: 68,
      originalPrice: 120,
      description:
        "Join a local foodie for a late-night crawl through Chongqing's best xiaomian (small noodles) joints.",
      includes: [
        "3 xiaomian tastings",
        "Local beer x1",
        "Night city walk",
        "English-friendly guide",
      ].join("\n"),
      address: "较场口夜市集合点",
      area: "Yuzhong District · 渝中区",
      // TODO 占位：较场口近似 GCJ-02 坐标
      lng: 106.5496,
      lat: 29.5568,
      sortOrder: 4,
    },
  ];

  for (const d of deals) {
    await prisma.deal.upsert({
      where: { slug: d.slug },
      update: d,
      create: d,
    });
  }

  console.log(`Seeded ${deals.length} deals.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });