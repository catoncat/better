#!/usr/bin/env bun
/**
 * Kingdee Field Discovery Script
 *
 * This script discovers all available fields for the Kingdee forms we're syncing.
 * It uses the View API to fetch complete model structures for each form.
 *
 * Usage:
 *   bun scripts/kingdee-discover-fields.ts
 */

import { getKingdeeConfig, kingdeeLogin, kingdeeView } from "../apps/server/src/modules/mes/integration/kingdee";

// Forms we're currently syncing
const FORMS_TO_DISCOVER = [
	{ formId: "PRD_MO", name: "生产订单 (Work Order)", sampleNumber: null },
	{ formId: "BD_Material", name: "物料主数据 (Material)", sampleNumber: null },
	{ formId: "ENG_BOM", name: "BOM (Bill of Materials)", sampleNumber: null },
	{ formId: "BD_WorkCenter", name: "工作中心 (Work Center - Basic)", sampleNumber: null },
	{ formId: "PRD_WorkCenter", name: "工作中心 (Work Center - Production)", sampleNumber: null },
	{ formId: "ENG_Route", name: "工艺路线 (Routing)", sampleNumber: null },
] as const;

type FieldInfo = {
	path: string;
	type: string;
	value: unknown;
	isArray: boolean;
	isObject: boolean;
	children?: FieldInfo[];
};

/**
 * Recursively extract field information from an object
 */
function extractFields(obj: unknown, prefix = ""): FieldInfo[] {
	if (obj === null || obj === undefined) {
		return [];
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			return [{
				path: prefix,
				type: "array",
				value: [],
				isArray: true,
				isObject: false,
			}];
		}

		// Analyze first item to understand array structure
		const firstItem = obj[0];
		const itemFields = extractFields(firstItem, `${prefix}[0]`);

		return [{
			path: prefix,
			type: "array",
			value: obj,
			isArray: true,
			isObject: false,
			children: itemFields,
		}];
	}

	if (typeof obj === "object") {
		const fields: FieldInfo[] = [];

		for (const [key, value] of Object.entries(obj)) {
			const fieldPath = prefix ? `${prefix}.${key}` : key;
			const valueType = typeof value;

			if (value === null) {
				fields.push({
					path: fieldPath,
					type: "null",
					value: null,
					isArray: false,
					isObject: false,
				});
			} else if (Array.isArray(value)) {
				fields.push(...extractFields(value, fieldPath));
			} else if (typeof value === "object") {
				fields.push({
					path: fieldPath,
					type: "object",
					value,
					isArray: false,
					isObject: true,
					children: extractFields(value, fieldPath),
				});
			} else {
				fields.push({
					path: fieldPath,
					type: valueType,
					value,
					isArray: false,
					isObject: false,
				});
			}
		}

		return fields;
	}

	return [{
		path: prefix,
		type: typeof obj,
		value: obj,
		isArray: false,
		isObject: false,
	}];
}

/**
 * Format field info as a tree structure
 */
function formatFieldTree(fields: FieldInfo[], indent = 0): string {
	const lines: string[] = [];
	const indentStr = "  ".repeat(indent);

	for (const field of fields) {
		const pathParts = field.path.split(".");
		const fieldName = pathParts[pathParts.length - 1];

		if (field.isArray) {
			lines.push(`${indentStr}${fieldName}: array[${(field.value as unknown[]).length}]`);
			if (field.children && field.children.length > 0) {
				lines.push(formatFieldTree(field.children, indent + 1));
			}
		} else if (field.isObject) {
			lines.push(`${indentStr}${fieldName}: object`);
			if (field.children && field.children.length > 0) {
				lines.push(formatFieldTree(field.children, indent + 1));
			}
		} else {
			const valueStr = field.value === null ? "null" : String(field.value).substring(0, 50);
			lines.push(`${indentStr}${fieldName}: ${field.type} = ${valueStr}`);
		}
	}

	return lines.join("\n");
}

