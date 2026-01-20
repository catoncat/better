import type { PrismaClient, ProcessType } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

type LineSummary = {
	id: string;
	code: string;
	name: string;
	processType: ProcessType;
};

export const updateLineProcessType = async (
	db: PrismaClient,
	lineId: string,
	processType: ProcessType,
): Promise<ServiceResult<LineSummary>> => {
	const line = await db.line.findUnique({
		where: { id: lineId },
		select: { id: true, code: true, name: true, processType: true },
	});

	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: "Line not found",
			status: 404,
		};
	}

	const updated = await db.line.update({
		where: { id: lineId },
		data: { processType },
		select: { id: true, code: true, name: true, processType: true },
	});

	return { success: true, data: updated };
};
