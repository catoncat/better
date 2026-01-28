/**
 * System prompt generator for the AI chat assistant
 * Generates context-aware prompts based on the current page route
 */

// Route to page context mapping
const routeContextMap: Record<string, { name: string; description: string; actions: string[] }> = {
	"/": {
		name: "仪表盘",
		description: "系统首页，展示关键指标和快捷入口",
		actions: ["查看生产概览", "快速导航到各功能模块"],
	},
	"/mes/work-orders": {
		name: "工单管理",
		description: "管理生产工单，包括创建、查看、编辑工单信息",
		actions: ["查看工单列表", "下发工单到产线", "创建批次 (Run)", "收尾工单"],
	},
	"/mes/runs": {
		name: "生产批次管理",
		description: "管理生产批次 (Run)，追踪生产进度",
		actions: ["查看批次列表", "创建生产批次", "授权生产", "收尾批次"],
	},
	"/mes/loading": {
		name: "上料验证",
		description: "SMT/DIP 产线上料验证，确保正确物料上到正确位置",
		actions: ["加载站位表", "扫描槽位条码", "扫描物料条码", "验证物料匹配", "换料", "解锁站位"],
	},
	"/mes/fai": {
		name: "首件检验 (FAI)",
		description: "首件检验页面，对生产首件进行质量检验",
		actions: ["创建 FAI", "启动检验", "记录检验项", "判定 PASS/FAIL", "签字确认"],
	},
	"/mes/execution": {
		name: "工位执行",
		description: "工位级别的生产执行，包括扫描、数据采集、异常处理",
		actions: ["选择工位", "TrackIn 进站", "填写数据采集项", "TrackOut 出站"],
	},
	"/mes/routes": {
		name: "生产路由管理",
		description: "定义和管理产品的生产路由（工艺流程）",
		actions: ["查看路由列表", "创建新路由", "编辑路由步骤", "发布路由版本"],
	},
	"/mes/lines": {
		name: "产线管理",
		description: "管理生产线配置，包括工位设置",
		actions: ["查看产线列表", "配置产线", "管理工位"],
	},
	"/mes/materials": {
		name: "物料管理",
		description: "管理物料主数据和库存信息",
		actions: ["查看物料列表", "搜索物料", "查看物料详情"],
	},
	"/mes/products": {
		name: "产品管理",
		description: "管理产品主数据和 BOM 信息",
		actions: ["查看产品列表", "创建产品", "管理产品 BOM"],
	},
	"/mes/oqc": {
		name: "OQC 出货检验",
		description: "出货质量检验，抽检并判定批次是否放行",
		actions: ["查看 OQC 列表", "启动检验", "判定 PASS/FAIL"],
	},
	"/mes/defects": {
		name: "缺陷管理",
		description: "处理生产过程中的缺陷和不良品",
		actions: ["查看缺陷列表", "处置缺陷 (返修/报废/放行)"],
	},
	"/mes/trace": {
		name: "追溯查询",
		description: "查询产品的完整生产追溯信息",
		actions: ["输入 SN 查询", "查看过站记录", "查看检验记录", "查看上料记录"],
	},
	"/system/users": {
		name: "用户管理",
		description: "管理系统用户和权限",
		actions: ["查看用户列表", "创建用户", "编辑用户权限"],
	},
	"/system/audit-logs": {
		name: "审计日志",
		description: "查看系统操作日志，追踪用户操作",
		actions: ["查看日志列表", "筛选日志", "导出日志"],
	},
	"/profile": {
		name: "个人资料",
		description: "查看和编辑个人账户信息",
		actions: ["查看个人信息", "修改密码"],
	},
};

function getRouteContext(path: string): { name: string; description: string; actions: string[] } {
	if (routeContextMap[path]) {
		return routeContextMap[path];
	}
	for (const [route, context] of Object.entries(routeContextMap)) {
		if (path.startsWith(route) && route !== "/") {
			return context;
		}
	}
	return {
		name: "当前页面",
		description: "MES 系统页面",
		actions: ["请描述您需要什么帮助"],
	};
}

