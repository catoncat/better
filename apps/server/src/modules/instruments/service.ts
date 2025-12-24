import { Prisma, type PrismaClient } from "@better-app/db";
import type { Static } from "elysia";
import { CalibrationType } from "../../types/prisma-enums";
import { parseSortOrderBy } from "../../utils/sort";
import type { ServiceResult } from "../../types/service-result";
import type {
	calibrationCreateSchema,
	calibrationDeleteQuerySchema,
	calibrationListAllQuerySchema,
	calibrationListQuerySchema,
	calibrationUpdateSchema,
	instrumentCalibrationUpdateSchema,
	instrumentCreateSchema,
	instrumentListQuerySchema,
	instrumentUpdateSchema,
} from "./schema";

type InstrumentListQuery = Static<typeof instrumentListQuerySchema>;
type InstrumentCreateInput = Static<typeof instrumentCreateSchema>;
type InstrumentUpdateInput = Static<typeof instrumentUpdateSchema>;
type InstrumentCalibrationUpdateInput = Static<typeof instrumentCalibrationUpdateSchema>;
type CalibrationListQuery = Static<typeof calibrationListQuerySchema>;
type CalibrationListAllQuery = Static<typeof calibrationListAllQuerySchema>;
type CalibrationCreateInput = Static<typeof calibrationCreateSchema>;
type CalibrationUpdateInput = Static<typeof calibrationUpdateSchema>;
type CalibrationDeleteQuery = Static<typeof calibrationDeleteQuerySchema>;

type PrismaTx = PrismaClient | Prisma.TransactionClient;

const parseDateNullable = (value?: string | null) => {
	if (value === undefined) return undefined;
	if (value === null) return null;

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const computeNextCalibrationDate = (
	lastCalibrationDate?: Date | null,
	intervalDays?: number | null,
	providedNextDate?: Date | null,
) => {
	if (providedNextDate !== undefined) return providedNextDate;
	if (!lastCalibrationDate || !intervalDays || intervalDays <= 0) return null;

	const next = new Date(lastCalibrationDate);
	next.setDate(next.getDate() + intervalDays);
	return next;
};

const calibrationRecordInclude = {
	operator: true,
	createdBy: true,
} satisfies Prisma.CalibrationRecordInclude;

const normalizeNullableString = (value?: string | null) => {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
};

const normalizeResult = (value?: string | null) => normalizeNullableString(value);

const parseStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
};

const completedCalibrationResults = new Set(["pass", "fail"]);

const isCompletedResult = (value?: string | null) => {
	if (!value) return false;
	return completedCalibrationResults.has(value.toLowerCase());
};

const parseDateRequired = (value?: string | null) => {
	const parsed = parseDateNullable(value);
	return parsed instanceof Date ? parsed : null;
};

const computeRecordNextDate = (
	performedAt: Date,
	intervalDays?: number | null,
	providedNextDate?: Date | null,
) => computeNextCalibrationDate(performedAt, intervalDays ?? null, providedNextDate);

const syncInstrumentCalibrationDates = async (
	tx: PrismaTx,
	instrumentId: string,
	intervalDays: number | null | undefined,
	allowClear: boolean,
) => {
	const latestRecord = await tx.calibrationRecord.findFirst({
		where: {
			instrumentId,
			result: { in: Array.from(completedCalibrationResults) },
		},
		orderBy: { performedAt: "desc" },
	});

	if (!latestRecord) {
		if (!allowClear) return null;
		return tx.instrument.update({
			where: { id: instrumentId },
			data: { lastCalibrationDate: null, nextCalibrationDate: null },
		});
	}

	const nextCalibrationDate =
		latestRecord.nextCalibrationDate ??
		computeNextCalibrationDate(latestRecord.performedAt, intervalDays ?? null, undefined);

	const data: Prisma.InstrumentUpdateInput = {
		lastCalibrationDate: latestRecord.performedAt,
		nextCalibrationDate,
	};

	if (latestRecord.calibrationType) {
		data.calibrationType = latestRecord.calibrationType;
	}

	return tx.instrument.update({
		where: { id: instrumentId },
		data,
	});
};

