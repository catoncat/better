# better-app

一个使用 Bun 构建的全栈 TypeScript 单体仓库（monorepo）：Elysia API + React Web + Prisma(SQLite)。

## Repo 内容

- 后端：`apps/server`（Elysia，Better Auth，OpenAPI `/openapi`，可选 OTel）
- 前端：`apps/web`（React 19 + TanStack Router，Vite dev server）
- 数据：`packages/db`（Prisma schema + generated client + Prismabox(TypeBox) schemas）
- 认证：`packages/auth`（Better Auth 配置与 Prisma adapter）
- 业务域：包含 MES（详见 `domain_docs/mes/*`）

更详细的架构与约定见：
- `agent_docs/00_onboarding/project_overview.md`
- `agent_docs/00_onboarding/setup.md`

## 快速开始（本地开发）

```bash
bun install
cp apps/server/.env.example apps/server/.env

bun run db:migrate
bun run db:seed

# Web http://localhost:3001  API http://localhost:3000
bun run dev
```

前端开发默认通过 Vite proxy 将 `/api` 转发到 `http://localhost:3000`（见 `apps/web/vite.config.ts`）。

## MES 快速演示（端到端）

在另一个终端运行：

```bash
bun apps/server/scripts/test-mes-flow.ts
```

## 常用命令

- 开发：`bun run dev` / `bun run dev:web` / `bun run dev:server`
- 数据库：`bun run db:migrate` / `bun run db:deploy` / `bun run db:studio` / `bun run db:generate`
- 质量：`bun run lint:fix` / `bun run check-types`
- 单文件二进制（web 资源内嵌）：`bun run build:single`（输出 `apps/server/better-app`）

## 环境变量（开发最小集）

- `DATABASE_URL`：SQLite `file:` URL（例如 `file:./data/`；相对路径按 repo 根目录解析）
- `APP_URL`：用于 CORS 允许来源（默认 `http://localhost:3001`）
- `APP_TIMEZONE`：IANA 时区（默认 `Asia/Shanghai`）
- Seed 默认管理员：`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`

完整变量列表见 `apps/server/.env.example`（请不要把真实密钥提交到仓库）。

## API 文档

启动 server 后访问：
- OpenAPI UI：`http://localhost:3000/openapi`
- OpenAPI JSON：`http://localhost:3000/openapi/json`
