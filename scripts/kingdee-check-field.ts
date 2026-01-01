#!/usr/bin/env bun
/**
 * Quick field check for ExecuteBillQuery.
 *
 * Usage:
 *   bun scripts/kingdee-check-field.ts FORM_ID FIELD_KEY[,FIELD_KEY...]
 */

import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "../apps/server/src/modules/mes/integration/kingdee";

const formId = process.argv[2];
const fieldKeysRaw = process.argv[3];

if (!formId || !fieldKeysRaw) {
	console.error("Usage: bun scripts/kingdee-check-field.ts FORM_ID FIELD_KEY[,FIELD_KEY...]");
	process.exit(1);
}

const main = async () => {
	const configResult = getKingdeeConfig();
	if (!configResult.success) {
		console.error(`Config missing: ${configResult.message}`);
		process.exit(1);
	}

	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) {
		console.error(`Login failed: ${loginResult.message}`);
		process.exit(1);
	}

	const result = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
		formId,
		fieldKeys: fieldKeysRaw,
		startRow: 0,
		limit: 3,
	});

	if (!result.success) {
		console.error(`Query failed: ${result.message}`);
		process.exit(1);
	}

	console.log(`Rows: ${result.data.length}`);
	if (result.data.length > 0) {
		console.log(`Sample: ${JSON.stringify(result.data[0])}`);
	}
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