export const listInstruments = async (
	db: PrismaClient,
	query: InstrumentListQuery,
): Promise<ServiceResult<any>> => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);
	const where: Prisma.InstrumentWhereInput = {};

	const orderBy = parseSortOrderBy<Prisma.InstrumentOrderByWithRelationInput>(query.sort, {
		allowedFields: [
			"instrumentNo",
			"description",
			"model",
			"manufacturer",
			"serialNo",
			"department",
			"status",
			"calibrationType",
			"lastCalibrationDate",
			"nextCalibrationDate",
			"intervalDays",
			"createdAt",
			"updatedAt",
			"owner.name",
		],
		fallback: [{ instrumentNo: "asc" }, { createdAt: "desc" }],
	});

	if (query.calibrationType) {
		const types = query.calibrationType.split(",") as CalibrationType[];
		if (types.length > 0) {
			where.calibrationType = { in: types };
		}
	}
	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean);
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}
	if (query.department) {
		where.department = { contains: query.department };
	}
	if (query.ownerId) {
		where.ownerId = query.ownerId;
	}
	if (query.calibrationDueBefore) {
		const dueBefore = parseDateNullable(query.calibrationDueBefore);
		if (dueBefore) {
			where.nextCalibrationDate = { lte: dueBefore };
		}
	}
	if (query.search) {
		where.OR = [
			{ instrumentNo: { contains: query.search } },
			{ serialNo: { contains: query.search } },
			{ model: { contains: query.search } },
			{ description: { contains: query.search } },
			{ department: { contains: query.search } },
		];
	}

	const [items, total] = await Promise.all([
		db.instrument.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { owner: true },
		}),
		db.instrument.count({ where }),
	]);

	return { success: true, data: { items, total, page, pageSize } };
};

export const getInstrument = async (
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<any>> => {
	const instrument = await db.instrument.findUnique({
		where: { id },
		include: { owner: true },
	});

	if (!instrument) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: "Instrument not found",
			status: 404,
		};
	}

	return { success: true, data: instrument };
};

export const createInstrument = async (
	db: PrismaClient,
	body: InstrumentCreateInput,
): Promise<ServiceResult<any>> => {
	const lastCalibrationDate = parseDateNullable(body.lastCalibrationDate);
	const intervalDays = body.intervalDays ?? null;
	const nextCalibrationDate = computeNextCalibrationDate(
		lastCalibrationDate,
		intervalDays,
		parseDateNullable(body.nextCalibrationDate),
	);

	const data: Prisma.InstrumentCreateInput = {
		instrumentNo: body.instrumentNo,
		manufacturer: body.manufacturer,
		model: body.model,
		description: body.description,
		serialNo: body.serialNo,
		department: body.department,
		lastCalibrationDate,
		intervalDays,
		calibrationType: body.calibrationType,
		nextCalibrationDate,
		remarks: body.remarks,
		status: body.status,
	};

	if (body.ownerId) {
		data.owner = { connect: { id: body.ownerId } };
	}

	try {
		const created = await db.instrument.create({ data });
		return { success: true, data: created };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				code: "CONFLICT",
				message: "Instrument number already exists",
				status: 409,
			};
		}
		throw error;
	}
};

