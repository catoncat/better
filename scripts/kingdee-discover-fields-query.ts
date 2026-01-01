#!/usr/bin/env bun
/**
 * Kingdee Field Discovery Script (using ExecuteBillQuery)
 *
 * This script discovers all available fields by executing queries with wildcard selectors
 * and analyzing the returned data structure.
 *
 * Usage:
 *   bun scripts/kingdee-discover-fields-query.ts
 */

import { getKingdeeConfig, kingdeeLogin, kingdeeExecuteBillQuery } from "../apps/server/src/modules/mes/integration/kingdee";

// Forms we're currently syncing
const FORMS_TO_DISCOVER = [
	{
		formId: "PRD_MO",
		name: "生产订单 (Work Order)",
		// Commonly used base fields for this form
		knownFields: [
			"FID",
			"FBillNo",
			"FBillTypeID",
			"FMaterialId",
			"FQty",
			"FStatus",
			"FDocumentStatus",
			"FCreateDate",
			"FModifyDate",
			"FPlanFinishDate",
			"FPickMtrlStatus",
			"FPrdOrgId",
			"FWorkShopID",
			"FProduceLineId",
		],
	},
	{
		formId: "BD_Material",
		name: "物料主数据 (Material)",
		knownFields: [
			"FMaterialId",
			"FNumber",
			"FName",
			"FMnemonicCode",
			"FSpecification",
			"FModel",
			"FCategoryID",
			"FBaseUnitId",
			"FCreateDate",
			"FModifyDate",
			"FErpClsID",
		],
	},
	{
		formId: "ENG_BOM",
		name: "BOM (Bill of Materials)",
		knownFields: [
			"FID",
			"FBillNo",
			"FMaterialID",
			"FTreeEntity",
			"FModifyDate",
		],
	},
	{
		formId: "BD_WorkCenter",
		name: "工作中心 (Work Center - Basic)",
		knownFields: [
			"FID",
			"FNumber",
			"FName",
			"FUseOrgId",
			"FCreateDate",
			"FModifyDate",
		],
	},
	{
		formId: "PRD_WorkCenter",
		name: "工作中心 (Work Center - Production)",
		knownFields: [
			"FID",
			"FNumber",
			"FName",
			"FUseOrgId",
			"FCreateDate",
			"FModifyDate",
		],
	},
	{
		formId: "ENG_Route",
		name: "工艺路线 (Routing)",
		knownFields: [
			"FID",
			"FBillNo",
			"FNumber",
			"FName",
			"FMaterialId",
			"FTreeEntity",
			"FModifyDate",
		],
	},
] as const;

type FieldAnalysis = {
	fieldKey: string;
	sampleValue: unknown;
	valueType: string;
	isNull: boolean;
	isComplex: boolean; // Object or Array
	frequency: number; // How many records have non-null values
};

/**
 * Analyze a single field across all rows
 */
function analyzeField(rows: unknown[][], fieldIndex: number, fieldKey: string): FieldAnalysis {
	let nonNullCount = 0;
	let sampleValue: unknown = null;
	let valueType = "unknown";

	for (const row of rows) {
		const value = row[fieldIndex];
		if (value !== null && value !== undefined) {
			nonNullCount++;
			if (sampleValue === null) {
				sampleValue = value;
				if (Array.isArray(value)) {
					valueType = "array";
				} else if (typeof value === "object") {
					valueType = "object";
				} else {
					valueType = typeof value;
				}
			}
		}
	}

	return {
		fieldKey,
		sampleValue,
		valueType,
		isNull: nonNullCount === 0,
		isComplex: valueType === "object" || valueType === "array",
		frequency: nonNullCount,
	};
}

/**
 * Try to expand base field with common suffixes for related objects
 */
function expandFieldVariations(baseField: string): string[] {
	const variations = [baseField];

	// Common Kingdee field patterns
	const suffixes = [
		".FNumber",
		".FName",
		".FID",
		".FFullName",
		".FDescription",
		".FCode",
	];

	// For entity fields (usually contain "Entity")
	if (baseField.includes("Entity")) {
		const entityVariations = [
			`${baseField}.FEntryID`,
			`${baseField}.FSeq`,
		];
		variations.push(...entityVariations);
	}

	// Add common suffixes for base data fields
	if (baseField.match(/F\w+(Id|ID)$/)) {
		variations.push(...suffixes.map(s => `${baseField}${s}`));
	}

	return variations;
}

