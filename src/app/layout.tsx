import type { Metadata } from "next";
import "./globals.css";
import "./cq.css";

export const metadata: Metadata = {
  title: "CQ LOCAL",
  description:
    "Curated Chongqing deals for international travelers — food, spa and city experiences.",
};

/**
 * 根 layout（必须提供 <html> 和 <body>）
 *
 * CQ LOCAL 原型是固定深色的移动端产品页（不跟随站点明暗主题），
 * 直接把作用域容器类 cq-root 挂到 <body> 上，三页共用深色底 + 作用域样式。
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="cq-root">{children}</body>
    </html>
  );
}