export const updateInstrument = async (
	db: PrismaClient,
	id: string,
	body: InstrumentUpdateInput,
): Promise<ServiceResult<any>> => {
	const existing = await db.instrument.findUnique({ where: { id } });

	if (!existing) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: "Instrument not found",
			status: 404,
		};
	}

	const data: Prisma.InstrumentUpdateInput = {};
	const nextDateRequested =
		body.nextCalibrationDate !== undefined ||
		body.lastCalibrationDate !== undefined ||
		body.intervalDays !== undefined;
	const lastCalibrationDate =
		body.lastCalibrationDate !== undefined
			? parseDateNullable(body.lastCalibrationDate)
			: existing.lastCalibrationDate;
	const intervalDays = body.intervalDays !== undefined ? body.intervalDays : existing.intervalDays;
	const providedNextDate =
		body.nextCalibrationDate !== undefined
			? parseDateNullable(body.nextCalibrationDate)
			: undefined;

	if (body.instrumentNo !== undefined) data.instrumentNo = body.instrumentNo;
	if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
	if (body.model !== undefined) data.model = body.model;
	if (body.description !== undefined) data.description = body.description;
	if (body.serialNo !== undefined) data.serialNo = body.serialNo;
	if (body.department !== undefined) data.department = body.department;
	if (body.lastCalibrationDate !== undefined) {
		data.lastCalibrationDate = lastCalibrationDate;
	}
	if (body.intervalDays !== undefined) data.intervalDays = intervalDays;
	if (body.calibrationType !== undefined) data.calibrationType = body.calibrationType;
	if (body.remarks !== undefined) data.remarks = body.remarks;
	if (body.status !== undefined) data.status = body.status;

	if (nextDateRequested) {
		data.nextCalibrationDate = computeNextCalibrationDate(
			lastCalibrationDate,
			intervalDays,
			providedNextDate,
		);
	}

	if (body.ownerId !== undefined) {
		if (body.ownerId === null) {
			data.owner = { disconnect: true };
		} else {
			data.owner = { connect: { id: body.ownerId } };
		}
	}

	try {
		const updated = await db.instrument.update({
			where: { id },
			data,
		});
		return { success: true, data: updated };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				code: "CONFLICT",
				message: "Instrument number already exists",
				status: 409,
			};
		}
		throw error;
	}
};

export const updateInstrumentCalibration = async (
	db: PrismaClient,
	id: string,
	body: InstrumentCalibrationUpdateInput,
): Promise<ServiceResult<any>> => {
	const existing = await db.instrument.findUnique({ where: { id } });
	if (!existing) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: "Instrument not found",
			status: 404,
		};
	}

	const lastCalibrationDate =
		body.lastCalibrationDate !== undefined
			? parseDateNullable(body.lastCalibrationDate)
			: existing.lastCalibrationDate;
	const intervalDays = body.intervalDays !== undefined ? body.intervalDays : existing.intervalDays;
	const providedNextDate =
		body.nextCalibrationDate !== undefined
			? parseDateNullable(body.nextCalibrationDate)
			: undefined;

	const data: Prisma.InstrumentUpdateInput = {
		nextCalibrationDate: computeNextCalibrationDate(
			lastCalibrationDate,
			intervalDays,
			providedNextDate,
		),
	};

	if (body.lastCalibrationDate !== undefined) data.lastCalibrationDate = lastCalibrationDate;
	if (body.intervalDays !== undefined) data.intervalDays = intervalDays;
	if (body.calibrationType !== undefined) data.calibrationType = body.calibrationType;
	if (body.remarks !== undefined) data.remarks = body.remarks;
	if (body.status !== undefined) data.status = body.status;

	const updated = await db.instrument.update({
		where: { id },
		data,
	});

	return { success: true, data: updated };
};

export const deleteInstrument = async (
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<any>> => {
	const existing = await db.instrument.findUnique({ where: { id } });
	if (!existing) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: "Instrument not found",
			status: 404,
		};
	}

	await db.instrument.delete({ where: { id } });
	return { success: true, data: { deleted: true } };
};

