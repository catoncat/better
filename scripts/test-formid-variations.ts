#!/usr/bin/env bun
/**
 * Test different FormId variations to find the correct ones
 *
 * This script tries common variations of FormId naming conventions
 * to discover the correct FormIds for BOM and WorkCenter
 */

import { getKingdeeConfig, kingdeeLogin, kingdeeExecuteBillQuery } from "../apps/server/src/modules/mes/integration/kingdee";

// Possible FormId variations to test
const FORMID_TESTS = {
	"BOM": [
		"ENG_BOM",
		"ENG_Bom",
		"PRD_BOM",
		"BD_BOM",
		"BOM",
		"ENG_PPBOM",
		"ENG_ECNBOM",
	],
	"WorkCenter": [
		"BD_WorkCenter",
		"BD_WORKCENTER",
		"PRD_WorkCenter",
		"PRD_WORKCENTER",
		"BD_WORKCENTRE", // British spelling
		"PRD_WORKCENTRE",
		"MFG_WorkCenter",
		"WorkCenter",
		"WORKCENTER",
		// 其他可能的名称
		"PRD_WORKGROUP",
		"BD_WORKGROUP",
		"PRD_DEPARTMENT",
		"BD_DEPARTMENT",
		"PRD_WORKSHOP",
		"BD_WORKSHOP",
		"MFG_DEPARTMENT",
		"MFG_WORKSHOP",
		"ENG_WorkCenter",
		"ENG_WORKCENTER",
		// 中文名称的拼音
		"BD_GONGZUOZHONGXIN",
		"PRD_GONGZUOZHONGXIN",
	],
};

async function testFormId(cookie: string, formId: string, category: string): Promise<boolean> {
	const config = getKingdeeConfig();
	if (!config.success) return false;

	// Try to query with minimal fields
	const testFields = ["FID", "FNumber", "FName"].join(",");

	try {
		const result = await kingdeeExecuteBillQuery(
			config.data,
			cookie,
			{
				formId,
				fieldKeys: testFields,
				filterString: "",
				startRow: 0,
				limit: 1,
			}
		);

		if (result.success && Array.isArray(result.data)) {
			console.log(`  ✅ ${formId} - WORKS! (${result.data.length} records)`);
			return true;
		} else {
			console.log(`  ❌ ${formId} - Failed: ${result.code || 'unknown error'}`);
			return false;
		}
	} catch (error) {
		console.log(`  ❌ ${formId} - Exception: ${error instanceof Error ? error.message : 'unknown'}`);
		return false;
	}
}

async function main() {
	console.log("🔍 Testing FormId Variations\n");

	// Get config and login
	const configResult = getKingdeeConfig();
	if (!configResult.success) {
		console.error("❌ Config failed:", configResult.message);
		process.exit(1);
	}

	console.log("🔐 Logging in...");
	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) {
		console.error("❌ Login failed:", loginResult.message);
		process.exit(1);
	}
	console.log("✅ Login successful\n");

	const cookie = loginResult.data.cookie;
	const results: Record<string, string[]> = {};

	// Test each category
	for (const [category, formIds] of Object.entries(FORMID_TESTS)) {
		console.log(`\n${"=".repeat(60)}`);
		console.log(`📋 Testing ${category} FormIds`);
		console.log("=".repeat(60));

		results[category] = [];

		for (const formId of formIds) {
			const success = await testFormId(cookie, formId, category);
			if (success) {
				results[category].push(formId);
			}
			// Small delay to avoid overwhelming the server
			await new Promise(resolve => setTimeout(resolve, 200));
		}
	}

	// Summary
	console.log("\n" + "=".repeat(60));
	console.log("📊 SUMMARY");
	console.log("=".repeat(60));

	for (const [category, workingFormIds] of Object.entries(results)) {
		console.log(`\n${category}:`);
		if (workingFormIds.length === 0) {
			console.log("  ❌ No working FormIds found");
		} else {
			console.log(`  ✅ Working FormIds: ${workingFormIds.join(", ")}`);
		}
	}

	console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
