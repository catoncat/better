#!/usr/bin/env bun
/**
 * Kingdee Complete Field Discovery
 *
 * This script uses ExecuteBillQuery to discover ALL available fields for each form.
 * It queries with a minimal field set to get some records, then uses View API
 * to get the complete structure of those records.
 *
 * Usage:
 *   bun scripts/kingdee-fields-complete.ts [formId]
 *
 * Examples:
 *   bun scripts/kingdee-fields-complete.ts              # Discover all forms
 *   bun scripts/kingdee-fields-complete.ts PRD_MO       # Only discover PRD_MO
 */

import { getKingdeeConfig, kingdeeLogin, kingdeeExecuteBillQuery, kingdeeView } from "../apps/server/src/modules/mes/integration/kingdee";

const FORMS = {
	"PRD_MO": {
		name: "生产订单 (Work Order)",
		numberField: "FBillNo",
		currentFields: ["FBillNo", "FMaterialId.FNumber", "FQty", "FPlanFinishDate", "FStatus", "FPickMtrlStatus", "FModifyDate"],
	},
	"BD_Material": {
		name: "物料主数据 (Material)",
		numberField: "FNumber",
		currentFields: ["FNumber", "FName", "FCategoryID.FName", "FBaseUnitId.FName", "FModifyDate"],
	},
	"ENG_BOM": {
		name: "BOM (Bill of Materials)",
		numberField: "FNumber",  // BOM有自己的编号字段
		currentFields: ["FMaterialID.FNumber", "FMaterialIDChild.FNumber", "FNumerator", "FModifyDate"],
	},
	"ENG_WorkCenter": {
		name: "工作中心 (Engineering Work Center)",
		numberField: "FNumber",
		currentFields: ["FNumber", "FName", "FModifyDate"],
	},
	"ENG_Route": {
		name: "工艺路线 (Routing)",
		numberField: "FNumber",
		currentFields: ["FNumber", "FName", "FMaterialId.FNumber", "FModifyDate"],
	},
} as const;

type FormId = keyof typeof FORMS;

/**
 * Pretty print JSON with colors
 */
function prettyPrint(obj: unknown, indent = 0): void {
	const indentStr = "  ".repeat(indent);

	if (obj === null || obj === undefined) {
		console.log(`${indentStr}${obj}`);
		return;
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			console.log(`${indentStr}[]`);
			return;
		}
		console.log(`${indentStr}[ (${obj.length} items)`);
		prettyPrint(obj[0], indent + 1);
		if (obj.length > 1) {
			console.log(`${indentStr}  ... ${obj.length - 1} more items`);
		}
		console.log(`${indentStr}]`);
		return;
	}

	if (typeof obj === "object") {
		const entries = Object.entries(obj);
		console.log(`${indentStr}{`);
		for (const [key, value] of entries) {
			const valueType = Array.isArray(value) ? "array" : typeof value;
			const preview = Array.isArray(value)
				? `[${value.length}]`
				: typeof value === "object" && value !== null
					? "{...}"
					: JSON.stringify(value).substring(0, 50);

			console.log(`${indentStr}  ${key}: ${valueType} = ${preview}`);
		}
		console.log(`${indentStr}}`);
		return;
	}

	console.log(`${indentStr}${JSON.stringify(obj)}`);
}

/**
 * Extract all field paths from an object recursively
 */
function extractFieldPaths(obj: unknown, prefix = ""): string[] {
	if (obj === null || obj === undefined) {
		return [prefix];
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			return [prefix];
		}
		// For arrays, show structure of first item with [*] notation
		return extractFieldPaths(obj[0], prefix);
	}

	if (typeof obj === "object") {
		const paths: string[] = [];
		for (const [key, value] of Object.entries(obj)) {
			const fieldPath = prefix ? `${prefix}.${key}` : key;

			if (Array.isArray(value)) {
				paths.push(`${fieldPath}[*]`);
				if (value.length > 0) {
					// Recurse into array items
					const itemPaths = extractFieldPaths(value[0], fieldPath);
					paths.push(...itemPaths.filter(p => p !== fieldPath));
				}
			} else if (typeof value === "object" && value !== null) {
				const subPaths = extractFieldPaths(value, fieldPath);
				paths.push(...subPaths);
			} else {
				paths.push(fieldPath);
			}
		}
		return paths;
	}

	return [prefix];
}

/**
 * Convert internal field names to FieldKeys format
 */
function convertToFieldKeys(internalPaths: string[]): string[] {
	// Kingdee's internal model uses different naming than FieldKeys
	// This is a heuristic conversion - may need manual adjustment
	const fieldKeys = new Set<string>();

	for (const path of internalPaths) {
		// Skip metadata fields
		if (path.includes("_") && !path.startsWith("F")) continue;
		if (path.includes(".__")) continue;

		// Extract meaningful paths
		const parts = path.split(".");

		// Handle entity arrays like TreeEntity[*].FQty -> FTreeEntity.FQty
		const transformed = parts.map(part => {
			if (part.endsWith("[*]")) {
				const base = part.replace("[*]", "");
				return base.startsWith("F") ? base : `F${base}`;
			}
			return part;
		}).join(".");

		if (transformed) {
			fieldKeys.add(transformed);
		}
	}

	return Array.from(fieldKeys).sort();
}