export const listCalibrationRecords = async (
	db: PrismaClient,
	instrumentId: string,
	query: CalibrationListQuery,
): Promise<ServiceResult<any>> => {
	const instrument = await db.instrument.findUnique({
		where: { id: instrumentId },
		select: { id: true },
	});

	if (!instrument) {
		return { success: false, code: "NOT_FOUND", message: "Instrument not found", status: 404 };
	}

	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);
	const where: Prisma.CalibrationRecordWhereInput = { instrumentId };

	if (query.calibrationType) {
		const types = query.calibrationType
			.split(",")
			.map((type) => type.trim())
			.filter(Boolean) as CalibrationType[];

		if (types.length > 0) {
			where.calibrationType = { in: types };
		}
	}

	if (query.result) {
		const results = query.result
			.split(",")
			.map((result) => result.trim())
			.filter(Boolean);

		if (results.length > 0) {
			where.result = { in: results };
		}
	}

	const dateFrom = parseDateNullable(query.dateFrom);
	if (query.dateFrom && !dateFrom) {
		return {
			success: false,
			code: "INVALID_DATE_RANGE",
			message: "Invalid start date",
			status: 400,
		};
	}

	const dateTo = parseDateNullable(query.dateTo);
	if (query.dateTo && !dateTo) {
		return {
			success: false,
			code: "INVALID_DATE_RANGE",
			message: "Invalid end date",
			status: 400,
		};
	}

	if (dateFrom && dateTo && dateFrom > dateTo) {
		return {
			success: false,
			code: "INVALID_DATE_RANGE",
			message: "Start date cannot be after end date",
			status: 400,
		};
	}

	if (dateFrom || dateTo) {
		const performedAt: Prisma.DateTimeFilter = {};
		if (dateFrom) performedAt.gte = dateFrom;
		if (dateTo) performedAt.lte = dateTo;
		where.performedAt = performedAt;
	}

	if (query.search) {
		where.OR = [
			{ certificateNo: { contains: query.search } },
			{ providerName: { contains: query.search } },
			{ remarks: { contains: query.search } },
		];
	}

	const [items, total] = await Promise.all([
		db.calibrationRecord.findMany({
			where,
			orderBy: parseSortOrderBy<Prisma.CalibrationRecordOrderByWithRelationInput>(query.sort, {
				allowedFields: [
					"performedAt",
					"nextCalibrationDate",
					"calibrationType",
					"result",
					"createdAt",
					"updatedAt",
				],
				fallback: [{ performedAt: "desc" }, { createdAt: "desc" }],
			}),
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: calibrationRecordInclude,
		}),
		db.calibrationRecord.count({ where }),
	]);

	return { success: true, data: { items, total, page, pageSize } };
};

