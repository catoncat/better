import { type Prisma, type PrismaClient, RunStatus, UnitStatus } from "@better-app/db";
import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import { parseSortOrderBy } from "../../../utils/sort";
import { checkFaiGate } from "../fai/service";
import { checkAndTriggerOqc } from "../oqc/trigger-service";
import { canAuthorize as checkReadiness } from "../readiness/service";
import type { runAuthorizeSchema, runListQuerySchema, generateUnitsSchema } from "./schema";

type RunAuthorizeInput = Static<typeof runAuthorizeSchema>;
type RunListQuery = Static<typeof runListQuerySchema>;
type GenerateUnitsInput = Static<typeof generateUnitsSchema>;
type RunRecord = Prisma.RunGetPayload<Prisma.RunDefaultArgs>;

const tracer = trace.getTracer("mes");

const TERMINAL_RUN_STATUSES: RunStatus[] = [
	RunStatus.COMPLETED,
	RunStatus.CLOSED_REWORK,
	RunStatus.SCRAPPED,
];

const TERMINAL_UNIT_STATUSES: UnitStatus[] = [UnitStatus.DONE, UnitStatus.SCRAPPED];

const setSpanAttributes = (span: Span, attributes: Record<string, unknown>) => {
	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === null) continue;
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			span.setAttribute(key, value);
		}
	}
};

export const getRunDetail = async (db: PrismaClient, runNo: string) => {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: true,
			line: true,
			routeVersion: {
				include: {
					routing: true,
				},
			},
		},
	});

	if (!run) {
		return null;
	}

	const [unitStats, recentUnits] = await Promise.all([
		db.unit.groupBy({
			by: ["status"],
			where: { runId: run.id },
			_count: true,
		}),
		db.unit.findMany({
			where: { runId: run.id },
			orderBy: { updatedAt: "desc" },
			take: 20,
			select: {
				sn: true,
				status: true,
				currentStepNo: true,
				updatedAt: true,
			},
		}),
	]);

	const statsMap: Record<string, number> = {};
	let total = 0;
	for (const stat of unitStats) {
		statsMap[stat.status] = stat._count;
		total += stat._count;
	}

	return {
		run: {
			id: run.id,
			runNo: run.runNo,
			status: run.status,
			shiftCode: run.shiftCode,
			startedAt: run.startedAt?.toISOString() ?? null,
			endedAt: run.endedAt?.toISOString() ?? null,
			createdAt: run.createdAt.toISOString(),
		},
		workOrder: {
			woNo: run.workOrder.woNo,
			productCode: run.workOrder.productCode,
			plannedQty: run.workOrder.plannedQty,
		},
		line: run.line ? { code: run.line.code, name: run.line.name } : null,
		routeVersion: run.routeVersion
			? {
					versionNo: run.routeVersion.versionNo,
					status: run.routeVersion.status,
					route: {
						code: run.routeVersion.routing.code,
						name: run.routeVersion.routing.name,
					},
				}
			: null,
		unitStats: {
			total,
			queued: statsMap[UnitStatus.QUEUED] ?? 0,
			inStation: statsMap[UnitStatus.IN_STATION] ?? 0,
			done: statsMap[UnitStatus.DONE] ?? 0,
			failed:
				(statsMap[UnitStatus.OUT_FAILED] ?? 0) +
				(statsMap[UnitStatus.SCRAPPED] ?? 0) +
				(statsMap[UnitStatus.ON_HOLD] ?? 0),
		},
		recentUnits: recentUnits.map((u) => ({
			sn: u.sn,
			status: u.status,
			currentStepNo: u.currentStepNo,
			updatedAt: u.updatedAt.toISOString(),
		})),
	};
};

export const listRuns = async (
	db: PrismaClient,
	query: RunListQuery,
	extraWhere?: Prisma.RunWhereInput,
) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.RunWhereInput = {};

	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean) as RunStatus[];
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	if (query.woNo) {
		where.workOrder = { woNo: query.woNo };
	}

	if (query.lineCode) {
		where.line = { code: query.lineCode };
	}

	if (query.search) {
		where.OR = [
			{ runNo: { contains: query.search } },
			{ workOrder: { woNo: { contains: query.search } } },
		];
	}

	if (extraWhere) {
		const andFilters: Prisma.RunWhereInput[] = [];
		if (where.AND) {
			if (Array.isArray(where.AND)) {
				andFilters.push(...where.AND);
			} else {
				andFilters.push(where.AND);
			}
		}
		andFilters.push(extraWhere);
		where.AND = andFilters;
	}

	const orderBy = parseSortOrderBy<Prisma.RunOrderByWithRelationInput>(query.sort, {
		allowedFields: ["runNo", "status", "createdAt", "workOrder.woNo"],
		fallback: [{ createdAt: "desc" }],
	});

	const [items, total] = await Promise.all([
		db.run.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				workOrder: true,
				line: true,
				readinessChecks: {
					orderBy: { checkedAt: "desc" },
					take: 1,
					select: { status: true },
				},
			},
		}),
		db.run.count({ where }),
	]);

	const itemsWithReadiness = items.map(({ readinessChecks, ...run }) => ({
		...run,
		readinessStatus: readinessChecks[0]?.status ?? null,
	}));

	return { items: itemsWithReadiness, total, page, pageSize };
};

