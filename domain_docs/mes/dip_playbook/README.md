# DIP 系统配置与流程文档总览

## 目标
本目录用于系统化描述 DIP（通孔插件）产线在本系统中的配置方式、数据来源、数据管理方式，以及完整流程的详细验证步骤。

文档面向两类目标：
1. 生成更真实、更复杂的 DIP 演示数据
2. 设计更细致、更有意义的验证步骤

## 范围说明
- 本目录仅覆盖 DIP 产线（含插件作业、波峰焊接、后焊处理、测试、OQC 等关键流程）。
- 与既有文档并行存在，不覆盖、不修改 `domain_docs/mes/spec/*` 和 `domain_docs/mes/tests/*`。
- 以"系统真实行为"为准，避免理想化流程描述。

## DIP 与 SMT 的核心差异

| 特性 | SMT (表面贴装) | DIP (通孔插件) |
|------|----------------|----------------|
| 元件类型 | 贴片元件 | 通孔元件（连接器、大电容等）|
| 焊接方式 | 回流焊 | **波峰焊 + 手工焊接** |
| 自动化程度 | 极高 | **中等，大量手工作业** |
| 关键夹具 | 钢网 (Stencil) | **波峰焊治具、测试夹具** |
| 流程复杂度 | 流程短 | **流程长（插件→焊接→后焊→测试）** |
| 质量控制点 | 锡膏印刷、贴片精度 | **通孔透锡、剪脚、人工外观** |
| 特殊工序 | 无 | **三防漆喷涂、固化** |
| 上料防错 | FeederSlot + 扫码验证 | **无站位上料，物料发料制** |

## 结构规划
- `00_scope_and_terms.md`
  - 适用范围、角色划分、核心术语（与 SMT 区分的部分重点说明）。
- `01_data_sources_and_ownership.md`
  - 数据来源、数据管理方式、数据生命周期与责任边界。
- `02_configuration/`
  - `01_lines_and_stations.md` 产线与工位配置（替代 SMT 站位概念）
  - `02_material_and_tooling.md` 物料与工装夹具
  - `03_routes_and_products.md` 路由与产品
  - `04_inspection_config.md` 检验配置（IPQC/ICT/FCT）
- `03_run_flow/`
  - `01_work_order_to_run.md` 工单到批次
  - `02_readiness_and_prep.md` 就绪检查与准备（含豁免机制）
  - `03_insertion_flow.md` 插件流程（AI/手工/异形）
  - `04_wave_soldering.md` 波峰焊接
  - `05_post_soldering.md` 后焊处理（补焊/剪脚/喷涂/固化）
  - `06_fai_and_ipqc.md` 首件与过程检验（含签字门禁）
  - `07_testing_flow.md` 测试流程（ICT/FCT）
  - `08_oqc_closeout.md` OQC 与完工
  - `09_exception_and_recovery.md` 异常处理与返修
  - `10_maintenance.md` 维修管理
- `04_demo_data/`
  - `01_demo_dataset_blueprint.md` 演示数据蓝图
  - `02_demo_run_recipe.md` 演示批次生成步骤
  - `03_demo_dataset_script.md` 演示数据脚本
- `05_validation/`
  - `01_insertion_validation.md` 插件验证清单
  - `02_soldering_validation.md` 焊接验证清单
  - `03_testing_validation.md` 测试验证清单
  - `04_traceability_validation.md` 追溯验证清单
- `99_appendix/`
  - `01_entity_to_table_map.md` 实体到数据表映射
  - `02_api_and_ui_index.md` API 与页面索引
  - `03_tooling_management.md` 工装夹具管理说明

## 使用方式
- 新手请按顺序阅读：`00_scope_and_terms.md` → `01_data_sources_and_ownership.md` → `02_configuration/*` → `03_run_flow/*`。
- 需要生成演示数据时，从 `04_demo_data/*` 开始。
- 需要验收或测试时，从 `05_validation/*` 开始。

## 注意事项
- 本目录将持续补充，当前只完成第一阶段文档。
- 所有描述以当前系统实现为基准，若实现变更需同步更新此目录。
- DIP 流程规范参见：`spec/process/04_dip_flows.md`
- DIP 实现对齐参见：`spec/impl_align/04_dip_align.md`