export const listAllCalibrationRecords = async (
	db: PrismaClient,
	query: CalibrationListAllQuery,
): Promise<ServiceResult<any>> => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);
	const where: Prisma.CalibrationRecordWhereInput = {};
	const and: Prisma.CalibrationRecordWhereInput[] = [];

	const instrumentIdFilter = normalizeNullableString(query.instrumentId);
	if (instrumentIdFilter) {
		const instrumentIds = instrumentIdFilter
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean);
		if (instrumentIds.length > 0) {
			where.instrumentId = { in: instrumentIds };
		}
	}

	if (query.calibrationType) {
		const types = query.calibrationType
			.split(",")
			.map((type) => type.trim())
			.filter(Boolean) as CalibrationType[];

		if (types.length > 0) {
			where.calibrationType = { in: types };
		}
	}

	if (query.result) {
		const results = query.result
			.split(",")
			.map((result) => result.trim())
			.filter(Boolean);

		if (results.length > 0) {
			where.result = { in: results };
		}
	}

	const dateFrom = parseDateNullable(query.dateFrom);
	if (query.dateFrom && !dateFrom) {
		return {
			success: false,
			code: "INVALID_DATE_RANGE",
			message: "Invalid start date",
			status: 400,
		};
	}

	const dateTo = parseDateNullable(query.dateTo);
	if (query.dateTo && !dateTo) {
		return {
			success: false,
			code: "INVALID_DATE_RANGE",
			message: "Invalid end date",
			status: 400,
		};
	}

	if (dateFrom && dateTo && dateFrom > dateTo) {
		return {
			success: false,
			code: "INVALID_DATE_RANGE",
			message: "Start date cannot be after end date",
			status: 400,
		};
	}

	if (dateFrom || dateTo) {
		const performedAt: Prisma.DateTimeFilter = {};
		if (dateFrom) performedAt.gte = dateFrom;
		if (dateTo) performedAt.lte = dateTo;
		where.performedAt = performedAt;
	}

	const instrumentSearch = normalizeNullableString(query.instrumentSearch);
	if (instrumentSearch) {
		and.push({
			instrument: {
				OR: [
					{ instrumentNo: { contains: instrumentSearch } },
					{ model: { contains: instrumentSearch } },
					{ manufacturer: { contains: instrumentSearch } },
					{ serialNo: { contains: instrumentSearch } },
					{ department: { contains: instrumentSearch } },
				],
			},
		});
	}

	const search = normalizeNullableString(query.search);
	if (search) {
		and.push({
			OR: [
				{ certificateNo: { contains: search } },
				{ providerName: { contains: search } },
				{ remarks: { contains: search } },
				{
					instrument: {
						OR: [
							{ instrumentNo: { contains: search } },
							{ model: { contains: search } },
							{ manufacturer: { contains: search } },
							{ serialNo: { contains: search } },
							{ department: { contains: search } },
						],
					},
				},
			],
		});
	}

	if (and.length > 0) {
		where.AND = and;
	}

	const [items, total] = await Promise.all([
		db.calibrationRecord.findMany({
			where,
			orderBy: parseSortOrderBy<Prisma.CalibrationRecordOrderByWithRelationInput>(query.sort, {
				allowedFields: [
					"performedAt",
					"nextCalibrationDate",
					"calibrationType",
					"result",
					"createdAt",
					"updatedAt",
					"instrument.instrumentNo",
					"instrument.model",
					"instrument.manufacturer",
					"instrument.serialNo",
					"instrument.department",
				],
				fallback: [{ performedAt: "desc" }, { createdAt: "desc" }],
			}),
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { ...calibrationRecordInclude, instrument: true },
		}),
		db.calibrationRecord.count({ where }),
	]);

	return { success: true, data: { items, total, page, pageSize } };
};

