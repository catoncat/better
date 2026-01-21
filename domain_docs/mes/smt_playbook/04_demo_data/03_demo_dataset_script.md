# 演示数据脚本（SMT）

## 1. 目的
- 一键生成 SMT 演示数据：基础配置 + 运行批次（上料/FAI/执行/OQC）
- 便于快速准备演示与验证数据集

## 2. 脚本位置
- `apps/server/scripts/smt-demo-dataset.ts`

## 3. 运行方式
### 3.1 前置条件
- 已执行基础种子数据（包含用户与角色）：`bun apps/server/scripts/seed.ts`
- API 服务已启动（默认端口 3000，可用 `--api-url` 指定）

### 3.2 运行脚本
```bash
bun apps/server/scripts/smt-demo-dataset.ts
```

### 常用参数
- `--seed-only` 只生成基础配置，不创建 Run
- `--plan-qty <n>` Run 计划数量（默认 10）
- `--unit-qty <n>` 生成 Unit 数量（默认 = planQty）
- `--sample-qty <n>` FAI 抽样数（默认 2）
- `--wo-no <woNo>` 自定义工单号（默认 `WO-20250526-001`）
- `--api-url <url>` API 地址（默认 `http://127.0.0.1:3000/api`）
- `--email <email>` 登录邮箱（默认 `SEED_ADMIN_EMAIL`）
- `--password <pwd>` 登录密码（默认 `SEED_ADMIN_PASSWORD`）
- `--test-password <pwd>` 测试账号密码（默认 `SEED_TEST_PASSWORD`）
- `--operator-id <id>` 上料/执行操作人（默认 `OP-01`）

## 4. 输出说明
- 脚本会输出：
  - `runNo`
  - Unit SN 列表（前 3 个）
  - FAI / OQC 任务 ID
- 实际验证步骤中请以脚本输出为准。

## 5. 生成的数据范围（摘要）
- 配置数据：Line / StationGroup / Station / FeederSlot / SlotMaterialMapping
- 主数据：Material / MaterialLot / BOM
- 路由：Routing + RoutingStep + 编译版本
- Readiness 依赖：LineStencil + StencilStatusRecord / LineSolderPaste + SolderPasteStatusRecord / TPM Equipment
- 运行数据：Run / Unit / LoadingRecord / FAI / Track / OQC

## 6. 与演示流程的对齐说明
- Run 编号由系统自动生成（`RUN-${woNo}-${timestamp}`），请在脚本输出中获取。
- 上料扫码示例使用 `物料编码|批次号` 格式。
