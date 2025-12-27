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
		materials: t.Array(
			t.Object({
				position: t.Union([t.String(), t.Null()]),
				materialCode: t.String(),
				lotNo: t.String(),
				isKeyPart: t.Boolean(),
			}),
		),
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