/**
 * Generate field mapping suggestions based on discovered fields
 */
function generateFieldMappingSuggestions(formId: string, fields: FieldInfo[]): string {
	const suggestions: string[] = [];
	suggestions.push(`\n// Suggested field mappings for ${formId}:`);
	suggestions.push("const FIELD_KEYS = [");

	// Extract non-nested, non-object fields as potential candidates
	const candidateFields = fields.filter(f =>
		!f.isObject &&
		!f.isArray &&
		!f.path.includes("[") &&
		f.path.split(".").length <= 2 // Max one level of nesting
	);

	for (const field of candidateFields.slice(0, 20)) { // Limit to first 20
		suggestions.push(`  "${field.path}", // ${field.type}`);
	}

	suggestions.push("];");

	return suggestions.join("\n");
}

async function main() {
	console.log("🔍 Kingdee Field Discovery Tool\n");
	console.log("This tool will discover all available fields for the forms we're syncing.\n");

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
	console.log(`✅ Kingdee Config loaded: ${config.baseUrl}`);

	// Login
	console.log("\n🔐 Logging in...");
	const loginResult = await kingdeeLogin(config);
	if (!loginResult.success) {
		console.error("❌ Login failed:", loginResult.message);
		process.exit(1);
	}

	const cookie = loginResult.data.cookie;
	console.log("✅ Login successful\n");

	// Discover fields for each form
	const results: Record<string, { fields: FieldInfo[], raw: unknown }> = {};

	for (const form of FORMS_TO_DISCOVER) {
		console.log(`\n${"=".repeat(80)}`);
		console.log(`📋 Discovering fields for: ${form.name}`);
		console.log(`   FormId: ${form.formId}`);
		console.log(`${"=".repeat(80)}\n`);

		try {
			// For View API, we need a sample record number
			// If sampleNumber is not provided, we'll try to use a generic approach
			const viewPayload = form.sampleNumber
				? { CreateOrgId: 0, Number: form.sampleNumber }
				: { CreateOrgId: 0, Id: "0" }; // Try with ID 0 to see structure

			const viewResult = await kingdeeView(config, cookie, form.formId, viewPayload);

			if (!viewResult.success) {
				console.error(`⚠️  View API failed for ${form.formId}: ${viewResult.message}`);
				console.error("   This might be because we don't have a sample record.");
				console.error("   You can manually provide a sample number in the script.\n");
				continue;
			}

			const data = viewResult.data;

			// Extract fields
			const fields = extractFields(data);
			results[form.formId] = { fields, raw: data };

			// Display results
			console.log("📊 Field Structure:\n");
			console.log(formatFieldTree(fields));

			// Generate mapping suggestions
			console.log(generateFieldMappingSuggestions(form.formId, fields));

			// Save raw JSON for inspection
			const outputPath = `./kingdee-fields-${form.formId}.json`;
			await Bun.write(outputPath, JSON.stringify(data, null, 2));
			console.log(`\n💾 Raw JSON saved to: ${outputPath}`);

		} catch (error) {
			console.error(`❌ Error discovering fields for ${form.formId}:`, error);
		}
	}

	console.log("\n\n" + "=".repeat(80));
	console.log("✨ Field Discovery Complete!");
	console.log("=".repeat(80));

	console.log("\n📝 Summary:");
	for (const form of FORMS_TO_DISCOVER) {
		const result = results[form.formId];
		if (result) {
			const leafFields = result.fields.filter(f => !f.isObject && !f.isArray);
			console.log(`  ${form.formId}: ${leafFields.length} fields discovered`);
		} else {
			console.log(`  ${form.formId}: Failed (needs sample record)`);
		}
	}

	console.log("\n💡 Next Steps:");
	console.log("  1. Review the generated JSON files for each form");
	console.log("  2. Update the field mappings in erp-master-sync-service.ts");
	console.log("  3. Test the updated sync with: bun scripts/kingdee-sync.ts");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
