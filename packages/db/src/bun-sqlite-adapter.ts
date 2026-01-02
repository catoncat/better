import { Database } from "bun:sqlite";
import path from "node:path";
import {
	type ColumnType,
	ColumnTypeEnum,
	type IsolationLevel,
	type SqlDriverAdapter,
	type SqlDriverAdapterFactory,
	type SqlQuery,
	type SqlResultSet,
	type Transaction,
	type TransactionOptions,
} from "@prisma/driver-adapter-utils";

type AdapterOptions = {
	url: string;
};

class AsyncLock {
	private chain = Promise.resolve();

	async acquire(): Promise<() => void> {
		let release: (() => void) | null = null;
		const next = new Promise<void>((resolve) => {
			release = resolve;
		});
		const previous = this.chain;
		this.chain = previous.then(() => next);
		await previous;
		return () => {
			release?.();
		};
	}
}

const adapterName = "@better-app/adapter-bun-sqlite" as const;

const resolveSqliteFilePath = (rawUrl: string) => {
	if (!rawUrl.startsWith("file:")) return rawUrl;
	const filePath = rawUrl.slice("file:".length);
	if (filePath.startsWith("/")) return filePath;
	return path.resolve(process.cwd(), filePath);
};

const mapDeclType = (declType: string): ColumnType | null => {
	switch (declType.toUpperCase()) {
		case "":
		case "NULL":
			return null;
		case "DECIMAL":
		case "NUMERIC":
			return ColumnTypeEnum.Numeric;
		case "FLOAT":
			return ColumnTypeEnum.Float;
		case "DOUBLE":
		case "DOUBLE PRECISION":
		case "REAL":
			return ColumnTypeEnum.Double;
		case "TINYINT":
		case "SMALLINT":
		case "MEDIUMINT":
		case "INT":
		case "INTEGER":
		case "SERIAL":
		case "INT2":
		case "INT8":
			return ColumnTypeEnum.Int32;
		case "BIGINT":
		case "UNSIGNED BIG INT":
			return ColumnTypeEnum.Int64;
		case "DATETIME":
		case "TIMESTAMP":
			return ColumnTypeEnum.DateTime;
		case "TIME":
			return ColumnTypeEnum.Time;
		case "DATE":
			return ColumnTypeEnum.Date;
		case "TEXT":
		case "CLOB":
		case "CHARACTER":
		case "VARCHAR":
		case "VARYING CHARACTER":
		case "NCHAR":
		case "NATIVE CHARACTER":
		case "NVARCHAR":
			return ColumnTypeEnum.Text;
		case "BLOB":
			return ColumnTypeEnum.Bytes;
		case "BOOLEAN":
			return ColumnTypeEnum.Boolean;
		case "JSONB":
			return ColumnTypeEnum.Json;
		default:
			return null;
	}
};

const inferColumnType = (value: unknown): ColumnType => {
	if (value === null) return ColumnTypeEnum.Int32;
	if (typeof value === "string") return ColumnTypeEnum.Text;
	if (typeof value === "bigint") return ColumnTypeEnum.Int64;
	if (typeof value === "boolean") return ColumnTypeEnum.Boolean;
	if (typeof value === "number")
		return Number.isInteger(value) ? ColumnTypeEnum.Int32 : ColumnTypeEnum.Double;
	if (value instanceof ArrayBuffer) return ColumnTypeEnum.Bytes;
	if (value instanceof Uint8Array) return ColumnTypeEnum.Bytes;
	return ColumnTypeEnum.Text;
};

const getColumnTypes = (declaredTypes: string[], rows: Array<Array<unknown>>): ColumnType[] => {
	const columnTypes = declaredTypes.map((t) => mapDeclType(t));
	const empty = new Set<number>();
	for (let i = 0; i < columnTypes.length; i++) {
		if (columnTypes[i] === null) empty.add(i);
	}

	if (empty.size === 0) return columnTypes as ColumnType[];

	for (const columnIndex of empty) {
		for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			const row = rows[rowIndex];
			if (!row) continue;
			const candidate = row[columnIndex];
			if (candidate !== null && candidate !== undefined) {
				columnTypes[columnIndex] = inferColumnType(candidate);
				break;
			}
		}
		if (columnTypes[columnIndex] === null) columnTypes[columnIndex] = ColumnTypeEnum.Int32;
	}

	return columnTypes as ColumnType[];
};

const mapRow = (row: Array<unknown>, columnTypes: ColumnType[]) => {
	const result: Array<unknown> = [];
	for (let i = 0; i < row.length; i++) {
		const value = row[i];
		if (value instanceof Uint8Array) {
			result[i] = Array.from(value);
			continue;
		}

		if (
			typeof value === "number" &&
			(columnTypes[i] === ColumnTypeEnum.Int32 || columnTypes[i] === ColumnTypeEnum.Int64) &&
			!Number.isInteger(value)
		) {
			result[i] = Math.trunc(value);
			continue;
		}

		if (typeof value === "number" && columnTypes[i] === ColumnTypeEnum.DateTime) {
			result[i] = new Date(value).toISOString();
			continue;
		}

		if (typeof value === "bigint") {
			result[i] = value.toString();
			continue;
		}

		result[i] = value;
	}
	return result;
};

