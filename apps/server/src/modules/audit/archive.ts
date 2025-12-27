import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@better-app/db";

type ArchiveResult = {
	archived: number;
	filePath?: string;
	rangeStart?: Date;
	rangeEnd?: Date;
	checksum?: string;
	cutoffDate: Date;
};

type ArchiveOptions = {
	cutoffDays?: number;
	outputDir?: string;
	batchSize?: number;
	now?: Date;
};

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_CUTOFF_DAYS = 90;
const DEFAULT_OUTPUT_DIR = "data/audit-archives";

const toIso = (value: Date) => value.toISOString();

export const archiveAuditEvents = async (
	db: PrismaClient,
	options: ArchiveOptions = {},
): Promise<ArchiveResult> => {
	const now = options.now ?? new Date();
	const cutoffDays = options.cutoffDays ?? DEFAULT_CUTOFF_DAYS;
	const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
	const outputDir = path.resolve(process.cwd(), options.outputDir ?? DEFAULT_OUTPUT_DIR);
	const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);

	const total = await db.auditEvent.count({
		where: { createdAt: { lt: cutoffDate } },
	});
	if (total === 0) {
		return { archived: 0, cutoffDate };
	}

	await mkdir(outputDir, { recursive: true });
	const stamp = now.toISOString().replace(/[:.]/g, "");
	const fileName = `audit-${cutoffDate.toISOString().slice(0, 10)}-${stamp}.jsonl`;
	const filePath = path.join(outputDir, fileName);
	const storedPath = path.relative(process.cwd(), filePath);

	const hash = createHash("sha256");
	const stream = createWriteStream(filePath, { flags: "wx" });

	let archived = 0;
	let rangeStart: Date | undefined;
	let rangeEnd: Date | undefined;
	let cursor: { id: string } | undefined;

	while (true) {
		const batch = await db.auditEvent.findMany({
			where: { createdAt: { lt: cutoffDate } },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: batchSize,
			...(cursor ? { cursor, skip: 1 } : {}),
		});

		if (batch.length === 0) break;

		for (const record of batch) {
			const line = JSON.stringify({
				...record,
				createdAt: toIso(record.createdAt),
			});
			stream.write(`${line}\n`);
			hash.update(`${line}\n`);
			archived += 1;
			if (!rangeStart) rangeStart = record.createdAt;
			rangeEnd = record.createdAt;
		}

		const last = batch[batch.length - 1];
		if (!last) break;
		cursor = { id: last.id };
	}

	await new Promise<void>((resolve, reject) => {
		stream.end(() => resolve());
		stream.on("error", reject);
	});

	if (!rangeStart || !rangeEnd) {
		return { archived: 0, cutoffDate };
	}

	const checksum = hash.digest("hex");

	await db.auditArchive.create({
		data: {
			filePath: storedPath,
			rangeStart,
			rangeEnd,
			rowCount: archived,
			checksum,
		},
	});

	await db.auditEvent.deleteMany({
		where: { createdAt: { lt: cutoffDate } },
	});

	return { archived, filePath: storedPath, rangeStart, rangeEnd, checksum, cutoffDate };
};
