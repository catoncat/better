import type { PrismaClient } from "@better-app/db";

const DEFAULT_RETENTION_DAYS = 30;

export const cleanupMesEvents = async (db: PrismaClient, retentionDays = DEFAULT_RETENTION_DAYS) => {
	const now = new Date();
	const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

	const result = await db.mesEvent.deleteMany({
		where: {
			OR: [
				{ retentionUntil: { lte: now } },
				{ retentionUntil: null, createdAt: { lte: cutoff } },
			],
		},
	});

	return { deleted: result.count, cutoff: cutoff.toISOString() };
};
