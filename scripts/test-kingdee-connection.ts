#!/usr/bin/env bun
/**
 * Quick test of Kingdee field discovery
 * This is a minimal test to verify the connection and basic functionality
 */

import { getKingdeeConfig, kingdeeLogin } from "../apps/server/src/modules/mes/integration/kingdee";

async function quickTest() {
	console.log("🧪 Quick Test: Kingdee Field Discovery\n");

	// Test 1: Config
	console.log("Test 1: Loading config...");
	const configResult = getKingdeeConfig();

	if (!configResult.success) {
		console.error("❌ FAIL: Could not load config");
		console.error(`   Error: ${configResult.message}`);
		console.error("\n💡 Make sure you have copied .env from main worktree:");
		console.error("   cp ../better/.env .env");
		return false;
	}

	console.log("✅ PASS: Config loaded");
	console.log(`   Server: ${configResult.data.baseUrl}`);
	console.log(`   DB: ${configResult.data.dbId}`);
	console.log(`   User: ${configResult.data.username}\n`);

	// Test 2: Login
	console.log("Test 2: Testing login...");
	const loginResult = await kingdeeLogin(configResult.data);

	if (!loginResult.success) {
		console.error("❌ FAIL: Login failed");
		console.error(`   Error: ${loginResult.message}`);
		return false;
	}

	console.log("✅ PASS: Login successful");
	console.log(`   Cookie: ${loginResult.data.cookie.substring(0, 50)}...\n`);

	// All tests passed
	console.log("✨ All tests passed! You can now run:");
	console.log("   bun scripts/kingdee-fields-complete.ts");

	return true;
}

quickTest()
	.then((success) => {
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error("\n💥 Unexpected error:", error);
		process.exit(1);
	});
