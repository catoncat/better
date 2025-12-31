/**
 * 金蝶工单字段探测脚本
 *
 * 用途：暴力尝试可能的字段名，找出业务状态和领料状态的正确字段
 *
 * 运行：bun run apps/server/scripts/probe-kingdee-fields.ts
 */

import {
	getKingdeeConfig,
	kingdeeExecuteBillQuery,
	kingdeeLogin,
} from "../src/modules/mes/integration/kingdee";

// 可能的业务状态字段名
const CANDIDATE_BIZ_STATUS_FIELDS = [
	"FStatus",
	"FBizStatus",
	"FOrderStatus",
	"FProductStatus",
	"FMOStatus",
	"FPrdOrgStatus",
	"FBillStatus",
	"FCloseStatus",
	"FCloserId",
	"FClosed",
	"FCancelStatus",
	"FConfirmStatus",
	"FBaseStatus",
];

// 可能的领料状态字段名
const CANDIDATE_PICK_STATUS_FIELDS = [
	"FPickMtrlStatus",
	"FIssueStatus",
	"FMaterialIssueStatus",
	"FPickStatus",
	"FMtrlPickStatus",
	"FReqStatus",
	"FStockOutStatus",
	"FIssuedQty",
	"FIssuedStatus",
	"FActPickQty",
	"FPickedQty",
	"FPickedStatus",
];

// 其他可能有用的字段
const CANDIDATE_OTHER_FIELDS = [
	"FBillType",
	"FBillTypeID",
	"FBillTypeID.FNumber",
	"FPrdOrgId",
	"FPrdOrgId.FNumber",
	"FWorkShopID",
	"FWorkShopID.FNumber",
	"FWorkShopID.FName",
	"FRoutingID",
	"FRoutingID.FNumber",
	"FBomID",
	"FBomID.FNumber",
	"FCreateDate",
	"FApproveDate",
	"FStartDate",
	"FPlanStartDate",
	"FConfirmDate",
	"FCompleteQty",
	"FGoodQty",
	"FBadQty",
	"FStockinQty",
	"FMinPlanQty",
	"FScheduleID",
];

