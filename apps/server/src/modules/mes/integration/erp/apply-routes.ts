import { type Prisma, StationType } from "@better-app/db";
import { toJsonValue } from "../utils";
import type { ErpRoute } from "./types";

const toDateOrNull = (value?: string) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const buildSourceStepKey = (routeNo: string, stepNo: number, processCode: string) =>
	`ERP:${routeNo}:${stepNo}:${processCode}`;

/**
 * Apply routes to the database.
 */
export const applyRoutes = async (
	tx: Prisma.TransactionClient,
	items: ErpRoute[],
	dedupeKey: string,
): Promise<void> => {
	for (const route of items) {
		if (!route.header.routeNo) continue;

		// Store raw header for audit
		await tx.erpRouteHeaderRaw.create({
			data: {
				sourceSystem: "ERP",
				sourceKey: route.header.routeNo,
				headId: route.header.headId || null,
				payload: toJsonValue(route.header),
				dedupeKey,
			},
		});

		// Upsert routing
		const routing = await tx.routing.upsert({
			where: { code: route.header.routeNo },
			update: {
				name: route.header.routeName || route.header.routeNo,
				sourceSystem: "ERP",
				sourceKey: route.header.routeNo,
				productCode: route.header.productCode || null,
				effectiveFrom: toDateOrNull(route.header.effectiveFrom),
				effectiveTo: toDateOrNull(route.header.effectiveTo),
				meta: toJsonValue({
					erp: {
						useOrgCode: route.header.useOrgCode,
						createOrgCode: route.header.createOrgCode,
						routeSource: route.header.routeSource,
						bomCode: route.header.bomCode,
						modifiedAt: route.header.modifiedAt,
					},
				}),
			},
			create: {
				code: route.header.routeNo,
				name: route.header.routeName || route.header.routeNo,
				sourceSystem: "ERP",
				sourceKey: route.header.routeNo,
				productCode: route.header.productCode || null,
				effectiveFrom: toDateOrNull(route.header.effectiveFrom),
				effectiveTo: toDateOrNull(route.header.effectiveTo),
				meta: toJsonValue({
					erp: {
						useOrgCode: route.header.useOrgCode,
						createOrgCode: route.header.createOrgCode,
						routeSource: route.header.routeSource,
						bomCode: route.header.bomCode,
						modifiedAt: route.header.modifiedAt,
					},
				}),
			},
		});

		const stepNos: number[] = [];

		for (const step of route.steps) {
			if (!Number.isFinite(step.stepNo)) continue;
			stepNos.push(step.stepNo);

			// Store raw line for audit
			await tx.erpRouteLineRaw.create({
				data: {
					sourceSystem: "ERP",
					sourceKey: route.header.routeNo,
					lineNo: step.stepNo,
					payload: toJsonValue(step),
					dedupeKey,
				},
			});

			const processCode = step.processCode || `ERP_${route.header.routeNo}_${step.stepNo}`;
			const processName = step.processName || processCode;

			// Find or create operation mapping
			let operation = await tx.operationMapping.findUnique({
				where: {
					sourceSystem_sourceProcessKey: {
						sourceSystem: "ERP",
						sourceProcessKey: processCode,
					},
				},
				include: { operation: true },
			});

			if (!operation) {
				const existingOperation = await tx.operation.findUnique({
					where: { code: processCode },
				});
				if (existingOperation) {
					operation = await tx.operationMapping.create({
						data: {
							sourceSystem: "ERP",
							sourceProcessKey: processCode,
							sourceProcessName: processName,
							operationId: existingOperation.id,
						},
						include: { operation: true },
					});
				} else {
					const createdOperation = await tx.operation.create({
						data: {
							code: processCode,
							name: processName,
							defaultType: StationType.MANUAL,
						},
					});
					operation = await tx.operationMapping.create({
						data: {
							sourceSystem: "ERP",
							sourceProcessKey: processCode,
							sourceProcessName: processName,
							operationId: createdOperation.id,
						},
						include: { operation: true },
					});
				}
			}

			// Upsert work center / station group mapping
			if (step.workCenterCode || step.departmentCode) {
				const sourceWorkCenter = step.workCenterCode ?? "";
				const sourceDepartment = step.departmentCode ?? "";
				await tx.workCenterStationGroupMapping.upsert({
					where: {
						sourceSystem_sourceWorkCenter_sourceDepartment: {
							sourceSystem: "ERP",
							sourceWorkCenter,
							sourceDepartment,
						},
					},
					update: {
						meta: toJsonValue({
							workCenterName: step.workCenterName,
							departmentName: step.departmentName,
						}),
					},
					create: {
						sourceSystem: "ERP",
						sourceWorkCenter,
						sourceDepartment,
						meta: toJsonValue({
							workCenterName: step.workCenterName,
							departmentName: step.departmentName,
						}),
					},
				});
			}

			const sourceStepKey = buildSourceStepKey(route.header.routeNo, step.stepNo, processCode);
			const stationType = operation.operation.defaultType ?? StationType.MANUAL;

			await tx.routingStep.upsert({
				where: {
					routingId_stepNo: {
						routingId: routing.id,
						stepNo: step.stepNo,
					},
				},
				update: {
					operationId: operation.operationId,
					sourceStepKey,
					stationType,
					meta: toJsonValue({
						erp: {
							processCode,
							processName,
							workCenterCode: step.workCenterCode,
							workCenterName: step.workCenterName,
							departmentCode: step.departmentCode,
							departmentName: step.departmentName,
							description: step.description,
							keyOper: step.keyOper,
							firstPieceInspect: step.firstPieceInspect,
							processRecordStation: step.processRecordStation,
							qualityInspectStation: step.qualityInspectStation,
						},
					}),
				},
				create: {
					routingId: routing.id,
					stepNo: step.stepNo,
					sourceStepKey,
					operationId: operation.operationId,
					stationType,
					meta: toJsonValue({
						erp: {
							processCode,
							processName,
							workCenterCode: step.workCenterCode,
							workCenterName: step.workCenterName,
							departmentCode: step.departmentCode,
							departmentName: step.departmentName,
							description: step.description,
							keyOper: step.keyOper,
							firstPieceInspect: step.firstPieceInspect,
							processRecordStation: step.processRecordStation,
							qualityInspectStation: step.qualityInspectStation,
						},
					}),
				},
			});
		}

		// Update isLast flag and delete orphan steps
		if (stepNos.length > 0) {
			const maxStep = Math.max(...stepNos);
			await tx.routingStep.updateMany({
				where: { routingId: routing.id, stepNo: { in: stepNos, not: maxStep } },
				data: { isLast: false },
			});
			await tx.routingStep.updateMany({
				where: { routingId: routing.id, stepNo: maxStep },
				data: { isLast: true },
			});
			await tx.routingStep.deleteMany({
				where: {
					routingId: routing.id,
					stepNo: { notIn: stepNos },
				},
			});
		}
	}
};
