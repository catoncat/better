# 首件与过程检验

## 1. 概述
DIP 产线的检验体系比 SMT 更复杂，包括：
- **FAI（首件检验）**：Run 级门禁，授权后才能批量执行
- **IPQC（过程检验）**：段首件检查与巡检，不作为 Run 授权门禁

## 2. FAI（首件检验）

### 2.1 FAI 触发场景
| 场景 | 说明 |
|------|------|
| 新批次 | 每个新 Run 的第一块板 |
| 换产 | 更换产品后的第一块板 |
| 设备变更 | 关键设备/工艺参数变更后 |
| 停机恢复 | 长时间停机后复工 |

### 2.2 FAI 流程
```
Run 创建（PREP）
    ↓
就绪检查通过
    ↓
首件生产
    ↓
创建 FAI 任务
    ↓
执行 FAI 检验
    ↓
FAI 判定
    ├─ 合格 → Run 授权（AUTHORIZED）
    └─ 不合格 → 重新生产首件
```

### 2.3 FAI 检验项（DIP 产线）
| 检验项 | 检验方法 | 判定标准 |
|--------|----------|----------|
| 物料一致性 | 对照 BOM | 物料型号/批次正确 |
| 插件位置 | 目视/夹具对位 | 位置准确无偏移 |
| 插件极性 | 目视检查 | 极性标识正确 |
| 波峰焊质量 | 目视/放大镜 | 透锡率、无虚焊短路 |
| 手工焊点 | 目视检查 | 焊点饱满光亮 |
| 剪脚高度 | 测量 | 符合工艺要求 |
| 三防漆覆盖 | 目视 | 按工艺图纸覆盖 |
| ICT 测试 | 设备测试 | 测试通过 |
| FCT 测试 | 设备测试 | 功能正常 |
| 外观 | 目视检查 | 无划伤/污染/变形 |

### 2.4 FAI 创建
```
POST /api/fai/run/:runNo

Request:
{
  "unitId": "首件单件ID"
}

Response:
{
  "faiId": "FAI-001",
  "runNo": "RUN-2024-001",
  "status": "PENDING",
  "createdAt": "2024-01-15T08:00:00Z"
}
```

### 2.5 FAI 完成
```
POST /api/fai/:faiId/complete

Request:
{
  "result": "PASS", // PASS / FAIL
  "checkItems": [
    { "item": "物料一致性", "result": "PASS", "notes": "" },
    { "item": "插件位置", "result": "PASS", "notes": "" },
    ...
  ],
  "completedBy": "QC-001",
  "photos": ["photo1.jpg", "photo2.jpg"]
}
```

### 2.6 FAI 状态
| 状态 | 说明 |
|------|------|
| PENDING | 待检验 |
| IN_PROGRESS | 检验中 |
| PASSED | 合格 |
| FAILED | 不合格 |

## 3. IPQC（过程检验）

### 3.1 IPQC 与 FAI 的区别
| 维度 | FAI | IPQC |
|------|-----|------|
| 级别 | Run 级 | 工段级 |
| 作用 | 授权门禁 | 过程监控 |
| 频率 | 一次 | 多次 |
| 强制性 | 必须通过 | 建议性 |

### 3.2 IPQC 类型
| 类型 | 触发时机 | 说明 |
|------|----------|------|
| 段首件 | 工段开始 | 新工段的首件检查 |
| 定时巡检 | 每 N 小时 | 周期性抽检 |
| 定量巡检 | 每 N 件 | 按产量抽检 |
| 事件触发 | 异常发生后 | 不良率上升等触发 |

### 3.3 DIP 关键 IPQC 点

#### 后焊段首件
| 检查项 | 说明 |
|--------|------|
| 手工焊点质量 | 首件焊点检查 |
| 剪脚高度 | 测量确认 |
| 三防漆覆盖 | 对照工艺图 |
| 固化效果 | 检查固化度 |

