# SMT 系统配置与流程文档总览

## 目标
本目录用于系统化描述 SMT 在本系统中的配置方式、数据来源、数据管理方式，以及完整流程的详细验证步骤。
文档面向两类目标：
1) 生成更真实、更复杂的演示数据
2) 设计更细致、更有意义的验证步骤

## 范围说明
- 本目录仅覆盖 SMT 产线（含上料防错、首件、执行、OQC 等关键流程）。
- 与既有文档并行存在，不覆盖、不修改 `domain_docs/mes/spec/*` 和 `domain_docs/mes/tests/*`。
- 以“系统真实行为”为准，避免理想化流程描述。

## 结构规划
- `00_scope_and_terms.md`
  - 术语定义、角色划分、核心实体映射（站位/工位/物料/批次等）。
- `01_data_sources_and_ownership.md`
  - 数据来源、数据管理方式、数据生命周期与责任边界。
- `02_configuration/`
  - `01_lines_and_slots.md` 产线与站位配置
  - `02_material_master_and_lots.md` 物料与批次配置
  - `03_slot_material_mapping.md` 槽位物料映射
  - `04_routes_and_products.md` 路由/产品影响范围
- `03_run_flow/`
  - `01_work_order_to_run.md` 工单与批次
  - `02_readiness_and_prep.md` 准备流程与就绪检查
  - `03_loading_flow.md` 上料防错（加载站位表/扫码验证/换料）
  - `04_fai_flow.md` 首件流程
  - `05_execution_and_trace.md` 执行与追溯
  - `06_oqc_closeout.md` OQC 与完工
- `04_demo_data/`
  - `01_demo_dataset_blueprint.md` 演示数据蓝图
  - `02_demo_run_recipe.md` 演示批次生成步骤
- `05_validation/`
  - `01_loading_validation.md` 上料验证清单
  - `02_run_and_execution_validation.md` 批次与执行验证清单
  - `03_traceability_validation.md` 追溯验证清单
- `99_appendix/`
  - `01_entity_to_table_map.md` 实体到数据表的映射
  - `02_api_and_ui_index.md` API 与页面索引
  - `03_barcode_rules.md` 条码规则与兼容性说明

## 使用方式
- 新手请按顺序阅读：`00_scope_and_terms.md` → `01_data_sources_and_ownership.md` → `02_configuration/*` → `03_run_flow/*`。
- 需要生成演示数据时，从 `04_demo_data/*` 开始。
- 需要验收或测试时，从 `05_validation/*` 开始。

## 注意事项
- 本目录将持续补充，当前只完成第一阶段文档。
- 所有描述以当前系统实现为基准，若实现变更需同步更新此目录。
