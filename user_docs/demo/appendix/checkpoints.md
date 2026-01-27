# 验证检查点清单

> 用于验证演示流程是否正确完成的检查点。

---

## Readiness 检查点

- [ ] 6 项检查状态与数据来源一致
- [ ] Formal Check 写入记录与审计
- [ ] Waive 需要权限并记录原因
- [ ] 新增准备项（PREP_STENCIL_CLEAN, PREP_SCRAPER）可检查
- [ ] 豁免后显示 WAIVED 状态

---

## Loading 检查点

- [ ] load-table 成功生成站位期望（RunSlotExpectation）
- [ ] 站位初始状态为 PENDING
- [ ] PASS 验证后站位状态变为 LOADED
- [ ] WARNING（替代料）验证后站位状态变为 LOADED
- [ ] FAIL 验证后 failedAttempts 递增
- [ ] 连续 3 次 FAIL 触发站位锁定
- [ ] 解锁需要权限并填写原因
- [ ] replace 记录 REPLACED 状态并保留原因
- [ ] 幂等扫码不新增记录

---

## FAI 检查点

- [ ] sampleQty 满足才能创建 FAI
- [ ] FAI 状态流转：PENDING → INSPECTING → PASS/FAIL
- [ ] 试产 TrackIn/Out 仅允许首工序
- [ ] 检验项记录完整（itemName, result 必填）
- [ ] PASS/FAIL 与 failedQty 规则一致
- [ ] SPI/AOI FAIL 阻断 FAI PASS
- [ ] FAI PASS 后需签字才能授权
- [ ] 签字记录签字人和签字时间

---

## 授权检查点

- [ ] 授权前自动触发 Readiness 检查
- [ ] FAI 门禁阻断逻辑生效
- [ ] 签字门禁阻断逻辑生效
- [ ] 授权成功后 Run 状态变为 AUTHORIZED

---

## Execution 检查点

- [ ] 首次 TrackIn 后 Run 状态变为 IN_PROGRESS
- [ ] Unit 状态流转：QUEUED → IN_STATION → DONE/OUT_FAILED
- [ ] 必填数据采集阻断 TrackOut
- [ ] FAIL 触发缺陷记录创建
- [ ] 处置方式影响 Unit 状态（REWORK/SCRAP）
- [ ] 返修后可重新 TrackIn

---

## OQC/MRB 检查点

- [ ] 抽检规则匹配正确
- [ ] 样本数计算正确（PERCENTAGE/FIXED）
- [ ] OQC PASS 后 Run 状态变为 COMPLETED
- [ ] OQC FAIL 后 Run 状态变为 ON_HOLD
- [ ] MRB RELEASE 后 Run 状态变为 COMPLETED
- [ ] MRB REWORK 创建返修 Run
- [ ] MRB SCRAP 后 Run 状态变为 SCRAPPED

---

## 收尾检查点

- [ ] Run 收尾后状态正确
- [ ] 工单收尾后状态变为 COMPLETED
- [ ] 所有记录可审计追溯

---

## Trace 检查点

- [ ] routeVersion 与 Run 绑定版本一致
- [ ] tracks 记录完整（进站/出站时间、工位、操作人）
- [ ] dataValues 记录完整（采集项值）
- [ ] inspections 记录完整（FAI/OQC 结果）
- [ ] loadingRecords 记录完整（物料批次、站位、验证结果）
- [ ] 缺陷处置记录可见
- [ ] 豁免记录可见
- [ ] 物料批次反查返回正确 SN 列表

---

## 时间规则检查点（新增）

- [ ] 锡膏扫码后自动创建时间规则实例
- [ ] 规则状态显示正确（ACTIVE/EXPIRED）
- [ ] 接近超时时显示预警
- [ ] 超时后 Readiness 检查失败
- [ ] 豁免需要 `time_rule:override` 权限

---

## 准备记录检查点（新增）

- [ ] 钢网清洗记录创建成功
- [ ] 刮刀点检记录创建成功
- [ ] 记录关联到正确的实体
- [ ] Readiness 检查可读取准备记录

---

## 维修管理检查点（新增）

- [ ] 维修记录状态流转正确
- [ ] 维修中实体导致 Readiness 失败
- [ ] 维修验证后实体可用

---

## 快速验证命令

```bash
# 验证服务健康
curl http://localhost:3000/api/health

# 验证前端可访问
curl -I http://localhost:3001

# 运行验收脚本
bun scripts/mes-acceptance.ts --track smt --scenario happy --json
bun scripts/mes-acceptance.ts --track dip --scenario happy --json
```

---

## 返回

- [演示指南首页](../README.md)
- [SMT 演示文档](../smt/)
- [DIP 演示文档](../dip/)