async function discoverFormFields(
	config: ReturnType<typeof getKingdeeConfig>["data"],
	cookie: string,
	formId: FormId,
) {
	const form = FORMS[formId];

	console.log(`\n${"=".repeat(80)}`);
	console.log(`📋 ${form.name}`);
	console.log(`   FormId: ${formId}`);
	console.log(`${"=".repeat(80)}\n`);

	// Step 1: Get a sample record number using ExecuteBillQuery
	console.log(`🔍 Step 1: Finding sample records...`);

	const queryResult = await kingdeeExecuteBillQuery(config, cookie, {
		formId,
		fieldKeys: form.numberField,
		filterString: "",
		startRow: 0,
		limit: 5,
	});

	if (!queryResult.success) {
		console.error(`❌ Query failed: ${queryResult.message}`);
		return;
	}

	const rows = queryResult.data;
	if (rows.length === 0) {
		console.warn(`⚠️  No records found for ${formId}`);
		return;
	}

	const sampleNumber = String(rows[0][0]);
	console.log(`✅ Found ${rows.length} records, using sample: ${sampleNumber}\n`);

	// Step 2: Use View API to get complete structure
	console.log(`🔍 Step 2: Fetching complete structure with View API...`);

	const viewResult = await kingdeeView(config, cookie, formId, {
		CreateOrgId: 0,
		Number: sampleNumber,
	});

	if (!viewResult.success) {
		console.error(`❌ View failed: ${viewResult.message}`);
		return;
	}

	const model = viewResult.data;
	console.log(`✅ Retrieved complete model\n`);

	// Step 3: Analyze structure
	console.log(`📊 Structure Overview:\n`);
	prettyPrint(model);

	// Step 4: Extract all field paths
	console.log(`\n\n🗂️  All Field Paths:\n`);
	const allPaths = extractFieldPaths(model);
	const fieldKeys = convertToFieldKeys(allPaths);

	// Group by prefix
	const grouped = new Map<string, string[]>();
	for (const field of fieldKeys) {
		const prefix = field.split(".")[0];
		if (!grouped.has(prefix)) {
			grouped.set(prefix, []);
		}
		grouped.get(prefix)!.push(field);
	}

	for (const [prefix, fields] of Array.from(grouped).sort()) {
		console.log(`\n${prefix}:`);
		for (const field of fields) {
			const isCurrent = form.currentFields.includes(field);
			const marker = isCurrent ? "✓" : " ";
			console.log(`  ${marker} ${field}`);
		}
	}

	// Step 5: Generate new field list
	console.log(`\n\n💡 Suggested Field List (TypeScript):\n`);
	console.log(`const ${formId.replace(/[^A-Z0-9]/g, "_")}_FIELDS = [`);
	for (const field of fieldKeys) {
		const isCurrent = form.currentFields.includes(field);
		const comment = isCurrent ? " // currently used" : "";
		console.log(`  "${field}",${comment}`);
	}
	console.log(`];\n`);

	// Step 6: Save to file
	const outputPath = `./kingdee-${formId}-complete.json`;
	await Bun.write(outputPath, JSON.stringify({
		formId,
		formName: form.name,
		sampleNumber,
		currentFields: form.currentFields,
		discoveredFields: fieldKeys,
		rawModel: model,
		allInternalPaths: allPaths,
	}, null, 2));

	console.log(`💾 Complete analysis saved to: ${outputPath}`);
}

async function main() {
	const targetFormId = process.argv[2] as FormId | undefined;

	console.log("🔍 Kingdee Complete Field Discovery\n");

	if (targetFormId && !FORMS[targetFormId]) {
		console.error(`❌ Unknown FormId: ${targetFormId}`);
		console.error(`\nAvailable forms: ${Object.keys(FORMS).join(", ")}`);
		process.exit(1);
	}

	// Get Kingdee config
	const configResult = getKingdeeConfig();
	if (!configResult.success) {
		console.error("❌ Failed to get Kingdee config:", configResult.message);
		console.error("\nPlease ensure you have set the following environment variables:");
		console.error("  - MES_ERP_KINGDEE_SERVER_URL");
		console.error("  - MES_ERP_KINGDEE_DB_ID");
		console.error("  - MES_ERP_KINGDEE_USERNAME");
		console.error("  - MES_ERP_KINGDEE_PASSWORD");
		process.exit(1);
	}

	const config = configResult.data;
	console.log(`✅ Kingdee Config: ${config.baseUrl}`);

	// Login
	console.log(`🔐 Logging in as ${config.username}...`);
	const loginResult = await kingdeeLogin(config);
	if (!loginResult.success) {
		console.error("❌ Login failed:", loginResult.message);
		process.exit(1);
	}

	const cookie = loginResult.data.cookie;
	console.log("✅ Login successful");

	// Discover fields
	const formsToDiscover = targetFormId ? [targetFormId] : Object.keys(FORMS) as FormId[];

	for (const formId of formsToDiscover) {
		await discoverFormFields(config, cookie, formId);
	}

	console.log("\n\n" + "=".repeat(80));
	console.log("✨ Discovery Complete!");
	console.log("=".repeat(80));
}

main().catch((error) => {
	console.error("\n❌ Fatal error:", error);
	process.exit(1);
});