// 已知可用的基础字段
const BASE_FIELDS = [
	"FBillNo",
	"FMaterialId.FNumber",
	"FMaterialId.FName",
	"FQty",
	"FPlanFinishDate",
	"FDocumentStatus",
	"FModifyDate",
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function probeFields() {
	console.log("=".repeat(60));
	console.log("金蝶工单字段探测脚本");
	console.log("=".repeat(60));
	console.log("");

	// 1. 获取配置和登录
	const configResult = getKingdeeConfig();
	if (!configResult.success) {
		console.error("❌ 金蝶配置缺失:", configResult.message);
		console.log("请确保以下环境变量已设置:");
		console.log("  MES_ERP_KINGDEE_BASE_URL");
		console.log("  MES_ERP_KINGDEE_DBID");
		console.log("  MES_ERP_KINGDEE_USERNAME");
		console.log("  MES_ERP_KINGDEE_APPID");
		console.log("  MES_ERP_KINGDEE_APP_SECRET");
		console.log("  MES_ERP_KINGDEE_LCID");
		return;
	}

	console.log("✓ 配置已加载");
	console.log(`  Base URL: ${configResult.data.baseUrl}`);
	console.log(`  DB ID: ${configResult.data.dbId}`);
	console.log("");

	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) {
		console.error("❌ 登录失败:", loginResult.message);
		return;
	}
	console.log("✓ 登录成功");
	console.log("");

	const { config, cookie } = { config: configResult.data, cookie: loginResult.data.cookie };

	// 2. 先用基础字段获取一条工单
	console.log("-".repeat(60));
	console.log("步骤 1: 验证基础字段");
	console.log("-".repeat(60));

	const baseResult = await kingdeeExecuteBillQuery(config, cookie, {
		formId: "PRD_MO",
		fieldKeys: BASE_FIELDS.join(","),
		filterString: "",
		limit: 3,
	});

	if (!baseResult.success) {
		console.error("❌ 基础查询失败:", baseResult.message);
		return;
	}

	console.log(`✓ 基础查询成功，返回 ${baseResult.data.length} 条记录`);
	if (baseResult.data.length > 0) {
		console.log("  示例数据:");
		const row = baseResult.data[0] as unknown[];
		BASE_FIELDS.forEach((field, i) => {
			console.log(`    ${field}: ${JSON.stringify(row[i])}`);
		});
	}
	console.log("");

	// 3. 逐个测试候选字段
	console.log("-".repeat(60));
	console.log("步骤 2: 探测业务状态字段");
	console.log("-".repeat(60));

	const validBizFields: { field: string; sampleValues: unknown[] }[] = [];

	for (const field of CANDIDATE_BIZ_STATUS_FIELDS) {
		await delay(200); // 避免请求过快
		const result = await kingdeeExecuteBillQuery(config, cookie, {
			formId: "PRD_MO",
			fieldKeys: `FBillNo,${field}`,
			filterString: "",
			limit: 5,
		});

		if (result.success && result.data.length > 0) {
			const sampleValues = result.data.map((row) => (row as unknown[])[1]);
			const uniqueValues = [...new Set(sampleValues.map((v) => JSON.stringify(v)))];
			console.log(`  ✓ ${field}: ${uniqueValues.join(", ")}`);
			validBizFields.push({ field, sampleValues });
		} else {
			console.log(`  ✗ ${field}: ${result.success ? "无数据" : result.message}`);
		}
	}

	console.log("");
	console.log("-".repeat(60));
	console.log("步骤 3: 探测领料状态字段");
	console.log("-".repeat(60));

	const validPickFields: { field: string; sampleValues: unknown[] }[] = [];

	for (const field of CANDIDATE_PICK_STATUS_FIELDS) {
		await delay(200);
		const result = await kingdeeExecuteBillQuery(config, cookie, {
			formId: "PRD_MO",
			fieldKeys: `FBillNo,${field}`,
			filterString: "",
			limit: 5,
		});

		if (result.success && result.data.length > 0) {
			const sampleValues = result.data.map((row) => (row as unknown[])[1]);
			const uniqueValues = [...new Set(sampleValues.map((v) => JSON.stringify(v)))];
			console.log(`  ✓ ${field}: ${uniqueValues.join(", ")}`);
			validPickFields.push({ field, sampleValues });
		} else {
			console.log(`  ✗ ${field}: ${result.success ? "无数据" : result.message}`);
		}
	}

	console.log("");
	console.log("-".repeat(60));
	console.log("步骤 4: 探测其他有用字段");
	console.log("-".repeat(60));

	const validOtherFields: { field: string; sampleValues: unknown[] }[] = [];

	for (const field of CANDIDATE_OTHER_FIELDS) {
		await delay(200);
		const result = await kingdeeExecuteBillQuery(config, cookie, {
			formId: "PRD_MO",
			fieldKeys: `FBillNo,${field}`,
			filterString: "",
			limit: 3,
		});

		if (result.success && result.data.length > 0) {
			const sampleValues = result.data.map((row) => (row as unknown[])[1]);
			const uniqueValues = [...new Set(sampleValues.map((v) => JSON.stringify(v)))];
			console.log(`  ✓ ${field}: ${uniqueValues.slice(0, 3).join(", ")}`);
			validOtherFields.push({ field, sampleValues });
		} else {
			console.log(`  ✗ ${field}: ${result.success ? "无数据" : result.message}`);
		}
	}

	// 4. 输出汇总
	console.log("");
	console.log("=".repeat(60));
	console.log("汇总");
	console.log("=".repeat(60));

	console.log("");
	console.log("可用的业务状态相关字段:");
	if (validBizFields.length === 0) {
		console.log("  (无)");
	} else {
		for (const { field, sampleValues } of validBizFields) {
			const uniqueValues = [...new Set(sampleValues.map((v) => JSON.stringify(v)))];
			console.log(`  - ${field}: ${uniqueValues.join(", ")}`);
		}
	}

	console.log("");
	console.log("可用的领料状态相关字段:");
	if (validPickFields.length === 0) {
		console.log("  (无)");
	} else {
		for (const { field, sampleValues } of validPickFields) {
			const uniqueValues = [...new Set(sampleValues.map((v) => JSON.stringify(v)))];
			console.log(`  - ${field}: ${uniqueValues.join(", ")}`);
		}
	}

	console.log("");
	console.log("可用的其他字段:");
	if (validOtherFields.length === 0) {
		console.log("  (无)");
	} else {
		for (const { field, sampleValues } of validOtherFields) {
			const uniqueValues = [...new Set(sampleValues.map((v) => JSON.stringify(v)))];
			console.log(`  - ${field}: ${uniqueValues.slice(0, 5).join(", ")}`);
		}
	}

	// 5. 如果找到字段，尝试完整查询
	if (validBizFields.length > 0 || validPickFields.length > 0) {
		console.log("");
		console.log("-".repeat(60));
		console.log("步骤 5: 完整字段测试");
		console.log("-".repeat(60));

		const allFields = [
			...BASE_FIELDS,
			...validBizFields.map((f) => f.field),
			...validPickFields.map((f) => f.field),
		];

		const fullResult = await kingdeeExecuteBillQuery(config, cookie, {
			formId: "PRD_MO",
			fieldKeys: allFields.join(","),
			filterString: "",
			limit: 5,
		});

		if (fullResult.success && fullResult.data.length > 0) {
			console.log("✓ 完整查询成功");
			console.log("");
			console.log("示例工单数据:");
			for (let rowIdx = 0; rowIdx < Math.min(3, fullResult.data.length); rowIdx++) {
				const row = fullResult.data[rowIdx] as unknown[];
				console.log(`\n  工单 ${rowIdx + 1}:`);
				allFields.forEach((field, i) => {
					const value = row[i];
					if (value !== null && value !== undefined && value !== "") {
						console.log(`    ${field}: ${JSON.stringify(value)}`);
					}
				});
			}
		} else {
			console.log("✗ 完整查询失败:", fullResult.success ? "无数据" : fullResult.message);
		}
	}

	console.log("");
	console.log("=".repeat(60));
	console.log("探测完成");
	console.log("=".repeat(60));
}

probeFields().catch(console.error);