export const createCalibrationRecord = async (
	db: PrismaClient,
	instrumentId: string,
	userId: string,
	body: CalibrationCreateInput,
): Promise<ServiceResult<any>> => {
	const instrument = await db.instrument.findUnique({ where: { id: instrumentId } });

	if (!instrument) {
		return { success: false, code: "NOT_FOUND", message: "Instrument not found", status: 404 };
	}

	const performedAt = parseDateRequired(body.performedAt);
	if (!performedAt) {
		return {
			success: false,
			code: "INVALID_PERFORMED_AT",
			message: "Invalid calibration date",
			status: 400,
		};
	}

	if (performedAt.getTime() > Date.now()) {
		return {
			success: false,
			code: "PERFORMED_IN_FUTURE",
			message: "Calibration date cannot be in the future",
			status: 400,
		};
	}

	const providedNext =
		body.nextCalibrationDate !== undefined
			? parseDateNullable(body.nextCalibrationDate)
			: undefined;
	if (
		body.nextCalibrationDate !== undefined &&
		body.nextCalibrationDate !== null &&
		!providedNext
	) {
		return {
			success: false,
			code: "INVALID_NEXT_DATE",
			message: "Invalid next calibration date",
			status: 400,
		};
	}

	const certificateNo = normalizeNullableString(body.certificateNo);
	const providerName = normalizeNullableString(body.providerName);
	const certificateUrl = normalizeNullableString(body.certificateUrl);
	const remarks = normalizeNullableString(body.remarks);
	const result = normalizeResult(body.result);

	if (body.calibrationType === CalibrationType.external && !providerName && !certificateNo) {
		return {
			success: false,
			code: "EXTERNAL_INFO_REQUIRED",
			message: "External calibrations require provider name or certificate number",
			status: 400,
		};
	}

	const nextCalibrationDate = computeRecordNextDate(
		performedAt,
		instrument.intervalDays,
		body.nextCalibrationDate === undefined ? undefined : (providedNext ?? null),
	);

	if (nextCalibrationDate && nextCalibrationDate.getTime() < performedAt.getTime()) {
		return {
			success: false,
			code: "INVALID_NEXT_DATE",
			message: "Next calibration date cannot be before calibration date",
			status: 400,
		};
	}

	const updateInstrumentDates = body.updateInstrumentDates ?? true;
	const shouldUpdateInstrument = updateInstrumentDates && isCompletedResult(result);

	try {
		const created = await db.$transaction(async (tx) => {
			const record = await tx.calibrationRecord.create({
				data: {
					instrument: { connect: { id: instrumentId } },
					calibrationType: body.calibrationType,
					performedAt,
					nextCalibrationDate,
					result,
					certificateNo,
					certificateUrl,
					attachments: body.attachments ?? [],
					providerName,
					remarks,
					createdBy: { connect: { id: userId } },
					...(body.operatorId
						? {
								operator: { connect: { id: body.operatorId } },
							}
						: {}),
				},
				include: calibrationRecordInclude,
			});

			if (shouldUpdateInstrument) {
				await syncInstrumentCalibrationDates(tx, instrument.id, instrument.intervalDays, false);
			}

			return record;
		});

		return { success: true, data: created };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				code: "DUPLICATE_CERTIFICATE_NO",
				message: "Certificate number already exists for this instrument",
				status: 409,
			};
		}
		throw error;
	}
};

