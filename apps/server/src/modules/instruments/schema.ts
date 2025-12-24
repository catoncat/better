import { t } from "elysia";
import { CalibrationType } from "../../types/prisma-enums";
import * as Prismabox from "@better-app/db/prismabox";

// --- Helpers ---
const createResponseSchema = <T extends unknown>(schema: T) =>
	t.Object({
		ok: t.Boolean(),
		data: schema,
	});

// --- Query Schemas ---
export const instrumentListQuerySchema = t.Object({
	page: t.Optional(t.Number({ minimum: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
	calibrationType: t.Optional(t.String()),
	department: t.Optional(t.String()),
	ownerId: t.Optional(t.String()),
	search: t.Optional(t.String()),
	status: t.Optional(t.String()),
	calibrationDueBefore: t.Optional(t.String()),
	sort: t.Optional(t.String()),
});

export const instrumentParamsSchema = t.Object({ id: t.String() });

export const calibrationListQuerySchema = t.Object({
	page: t.Optional(t.Number({ minimum: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
	calibrationType: t.Optional(t.String()),
	result: t.Optional(t.String()),
	dateFrom: t.Optional(t.String()),
	dateTo: t.Optional(t.String()),
	search: t.Optional(t.String()),
	sort: t.Optional(t.String()),
});

export const calibrationListAllQuerySchema = t.Object({
	page: t.Optional(t.Number({ minimum: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
	calibrationType: t.Optional(t.String()),
	result: t.Optional(t.String()),
	dateFrom: t.Optional(t.String()),
	dateTo: t.Optional(t.String()),
	search: t.Optional(t.String()),
	instrumentId: t.Optional(t.String()),
	instrumentSearch: t.Optional(t.String()),
	sort: t.Optional(t.String()),
});

export const calibrationRecordParamsSchema = t.Object({
	id: t.String(),
	recordId: t.String(),
});

export const calibrationDeleteQuerySchema = t.Object({
	rollbackInstrumentDates: t.Optional(t.Boolean()),
});

// --- Body Schemas ---
export const instrumentCreateSchema = t.Object({
	instrumentNo: t.String(),
	manufacturer: t.Optional(t.String()),
	model: t.Optional(t.String()),
	description: t.Optional(t.String()),
	serialNo: t.Optional(t.String()),
	department: t.Optional(t.String()),
	ownerId: t.Optional(t.String()),
	lastCalibrationDate: t.Optional(t.String()),
	intervalDays: t.Optional(t.Number()),
	calibrationType: t.Optional(t.Enum(CalibrationType)),
	nextCalibrationDate: t.Optional(t.String()),
	remarks: t.Optional(t.String()),
	status: t.Optional(t.String()),
});

export const instrumentUpdateSchema = t.Object({
	instrumentNo: t.Optional(t.String()),
	manufacturer: t.Optional(t.Union([t.String(), t.Null()])),
	model: t.Optional(t.Union([t.String(), t.Null()])),
	description: t.Optional(t.Union([t.String(), t.Null()])),
	serialNo: t.Optional(t.Union([t.String(), t.Null()])),
	department: t.Optional(t.Union([t.String(), t.Null()])),
	ownerId: t.Optional(t.Union([t.String(), t.Null()])),
	lastCalibrationDate: t.Optional(t.Union([t.String(), t.Null()])),
	intervalDays: t.Optional(t.Union([t.Number(), t.Null()])),
	calibrationType: t.Optional(t.Union([t.Enum(CalibrationType), t.Null()])),
	nextCalibrationDate: t.Optional(t.Union([t.String(), t.Null()])),
	remarks: t.Optional(t.Union([t.String(), t.Null()])),
	status: t.Optional(t.Union([t.String(), t.Null()])),
});

export const instrumentCalibrationUpdateSchema = t.Object({
	lastCalibrationDate: t.Optional(t.Union([t.String(), t.Null()])),
	intervalDays: t.Optional(t.Union([t.Number(), t.Null()])),
	calibrationType: t.Optional(t.Union([t.Enum(CalibrationType), t.Null()])),
	nextCalibrationDate: t.Optional(t.Union([t.String(), t.Null()])),
	remarks: t.Optional(t.Union([t.String(), t.Null()])),
	status: t.Optional(t.Union([t.String(), t.Null()])),
});

export const calibrationCreateSchema = t.Object({
	calibrationType: t.Enum(CalibrationType),
	performedAt: t.String(),
	nextCalibrationDate: t.Optional(t.Union([t.String(), t.Null()])),
	result: t.Optional(t.Union([t.String(), t.Null()])),
	certificateNo: t.Optional(t.Union([t.String(), t.Null()])),
	certificateUrl: t.Optional(t.Union([t.String(), t.Null()])),
	attachments: t.Optional(t.Array(t.String())),
	providerName: t.Optional(t.Union([t.String(), t.Null()])),
	operatorId: t.Optional(t.Union([t.String(), t.Null()])),
	remarks: t.Optional(t.Union([t.String(), t.Null()])),
	updateInstrumentDates: t.Optional(t.Boolean()),
});

export const calibrationUpdateSchema = t.Object({
	calibrationType: t.Optional(t.Enum(CalibrationType)),
	performedAt: t.Optional(t.String()),
	nextCalibrationDate: t.Optional(t.Union([t.String(), t.Null()])),
	result: t.Optional(t.Union([t.String(), t.Null()])),
	certificateNo: t.Optional(t.Union([t.String(), t.Null()])),
	certificateUrl: t.Optional(t.Union([t.String(), t.Null()])),
	attachments: t.Optional(t.Array(t.String())),
	providerName: t.Optional(t.Union([t.String(), t.Null()])),
	operatorId: t.Optional(t.Union([t.String(), t.Null()])),
	remarks: t.Optional(t.Union([t.String(), t.Null()])),
	updateInstrumentDates: t.Optional(t.Boolean()),
});

// --- Response Schemas ---

const instrumentResponseItem = Prismabox.InstrumentPlain;
const instrumentWithRelations = t.Composite([
	Prismabox.InstrumentPlain,
	t.Object({
		owner: t.Union([Prismabox.UserPlain, t.Null()]),
	}),
]);

export const instrumentListResponseSchema = createResponseSchema(
	t.Object({
		items: t.Array(instrumentWithRelations),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
);

export const instrumentResponseSchema = createResponseSchema(instrumentWithRelations);

export const departmentListResponseSchema = createResponseSchema(t.Array(t.String()));

// Calibration responses
// Include necessary relations in schema
const calibrationRecordSchema = t.Composite([
	Prismabox.CalibrationRecordPlain,
	t.Object({
		operator: t.Union([Prismabox.UserPlain, t.Null()]),
		createdBy: t.Union([Prismabox.UserPlain, t.Null()]),
	}),
]);

const calibrationRecordWithInstrumentSchema = t.Composite([
	calibrationRecordSchema,
	t.Object({
		instrument: Prismabox.InstrumentPlain,
	}),
]);

export const calibrationListResponseSchema = createResponseSchema(
	t.Object({
		items: t.Array(calibrationRecordSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
);

export const calibrationListAllResponseSchema = createResponseSchema(
	t.Object({
		items: t.Array(calibrationRecordWithInstrumentSchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
);

export const calibrationResponseSchema = createResponseSchema(calibrationRecordSchema);

export const deleteResponseSchema = createResponseSchema(
	t.Object({
		deleted: t.Boolean(),
	}),
);