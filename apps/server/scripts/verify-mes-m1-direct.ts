import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

import prisma, { WorkOrderStatus, RunStatus, UnitStatus } from "@better-app/db";
import { receiveWorkOrder, releaseWorkOrder, createRun } from "../src/modules/mes/work-order/service";
import { authorizeRun, generateUnits } from "../src/modules/mes/run/service";
import { trackIn, trackOut } from "../src/modules/mes/execution/service";

async function verify() {
	console.log("Starting Direct Service Layer Verification for MES M1...");

	const woNo = `WO-VERIFY-${Date.now()}`;

	// 1. Receive WO
	console.log("Testing receiveWorkOrder...");
	await receiveWorkOrder(prisma, {
		woNo,
		productCode: "VERIFY-PROD",
		plannedQty: 50,
		routingCode: "PCBA-STD-V1"
	});
	const wo = await prisma.workOrder.findUnique({ where: { woNo } });
	if (!wo || wo.status !== WorkOrderStatus.RECEIVED) throw new Error("WO Receive failed");

	// 2. Release WO
	console.log("Testing releaseWorkOrder...");
	await releaseWorkOrder(prisma, woNo, {});
	const woReleased = await prisma.workOrder.findUnique({ where: { woNo } });
	if (woReleased?.status !== WorkOrderStatus.RELEASED) throw new Error("WO Release failed");

	// 3. Create Run
	console.log("Testing createRun...");
	const runResult = await createRun(prisma, woNo, { lineCode: "LINE-A", planQty: 10 });
	if (!runResult.success) throw new Error("Run Creation failed");
	const runNo = runResult.data?.runNo;
	if (!runNo) throw new Error("Run No not found");

	// 4. Generate Units
	console.log("Testing generateUnits...");
	const genResult = await generateUnits(prisma, runNo, { quantity: 10 });
	if (!genResult.success) throw new Error(`Generate Units failed: ${genResult.message}`);
	console.log(`Generated ${genResult.data?.generated} units`);
	const firstSn = genResult.data?.units[0]?.sn;
	if (!firstSn) throw new Error("No units generated");

	// 5. Authorize Run
	console.log("Testing authorizeRun...");
	await authorizeRun(prisma, runNo, { action: "AUTHORIZE" });
	const runAuth = await prisma.run.findUnique({ where: { runNo } });
	if (runAuth?.status !== RunStatus.AUTHORIZED) throw new Error("Run Authorization failed");

	// 6. Track In (Step 1: PRINTING)
	console.log("Testing trackIn (Step 1)...");
	const inResult = await trackIn(prisma, "ST-PRINT-01", { sn: firstSn, woNo, runNo });
	if (!inResult.success) throw new Error(`TrackIn failed: ${inResult.message}`);
	const unitIn = await prisma.unit.findUnique({ where: { sn: firstSn } });
	if (unitIn?.status !== UnitStatus.IN_STATION) throw new Error("Unit status mismatch after TrackIn");

	// 7. Track Out (Step 1)
	console.log("Testing trackOut (Step 1)...");
	const outResult = await trackOut(prisma, "ST-PRINT-01", { sn: firstSn, runNo, result: "PASS" });
	if (!outResult.success) throw new Error(`TrackOut failed: ${outResult.message}`);
	const unitOut = await prisma.unit.findUnique({ where: { sn: firstSn } });
	// After PASS at step 1, it should be QUEUED at step 2
	if (unitOut?.status !== UnitStatus.QUEUED || unitOut.currentStepNo !== 2) {
		throw new Error(`Unit state mismatch after TrackOut: ${unitOut?.status}, step: ${unitOut?.currentStepNo}`);
	}

	console.log("\nService Layer Verification Successful!");
}

verify()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error("\nVerification Failed:", e);
		await prisma.$disconnect();
		process.exit(1);
	});