async function discoverFormFields(
	config: ReturnType<typeof getKingdeeConfig>["data"],
	cookie: string,
	formId: string,
	formName: string,
	knownFields: readonly string[],
) {
	console.log(`\n${"=".repeat(80)}`);
	console.log(`📋 Discovering fields for: ${formName}`);
	console.log(`   FormId: ${formId}`);
	console.log(`${"=".repeat(80)}\n`);

	// Generate field variations
	const allFieldVariations = new Set<string>();
	for (const field of knownFields) {
		const variations = expandFieldVariations(field);
		variations.forEach(v => allFieldVariations.add(v));
	}

	const fieldsToTest = Array.from(allFieldVariations);
	console.log(`🔍 Testing ${fieldsToTest.length} field variations...\n`);

	// Query with all fields
	const fieldKeys = fieldsToTest.join(",");

	try {
		const queryResult = await kingdeeExecuteBillQuery(config, cookie, {
			formId,
			fieldKeys,
			filterString: "",
			startRow: 0,
			limit: 10, // Sample 10 records
		});

		if (!queryResult.success) {
			console.error(`❌ Query failed: ${queryResult.message}`);
			return;
		}

		const rows = queryResult.data;
		console.log(`✅ Retrieved ${rows.length} sample records\n`);

		if (rows.length === 0) {
			console.warn(`⚠️  No records found for ${formId}. Cannot analyze fields.`);
			return;
		}

		// Analyze each field
		const analyses: FieldAnalysis[] = [];
		for (let i = 0; i < fieldsToTest.length; i++) {
			const analysis = analyzeField(rows, i, fieldsToTest[i]);
			analyses.push(analysis);
		}

		// Display results
		console.log("📊 Field Analysis:\n");
		console.log("Field Key".padEnd(50) + " | Type".padEnd(10) + " | Sample Value");
		console.log("-".repeat(100));

		// Group by base field
		const grouped = new Map<string, FieldAnalysis[]>();
		for (const analysis of analyses) {
			const baseField = analysis.fieldKey.split(".")[0];
			if (!grouped.has(baseField)) {
				grouped.set(baseField, []);
			}
			grouped.get(baseField)!.push(analysis);
		}

		for (const [baseField, fieldAnalyses] of grouped) {
			console.log(`\n${baseField}:`);
			for (const analysis of fieldAnalyses) {
				if (analysis.isNull) {
					console.log(`  ${analysis.fieldKey.padEnd(48)} | ${"null".padEnd(8)} | (no data)`);
				} else {
					const sampleStr = analysis.isComplex
						? JSON.stringify(analysis.sampleValue).substring(0, 40)
						: String(analysis.sampleValue).substring(0, 40);
					console.log(`  ${analysis.fieldKey.padEnd(48)} | ${analysis.valueType.padEnd(8)} | ${sampleStr}`);
				}
			}
		}

		// Generate recommended field list (non-null, simple fields)
		const recommended = analyses
			.filter(a => !a.isNull && !a.isComplex)
			.map(a => a.fieldKey);

		console.log("\n\n💡 Recommended Fields (non-null, simple types):\n");
		console.log("const FIELDS = [");
		for (const field of recommended) {
			console.log(`  "${field}",`);
		}
		console.log("];");

		// Save raw data
		const outputPath = `./kingdee-fields-${formId}.json`;
		await Bun.write(outputPath, JSON.stringify({
			formId,
			formName,
			sampleSize: rows.length,
			fields: analyses,
			sampleRecords: rows,
		}, null, 2));
		console.log(`\n💾 Full analysis saved to: ${outputPath}`);

	} catch (error) {
		console.error(`❌ Error querying ${formId}:`, error);
	}
}

async function main() {
	console.log("🔍 Kingdee Field Discovery Tool (ExecuteBillQuery)\n");

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
	console.log("✅ Login successful");

	// Discover fields for each form
	for (const form of FORMS_TO_DISCOVER) {
		await discoverFormFields(
			config,
			cookie,
			form.formId,
			form.name,
			form.knownFields,
		);
	}

	console.log("\n\n" + "=".repeat(80));
	console.log("✨ Field Discovery Complete!");
	console.log("=".repeat(80));

	console.log("\n💡 Next Steps:");
	console.log("  1. Review the generated JSON files for each form");
	console.log("  2. Update the field mappings in erp-master-sync-service.ts");
	console.log("  3. Test the updated sync with: bun scripts/kingdee-sync.ts");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
