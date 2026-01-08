import { t } from "elysia";

export const traceModeQuerySchema = t.Object({
	mode: t.Optional(t.Union([t.Literal("run"), t.Literal("latest")])),
});

export const traceUnitResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		unit: t.Object({
			sn: t.String(),
			status: t.String(),
			woNo: t.String(),
			runNo: t.Union([t.String(), t.Null()]),
		}),
		route: t.Object({
			code: t.String(),
			sourceSystem: t.String(),
			sourceKey: t.Union([t.String(), t.Null()]),
		}),
		routeVersion: t.Object({
			id: t.String(),
			versionNo: t.Number(),
			compiledAt: t.String(),
		}),
		steps: t.Array(
			t.Object({
				stepNo: t.Number(),
				operationId: t.String(),
				stationType: t.String(),
				stationGroupId: t.Union([t.String(), t.Null()]),
				allowedStationIds: t.Array(t.String()),
				requiresFAI: t.Boolean(),
				requiresAuthorization: t.Boolean(),
				dataSpecIds: t.Array(t.String()),
			}),
		),
		tracks: t.Array(
			t.Object({
				stepNo: t.Number(),
				operation: t.Union([t.String(), t.Null()]),
				inAt: t.Union([t.String(), t.Null()]),
				outAt: t.Union([t.String(), t.Null()]),
				result: t.Union([t.String(), t.Null()]),
			}),
		),
		dataValues: t.Array(
			t.Object({
				stepNo: t.Union([t.Number(), t.Null()]),
				name: t.String(),
				value: t.Union([t.Number(), t.String(), t.Boolean(), t.Any(), t.Null()]),
				valueNumber: t.Union([t.Number(), t.Null()]),
				valueText: t.Union([t.String(), t.Null()]),
				valueBoolean: t.Union([t.Boolean(), t.Null()]),
				valueJson: t.Union([t.Any(), t.Null()]),
				judge: t.Union([t.String(), t.Null()]),
			}),
		),
		defects: t.Array(
			t.Object({
				id: t.String(),
				code: t.String(),
				location: t.Union([t.String(), t.Null()]),
				qty: t.Number(),
				status: t.String(),
			}),
		),
		inspections: t.Array(
			t.Object({
				id: t.String(),
				type: t.String(),
				status: t.String(),
				startedAt: t.Union([t.String(), t.Null()]),
				inspectorId: t.Union([t.String(), t.Null()]),
				decidedAt: t.Union([t.String(), t.Null()]),
				decidedBy: t.Union([t.String(), t.Null()]),
				remark: t.Union([t.String(), t.Null()]),
				unitItems: t.Object({
					pass: t.Number(),
					fail: t.Number(),
					na: t.Number(),
				}),
			}),
		),
		loadingRecords: t.Array(
			t.Object({
				id: t.String(),
				slotCode: t.String(),
				slotName: t.Union([t.String(), t.Null()]),
				position: t.Number(),
				materialCode: t.String(),
				lotNo: t.String(),
				status: t.String(),
				verifyResult: t.String(),
				loadedAt: t.String(),
				loadedBy: t.String(),
				unloadedAt: t.Union([t.String(), t.Null()]),
				unloadedBy: t.Union([t.String(), t.Null()]),
			}),
		),
		materials: t.Array(
			t.Object({
				position: t.Union([t.String(), t.Null()]),
				materialCode: t.String(),
				lotNo: t.String(),
				isKeyPart: t.Boolean(),
			}),
		),
		readiness: t.Union([
			t.Null(),
			t.Object({
				status: t.String(),
				checkedAt: t.String(),
				checkedBy: t.Union([t.String(), t.Null()]),
				waivedItems: t.Array(
					t.Object({
						itemType: t.String(),
						itemKey: t.String(),
						failReason: t.Union([t.String(), t.Null()]),
						evidenceJson: t.Union([t.Any(), t.Null()]),
						waivedAt: t.Union([t.String(), t.Null()]),
						waivedBy: t.Union([t.String(), t.Null()]),
						waiveReason: t.Union([t.String(), t.Null()]),
						source: t.Literal("WAIVE"),
					}),
				),
			}),
		]),
		snapshot: t.Any(),
	}),
});

export const traceErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
