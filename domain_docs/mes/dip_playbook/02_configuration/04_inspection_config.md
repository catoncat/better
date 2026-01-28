# 检验配置

## 1. 概述
DIP 产线的检验配置比 SMT 更复杂，包括：
- **FAI（首件检验）**：Run 级门禁
- **IPQC（过程检验）**：段首件与巡检
- **ICT（在线测试）**：电气连通性测试
- **FCT（功能测试）**：功能性验证
- **OQC（出货检验）**：最终抽检

## 2. FAI 配置

### 2.1 FAI 触发条件
| 条件 | 说明 |
|------|------|
| 新批次 | 每个新 Run 的第一块板 |
| 换线 | 更换产品后的第一块板 |
| 设备变更 | 关键设备参数变更后 |

### 2.2 FAI 检验项
| 检验项 | 检验方法 | 判定标准 |
|--------|----------|----------|
| 物料一致性 | 对照 BOM 核对 | 物料型号/批次正确 |
| 插件位置 | 目视/夹具对位 | 位置准确无偏移 |
| 插件极性 | 目视检查 | 极性标识正确 |
| 焊接质量 | 目视/放大镜 | 无虚焊/短路/透锡不足 |
| 外观 | 目视检查 | 无划伤/污染/变形 |
| 功能验证 | 基础功能测试 | 功能正常 |

### 2.3 FAI 模板（FaiTemplate）
FAI 采用结构化模板，路由绑定模板后在创建 FAI 时自动生成检验项。
| 字段 | 说明 | 示例 |
|------|------|------|
| code | 模板编码 | FAI-PRDA-V1 |
| name | 模板名称 | 产品 A 首件模板 |
| productCode | 适用产品 | PRD-A |
| processType | 工艺类型 | DIP |
| version | 版本 | V1 |
| isActive | 是否启用 | true |
| items | 检验项列表 | seq/itemName/itemSpec/required |
| meta | 扩展信息 | JSON |

## 3. IPQC 配置

### 3.1 IPQC 类型
| 类型 | 触发时机 | 说明 |
|------|----------|------|
| 段首件 | 工段开始 | 后焊/测试段的首件检查 |
| 定时巡检 | 每 N 小时 | 周期性抽检 |
| 定量巡检 | 每 N 件 | 按产量抽检 |
| 事件触发 | 异常发生后 | 不良率上升等触发 |

### 3.2 IPQC 检验点配置（IpqcCheckpoint）
| 字段 | 说明 | 示例 |
|------|------|------|
| stationId | 工位 ID | DIP-A-HS-01 |
| checkType | 检验类型 | FIRST_PIECE / PATROL |
| frequency | 频率 | 每 2 小时 / 每 100 件 |
| checkItems | 检验项 | 焊接质量、外观等 |
| sampleSize | 抽样数量 | 3 件 |

### 3.3 DIP 典型 IPQC 配置
```yaml
后焊段首件:
  station: DIP-A-HS-01
  checkType: FIRST_PIECE
  checkItems:
    - 手工焊点质量
    - 剪脚高度
    - 三防漆覆盖
  sampleSize: 1

后焊定时巡检:
  station: DIP-A-HS-01
  checkType: PATROL
  frequency: 2h
  checkItems:
    - 焊接质量抽检
    - 工装状态
    - 环境温湿度
  sampleSize: 5

测试段首件:
  station: DIP-A-ICT-01
  checkType: FIRST_PIECE
  checkItems:
    - ICT 测试程序验证
    - 测试夹具状态
    - 首件测试结果
  sampleSize: 1
```

## 4. ICT 测试配置

### 4.1 ICT 测试程序（TestProgram）
| 字段 | 说明 | 示例 |
|------|------|------|
| programCode | 程序编码 | ICT-PRDA-V1 |
| name | 程序名称 | 产品 A ICT 测试程序 |
| productId | 适用产品 | PROD-A |
| stationId | 测试工位 | DIP-A-ICT-01 |
| version | 版本 | 1.0 |
| testPoints | 测试点数 | 256 |