#### 测试段首件
| 检查项 | 说明 |
|--------|------|
| 测试程序版本 | 确认版本正确 |
| 测试夹具状态 | 检查夹具 |
| 首件测试结果 | 完整测试一遍 |
| 测试数据核对 | 检查数据记录 |

### 3.4 IPQC 流程
```
触发 IPQC
    ↓
选择抽样单件
    ↓
执行检验
    ↓
记录检验结果
    ├─ 合格 → 继续生产
    └─ 不合格 → 标记单件 + 触发排查
```

### 3.5 IPQC 记录（IPQCRecord）
| 字段 | 说明 |
|------|------|
| recordId | 记录 ID |
| runId | 批次 ID |
| stationId | 工位 ID |
| checkType | 检验类型 |
| sampleUnits | 抽样单件 |
| checkItems | 检验项结果 |
| result | 总体结果 |
| checkedBy | 检验人 |
| checkedAt | 检验时间 |
| notes | 备注 |

## 4. IPQC 巡检配置

### 4.1 巡检点配置
```yaml
后焊巡检配置:
  station: DIP-A-HS-01
  checkType: PATROL
  frequency:
    type: TIME
    interval: 2h
  sampleSize: 5
  checkItems:
    - name: 焊点质量
      method: 目视
      standard: 饱满光亮
    - name: 剪脚高度
      method: 测量
      standard: 0.5-1.0mm
    - name: 三防漆覆盖
      method: 目视
      standard: 按图纸覆盖

测试巡检配置:
  station: DIP-A-ICT-01
  checkType: PATROL
  frequency:
    type: QUANTITY
    interval: 100
  sampleSize: 3
  checkItems:
    - name: 测试结果一致性
      method: 比对
      standard: 与首件一致
```

### 4.2 巡检执行
```
系统提醒巡检
    ↓
IPQC 人员响应
    ↓
抽取样品
    ↓
按检验项检查
    ↓
记录结果
    ↓
关闭巡检任务
```

## 5. 不合格处理

### 5.1 FAI 不合格
```
FAI 不合格
    ↓
分析原因
    ↓
处置措施
    ├─ 调整工艺 → 重新生产首件 → 重新 FAI
    ├─ 设备问题 → 设备调整 → 重新生产首件 → 重新 FAI
    └─ 物料问题 → 更换物料 → 重新生产首件 → 重新 FAI
```

### 5.2 IPQC 不合格
```
IPQC 不合格
    ↓
标记抽样单件为不良
    ↓
评估影响范围
    ├─ 个别问题 → 该单件返修
    └─ 批量问题 → 暂停生产 → 回溯检查 → 批量处置
```

## 6. 检验记录追溯

### 6.1 FAI 追溯
- FAI 任务与 Run 关联
- FAI 单件可追溯到后续批量
- FAI 照片和检验项存档

### 6.2 IPQC 追溯
- IPQC 记录与 Run 和时间段关联
- 可查询任意时间点的巡检结果
- 不良时可回溯到前序 IPQC

## 7. 页面与操作

### 7.1 FAI 页面
路径：`/mes/fai`

功能：
- FAI 任务列表
- 创建 FAI
- 执行 FAI 检验
- 查看 FAI 结果

### 7.2 IPQC 页面
路径：`/mes/ipqc`（待实现）

功能：
- IPQC 任务列表
- 巡检提醒
- 执行 IPQC
- 查看历史记录

## 8. 相关 API

| 操作 | API | 说明 |
|------|-----|------|
| 创建 FAI | `POST /api/fai/run/:runNo` | |
| 开始 FAI | `POST /api/fai/:faiId/start` | |
| 完成 FAI | `POST /api/fai/:faiId/complete` | |
| 查询 FAI | `GET /api/fai` | 支持按 Run 筛选 |
| 创建 IPQC | `POST /api/ipqc` | （待实现） |
| 完成 IPQC | `POST /api/ipqc/:id/complete` | （待实现） |
