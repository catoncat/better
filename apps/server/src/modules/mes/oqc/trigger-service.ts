import { type PrismaClient, RunStatus, UnitStatus } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { calculateSampleSize, getApplicableRule } from "./sampling-rule-service";
import { createOqc } from "./service";

/**
 * Unit statuses that indicate a unit is terminal for run completion.
 */
const TERMINAL_UNIT_STATUSES: UnitStatus[] = [UnitStatus.DONE, UnitStatus.SCRAPPED];

/**
 * Check if all units in a run are DONE.
 */
export async function areAllUnitsTerminal(db: PrismaClient, runId: string): Promise<boolean> {
	const run = await db.run.findUnique({
		where: { id: runId },
		include: { units: { select: { status: true } } },
	});

	if (!run || run.units.length === 0) {
		return false;
	}

	return run.units.every((unit) => TERMINAL_UNIT_STATUSES.includes(unit.status));
}

/**
 * Select random sample units using Fisher-Yates shuffle.
 */
export function selectSampleUnits<T>(units: T[], sampleSize: number): T[] {
	if (sampleSize >= units.length) {
		return [...units];
	}

	// Fisher-Yates shuffle and take first N
	const shuffled = [...units];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffled[i];
		const swap = shuffled[j];
		if (temp === undefined || swap === undefined) {
			continue;
		}
		shuffled[i] = swap;
		shuffled[j] = temp;
	}

	return shuffled.slice(0, sampleSize);
}

/**
 * Check if OQC should be triggered for a run and create it if needed.
 * Called when a unit reaches terminal status (e.g., after trackOut with DONE status).
 *
 * Returns:
 * - { triggered: true, oqcId: string } if OQC was created
 * - { triggered: false, reason: string } if OQC was not created
 * - { triggered: false, completed: true } if run should complete without OQC
 */
export async function checkAndTriggerOqc(
	db: PrismaClient,
	runNo: string,
	options?: { createdBy?: string },
): Promise<
	ServiceResult<
		| { triggered: true; oqcId: string; sampleSize: number }
		| { triggered: false; reason: string; completed?: boolean }
	>
> {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: { select: { productCode: true } },
			line: { select: { id: true } },
			routeVersion: { select: { routingId: true } },
			units: { select: { id: true, sn: true, status: true } },
		},
	});

	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	// Only trigger for runs in IN_PROGRESS status
	if (run.status !== RunStatus.IN_PROGRESS) {
		return {
			success: true as const,
			data: {
				triggered: false as const,
				reason: `Run status ${run.status} does not allow OQC trigger`,
			},
		};
	}

	// Check if all units are DONE
	const allTerminal = run.units.every((unit) => TERMINAL_UNIT_STATUSES.includes(unit.status));
	if (!allTerminal) {
		return {
			success: true as const,
			data: { triggered: false as const, reason: "Not all units have reached terminal status" },
		};
	}

	// Find applicable sampling rule
	const rule = await getApplicableRule(db, {
		productCode: run.workOrder?.productCode,
		lineId: run.lineId,
		routingId: run.routeVersion?.routingId,
	});

	if (!rule) {
		// No sampling rule = no OQC required, complete the run directly

		// Transition run to COMPLETED
		await db.run.update({
			where: { id: run.id },
			data: {
				status: RunStatus.COMPLETED,
				endedAt: new Date(),
			},
		});

		return {
			success: true as const,
			data: {
				triggered: false as const,
				reason: "No sampling rule applicable",
				completed: true,
			},
		};
	}

	// Calculate sample size
	const doneUnits = run.units.filter((u) => u.status === UnitStatus.DONE);
	const sampleSize = calculateSampleSize(rule, doneUnits.length);

	// Sample size 0 means no OQC is required (e.g. rule=0% or no eligible units)
	if (sampleSize <= 0) {
		await db.run.update({
			where: { id: run.id },
			data: {
				status: RunStatus.COMPLETED,
				endedAt: new Date(),
			},
		});

		return {
			success: true as const,
			data: {
				triggered: false as const,
				reason: "Sample size is 0, no OQC required",
				completed: true,
			},
		};
	}

	// Select sample units
	const sampledUnits = selectSampleUnits(doneUnits, sampleSize);
	const sampledUnitIds = sampledUnits.map((u) => u.id);

	// Create OQC task
	const oqcResult = await createOqc(
		db,
		runNo,
		{ sampleQty: sampleSize },
		{
			createdBy: options?.createdBy,
			sampledUnitIds,
			samplingRuleId: rule.id,
			samplingType: rule.samplingType,
			samplingValue: rule.sampleValue,
		},
	);

	if (!oqcResult.success) {
		return oqcResult;
	}

	return {
		success: true as const,
		data: {
			triggered: true as const,
			oqcId: oqcResult.data.id,
			sampleSize,
		},
	};
}
