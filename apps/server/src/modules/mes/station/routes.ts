import { getAllPermissions, getEffectiveDataScope, type Prisma } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	stationGroupListResponseSchema,
	stationListResponseSchema,
	stationQueueResponseSchema,
} from "./schema";

type SnapshotStep = {
	stepNo: number;
	operationId: string;
	stationType: string;
	stationGroupId: string | null;
	allowedStationIds?: string[];
	requiresFAI?: boolean;
	requiresAuthorization?: boolean;
};

type StepMeta = {
	stepNo: number;
	operationCode: string;
	operationName: string | null;
	stationType: string;
	stationGroup: { code: string; name: string } | null;
	stationCodes: string[];
};

type RunStepContext = {
	firstStepNo: number;
	stepInfoByNo: Map<number, StepMeta>;
	nextStepInfoByNo: Map<number, StepMeta | null>;
};

const getSnapshotSteps = (snapshot: unknown): SnapshotStep[] => {
	if (!snapshot || typeof snapshot !== "object") return [];
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return [];
	return record.steps.filter((step): step is SnapshotStep => !!step && typeof step === "object");
};

export const stationModule = new Elysia({
	prefix: "/stations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/groups",
		async ({ db }) => {
			const items = await db.stationGroup.findMany({
				select: {
					id: true,
					code: true,
					name: true,
				},
				orderBy: [{ code: "asc" }],
			});
			return { items };
		},
		{
			isAuth: true,
			requirePermission: [
				Permission.ROUTE_READ,
				Permission.ROUTE_CONFIGURE,
				Permission.WO_RELEASE,
				Permission.RUN_CREATE,
			],
			response: stationGroupListResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	)
	.get(
		"/",
		async ({ db, userPermissions }) => {
			const permissions = userPermissions ? new Set(getAllPermissions(userPermissions)) : new Set();
			const scopePermission = permissions.has(Permission.EXEC_READ)
				? Permission.EXEC_READ
				: permissions.has(Permission.EXEC_TRACK_IN)
					? Permission.EXEC_TRACK_IN
					: Permission.EXEC_TRACK_OUT;

			const scope = userPermissions
				? getEffectiveDataScope(userPermissions, scopePermission)
				: { scope: "ALL" as const, lineIds: [], stationIds: [] };

			const where =
				scope.scope === "ASSIGNED_LINES"
					? { lineId: { in: scope.lineIds ?? [] } }
					: scope.scope === "ASSIGNED_STATIONS"
						? { id: { in: scope.stationIds ?? [] } }
						: undefined;

			const items = await db.station.findMany({
				where,
				select: {
					id: true,
					code: true,
					name: true,
					stationType: true,
					line: { select: { code: true, name: true } },
				},
				orderBy: [{ code: "asc" }],
			});
			return { items };
		},
		{
			isAuth: true,
			requirePermission: [
				Permission.EXEC_READ,
				Permission.EXEC_TRACK_IN,
				Permission.EXEC_TRACK_OUT,
			],
			response: stationListResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	)
	.get(
		"/:stationCode/queue",
		async ({ db, params, set, userPermissions }) => {
			const permissions = userPermissions ? new Set(getAllPermissions(userPermissions)) : new Set();
			const scopePermission = permissions.has(Permission.EXEC_READ)
				? Permission.EXEC_READ
				: permissions.has(Permission.EXEC_TRACK_IN)
					? Permission.EXEC_TRACK_IN
					: Permission.EXEC_TRACK_OUT;

			const scope = userPermissions
				? getEffectiveDataScope(userPermissions, scopePermission)
				: { scope: "ALL" as const, lineIds: [], stationIds: [] };

			const station = await db.station.findUnique({
				where: { code: params.stationCode },
				select: { id: true, code: true, name: true, lineId: true },
			});

			if (station && scope.scope === "ASSIGNED_STATIONS") {
				const stationIds = new Set(scope.stationIds ?? []);
				if (!stationIds.has(station.id)) {
					set.status = 403;
					return { station: { code: station.code, name: station.name }, queue: [] };
				}
			}

			if (station && scope.scope === "ASSIGNED_LINES") {
				const lineIds = new Set(scope.lineIds ?? []);
				if (!station.lineId || !lineIds.has(station.lineId)) {
					set.status = 403;
					return { station: { code: station.code, name: station.name }, queue: [] };
				}
			}

			if (!station) {
				return { station: { code: params.stationCode, name: "未知" }, queue: [] };
			}

			const units = await db.unit.findMany({
				where: {
					status: "IN_STATION",
					tracks: {
						some: {
							stationId: station.id,
							outAt: null,
						},
					},
				},
				include: {
					workOrder: { select: { woNo: true } },
					run: {
						select: {
							id: true,
							runNo: true,
							lineId: true,
							routeVersion: { select: { snapshotJson: true } },
						},
					},
					tracks: {
						where: { stationId: station.id, outAt: null },
						orderBy: { inAt: "desc" },
						take: 1,
					},
				},
				orderBy: { updatedAt: "desc" },
				take: 50,
			});

			const runContexts = new Map<string, RunStepContext>();
			if (units.length > 0) {
				const stepsByRun = new Map<string, { steps: SnapshotStep[]; lineId: string | null }>();
				const operationIds = new Set<string>();
				const stationGroupIds = new Set<string>();
				const allowedStationIds = new Set<string>();

				for (const unit of units) {
					const run = unit.run;
					if (!run?.routeVersion?.snapshotJson) continue;
					if (stepsByRun.has(run.id)) continue;
					const steps = getSnapshotSteps(run.routeVersion.snapshotJson).sort(
						(a, b) => a.stepNo - b.stepNo,
					);
					if (steps.length === 0) continue;
					stepsByRun.set(run.id, { steps, lineId: run.lineId ?? null });

					for (const step of steps) {
						if (step.operationId) operationIds.add(step.operationId);
						if (step.stationGroupId) stationGroupIds.add(step.stationGroupId);
						if (step.allowedStationIds) {
							for (const stationId of step.allowedStationIds) {
								allowedStationIds.add(stationId);
							}
						}
					}
				}

				const [operations, stationGroups, stations] = await Promise.all([
					operationIds.size
						? db.operation.findMany({
								where: { id: { in: [...operationIds] } },
								select: { id: true, code: true, name: true },
							})
						: Promise.resolve([]),
					stationGroupIds.size
						? db.stationGroup.findMany({
								where: { id: { in: [...stationGroupIds] } },
								select: { id: true, code: true, name: true },
							})
						: Promise.resolve([]),
					stationGroupIds.size || allowedStationIds.size
						? db.station.findMany({
								where: {
									OR: [
										stationGroupIds.size ? { groupId: { in: [...stationGroupIds] } } : undefined,
										allowedStationIds.size ? { id: { in: [...allowedStationIds] } } : undefined,
									].filter(Boolean) as Prisma.StationWhereInput[],
								},
								select: { id: true, code: true, name: true, groupId: true, lineId: true },
							})
						: Promise.resolve([]),
				]);

				const operationById = new Map(operations.map((operation) => [operation.id, operation]));
				const stationGroupById = new Map(stationGroups.map((group) => [group.id, group]));
				const stationById = new Map(stations.map((station) => [station.id, station]));
				const stationsByGroupId = new Map<string, typeof stations>();

				for (const stationRecord of stations) {
					if (!stationRecord.groupId) continue;
					const list = stationsByGroupId.get(stationRecord.groupId) ?? [];
					list.push(stationRecord);
					stationsByGroupId.set(stationRecord.groupId, list);
				}

				const buildStepMeta = (step: SnapshotStep, lineId: string | null): StepMeta => {
					const operation = operationById.get(step.operationId);
					const stationGroup = step.stationGroupId
						? stationGroupById.get(step.stationGroupId)
						: null;

					const stationCodes = step.allowedStationIds?.length
						? step.allowedStationIds
								.map((id) => stationById.get(id))
								.filter(
									(stationItem): stationItem is NonNullable<typeof stationItem> =>
										stationItem !== undefined &&
										stationItem !== null &&
										(!lineId || stationItem.lineId === lineId),
								)
								.map((stationItem) => stationItem.code)
						: step.stationGroupId
							? (stationsByGroupId.get(step.stationGroupId) ?? [])
									.filter((stationItem) => (lineId ? stationItem.lineId === lineId : true))
									.map((stationItem) => stationItem.code)
							: [];

					return {
						stepNo: step.stepNo,
						operationCode: operation?.code ?? step.operationId,
						operationName: operation?.name ?? null,
						stationType: step.stationType,
						stationGroup: stationGroup
							? { code: stationGroup.code, name: stationGroup.name }
							: null,
						stationCodes,
					};
				};

				for (const [runId, { steps, lineId }] of stepsByRun) {
					const stepInfoByNo = new Map<number, StepMeta>();
					const nextStepInfoByNo = new Map<number, StepMeta | null>();
					for (let index = 0; index < steps.length; index += 1) {
						const step = steps[index];
						if (!step) continue;
						stepInfoByNo.set(step.stepNo, buildStepMeta(step, lineId));
						const nextStep = steps[index + 1];
						nextStepInfoByNo.set(step.stepNo, nextStep ? buildStepMeta(nextStep, lineId) : null);
					}
					runContexts.set(runId, {
						firstStepNo: steps[0]?.stepNo ?? 0,
						stepInfoByNo,
						nextStepInfoByNo,
					});
				}
			}

			const queue = units.map((unit) => {
				const context = unit.run?.id ? runContexts.get(unit.run.id) : null;
				const resolvedStepNo = unit.currentStepNo ?? context?.firstStepNo ?? 0;
				const currentStep = resolvedStepNo
					? (context?.stepInfoByNo.get(resolvedStepNo) ?? null)
					: null;
				const nextStep = resolvedStepNo
					? (context?.nextStepInfoByNo.get(resolvedStepNo) ?? null)
					: null;
				return {
					sn: String(unit.sn),
					status: String(unit.status),
					currentStepNo: Number(resolvedStepNo),
					currentStep,
					nextStep,
					woNo: String(unit.workOrder.woNo),
					runNo: unit.run?.runNo ?? "",
					inAt: unit.tracks[0]?.inAt ? new Date(String(unit.tracks[0].inAt)).toISOString() : null,
				};
			});

			return { station: { code: station.code, name: station.name }, queue };
		},
		{
			isAuth: true,
			requirePermission: [
				Permission.EXEC_READ,
				Permission.EXEC_TRACK_IN,
				Permission.EXEC_TRACK_OUT,
			],
			params: t.Object({ stationCode: t.String() }),
			response: stationQueueResponseSchema,
			detail: { tags: ["MES - Stations"] },
		},
	);