export const updateCalibrationRecord = async (
	db: PrismaClient,
	instrumentId: string,
	recordId: string,
	body: CalibrationUpdateInput,
): Promise<ServiceResult<any>> => {
	const instrument = await db.instrument.findUnique({ where: { id: instrumentId } });
	if (!instrument) {
		return { success: false, code: "NOT_FOUND", message: "Instrument not found", status: 404 };
	}

	const existing = await db.calibrationRecord.findUnique({ where: { id: recordId } });
	if (!existing || existing.instrumentId !== instrumentId) {
		return {
			success: false,
			code: "CALIBRATION_NOT_FOUND",
			message: "Calibration record not found",
			status: 404,
		};
	}

	const performedAt =
		body.performedAt !== undefined ? parseDateRequired(body.performedAt) : existing.performedAt;
	if (!performedAt) {
		return {
			success: false,
			code: "INVALID_PERFORMED_AT",
			message: "Invalid calibration date",
			status: 400,
		};
	}

	if (performedAt.getTime() > Date.now()) {
		return {
			success: false,
			code: "PERFORMED_IN_FUTURE",
			message: "Calibration date cannot be in the future",
			status: 400,
		};
	}

	const providedNext =
		body.nextCalibrationDate !== undefined
			? parseDateNullable(body.nextCalibrationDate)
			: undefined;
	if (
		body.nextCalibrationDate !== undefined &&
		body.nextCalibrationDate !== null &&
		!providedNext
	) {
		return {
			success: false,
			code: "INVALID_NEXT_DATE",
			message: "Invalid next calibration date",
			status: 400,
		};
	}

	const nextCalibrationDate = (() => {
		if (body.nextCalibrationDate !== undefined) {
			return providedNext ?? null;
		}
		if (body.performedAt !== undefined) {
			const computed = computeRecordNextDate(performedAt, instrument.intervalDays, undefined);
			return computed ?? existing.nextCalibrationDate;
		}
		return existing.nextCalibrationDate;
	})();

	if (nextCalibrationDate && nextCalibrationDate.getTime() < performedAt.getTime()) {
		return {
			success: false,
			code: "INVALID_NEXT_DATE",
			message: "Next calibration date cannot be before calibration date",
			status: 400,
		};
	}

	const calibrationType = body.calibrationType ?? existing.calibrationType;
	const certificateNo =
		body.certificateNo !== undefined
			? normalizeNullableString(body.certificateNo)
			: existing.certificateNo;
	const providerName =
		body.providerName !== undefined
			? normalizeNullableString(body.providerName)
			: existing.providerName;
	const certificateUrl =
		body.certificateUrl !== undefined
			? normalizeNullableString(body.certificateUrl)
			: existing.certificateUrl;
	const remarks =
		body.remarks !== undefined ? normalizeNullableString(body.remarks) : existing.remarks;
	const result = body.result !== undefined ? normalizeResult(body.result) : existing.result;
	const attachments = body.attachments ?? parseStringArray(existing.attachments);

	if (calibrationType === CalibrationType.external && !providerName && !certificateNo) {
		return {
			success: false,
			code: "EXTERNAL_INFO_REQUIRED",
			message: "External calibrations require provider name or certificate number",
			status: 400,
		};
	}

	const operatorUpdate = (() => {
		if (body.operatorId === undefined) return undefined;
		if (body.operatorId === null) return { disconnect: true };
		return { connect: { id: body.operatorId } };
	})();

	const data: Prisma.CalibrationRecordUpdateInput = {
		calibrationType,
		performedAt,
		nextCalibrationDate,
		result,
		certificateNo,
		certificateUrl,
		attachments: attachments as Prisma.InputJsonValue,
		providerName,
		remarks,
	};

	if (operatorUpdate) {
		data.operator = operatorUpdate;
	}

	const updateInstrumentDates = body.updateInstrumentDates ?? true;
	const shouldUpdateInstrument =
		updateInstrumentDates && (isCompletedResult(result) || isCompletedResult(existing.result));

	try {
		const updated = await db.$transaction(async (tx) => {
			const record = await tx.calibrationRecord.update({
				where: { id: recordId },
				data,
				include: calibrationRecordInclude,
			});

			if (shouldUpdateInstrument) {
				await syncInstrumentCalibrationDates(tx, instrument.id, instrument.intervalDays, true);
			}

			return record;
		});

		return { success: true, data: updated };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				code: "DUPLICATE_CERTIFICATE_NO",
				message: "Certificate number already exists for this instrument",
				status: 409,
			};
		}
		throw error;
	}
};

export const deleteCalibrationRecord = async (
	db: PrismaClient,
	instrumentId: string,
	recordId: string,
	query: CalibrationDeleteQuery,
): Promise<ServiceResult<{ deleted: true }>> => {
	const instrument = await db.instrument.findUnique({ where: { id: instrumentId } });
	if (!instrument) {
		return { success: false, code: "NOT_FOUND", message: "Instrument not found", status: 404 };
	}

	const existing = await db.calibrationRecord.findUnique({ where: { id: recordId } });
	if (!existing || existing.instrumentId !== instrumentId) {
		return {
			success: false,
			code: "CALIBRATION_NOT_FOUND",
			message: "Calibration record not found",
			status: 404,
		};
	}

	const rollbackInstrumentDates = query.rollbackInstrumentDates ?? false;

	await db.$transaction(async (tx) => {
		await tx.calibrationRecord.delete({ where: { id: recordId } });

		if (rollbackInstrumentDates) {
			await syncInstrumentCalibrationDates(tx, instrument.id, instrument.intervalDays, true);
		}
	});

	return { success: true, data: { deleted: true } };
};

export const listDepartments = async (
	db: PrismaClient,
): Promise<ServiceResult<string[]>> => {
	const results = await db.instrument.groupBy({
		by: ["department"],
		where: {
			department: { not: null },
		},
	});
	const items = results
		.map((r) => r.department)
		.filter((d): d is string => d !== null && d !== "");
	return { success: true, data: items };
};