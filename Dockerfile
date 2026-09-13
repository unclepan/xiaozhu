# syntax=docker/dockerfile:1.7
# ↑ 这行叫 Dockerfile 前端声明（parser directive）
#   - 必须放在文件第一行（注释除外）
#   - 告诉 Docker 用 1.7 版本的语法解析这个文件
#   - 1.7 版本支持 --mount=type=cache 等高级特性
#   - 不加这行的话，--mount 这种写法会报语法错误

# ── 全局构建参数（ARG）──────────────────────────────────────
# ARG 和 ENV 的区别：
#   - ARG：只在 docker build 过程中有效，容器运行时不存在
#   - ENV：构建时和运行时都存在
# 用法：docker build --build-arg NODE_VERSION=22-alpine .
#       不传 --build-arg 就用等号后面的默认值

ARG NODE_VERSION=24-alpine
# NODE_VERSION=24-alpine
#   - 24        → Node.js 主版本号，24.x 最新版
#   - alpine    → 基于 Alpine Linux（一个极简 Linux 发行版，镜像只有 ~5MB）
#   - 完整镜像名：node:24-alpine
#   - 为什么用 alpine：比 node:24（基于 Debian，~300MB）小很多

ARG PNPM_VERSION=11.7.0
# PNPM_VERSION=11.7.0
#   - pnpm 的精确版本号
#   - 不用 latest，防止某天 pnpm 发新版本导致构建行为变化


# ════════════════════════════════════════════════════════════
# 第一阶段：deps（安装依赖）
# ════════════════════════════════════════════════════════════
# 为什么单独拆一个阶段：
#   Docker 是一层一层构建的，每一层有独立的缓存
#   如果 COPY 的文件没变，这一层和之后所有层都能直接用缓存，跳过执行
#   package.json 不常改，但源码经常改
#   所以先把 package.json 拷进来装依赖 → 这层能缓存很久
#   后面 COPY . . 拷源码 → 只有这层需要重新跑

FROM node:${NODE_VERSION} AS deps
# FROM：指定基础镜像
#   node:24-alpine → 从 Docker Hub 拉取 Node.js 官方镜像
#   AS deps        → 给这个阶段起名叫 deps，后面可以用 COPY --from=deps 引用

WORKDIR /app
# WORKDIR：设置工作目录
#   /app → 如果目录不存在会自动创建
#   之后的 RUN、COPY、CMD 都在这个目录下执行
#   等价于先 RUN mkdir -p /app && cd /app

RUN apk add --no-cache libc6-compat
# RUN：在容器内执行命令
#   apk → Alpine 的包管理器（相当于 Ubuntu 的 apt）
#   add → 安装软件包
#   --no-cache → 不缓存安装包索引，减小镜像体积
#                （默认 apk 会先 update 索引再 install，加 --no-cache 跳过 update 直接用）
#   libc6-compat → 包名，提供 glibc 兼容层
#                   Alpine 用的是 musl libc（更小），但有些 npm 包编译时依赖 glibc
#                   装这个兼容层可以避免 "Error loading shared library" 之类的错误

ARG PNPM_VERSION
# 在 FROM 之后重新声明 ARG
# 原因：ARG 的作用域只在声明它的 FROM 块内
#       每个 FROM 开启一个新阶段，上一阶段的 ARG 不会自动带过来
#       所以每个阶段都要重新写一遍 ARG PNPM_VERSION

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
# RUN：执行命令
#   corepack → Node.js 16.9+ 自带的包管理器管理工具
#              （相当于 nvm 管 Node 版本，corepack 管 pnpm/yarn 版本）
#   enable   → 启用 corepack（默认可能没启用）
#   prepare  → 下载并准备指定版本的 pnpm
#   pnpm@${PNPM_VERSION} → 下载 pnpm@11.7.0 这个版本
#   --activate → 把下载的 pnpm 设为当前 shell 的默认 pnpm 命令
#   效果：之后直接敲 pnpm 就是 11.7.0 版本，不需要 npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# COPY：从宿主机（你的电脑）拷贝文件到容器里
#   package.json       → 项目依赖声明（源路径，相对于 Dockerfile 所在目录）
#   pnpm-lock.yaml     → 依赖版本锁定文件
#   pnpm-workspace.yaml → pnpm monorepo 配置
#   ./                  → 目标路径，相对于 WORKDIR（即 /app/）
#   注意：这里故意不拷源码，只拷依赖文件
#         因为源码经常改，依赖文件不常改
#         这样 Docker 缓存能命中这一层

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
# RUN --mount=type=cache：挂载缓存目录（BuildKit 特性，需要 # syntax=docker/dockerfile:1.7）
#   --mount=type=cache → 挂载一个缓存卷
#   id=pnpm-store      → 缓存 ID，同一台机器上相同 ID 的缓存共享
#   target=/root/.local/share/pnpm/store → 容器内的挂载点（pnpm 的全局缓存目录）
#   效果：第一次构建时下载的包会存到宿主机缓存里
#         第二次构建时直接读缓存，不用重新下载（和 node_modules 不一样，这是 pnpm 的全局 store）
#
# pnpm install：安装依赖
#   --frozen-lockfile → 严格模式
#     不加这个参数：pnpm 发现 package.json 和 lockfile 不一致时，会自动更新 lockfile
#     加上这个参数：不一致时直接报错退出
#     目的：CI/构建环境必须保证依赖版本可复现，不能偷偷改 lockfile