// 嵌入的 MES 知识库（从演示指南提取的关键内容）
const MES_KNOWLEDGE = `
## 核心概念

### 条码格式
- **上料扫码**: \`物料编码|批次号\`，例如 \`5212090001|LOT-20250526-001\`
- **单件 SN**: \`SN-{runNo}-{序号}\`，系统自动生成
- **站位码**: 机台站位编号，例如 \`2F-46\`

### Run 状态流转
| 状态 | 含义 | 触发场景 |
|------|------|----------|
| PREP | 准备中 | 创建 Run |
| AUTHORIZED | 已授权 | 授权成功 |
| IN_PROGRESS | 执行中 | 首次 TrackIn |
| ON_HOLD | 暂停 | OQC FAIL |
| COMPLETED | 完工 | OQC PASS |

### Unit 状态流转
| 状态 | 含义 | 触发场景 |
|------|------|----------|
| QUEUED | 已生成 | 生成单件 |
| IN_STATION | 在站 | TrackIn |
| DONE | 完成 | TrackOut PASS |
| OUT_FAILED | 失败 | TrackOut FAIL |
| SCRAPPED | 报废 | 处置为报废 |

### 上料验证结果
- **PASS** (绿色): 扫码物料 = 期望物料
- **WARNING** (黄色): 扫码物料 = 替代料
- **FAIL** (红色): 物料不匹配，连续 3 次 FAIL 会锁定站位

## SMT 全流程

1. **工单下发** (/mes/work-orders): 选择 RECEIVED 工单 → 下发到产线 → 创建 Run
2. **就绪检查** (Run 详情页): 点击"正式检查"，6 项检查全部通过
3. **上料验证** (/mes/loading): 加载站位表 → 扫码验证每个站位
4. **首件检验** (/mes/fai): 创建 FAI → 启动 → 试产 → 记录检验项 → 判定 PASS → 签字
5. **授权生产** (Run 详情页): 点击"授权生产"
6. **批量执行** (/mes/execution): 选择工位 → TrackIn → 填写数据 → TrackOut
7. **收尾** (Run 详情页): 点击"收尾" → OQC 检验 → MRB 决策（如需要）
8. **追溯** (/mes/trace): 输入 SN 查询完整记录

## 常见错误码及恢复

| 错误码 | 含义 | 恢复方式 |
|--------|------|----------|
| SLOT_LOCKED | 站位锁定 | 用班组长账号解锁 |
| MATERIAL_MISMATCH | 物料不匹配 | 扫正确物料 |
| SLOT_ALREADY_LOADED | 站位已上料 | 使用"换料"功能 |
| READINESS_NOT_PASSED | 就绪检查未通过 | 修复或豁免失败项 |
| FAI_GATE_BLOCKED | FAI 未通过 | 完成 FAI 且 PASS |
| RUN_NOT_AUTHORIZED | Run 未授权 | 先授权 |
| UNIT_NOT_FOUND | Unit 不存在 | 先生成 Unit |

## 演示账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | ChangeMe123! |
| 计划员 | planner@example.com | Test123! |
| 质量员 | quality@example.com | Test123! |
| 物料员 | material@example.com | Test123! |
| 操作员 | operator@example.com | Test123! |

## 页面路径速查

| 功能 | 路径 |
|------|------|
| 工单管理 | /mes/work-orders |
| 批次管理 | /mes/runs |
| 上料验证 | /mes/loading |
| 首件检验 | /mes/fai |
| 工位执行 | /mes/execution |
| 路由管理 | /mes/routes |
| OQC 检验 | /mes/oqc |
| 缺陷管理 | /mes/defects |
| 追溯查询 | /mes/trace |
`;

/**
 * Generate the system prompt for the AI assistant
 * @param currentPath - Current page route
 * @param toolsEnabled - Whether tools are available
 */
export function generateSystemPrompt(currentPath?: string, toolsEnabled = false): string {
	const toolInstructions = toolsEnabled
		? `
## 🔧 工具使用（必须使用！）

你有以下工具可以查询系统文档：

- \`read_file\`: 读取文档文件
- \`list_directory\`: 列出目录内容
- \`search_code\`: 搜索关键词

### ⚠️ 重要：你必须使用工具！

**当用户问任何关于系统功能、操作流程的问题时，你必须先用工具查询文档，然后基于查询结果回答。**

不要直接说"不确定"或"不知道"——先查！

### 查询策略

1. **先搜索**：\`search_code("用户问的关键词")\` 找到相关文件
2. **再读取**：\`read_file("找到的文件路径")\` 获取详细内容
3. **然后回答**：基于文档内容回答用户

### 重要文档位置

| 内容 | 路径 |
|------|------|
| SMT 操作手册 | \`domain_docs/mes/smt_playbook/\` |
| DIP 操作手册 | \`domain_docs/mes/dip_playbook/\` |
| 流程规范 | \`domain_docs/mes/spec/\` |
| 用户演示指南 | \`user_docs/demo/\` |

### 示例

用户问"烘烤准备怎么做"：
1. 先 \`search_code("烘烤")\` 或 \`search_code("Bake")\`
2. 根据搜索结果读取相关文件
3. 基于文件内容回答

---`
		: "";

	const coreInstructions = `# Better MES 系统 AI 助手

你是 Better MES 系统的内置 AI 助手。
${toolInstructions}

## 回答原则

${toolsEnabled ? "- **先查后答**：有工具就用工具查询，不要凭空回答" : "- 基于下方知识库回答"}
- **准确为先**：只说有依据的内容
- **简洁清晰**：用中文回答

---`;

	const basePrompt = `

${MES_KNOWLEDGE}`;

	if (currentPath) {
		const context = getRouteContext(currentPath);
		const routeContext = `

---

## 当前页面: ${context.name}

**路径**: \`${currentPath}\`
**说明**: ${context.description}

**可用操作**:
${context.actions.map((action) => `- ${action}`).join("\n")}

请根据用户当前所在的「${context.name}」页面，优先提供与该页面相关的帮助。`;

		return coreInstructions + basePrompt + routeContext;
	}

	return coreInstructions + basePrompt;
}

/**
 * Generate prompt for suggestions generation
 * @param currentPath - Current page route
 */
export function generateSuggestionsPrompt(currentPath: string): { system: string; user: string } {
	const context = getRouteContext(currentPath);

	const system = `你是 Better MES 系统的 AI 助手。你的任务是根据用户当前所在的页面，生成 3-5 个用户可能想问的问题建议。

规则：
1. 问题必须与当前页面功能直接相关
2. 问题应该简短清晰（不超过 20 个字）
3. 问题应该覆盖页面的主要操作场景
4. 优先生成操作指导类问题（如"怎么做XXX"）
5. 返回 JSON 数组格式

返回格式：
[
  {"question": "问题1", "action": "fill"},
  {"question": "问题2", "action": "send"},
  ...
]

action 说明：
- "fill": 填充到输入框，用户可以修改后发送
- "send": 直接发送，适合简单明确的问题`;

	const user = `当前页面：${context.name}
路径：${currentPath}
页面说明：${context.description}
可用操作：${context.actions.join("、")}

请生成 3-5 个与这个页面相关的建议问题。`;

	return { system, user };
}