export const authorizeRun = async (
	db: PrismaClient,
	runNo: string,
	data: RunAuthorizeInput,
): Promise<ServiceResult<RunRecord>> => {
	return await tracer.startActiveSpan(
		"mes.runs.authorize",
		async (span): Promise<ServiceResult<RunRecord>> => {
			setSpanAttributes(span, {
				"mes.run.run_no": runNo,
				"mes.run.action": data.action,
				"mes.run.reason": data.reason,
			});

			try {
				const run = await db.run.findUnique({ where: { runNo } });
				if (!run) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
					return {
						success: false,
						code: "RUN_NOT_FOUND",
						message: "Run not found",
						status: 404,
					};
				}

				if (data.action === "AUTHORIZE") {
					if (run.status === RunStatus.AUTHORIZED) {
						return { success: true, data: run };
					}
					if (run.status !== RunStatus.PREP) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						span.setAttribute("mes.error_code", "RUN_NOT_READY");
						return {
							success: false,
							code: "RUN_NOT_READY",
							message: "Run is not in a state that can be authorized",
							status: 400,
						};
					}

					const readinessResult = await checkReadiness(db, runNo);
					if (!readinessResult.success) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						span.setAttribute("mes.error_code", readinessResult.code);
						return readinessResult as ServiceResult<RunRecord>;
					}
					if (!readinessResult.data.canAuthorize) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						span.setAttribute("mes.error_code", "READINESS_CHECK_FAILED");
						return {
							success: false,
							code: "READINESS_CHECK_FAILED",
							message:
								"Readiness check failed. All items must pass or be waived before authorization.",
							status: 400,
						};
					}

					// Check FAI gate if required
					const faiResult = await checkFaiGate(db, runNo);
					if (!faiResult.success) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						span.setAttribute("mes.error_code", faiResult.code);
						return faiResult as ServiceResult<RunRecord>;
					}
					if (faiResult.data.requiresFai && !faiResult.data.faiPassed) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						span.setAttribute("mes.error_code", "FAI_NOT_PASSED");
						return {
							success: false,
							code: "FAI_NOT_PASSED",
							message:
								"FAI inspection is required but not passed. Complete FAI before authorization.",
							status: 400,
						};
					}

					const updated = await db.run.update({
						where: { runNo },
						data: {
							status: RunStatus.AUTHORIZED,
						},
					});
					return { success: true, data: updated };
				}

				if (run.status !== RunStatus.AUTHORIZED) {
					return { success: true, data: run };
				}
				const updated = await db.run.update({
					where: { runNo },
					data: {
						status: RunStatus.PREP,
					},
				});
				return { success: true, data: updated };
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR });
				throw error;
			} finally {
				span.end();
			}
		},
	);
};

export const closeRun = async (
	db: PrismaClient,
	runNo: string,
	options?: { closedBy?: string },
): Promise<ServiceResult<RunRecord>> => {
	return tracer.startActiveSpan("mes.runs.close", async (span) => {
		setSpanAttributes(span, { "mes.run.run_no": runNo });

		try {
			const run = await db.run.findUnique({
				where: { runNo },
				include: { units: { select: { status: true } } },
			});

			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
				return {
					success: false as const,
					code: "RUN_NOT_FOUND",
					message: "Run not found",
					status: 404,
				};
			}

			const { units: _units, ...runRecord } = run;

			if (TERMINAL_RUN_STATUSES.includes(run.status)) {
				return { success: true as const, data: runRecord };
			}

			if (run.status !== RunStatus.IN_PROGRESS) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_CLOSABLE");
				return {
					success: false as const,
					code: "RUN_NOT_CLOSABLE",
					message: `Run status ${run.status} does not allow closeout`,
					status: 400,
				};
			}

			if (run.units.length === 0) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_HAS_NO_UNITS");
				return {
					success: false as const,
					code: "RUN_HAS_NO_UNITS",
					message: "Run has no units",
					status: 400,
				};
			}

			const allUnitsTerminal = run.units.every((unit) =>
				TERMINAL_UNIT_STATUSES.includes(unit.status),
			);
			if (!allUnitsTerminal) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_UNITS_NOT_TERMINAL");
				return {
					success: false as const,
					code: "RUN_UNITS_NOT_TERMINAL",
					message: "Not all units are terminal (DONE/SCRAPPED)",
					status: 400,
				};
			}

			const oqcTriggerResult = await checkAndTriggerOqc(db, runNo, {
				createdBy: options?.closedBy,
			});
			if (!oqcTriggerResult.success) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", oqcTriggerResult.code);
				return oqcTriggerResult as ServiceResult<RunRecord>;
			}

			if (oqcTriggerResult.data.triggered) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "OQC_REQUIRED");
				return {
					success: false as const,
					code: "OQC_REQUIRED",
					message: `OQC is required. Task ${oqcTriggerResult.data.oqcId} created.`,
					status: 409,
				};
			}

			if (!oqcTriggerResult.data.completed) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_CLOSEOUT_FAILED");
				return {
					success: false as const,
					code: "RUN_CLOSEOUT_FAILED",
					message: oqcTriggerResult.data.reason,
					status: 400,
				};
			}

			const updatedRun = await db.run.findUnique({ where: { runNo } });
			if (!updatedRun) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
				return {
					success: false as const,
					code: "RUN_NOT_FOUND",
					message: "Run not found",
					status: 404,
				};
			}

			return { success: true as const, data: updatedRun };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};