const mapArgs = (params: SqlQuery) => {
	const mapped: unknown[] = [];
	for (let i = 0; i < params.args.length; i++) {
		const arg = params.args[i];
		const argType = params.argTypes[i];

		if (arg === null) {
			mapped[i] = null;
			continue;
		}

		if (typeof arg === "string" && argType?.scalarType === "bigint") {
			mapped[i] = BigInt(arg);
			continue;
		}

		if (typeof arg === "string" && argType?.scalarType === "decimal") {
			mapped[i] = Number.parseFloat(arg);
			continue;
		}

		if (typeof arg === "string" && argType?.scalarType === "datetime") {
			const date = new Date(arg);
			mapped[i] = Number.isFinite(date.valueOf()) ? date.toISOString().replace("Z", "+00:00") : arg;
			continue;
		}

		if (arg instanceof Date) {
			mapped[i] = arg.toISOString().replace("Z", "+00:00");
			continue;
		}

		if (typeof arg === "string" && argType?.scalarType === "bytes") {
			mapped[i] = Buffer.from(arg, "base64");
			continue;
		}

		if (Array.isArray(arg) && argType?.scalarType === "bytes") {
			mapped[i] = new Uint8Array(arg);
			continue;
		}

		mapped[i] = arg;
	}
	return mapped;
};

const getStatementDeclaredTypes = (stmt: unknown, columnCount: number): string[] => {
	try {
		const types = (stmt as { columnTypes?: unknown }).columnTypes;
		if (Array.isArray(types) && types.length === columnCount) {
			return types as string[];
		}
	} catch {
		// bun:sqlite throws on columnTypes for non-read-only statements (UPDATE...RETURNING etc.)
	}
	return Array.from({ length: columnCount }, () => "NULL");
};

class BunSqliteTransaction implements Transaction {
	readonly provider = "sqlite" as const;
	readonly adapterName = adapterName;
	readonly options: TransactionOptions;

	constructor(
		private readonly db: Database,
		private readonly lockRelease: () => void,
	) {
		this.options = { usePhantomQuery: true };
	}

	async queryRaw(params: SqlQuery): Promise<SqlResultSet> {
		const stmt = this.db.query(params.sql);
		const args = mapArgs(params);
		const rows = stmt.values(...(args as never[])) as Array<Array<unknown>>;
		const columnNames = stmt.columnNames as string[];
		const columnTypes = getColumnTypes(getStatementDeclaredTypes(stmt, columnNames.length), rows);

		return {
			columnNames,
			columnTypes,
			rows: rows.map((row) => mapRow(row, columnTypes)),
		};
	}

	async executeRaw(params: SqlQuery): Promise<number> {
		const stmt = this.db.query(params.sql);
		const args = mapArgs(params);
		const result = stmt.run(...(args as never[]));
		return result.changes;
	}

	async commit(): Promise<void> {
		try {
			this.db.run("COMMIT");
		} finally {
			this.lockRelease();
		}
	}

	async rollback(): Promise<void> {
		try {
			this.db.run("ROLLBACK");
		} finally {
			this.lockRelease();
		}
	}
}

class BunSqliteAdapter implements SqlDriverAdapter {
	readonly provider = "sqlite" as const;
	readonly adapterName = adapterName;

	private readonly db: Database;
	private readonly lock = new AsyncLock();

	constructor(url: string) {
		const filename = resolveSqliteFilePath(url);
		this.db = new Database(filename);
		this.db.run("PRAGMA foreign_keys = ON");
	}

	async queryRaw(params: SqlQuery): Promise<SqlResultSet> {
		const release = await this.lock.acquire();
		try {
			const stmt = this.db.query(params.sql);
			const args = mapArgs(params);
			const rows = stmt.values(...(args as never[])) as Array<Array<unknown>>;
			const columnNames = stmt.columnNames as string[];
			const columnTypes = getColumnTypes(getStatementDeclaredTypes(stmt, columnNames.length), rows);

			return {
				columnNames,
				columnTypes,
				rows: rows.map((row) => mapRow(row, columnTypes)),
			};
		} finally {
			release();
		}
	}

	async executeRaw(params: SqlQuery): Promise<number> {
		const release = await this.lock.acquire();
		try {
			const stmt = this.db.query(params.sql);
			const args = mapArgs(params);
			const result = stmt.run(...(args as never[]));
			return result.changes;
		} finally {
			release();
		}
	}

	async executeScript(script: string): Promise<void> {
		const release = await this.lock.acquire();
		try {
			this.db.exec(script);
		} finally {
			release();
		}
	}

	async startTransaction(isolationLevel?: IsolationLevel): Promise<Transaction> {
		if (isolationLevel && isolationLevel !== "SERIALIZABLE") {
			throw new Error(`Unsupported isolation level for sqlite: ${isolationLevel}`);
		}

		const release = await this.lock.acquire();
		try {
			this.db.run("BEGIN");
			return new BunSqliteTransaction(this.db, release);
		} catch (error) {
			release();
			throw error;
		}
	}

	async dispose(): Promise<void> {
		const release = await this.lock.acquire();
		try {
			this.db.close();
		} finally {
			release();
		}
	}
}

export class PrismaBunSqlite implements SqlDriverAdapterFactory {
	readonly provider = "sqlite" as const;
	readonly adapterName = adapterName;

	constructor(private readonly config: AdapterOptions) {}

	async connect(): Promise<SqlDriverAdapter> {
		return new BunSqliteAdapter(this.config.url);
	}
}
