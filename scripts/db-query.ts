#!/usr/bin/env bun
/**
 * 通用数据库查询脚本 - 用于 data-verify skill
 *
 * 用法:
 *   bun scripts/db-query.ts "SELECT * FROM Run LIMIT 5"
 *   bun scripts/db-query.ts --table Run --where "runNo LIKE '%XXX%'"
 *   bun scripts/db-query.ts --run RUN-XXX  # 快捷查询批次及其期望
 *
 * 环境变量:
 *   DATABASE_URL - 数据库连接字符串 (从 apps/server/.env 读取)
 */

import { Database } from "bun:sqlite";
import path from "node:path";
import fs from "node:fs";

// 解析数据库路径
function getDatabasePath(): string {
	// 尝试从 apps/server/.env 读取
	const envPath = path.resolve(import.meta.dir, "../apps/server/.env");
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, "utf-8");
		const match = envContent.match(/DATABASE_URL=file:(.+)/);
		if (match) {
			const dbPath = match[1].trim();
			if (path.isAbsolute(dbPath)) {
				return dbPath;
			}
			return path.resolve(import.meta.dir, "..", dbPath);
		}
	}

	// 回退到默认路径
	return path.resolve(import.meta.dir, "../data/db.db");
}

function printHelp() {
	console.log(`
数据库查询脚本 - 用于 data-verify skill

用法:
  bun scripts/db-query.ts "<SQL>"                    # 执行原始 SQL
  bun scripts/db-query.ts --table <表名> [--where "条件"]  # 查询表
  bun scripts/db-query.ts --run <runNo>              # 查询批次及其站位期望
  bun scripts/db-query.ts --slot <lineId>            # 查询产线槽位
  bun scripts/db-query.ts --tables                   # 列出所有表

示例:
  bun scripts/db-query.ts "SELECT * FROM Run LIMIT 5"
  bun scripts/db-query.ts --run RUN-WO-MGMT-SMT-QUEUE-1769554559108
  bun scripts/db-query.ts --table RunSlotExpectation --where "status = 'PENDING'"
`);
}

