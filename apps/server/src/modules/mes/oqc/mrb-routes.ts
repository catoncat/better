import { AuditEntityType, getAllPermissions } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import { getReworkRuns, recordMrbDecision } from "./mrb-service";
import { mrbDecisionSchema } from "./schema";

export const mrbRoutes = new Elysia({ prefix: "/runs" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// Record MRB decision for a run
	.post(
		"/:runNo/mrb-decision",
		async ({ db, params, body, set, user, request, userPermissions }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const permissions = userPermissions ? new Set(getAllPermissions(userPermissions)) : new Set();
			const canWaiveFai = permissions.has(Permission.QUALITY_DISPOSITION);

			const beforeRun = await db.run.findUnique({
				where: { runNo: params.runNo },
				select: { id: true, status: true, runNo: true },
			});

			const result = await recordMrbDecision(db, params.runNo, body, {
				decidedBy: user?.id,
				canWaiveFai,
			});

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: beforeRun?.id ?? params.runNo,
					entityDisplay: `Run ${params.runNo}`,
					action: "MRB_DECISION",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before: beforeRun,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			// Determine specific action based on decision
			let action: string;
			switch (body.decision) {
				case "RELEASE":
					action = "MRB_RELEASE";
					break;
				case "REWORK":
					action = "MRB_REWORK";
					break;
				case "SCRAP":
					action = "MRB_SCRAP";
					break;
				default:
					action = "MRB_DECISION";
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.RUN,
				entityId: result.data.run.id,
				entityDisplay: `Run ${params.runNo}`,
				action,
				actor,
				status: "SUCCESS",
				before: beforeRun,
				after: { status: result.data.run.status, reworkRunNo: result.data.reworkRunNo },
				payload: body,
				request: meta,
			});

			// If rework run was created, also audit that
			if (result.data.reworkRunNo) {
				const reworkRun = await db.run.findUnique({
					where: { runNo: result.data.reworkRunNo },
				});
				if (reworkRun) {
					await recordAuditEvent(db, {
						entityType: AuditEntityType.RUN,
						entityId: reworkRun.id,
						entityDisplay: `Rework Run ${result.data.reworkRunNo}`,
						action: "RUN_REWORK_CREATE",
						actor,
						status: "SUCCESS",
						after: reworkRun,
						payload: {
							parentRunNo: params.runNo,
							reworkType: body.reworkType,
							faiWaiver: body.faiWaiver,
						},
						request: meta,
					});
				}
			}

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			body: mrbDecisionSchema,
			detail: { tags: ["MES - MRB"], summary: "Record MRB decision for a run in ON_HOLD status" },
		},
	)
	// Get rework runs for a parent run
	.get(
		"/:runNo/rework-runs",
		async ({ db, params, set }) => {
			const result = await getReworkRuns(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_DISPOSITION,
			detail: { tags: ["MES - MRB"], summary: "Get rework runs for a parent run" },
		},
	);
