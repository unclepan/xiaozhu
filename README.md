# xiaozhu

这是一个基于 [Next.js](https://nextjs.org) 的项目，使用 [`create-next-app`](https://nextjs.org/xiaozhu/app/api-reference/cli/create-next-app) 脚手架初始化，默认使用 **pnpm** 作为包管理器，并提供了开箱即用的 Docker 生产部署方案。

## 快速上手

```bash
pnpm install
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可查看运行结果。

## 文档索引

项目文档已按主题拆分至 [`documentation/`](./documentation) 目录，按需查阅：

| 主题 | 文档 | 适用场景 |
|------|------|---------|
| 🚀 快速开始 | [documentation/getting-started.md](./documentation/getting-started.md) | 首次拉取代码，启动本地开发环境 |
| 📜 可用脚本 | [documentation/scripts.md](./documentation/scripts.md) | 了解 `package.json` 中所有 npm 脚本的作用 |
| 🐳 Docker 部署 | [documentation/docker-deployment.md](./documentation/docker-deployment.md) | 将应用构建为生产 Docker 镜像 |
| 🧩 Docker Compose | [documentation/docker-compose.md](./documentation/docker-compose.md) | 用 `docker-compose.yml` 一键启动 / 滚动更新 |
| 🖥️ 服务器部署 | [documentation/server-deployment.md](./documentation/server-deployment.md) | 将镜像部署到自有服务器（含 Nginx / HTTPS / 滚动更新） |
| 🗄️ 数据库接入 | [documentation/prisma-setup.md](./documentation/prisma-setup.md) | Prisma v7 + 腾讯云 CynosDB MySQL 初始化教程 |

## 技术栈速览

- **框架**：Next.js 16（App Router，已启用 `output: "standalone"`）
- **样式**：Tailwind CSS
- **数据获取**：SWR
- **测试**：Vitest + Testing Library + jsdom
- **代码检查**：ESLint（`eslint-config-next`）
- **包管理**：pnpm（`corepack` 锁定为 `pnpm@9.15.0`）

## 部署到 Vercel

部署 Next.js 应用最简便的方式，是使用 Next.js 官方团队推出的 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)。更多细节请查阅 [Next.js 部署文档](https://nextjs.org/xiaozhu/app/building-your-application/deploying)。

如需部署到自有服务器，请按顺序参考 [documentation/docker-deployment.md](./documentation/docker-deployment.md) → [documentation/server-deployment.md](./documentation/server-deployment.md)。