function formatTable(rows: Record<string, unknown>[]): void {
	if (rows.length === 0) {
		console.log("(无数据)");
		return;
	}

	const columns = Object.keys(rows[0]);
	const widths: Record<string, number> = {};

	// 计算列宽
	for (const col of columns) {
		widths[col] = col.length;
		for (const row of rows) {
			const val = String(row[col] ?? "");
			// 截断过长的值
			const displayVal = val.length > 50 ? `${val.slice(0, 47)}...` : val;
			widths[col] = Math.max(widths[col], displayVal.length);
		}
	}

	// 打印表头
	const header = columns.map((col) => col.padEnd(widths[col])).join(" | ");
	const separator = columns.map((col) => "-".repeat(widths[col])).join("-+-");

	console.log(header);
	console.log(separator);

	// 打印数据
	for (const row of rows) {
		const line = columns
			.map((col) => {
				const val = String(row[col] ?? "");
				const displayVal = val.length > 50 ? `${val.slice(0, 47)}...` : val;
				return displayVal.padEnd(widths[col]);
			})
			.join(" | ");
		console.log(line);
	}

	console.log(`\n共 ${rows.length} 条记录`);
}

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	const dbPath = getDatabasePath();
	if (!fs.existsSync(dbPath)) {
		console.error(`数据库文件不存在: ${dbPath}`);
		process.exit(1);
	}

	console.log(`数据库: ${dbPath}\n`);
	const db = new Database(dbPath, { readonly: true });

	try {
		// --tables: 列出所有表
		if (args.includes("--tables")) {
			const tables = db
				.query(
					"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
				)
				.all();
			console.log("数据库表:");
			for (const t of tables as { name: string }[]) {
				console.log(`  - ${t.name}`);
			}
			return;
		}

		// --run: 查询批次及其站位期望
		const runIndex = args.indexOf("--run");
		if (runIndex !== -1) {
			const runNo = args[runIndex + 1];
			if (!runNo) {
				console.error("请提供 runNo");
				process.exit(1);
			}

			console.log(`=== 批次信息 ===`);
			const runs = db
				.query(
					`
        SELECT r.id, r.runNo, r.status, r.planQty, r.lineId, r.createdAt,
               w.woNo, w.productCode
        FROM Run r
        LEFT JOIN WorkOrder w ON r.woId = w.id
        WHERE r.runNo = ?
      `,
				)
				.all(runNo);
			formatTable(runs as Record<string, unknown>[]);

			if (runs.length > 0) {
				const run = runs[0] as { id: string };

				console.log(`\n=== 站位期望 ===`);
				const expectations = db
					.query(
						`
          SELECT rse.id, fs.slotCode, fs.slotName, fs.position,
                 rse.expectedMaterialCode, rse.alternates, rse.status,
                 rse.loadedMaterialCode, rse.loadedAt
          FROM RunSlotExpectation rse
          JOIN FeederSlot fs ON rse.slotId = fs.id
          WHERE rse.runId = ?
          ORDER BY fs.position
        `,
					)
					.all(run.id);
				formatTable(expectations as Record<string, unknown>[]);

				console.log(`\n=== 上料记录 ===`);
				const loadingRecords = db
					.query(
						`
          SELECT lr.id, fs.slotCode, lr.materialCode, lr.expectedCode,
                 lr.status, lr.verifyResult, lr.failReason, lr.loadedAt
          FROM LoadingRecord lr
          JOIN FeederSlot fs ON lr.slotId = fs.id
          WHERE lr.runId = ?
          ORDER BY lr.loadedAt DESC
          LIMIT 20
        `,
					)
					.all(run.id);
				formatTable(loadingRecords as Record<string, unknown>[]);
			}
			return;
		}

		// --slot: 查询产线槽位
		const slotIndex = args.indexOf("--slot");
		if (slotIndex !== -1) {
			const lineId = args[slotIndex + 1];
			if (!lineId) {
				console.error("请提供 lineId");
				process.exit(1);
			}

			console.log(`=== 产线槽位 ===`);
			const slots = db
				.query(
					`
        SELECT fs.id, fs.slotCode, fs.slotName, fs.position, fs.isLocked
        FROM FeederSlot fs
        WHERE fs.lineId = ?
        ORDER BY fs.position
      `,
				)
				.all(lineId);
			formatTable(slots as Record<string, unknown>[]);

			console.log(`\n=== 槽位物料映射 ===`);
			const mappings = db
				.query(
					`
        SELECT smm.id, fs.slotCode, smm.productCode, smm.materialCode,
               smm.isAlternate, smm.priority
        FROM SlotMaterialMapping smm
        JOIN FeederSlot fs ON smm.slotId = fs.id
        WHERE fs.lineId = ?
        ORDER BY fs.position, smm.priority
      `,
				)
				.all(lineId);
			formatTable(mappings as Record<string, unknown>[]);
			return;
		}

		// --table: 查询指定表
		const tableIndex = args.indexOf("--table");
		if (tableIndex !== -1) {
			const table = args[tableIndex + 1];
			if (!table) {
				console.error("请提供表名");
				process.exit(1);
			}

			const whereIndex = args.indexOf("--where");
			const whereClause = whereIndex !== -1 ? args[whereIndex + 1] : "";

			const sql = `SELECT * FROM ${table} ${whereClause ? `WHERE ${whereClause}` : ""} LIMIT 100`;
			console.log(`SQL: ${sql}\n`);

			const rows = db.query(sql).all();
			formatTable(rows as Record<string, unknown>[]);
			return;
		}

		// 原始 SQL 查询
		const sql = args.join(" ");
		console.log(`SQL: ${sql}\n`);

		const rows = db.query(sql).all();
		formatTable(rows as Record<string, unknown>[]);
	} finally {
		db.close();
	}
}

main().catch((err) => {
	console.error("错误:", err.message);
	process.exit(1);
});
