# Specs ↔ Tests 映射表

> **更新时间**: 2026-01-23

此文件建立 MES 验收场景（`01_acceptance_scenarios.md`）与实际测试代码之间的映射关系，便于追踪覆盖率和维护。

## 1. 测试入口汇总

| 入口 | 命令 | 说明 |
|------|------|------|
| Unit Tests | `bun test apps/server/src/testing/unit` | 单元测试（纯逻辑，无 DB） |
| Integration Tests | `bun test apps/server/src/testing/integration` | 集成测试（真实 DB + 子进程 Server） |
| Acceptance Tests | `bun run test:acceptance` | E2E 验收（独立 DB，flow runner） |
| Flow Runner (直接) | `bun apps/server/scripts/test-mes-flow.ts` | 手动运行特定场景 |

## 2. Acceptance Scenarios → Flow Runner 映射

### E2E 场景（Section 1）

| Scenario ID | 名称 | Flow Runner 覆盖 | 备注 |
|-------------|------|------------------|------|
| 场景 1 | 工单接收与释放 | ✅ `happy` | `WO: receive` → `WO: release` |
| 场景 2 | 生产运行创建与进站 | ✅ `happy` | `Run: create` → `Run: authorize` → `track-in` |
| 场景 3 | TrackOut 与质量控制 | ✅ `happy` | `track-in` → `track-out` (PASS) |
| 场景 4 | 数据采集与追溯 | ⚠️ 部分 | 追溯 API 未在 flow runner 中验证 |
| 场景 5 | OQC 抽检与 MRB 处置 | ✅ 全覆盖 | `oqc-fail-mrb-release`, `oqc-fail-mrb-scrap` |

### 异常处理（Section 2）

| Scenario ID | 名称 | 测试覆盖 | 备注 |
|-------------|------|----------|------|
| 场景 7 | 异常处理 | ✅ Integration | `roles-permissions.test.ts` (401/403) |

### 上料防错与集成 M2（Section 4）

| Scenario ID | 名称 | Flow Runner 覆盖 | 备注 |
|-------------|------|------------------|------|
| 场景 8 | 上料防错 - 正确物料验证 | ✅ `happy --with-loading` | `Loading: verify expected material` |
| 场景 9 | 上料防错 - 物料不匹配 | ✅ `happy --with-loading` | `Loading: verify mismatch` |
| 场景 10 | 连续失败触发锁定 | ❌ 未覆盖 | 需要专门测试锁定逻辑 |
| 场景 11 | 上料门禁阻断 Run 授权 | ⚠️ 部分 | Readiness check 覆盖，但未单独测试门禁 |
| 场景 12 | 钢网状态接收 - 自动模式 | ✅ `readiness-waive` | 通过 readiness 场景覆盖 |
| 场景 13 | 钢网状态不就绪阻断 | ✅ `readiness-waive` | `Readiness: formal check (expect FAIL)` |
| 场景 14 | 锡膏状态接收 - 合规 | ✅ `readiness-waive` | 通过 readiness 场景覆盖 |
| 场景 15 | 锡膏过期阻断 | ⚠️ 部分 | 可扩展 `readiness-waive` 场景 |
| 场景 16 | 手动降级模式 | ❌ 未覆盖 | 需要单独测试 `source=MANUAL` |

## 3. Flow Runner Scenarios 详情

### `happy` (默认)
```
Steps:
1. OQC Sampling Rule: create
2. Line: create/update
3. Station: create/update (×N)
4. Route: create/update
5. Product: create/update
6. BOM: create/update
7. Routing: compile route
8. WO: receive
9. WO: release
10. Run: create
11. OQC Sampling Rule: ensure
12. Loading: load slot expectations (if --with-loading)
13. Readiness: formal check (expect PASS)
14. Run: authorize (expect FAI_NOT_PASSED)
15. FAI: create/start (INSPECTING)
16. FAI: trial execution (first step)
17. FAI: record/complete (PASS)
18. FAI: sign
19. Run: authorize (expect PASS)
20. Execution: track-in/track-out (×N steps)
21. Run: closeout (OQC PASS → COMPLETED)
```

### `oqc-fail-mrb-release`
```
Steps 1-20: 同 happy
21. Run: closeout (OQC FAIL → ON_HOLD)
22. MRB: decision RELEASE → COMPLETED
```

### `oqc-fail-mrb-scrap`
```
Steps 1-20: 同 happy
21. Run: closeout (OQC FAIL → ON_HOLD)
22. MRB: decision SCRAP → SCRAPPED
```

### `readiness-waive`
```
Steps 1-12: 同 happy (需要 --with-loading)
13. Line: resolve lineId
14. Line: capture readiness config
15. Line: set readiness config (enable external gates)
16. Readiness: formal check (expect FAIL)
17. Readiness: waive failed items
18. Readiness: verify waived status (expect PASS)
19. Run: authorize (expect FAI error, confirming Readiness passed)
20. FAI: complete (PASS)
21. FAI: sign
22. Run: authorize (expect PASS)
23. Execution: track-in (create unit)
24. Trace: verify readiness attribution
(scenario ends early)
```

## 4. Integration Tests 详情

### `roles-permissions.test.ts`

| Test Case | 覆盖场景 | 说明 |
|-----------|----------|------|
| `GET /api/roles → 401 when unauthenticated` | 场景 7 | 未登录访问受保护 API |
| `GET /api/roles → 403 when missing permission` | 场景 7 | 权限不足访问管理 API |
| `GET /api/roles → 200 for admin` | 场景 7 | 管理员正常访问 |

### `datetime.test.ts` (Unit)

| Test Case | 说明 |
|-----------|------|
| `formatDateForDB` | 日期格式化工具函数 |
| `parseDateFromDB` | 日期解析工具函数 |

## 5. 覆盖率总结

| 分类 | 总场景数 | 已覆盖 | 部分覆盖 | 未覆盖 |
|------|----------|--------|----------|--------|
| E2E 场景 (1-5) | 5 | 4 | 1 | 0 |
| 异常处理 (7) | 1 | 1 | 0 | 0 |
| 上料防错与集成 (8-16) | 9 | 4 | 3 | 2 |
| **合计** | **15** | **9 (60%)** | **4 (27%)** | **2 (13%)** |

## 6. 待完善项（功能）

### 可选完善
- [ ] 场景 4：追溯查询 API 验证（`GET /api/trace/units/{sn}`）- 主流程已覆盖，仅差查询验证
- [ ] 场景 10：连续失败触发锁定 - 上料边界保护
- [ ] 场景 15：锡膏过期阻断 - 可扩展 `readiness-waive` 场景
- [ ] 场景 16：手动降级模式（`source=MANUAL`）- 外部系统不可用时的降级

## 7. 文件索引

| 文件路径 | 说明 |
|----------|------|
| `apps/server/scripts/test-mes-flow.ts` | Flow runner 主脚本 |
| `apps/server/src/testing/unit/*.test.ts` | 单元测试 |
| `apps/server/src/testing/integration/*.test.ts` | 集成测试 |
| `apps/server/src/testing/helpers/test-db.ts` | 测试 DB 隔离 helper |
| `apps/server/src/testing/helpers/test-app.ts` | 子进程 Server 启动 helper |
| `apps/server/src/testing/helpers/test-api-client.ts` | 测试 API 客户端 |
| `scripts/mes-acceptance.ts` | Acceptance harness（独立 DB 运行） |
