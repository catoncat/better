# DIP 全流程演示（端到端闭环）过程记录

> 记录日期: 2026-01-12
> 演示人员: Gemini
> 目的: 严格按照 `user_docs/demo/guide.md` 走查 DIP 全流程，记录每一步的操作、预期、实际结果、发现的问题及解决方案。

---

## 4.1 创建 DIP 工单与 Run（WO=RECEIVED → RELEASED → Run=PREP）

#### 角色: `planner@example.com` (生产计划员)

**操作演示**:
1.  **接收外部工单**:
    -   在「工单管理」页面 `/mes/work-orders`，点击「接收工单」。
    -   **预期**: 弹出接收工单对话框。
    -   **实际结果**: `[FAIL]`
        -   **问题 #1 (权限)**: 点击「接收工单」按钮后，后端返回 `403 Forbidden` 错误，提示 `Missing required permission: system:integration`。说明 `planner` 角色缺少接收外部工单的权限。
        -   **问题 #2 (UI)**: 接收工单的对话框表单过长，在某些屏幕尺寸下无法滚动，导致底部按钮可能难以点击（虽然自动化工具可以操作，但对真实用户有阻碍）。

    -   **临时解决方案**: 切换到 `admin` (系统管理员) 账号来执行「接收工单」操作。

---

## 4.1 (重试) 创建 DIP 工单与 Run（WO=RECEIVED → RELEASED → Run=PREP）

#### 角色: `admin@example.com` (系统管理员)

**操作演示**:
1.  **登录 Admin**:
    -   退出 `planner`，登录 `admin`。

2.  **接收外部工单**:
    -   进入 `/mes/work-orders`。
    -   点击「接收工单」。
    -   填写表单：
        -   工单号: `WO-DEMO-DIP-NEW`
        -   产品编码: `P-2001`
        -   计划数量: `5`
        -   路由编码: `PCBA-DIP-V1` (注意：搜索框可能默认选中了其他值，需清除后搜索)
        -   物料状态: `全部领料`
    -   点击「接收工单」。
    -   **结果**: `[PASS]` 工单创建成功。

#### 角色: `planner@example.com` (生产计划员)

3.  **切换回 Planner**:
    -   退出 `admin`，重新登录 `planner`。

4.  **下发工单**:
    -   找到 `WO-DEMO-DIP-NEW`。
    -   ...
