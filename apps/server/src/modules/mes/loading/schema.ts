import { t } from "elysia";

// Enum schemas for type-safe validation
const loadingRecordStatusSchema = t.Union([
	t.Literal("LOADED"),
	t.Literal("UNLOADED"),
	t.Literal("REPLACED"),
]);

const loadingVerifyResultSchema = t.Union([
	t.Literal("PASS"),
	t.Literal("FAIL"),
	t.Literal("WARNING"),
]);

const runSlotExpectationStatusSchema = t.Union([
	t.Literal("PENDING"),
	t.Literal("LOADED"),
	t.Literal("MISMATCH"),
]);

export const runNoParamSchema = t.Object({
	runNo: t.String(),
});

export const lineIdParamSchema = t.Object({
	lineId: t.String(),
});

export const slotIdParamSchema = t.Object({
	slotId: t.String(),
});

export const slotMappingIdParamSchema = t.Object({
	id: t.String(),
});

export const verifyLoadingBodySchema = t.Object({
	runNo: t.String(),
	slotCode: t.String(),
	materialLotBarcode: t.String({ minLength: 1 }),
	operatorId: t.Optional(t.String()),
	packageQty: t.Optional(t.Integer({ minimum: 0 })),
	reviewedBy: t.Optional(t.String()),
});

export const replaceLoadingBodySchema = t.Object({
	runNo: t.String(),
	slotCode: t.String(),
	newMaterialLotBarcode: t.String({ minLength: 1 }),
	operatorId: t.Optional(t.String()),
	reason: t.String({ minLength: 1 }),
	packageQty: t.Optional(t.Integer({ minimum: 0 })),
	reviewedBy: t.Optional(t.String()),
});

export const loadSlotTableResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		runId: t.String(),
		created: t.Number(),
	}),
});

const loadingRecordSchema = t.Object({
	id: t.String(),
	runNo: t.String(),
	slotId: t.String(),
	slotCode: t.String(),
	slotName: t.Union([t.String(), t.Null()]),
	position: t.Number(),
	materialLotId: t.String(),
	lotNo: t.String(),
	materialCode: t.String(),
	expectedCode: t.Union([t.String(), t.Null()]),
	status: loadingRecordStatusSchema,
	verifyResult: loadingVerifyResultSchema,
	failReason: t.Union([t.String(), t.Null()]),
	isIdempotent: t.Optional(t.Boolean()),
	packageQty: t.Union([t.Integer({ minimum: 0 }), t.Null()]),
	reviewedBy: t.Union([t.String(), t.Null()]),
	reviewedAt: t.Union([t.String(), t.Null()]),
	loadedAt: t.String(),
	loadedBy: t.String(),
	unloadedAt: t.Union([t.String(), t.Null()]),
	unloadedBy: t.Union([t.String(), t.Null()]),
	// Phase 1: 物料校验信息
	materialKnown: t.Optional(t.Boolean()),
	materialName: t.Optional(t.Union([t.String(), t.Null()])),
	// Phase 2: 物料校验状态（持久化）
	materialValidation: t.Optional(t.Union([t.String(), t.Null()])),
});

export const verifyLoadingResponseSchema = t.Object({
	ok: t.Boolean(),
	data: loadingRecordSchema,
});

export const loadingRecordsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(loadingRecordSchema),
	}),
});

const runSlotExpectationSchema = t.Object({
	id: t.String(),
	slotId: t.String(),
	slotCode: t.String(),
	slotName: t.Union([t.String(), t.Null()]),
	position: t.Number(),
	isLocked: t.Boolean(),
	expectedMaterialCode: t.String(),
	alternates: t.Array(t.String()),
	status: runSlotExpectationStatusSchema,
	loadedMaterialCode: t.Union([t.String(), t.Null()]),
	loadedAt: t.Union([t.String(), t.Null()]),
	loadedBy: t.Union([t.String(), t.Null()]),
});

export const loadingExpectationsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(runSlotExpectationSchema),
	}),
});

const feederSlotSchema = t.Object({
	id: t.String(),
	lineId: t.String(),
	slotCode: t.String(),
	slotName: t.Union([t.String(), t.Null()]),
	position: t.Number(),
	currentMaterialLotId: t.Union([t.String(), t.Null()]),
	isLocked: t.Boolean(),
	failedAttempts: t.Number(),
	lockedAt: t.Union([t.String(), t.Null()]),
	lockedReason: t.Union([t.String(), t.Null()]),
});

export const feederSlotsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(feederSlotSchema),
	}),
});

export const feederSlotResponseSchema = t.Object({
	ok: t.Boolean(),
	data: feederSlotSchema,
});

export const feederSlotCreateBodySchema = t.Object({
	slotCode: t.String(),
	slotName: t.Optional(t.String()),
	position: t.Number(),
});

export const feederSlotUpdateBodySchema = t.Object({
	slotCode: t.Optional(t.String()),
	slotName: t.Optional(t.String()),
	position: t.Optional(t.Number()),
});

export const unlockSlotBodySchema = t.Object({
	reason: t.String({ minLength: 1 }),
});

const slotMappingSchema = t.Object({
	id: t.String(),
	slotId: t.String(),
	slotCode: t.String(),
	slotName: t.Union([t.String(), t.Null()]),
	position: t.Number(),
	productCode: t.Union([t.String(), t.Null()]),
	routingId: t.Union([t.String(), t.Null()]),
	materialCode: t.String(),
	priority: t.Number(),
	isAlternate: t.Boolean(),
	unitConsumption: t.Union([t.Number(), t.Null()]),
	isCommonMaterial: t.Boolean(),
});

export const slotMappingsResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(slotMappingSchema),
	}),
});

export const slotMappingResponseSchema = t.Object({
	ok: t.Boolean(),
	data: slotMappingSchema,
});

export const slotMappingCreateBodySchema = t.Object({
	slotId: t.String(),
	materialCode: t.String(),
	productCode: t.Optional(t.String()),
	routingId: t.Optional(t.String()),
	priority: t.Optional(t.Number()),
	isAlternate: t.Optional(t.Boolean()),
	unitConsumption: t.Optional(t.Number({ minimum: 0 })),
	isCommonMaterial: t.Optional(t.Boolean()),
});

export const slotMappingUpdateBodySchema = t.Object({
	materialCode: t.Optional(t.String()),
	productCode: t.Optional(t.Union([t.String(), t.Null()])),
	routingId: t.Optional(t.Union([t.String(), t.Null()])),
	priority: t.Optional(t.Number()),
	isAlternate: t.Optional(t.Boolean()),
	unitConsumption: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
	isCommonMaterial: t.Optional(t.Boolean()),
});

export const slotMappingQuerySchema = t.Object({
	lineId: t.Optional(t.String()),
	slotId: t.Optional(t.String()),
	productCode: t.Optional(t.String()),
	routingId: t.Optional(t.String()),
});

export const errorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