# ════════════════════════════════════════════════════════════
# 第二阶段：builder（构建项目）
# ════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION} AS builder
# 重新 FROM，开启全新阶段
# 上一阶段装的那些 devDependencies 只在这个阶段用
# 最终 runner 阶段不会带过去，镜像更小

WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
# 同上，每个阶段都要重新装 pnpm

COPY --from=deps /app/node_modules ./node_modules
# COPY --from=deps：从 deps 阶段拷贝文件（跨阶段拷贝）
#   --from=deps               → 源阶段名称
#   /app/node_modules         → 源路径（deps 阶段的 /app/node_modules）
#   ./node_modules            → 目标路径（当前阶段的 /app/node_modules）
#   效果：直接把 deps 阶段装好的 node_modules 拷过来
#         不用重新 pnpm install，省时间
#         注意：这里拷的是完整的 node_modules（包含 devDependencies）
#               devDependencies 里有 prisma、typescript 等构建工具

COPY . .
# COPY . .：拷贝当前目录所有文件到容器
#   源 . → Dockerfile 所在目录的所有文件（除了 .dockerignore 里排除的）
#   目标 . → WORKDIR（/app/）
#   拷进去的内容：src/ prisma/ public/ next.config.ts tsconfig.json 等

ENV NEXT_TELEMETRY_DISABLED=1
# ENV：设置环境变量（构建时 + 运行时都生效）
#   NEXT_TELEMETRY_DISABLED → Next.js 的遥测开关
#   值 1 → 关闭，不向 Vercel 发送匿名使用数据
#   不加这个的话，每次 next build 会发一条遥测数据到 Vercel

ENV NODE_ENV=production
# NODE_ENV=production → 告诉 Node.js 和所有工具：当前是生产环境
#   影响：
#     - Next.js：启用生产优化（代码压缩、tree-shaking、SSR 优化）
#     - React：跳过开发时的警告和 PropTypes 检查
#     - 很多 npm 包会根据这个值切换行为（比如关闭 debug 日志）

ENV DATABASE_URL=mysql://dummy:dummy@localhost:3306/dummy
# DATABASE_URL：数据库连接字符串
#   为什么给假地址：
#     Prisma v7 的 prisma.config.ts 里写了 datasource.url = process.env.DATABASE_URL
#     pnpm db:generate（即 prisma generate）会读取 prisma.config.ts
#     如果 DATABASE_URL 不存在，prisma generate 会报错退出
#     但 generate 只是生成类型代码，不需要真的连数据库
#     所以随便给一个格式正确的假地址就行
#   格式：mysql://用户名:密码@主机:端口/数据库名

RUN pnpm db:generate
# pnpm db:generate → 执行 package.json 里 scripts 中定义的 db:generate 命令
#   实际执行的是：prisma generate
#   作用：读取 prisma/schema.prisma，生成 Prisma Client 代码
#   生成位置：src/generated/prisma/（在 schema.prisma 的 generator client 里配置的 output）
#   生成内容：类型定义、查询方法等，Next.js 编译时需要引用这些类型
#   不跑这步的话，pnpm build 会报 "Cannot find module" 错误

RUN pnpm build
# pnpm build → 执行 package.json 里 scripts 中定义的 build 命令
#   实际执行的是：next build
#   作用：编译 Next.js 项目
#   因为 next.config.ts 里配置了 output: "standalone"：
#     产物结构：
#       .next/standalone/     → 自包含运行时
#         server.js           → 入口文件，node server.js 就能启动
#         node_modules/       → 运行时需要的最小依赖子集（自动追踪）
#         package.json        → 运行时依赖声明
#       .next/static/         → 编译后的静态资源（JS chunk、CSS、图片等）
#   注意：standalone 模式下的 node_modules 是 Next.js 自动分析出来的最小集合
#         不是完整的 node_modules，只包含运行时真正 import 的包


# ════════════════════════════════════════════════════════════
# 第三阶段：runner（运行时）
# ════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION} AS runner
# 最后一个 FROM，最终镜像就是这个阶段的内容
# 前面 deps 和 builder 阶段的东西不会自动带过来
# 需要用 COPY --from=xxx 手动拷贝需要的内容

WORKDIR /app

ENV NODE_ENV=production
# 运行时环境变量，同上

ENV NEXT_TELEMETRY_DISABLED=1
# 运行时也关闭遥测

ENV PORT=3000
# PORT=3000 → Next.js server.js 会读取这个环境变量来决定监听哪个端口
#   默认就是 3000，显式写出来是为了明确