### 4.2 ICT 测试项
| 测试项 | 说明 | 判定标准 |
|--------|------|----------|
| 开路测试 | 检测断路 | 连通性正常 |
| 短路测试 | 检测桥连 | 无意外连接 |
| 电阻测试 | 测量电阻值 | 在规格范围内 |
| 电容测试 | 测量电容值 | 在规格范围内 |
| 二极管测试 | 测量二极管 | 极性/参数正确 |
| IC 测试 | 测试集成电路 | 功能正常 |

### 4.3 ICT 测试结果（TestRecord）
| 字段 | 说明 |
|------|------|
| unitId | 单件 ID |
| programId | 测试程序 ID |
| result | 结果（PASS/FAIL）|
| failedItems | 失败项明细 |
| rawData | 原始测试数据 |
| testedAt | 测试时间 |
| testedBy | 测试人员 |

## 5. FCT 测试配置

### 5.1 FCT 测试程序
| 字段 | 说明 | 示例 |
|------|------|------|
| programCode | 程序编码 | FCT-PRDA-V1 |
| name | 程序名称 | 产品 A 功能测试程序 |
| productId | 适用产品 | PROD-A |
| stationId | 测试工位 | DIP-A-FCT-01 |

### 5.2 FCT 测试项示例
| 测试项 | 说明 | 判定标准 |
|--------|------|----------|
| 电源上电 | 检测电源功能 | 电压/电流正常 |
| 通讯测试 | 检测通讯接口 | 通讯正常 |
| IO 测试 | 检测输入输出 | IO 响应正确 |
| LED 测试 | 检测指示灯 | 亮灭正常 |
| 按键测试 | 检测按键功能 | 按键响应正确 |
| 综合功能 | 模拟实际工作 | 功能正常 |

## 6. OQC 配置

### 6.1 OQC 抽样规则
| 字段 | 说明 | 示例 |
|------|------|------|
| productId | 产品 ID | PROD-A |
| sampleLevel | 抽样水平 | AQL 2.5 |
| sampleSize | 抽样数量 | 按批量查表 |
| checkItems | 检验项 | 外观、尺寸、功能 |

### 6.2 OQC 触发条件
| 条件 | 说明 |
|------|------|
| Run 完成 | 所有单件完成时自动触发 |
| 手动触发 | 质量人员手动创建 |
| 批量阈值 | 累计完成 N 件触发 |

## 7. 检验设备配置

### 7.1 测试设备（TestEquipment）
| 字段 | 说明 | 示例 |
|------|------|------|
| equipmentCode | 设备编码 | ICT-EQ-001 |
| name | 设备名称 | ICT 测试机 1 号 |
| type | 设备类型 | ICT / FCT |
| stationId | 关联工位 | DIP-A-ICT-01 |
| calibrationDue | 校准到期日 | 2024-12-31 |

### 7.2 设备校准管理
- 校准到期提醒
- 超期禁用测试
- 校准记录追溯

## 8. 配置要点

### 8.1 测试程序版本管理
- 测试程序需要版本控制
- 新版本需经过验证后启用
- 旧版本需要归档保留

### 8.2 测试与夹具关联
- 每个测试程序关联特定夹具
- 夹具更换需要重新验证
- 夹具寿命影响测试稳定性

## 9. 页面与 API

### 9.1 配置入口
- FAI 管理：`/mes/fai`
- IPQC 管理：`/mes/ipqc`（待实现）
- 测试程序：`/mes/test-programs`（待实现）
- OQC 管理：`/mes/oqc`

### 9.2 相关 API
| 操作 | API | 说明 |
|------|-----|------|
| FAI 创建 | `POST /api/fai/run/:runNo` | |
| FAI 完成 | `POST /api/fai/:faiId/complete` | |
| 测试记录 | `POST /api/test-records` | 记录测试结果 |
| OQC 创建 | `POST /api/oqc/run/:runNo` | |
| OQC 完成 | `POST /api/oqc/:oqcId/complete` | |
