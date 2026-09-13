import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出：Next.js 会在 .next/standalone 下生成自包含的最小运行时产物
  // 仅包含运行所必需的 node_modules 子集与 server.js，用于构建体积更小的生产 Docker 镜像
  output: "standalone",

  // 允许 next/image 加载外部 CDN 域名的图片
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      }
    ],
  },
};

export default nextConfig;