ENV HOSTNAME=0.0.0.0
# HOSTNAME=0.0.0.0 → 监听地址
#   0.0.0.0 → 监听所有网络接口（容器内外都能访问）
#   127.0.0.1 → 只监听本地回环（容器内部能访问，外部访问不了）
#   容器里必须用 0.0.0.0，否则 docker run -p 3000:3000 映射了端口也访问不到

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
# RUN：创建系统用户和用户组
#   addgroup → Alpine 的创建用户组命令
#     --system       → 创建系统组（组 ID < 1000，和普通用户组区分）
#     --gid 1001     → 指定组 ID 为 1001（固定值，避免随机分配）
#     nodejs         → 组名
#   && → 命令连接符，前面成功才执行后面
#   adduser → Alpine 的创建用户命令
#     --system       → 创建系统用户（无密码、无登录 shell、无 home 目录）
#     --uid 1001     → 指定用户 ID 为 1001
#     --ingroup nodejs → 把用户加到 nodejs 组
#     nextjs         → 用户名
#   目的：不用 root 运行应用，最小权限原则
#         如果应用被攻破，攻击者拿到的只是 nextjs 用户的权限，不是 root

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# COPY --from=builder：从 builder 阶段拷贝文件
#   --from=builder            → 源阶段
#   --chown=nextjs:nodejs     → 修改文件所有者
#     nextjs:nodejs           → 用户名:组名
#     效果：拷过来的文件属于 nextjs 用户，不是 root
#   /app/public               → 源路径（builder 阶段的 public 目录）
#   ./public                  → 目标路径（当前 /app/public）
#   内容：图片、字体、CSS 等静态资源

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 拷贝 standalone 产物
#   /app/.next/standalone → 源：builder 阶段的 standalone 目录
#   ./                     → 目标：当前工作目录 /app/
#   拷完后 /app/ 下会有：
#     server.js        → Next.js 自包含服务器入口
#     node_modules/    → 运行时最小依赖
#     package.json     → 依赖声明

COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 拷贝静态资源
#   standalone 目录里不包含 .next/static
#   因为 static 文件是给浏览器加载的，不是给 server.js 用的
#   但 server.js 会处理 /_next/static/... 的请求，需要这些文件存在
#   所以必须单独拷贝

COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma
# 拷贝 Prisma Client 生成代码
#   Next.js standalone 的依赖追踪是基于 import 语句的
#   Prisma Client 的引擎文件（.so/.node 二进制）可能不在 import 追踪范围内
#   显式拷贝确保不遗漏，防止运行时 "Cannot find Prisma Client" 错误

USER nextjs
# USER：切换运行用户
#   之后的所有 RUN、CMD、ENTRYPOINT 都用 nextjs 用户执行
#   不用 root 跑应用

EXPOSE 3000
# EXPOSE：声明容器监听的端口
#   这只是元数据/文档作用，不会真的打开端口
#   实际端口映射需要在 docker run -p 或 docker-compose.yml 里配置
#   但写上可以让运维人员一眼知道这个容器用哪个端口

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>{if(r.status>=500)process.exit(1)}).catch(()=>process.exit(1))"
# HEALTHCHECK：定义健康检查规则
#   Docker 会定期执行这个命令，根据返回值判断容器是否健康
#
#   参数说明：
#   --interval=30s      → 每 30 秒执行一次检查
#   --timeout=5s        → 单次检查命令超过 5 秒没返回，算失败
#   --start-period=20s  → 容器启动后等 20 秒才开始检查
#                          （给应用启动时间，避免刚启动还没就绪就被判定为不健康）
#   --retries=3         → 连续失败 3 次才判定为 unhealthy
#                          （避免偶尔的网络抖动导致误判）
#
#   CMD：要执行的检查命令
#   node -e "..." → 用 Node.js 执行一段内联脚本
#   fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/')
#     → 请求本机首页，端口从 PORT 环境变量读，默认 3000
#   .then(r=>{if(r.status>=500)process.exit(1)})
#     → 如果返回 5xx（服务器内部错误），退出码 1（不健康）
#     → 如果返回 2xx/3xx/4xx，正常退出（健康）
#       4xx 也算健康，因为说明服务器在正常运行，只是请求可能有问题
#   .catch(()=>process.exit(1))
#     → 请求失败（连接拒绝、超时等），退出码 1（不健康）
#
#   健康状态的作用：
#     docker ps 会显示 (healthy) 或 (unhealthy)
#     docker-compose 可以配置 depends_on + condition: service_healthy
#     K8s 会根据健康状态决定是否重启 Pod

CMD ["node", "server.js"]
# CMD：容器启动时执行的默认命令
#   格式：CMD ["可执行文件", "参数1", "参数2"]（exec 形式，推荐）
#   node → Node.js 运行时
#   server.js → Next.js standalone 的入口文件
#   效果：容器启动后自动运行 node server.js，启动 Next.js 服务器
#   注意