/**
 * Archive a completed Run to history storage.
 * TODO: Implement when archive functionality is needed:
 * - Move Run and related Units to archive tables
 * - Preserve traceability data
 * - Clean up from active tables
 * - Consider retention policies
 */
export const archiveRun = async (
	_db: PrismaClient,
	_runNo: string,
): Promise<ServiceResult<{ archived: boolean }>> => {
	// Placeholder - not yet implemented
	return {
		success: false as const,
		code: "NOT_IMPLEMENTED",
		message: "Run archiving is not yet implemented",
		status: 501,
	};
};

/**
 * Generate units for a Run.
 * Creates unit records with auto-generated SNs based on the run number.
 */
export const generateUnits = async (
	db: PrismaClient,
	runNo: string,
	data: GenerateUnitsInput,
): Promise<ServiceResult<{ generated: number; units: Array<{ sn: string; status: string }> }>> => {
	return tracer.startActiveSpan("mes.runs.generateUnits", async (span) => {
		setSpanAttributes(span, {
			"mes.run.run_no": runNo,
			"mes.run.quantity": data.quantity,
		});

		try {
			const run = await db.run.findUnique({
				where: { runNo },
				include: {
					workOrder: true,
					routeVersion: {
						include: {
							routing: {
								include: {
									steps: { orderBy: { stepNo: "asc" }, take: 1 },
								},
							},
						},
					},
				},
			});

			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
				return {
					success: false as const,
					code: "RUN_NOT_FOUND",
					message: "Run not found",
					status: 404,
				};
			}

			// Check if run is in a valid state for unit generation
			const allowedStatuses: RunStatus[] = [RunStatus.PREP, RunStatus.AUTHORIZED];
			if (!allowedStatuses.includes(run.status)) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "INVALID_RUN_STATUS");
				return {
					success: false as const,
					code: "INVALID_RUN_STATUS",
					message: `Cannot generate units for run in status ${run.status}. Allowed: ${allowedStatuses.join(", ")}`,
					status: 400,
				};
			}

			// Check existing unit count
			const existingCount = await db.unit.count({ where: { runId: run.id } });
			if (existingCount > 0) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNITS_ALREADY_EXIST");
				return {
					success: false as const,
					code: "UNITS_ALREADY_EXIST",
					message: `Run already has ${existingCount} units. Delete existing units first or use a different run.`,
					status: 400,
				};
			}

			// Generate SN prefix based on run number or custom prefix
			const snPrefix = data.snPrefix || `SN-${runNo}-`;

			// Get first step number from routing
			const firstStepNo = run.routeVersion?.routing?.steps?.[0]?.stepNo ?? 1;

			// Create units in batch
			const unitsData = Array.from({ length: data.quantity }, (_, i) => ({
				runId: run.id,
				woId: run.workOrder.id,
				sn: `${snPrefix}${String(i + 1).padStart(4, "0")}`,
				status: UnitStatus.QUEUED,
				currentStepNo: firstStepNo,
			}));

			await db.unit.createMany({ data: unitsData });

			// Fetch created units for response
			const createdUnits = await db.unit.findMany({
				where: { runId: run.id },
				select: { sn: true, status: true },
				orderBy: { sn: "asc" },
			});

			span.setAttribute("mes.units.generated", createdUnits.length);

			return {
				success: true as const,
				data: {
					generated: createdUnits.length,
					units: createdUnits,
				},
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};
