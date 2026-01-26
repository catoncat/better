# better-app

Better-app 是一个面向先进制造的 MES（Manufacturing Execution System）业务系统。

## MES 业务概览

该系统支撑从 ERP 路由、工单、产线、站位、工艺执行，到数据采集、质量管控（FAI/OQC）、缺陷处置与返修、TPM/ERP 主数据同步，再到追溯、Run 版本冻结、批次授权等全流程能力。当前 milestone 包含：

- M1~M1.8：完成 ERP 路由同步、MES 执行闭环、体验优化与 RBAC；
- M2：质量控制与授权闭环（FAI、OQC、缺陷处置、MRB、返修 Run）已落地；
- M3：上线准备（可重复验收、部署与运维清单、文档/培训、真实数据联调冒烟、数据采集配置 UI；默认人工执行、外部集成可降级）；
- M4：自动化/批量 Ingest、设备自动 Track-in/out、回传等二期能力；

详细流程、状态机、契约等规范请参阅 `domain_docs/mes/spec`，计划与任务安排见 `domain_docs/mes/plan`。

## 技术架构与栈

- **单体 monorepo**：使用 Bun 作为运行时与包管理器，`package.json` 里的 workspace 分别管理 `apps/*`、`packages/*`。
- **后端**：`apps/server`（Elysia + Better Auth + Prisma + OpenAPI）。主要插件包括 `prismaPlugin`、`authPlugin`、`permissionPlugin`、ERP/审核/审核日志 cron 等；默认 `/api` 前缀并暴露 `/openapi` 文档。
- **前端**：`apps/web`（React 19 + TanStack Router + Vite），开发模式通过 Vite proxy 代理 `/api`，生产可嵌入 server（`bun run build:single`）或通过 `APP_WEB_MODE` 配置目录。
- **数据层**：`packages/db`（Prisma schema、Prisma Client、Prismabox TypeBox schema；自定义 Bun SQLite adapter，使用 `DATABASE_URL` 指向 SQLite 文件，支持相对路径自动解析）。
- **认证/权限**：`packages/auth` 包含 Better Auth 设置与 Prisma 适配器，RBAC 建模（用户角色、线体/站位绑定、权限模块）与前端 `apps/web/src/lib/auth-client.ts` 配合。
- **文档与流程**：核心 onboarding、架构、编码标准在 `agent_docs/00_onboarding` 和 `agent_docs/01_core`；MES 规范在 `domain_docs/mes/spec`。

## 快速开始（本地开发）

```bash
bun install
cp apps/server/.env.example apps/server/.env

bun run db:migrate
bun run db:seed

# Web http://localhost:3001  API http://localhost:3000
bun run dev
```

开发时前端通过 `apps/web/vite.config.ts` 的 proxy 默认把 `/api` 转到 `http://localhost:3000`。

## MES 演示流程

新开终端执行：

```bash
bun apps/server/scripts/test-mes-flow.ts
```

该脚本会以 seed 管理员登录后跑一遍 ERP 路由同步、Run 执行、数据采集等示例流程，方便验收。

## 常用命令

- `bun run dev` / `bun run dev:web` / `bun run dev:server`（开发）
- `bun run db:migrate` / `bun run db:deploy` / `bun run db:studio` / `bun run db:generate`
- `bun run lint:fix` / `bun run lint` / `bun run check-types`
- `bun scripts/smart-verify.ts`（智能验证：纯文档变更跳过 `lint`/`check-types`）
- `bun run build:single`（生成单一二进制 `apps/server/better-app` + 嵌入前端）
- `bun run db:seed`（刷新 MES 示例数据）
- `apps/server/better-app seed mes`（单一二进制/容器内：补齐 MES 流程主数据；默认会编译可执行路由版本，可用 `--no-compile` 关闭）

## 关键环境变量

- `DATABASE_URL`: SQLite `file:` URL（例 `file:./data/db.db`，相对路径相对于 repo 根，会在 `packages/db` 解析为绝对路径）。
- `APP_URL`: 用于 API CORS 与 Better Auth 回调（默认 `http://localhost:3001`）。
- `APP_WEB_MODE`: `off|embedded|dir`，由 `apps/server/src/web/config.ts` 解析 Web 服务策略。
- `APP_TIMEZONE`: 时区设置（默认 `Asia/Shanghai`）。
- `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`: 默认管理员凭据；`DEFAULT_USER_PASSWORD` 为新用户初始化密码。
- `SEED_MES_MASTER_DATA`: Docker/单一二进制启动前是否执行 `seed mes`（`true` 时启用；幂等）。
- `APP_TLS_CERT_PATH`/`APP_TLS_KEY_PATH`: 生产 TLS 证书路径。

更多配置请参考 `apps/server/.env.example`。

## API 文档

启动服务后：
- OpenAPI UI：`http://localhost:3000/openapi`
- OpenAPI JSON：`http://localhost:3000/openapi/json`
