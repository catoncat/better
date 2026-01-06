# MES Domain Context

> LLM 快速了解 MES 实现进度。详细定义见各流程文档。

## 当前里程碑: M2

## 待实现（按优先级）

### M2 收尾

- **IPQC 服务**（DIP 后焊/测试首件检验）
  - 参考: `spec/process/04_dip_flows.md` → DIP-3, DIP-4 段
  - API（规划，建议与 FAI/OQC 一致）:
    - `POST /api/ipqc/run/{runNo}`（创建）
    - `POST /api/ipqc/{inspectionId}/items`（记录检验项）
    - `POST /api/ipqc/{inspectionId}/complete`（完成）
  - 实现模块: `apps/server/src/modules/mes/ipqc/`（新增）

### M3 规划

- **数据采集服务**（SPI/AOI/ICT/FCT 集成）
  - 参考: `spec/process/03_smp_flows.md` → SPI/AOI 节点
  - 参考: `spec/process/04_dip_flows.md` → AOI/ICT/FCT 节点
  - 现状：`POST /api/stations/{stationCode}/track-out` 支持 `data[]` 写入 `DataValue`
  - API（规划）：如需独立“设备数采入口”，再新增专用 ingest 端点（与 SCADA 对接）
  - 集成对象: SCADA

## 流程文档索引

| 流程 | 文档 | 状态 |
|------|------|------|
| 通用 | `spec/process/01_end_to_end_flows.md` | M1/M2 ✅ |
| SMT | `spec/process/03_smp_flows.md` | M1/M2 ✅, M3 ⬜ |
| DIP | `spec/process/04_dip_flows.md` | M1/M2 大部分 ✅, IPQC ⬜, M3 ⬜ |

每个流程文档末尾有 `## Implementation Status` 节，记录流程节点 → 实现层的对齐状态。

## 提交检查清单（MES 功能）

完成 MES 功能时：

1. **更新流程文档的 `## Implementation Status` 表**（标记 ✅）
2. 如新增流程节点，同步更新 Mermaid 图
3. 如待办变更，更新本文件的「待实现」节
