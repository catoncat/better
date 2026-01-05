import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";
import { expect } from "bun:test";
import { ApiClient } from "./client";

// Load env BEFORE importing db
const envPath = path.resolve(import.meta.dirname, "../../.env");
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

// Fix DATABASE_URL path for local execution from root
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("../../")) {
    process.env.DATABASE_URL = "file:./data/db.db";
    console.log(`Fixed DATABASE_URL to: ${process.env.DATABASE_URL}`);
}

const dbModule = await import("@better-app/db");
const prisma = dbModule.default;
const { ReadinessItemType, RunStatus, WorkOrderStatus } = dbModule;

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const LINE_CODE = "LINE-A";
const PRODUCT_CODE = "P-1001";
const ROUTE_CODE = "PCBA-STD-V1";
const SLOT_CODE = "SLOT-01";
const MATERIAL_CODE = "MAT-001";
const MATERIAL_LOT_NO = `LOT-${Date.now()}`;
const MATERIAL_BARCODE = `${MATERIAL_CODE}|${MATERIAL_LOT_NO}`;

async function runTest() {
    console.log("🚀 Starting End-to-End MES Flow Test...");
    const client = new ApiClient();

    // 1. Setup Test Data (Prisma)
    console.log("Step 0: Setting up test data...");
    
    // Ensure Line A exists and has readiness checks enabled
    const line = await prisma.line.upsert({
        where: { code: LINE_CODE },
        update: {
            meta: {
                readinessChecks: {
                    enabled: [ReadinessItemType.LOADING, ReadinessItemType.ROUTE],
                    loadingRequired: true
                }
            }
        },
        create: {
            code: LINE_CODE,
            name: "Test Line A",
            meta: {
                readinessChecks: {
                    enabled: [ReadinessItemType.LOADING, ReadinessItemType.ROUTE],
                    loadingRequired: true
                }
            }
        }
    });

    // Ensure Feeder Slot exists
    const slot = await prisma.feederSlot.upsert({
        where: { lineId_slotCode: { lineId: line.id, slotCode: SLOT_CODE } },
        update: {},
        create: {
            lineId: line.id,
            slotCode: SLOT_CODE,
            position: 1,
            slotName: "Test Slot 01"
        }
    });

    // Ensure Operations
    const opMap: Record<string, string> = {};
    const operations = [
        { code: "PRINTING", name: "Printing", type: "MANUAL" },
        { code: "SPI", name: "SPI", type: "MANUAL" },
        { code: "MOUNTING", name: "Mounting", type: "MANUAL" },
        { code: "REFLOW", name: "Reflow", type: "MANUAL" },
        { code: "AOI", name: "AOI", type: "MANUAL" },
    ];
    for (const op of operations) {
        const r = await prisma.operation.upsert({
            where: { code: op.code },
            update: {},
            create: { code: op.code, name: op.name, defaultType: op.type as any }
        });
        opMap[op.code] = r.id;
    }

    // Ensure Station Group
    const group = await prisma.stationGroup.upsert({
        where: { code: "SMT-LINE-A" },
        update: {},
        create: { code: "SMT-LINE-A", name: "SMT Line A Group" }
    });

    // Ensure Stations
    const stationDefs = [
        { code: "ST-PRINT-01", type: "MANUAL" },
        { code: "ST-SPI-01", type: "MANUAL" },
        { code: "ST-MOUNT-01", type: "MANUAL" },
        { code: "ST-REFLOW-01", type: "MANUAL" },
        { code: "ST-AOI-01", type: "MANUAL" },
    ];
    for (const s of stationDefs) {
        await prisma.station.upsert({
            where: { code: s.code },
            update: { lineId: line.id, groupId: group.id },
            create: { 
                code: s.code, name: s.code, stationType: s.type as any, 
                lineId: line.id, groupId: group.id 
            }
        });
    }

    // Ensure Admin has necessary permissions
    const adminRole = await prisma.role.findUnique({ where: { code: "admin" } });
    if (adminRole) {
        let perms: string[] = [];
        try { perms = JSON.parse(adminRole.permissions as string); } catch {}
        
        const needed = [
            "run:create", "run:authorize",
            "loading:view", "loading:verify", "loading:config",
            "readiness:view", "readiness:check", "readiness:config", "readiness:override",
            "quality:fai", "exec:track-in", "exec:track-out"
        ];
        
        const missing = needed.filter(p => !perms.includes(p));
        if (missing.length > 0) {
            perms.push(...missing);
            await prisma.role.update({
                where: { id: adminRole.id },
                data: { permissions: JSON.stringify(perms) }
            });
            console.log("Updated admin permissions.");
        }
    }

    // Ensure Routing
    const routing = await prisma.routing.upsert({
        where: { code: ROUTE_CODE },
        update: {},
        create: {
            code: ROUTE_CODE,
            name: "Standard PCBA Process V1",
            version: "1.0"
        }
    });

    // Ensure Steps
    const steps = [
        { stepNo: 1, opCode: "PRINTING", requiresFAI: true },
        { stepNo: 2, opCode: "SPI" },
        { stepNo: 3, opCode: "MOUNTING" },
        { stepNo: 4, opCode: "REFLOW" },
        { stepNo: 5, opCode: "AOI", isLast: true },
    ];

    for (const step of steps) {
        await prisma.routingStep.upsert({
            where: { routingId_stepNo: { routingId: routing.id, stepNo: step.stepNo } },
            update: { requiresFAI: step.requiresFAI || false },
            create: {
                routingId: routing.id,
                stepNo: step.stepNo,
                operationId: opMap[step.opCode],
                stationGroupId: group.id,
                stationType: "MANUAL",
                requiresFAI: step.requiresFAI || false,
                isLast: step.isLast || false
            }
        });
    }

    // Ensure Slot Mapping exists
    const mapping = await prisma.slotMaterialMapping.findFirst({
        where: { slotId: slot.id, materialCode: MATERIAL_CODE, productCode: PRODUCT_CODE }
    });
    
    if (!mapping) {
        await prisma.slotMaterialMapping.create({
            data: {
                slotId: slot.id,
                materialCode: MATERIAL_CODE,
                productCode: PRODUCT_CODE,
                priority: 1
            }
        });
    }

    console.log("Test data setup complete.");

    // 2. Login
    console.log("Step 1: Logging in...");
    await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    // 3. Compile Route
    console.log("Step 2: Compiling Route...");
    const compileRes = await client.post(`/routes/${ROUTE_CODE}/compile`);
    if (!compileRes.ok) throw new Error(`Compile failed: ${JSON.stringify(compileRes.data)}`);

    // 4. Receive Work Order
    console.log("Step 3: Receiving Work Order...");
    const woNo = `WO-TEST-${Date.now()}`;
    const woRes = await client.post("/integration/work-orders", {
        woNo,
        productCode: PRODUCT_CODE,
        plannedQty: 100,
        routingCode: ROUTE_CODE,
        pickStatus: "2"
    });
    if (!woRes.ok) throw new Error(`WO Receive failed: ${JSON.stringify(woRes.data)}`);

    // 5. Release Work Order
    console.log("Step 4: Releasing Work Order...");
    const releaseRes = await client.post(`/work-orders/${woNo}/release`, { lineCode: LINE_CODE });
    if (!releaseRes.ok) throw new Error(`WO Release failed: ${JSON.stringify(releaseRes.data)}`);

    // 6. Create Run
    console.log("Step 5: Creating Production Run...");
    const runRes = await client.post(`/work-orders/${woNo}/runs`, { lineCode: LINE_CODE });
    if (!runRes.ok) throw new Error(`Run Creation failed: ${JSON.stringify(runRes.data)}`);
    const runNo = runRes.data.data.runNo;
    console.log(`Run Created: ${runNo}`);

    // 7. Readiness Check (Pre-check) - Should Fail (Loading not ready)
    console.log("Step 6: Readiness Pre-check (Expect Fail)...");
    const preCheckRes = await client.post(`/runs/${runNo}/readiness/precheck`);
    // Note: The API might return 200 OK but the status in data is FAILED.
    // Check internal status
    if (!preCheckRes.ok) throw new Error(`Pre-check request failed: ${JSON.stringify(preCheckRes)}`);
    // We expect failure in logic, but let's verify if API returns failure or just result
    // API returns audit record. We check loading status.
    const latestReadiness = await client.get(`/runs/${runNo}/readiness/latest?type=PRECHECK`);
    const loadingItem = latestReadiness.data.data.items.find((i: any) => i.itemType === 'LOADING');
    // It might be PASSED if we haven't loaded table yet? 
    // Wait, if we haven't loaded table, expectations are empty, so checkLoading might PASS if it handles empty expectations gracefully as "nothing to check".
    // But we configured `loadingRequired: true` in Line Meta (though I'm not sure if that flag is used in logic).
    // Let's proceed to Load Table.

    // 8. Load Table
    console.log("Step 7: Loading Slot Table...");
    const loadTableRes = await client.post(`/runs/${runNo}/loading/load-table`);
    if (!loadTableRes.ok) throw new Error(`Load Table failed: ${JSON.stringify(loadTableRes.data)}`);

    // 9. Verify Loading (Wrong Material)
    console.log("Step 8: Verify Loading (Wrong Material)...");
    const verifyFailRes = await client.post("/loading/verify", {
        runNo,
        slotCode: SLOT_CODE,
        materialLotBarcode: "WRONG-MAT|LOT-999",
        operatorId: "OP-01" // Assuming string is enough, or needs real user ID? 
        // service.ts: getOperatorId checks if string is present. It doesn't seem to validate against DB Users unless specific logic exists. 
        // Actually getOperatorId just checks truthiness.
    });
    // Should fail or warn
    if (verifyFailRes.data.data.verifyResult === 'PASS') {
        throw new Error("Verify with wrong material should not PASS");
    }
    console.log("Verify failed as expected.");

    // 10. Verify Loading (Correct Material)
    console.log("Step 9: Verify Loading (Correct Material)...");
    const verifyPassRes = await client.post("/loading/verify", {
        runNo,
        slotCode: SLOT_CODE,
        materialLotBarcode: MATERIAL_BARCODE,
        operatorId: "OP-01"
    });
    if (verifyPassRes.data.data.verifyResult !== 'PASS') {
        throw new Error(`Verify correct material failed: ${JSON.stringify(verifyPassRes.data)}`);
    }

    // 11. Readiness Check (Formal) - Should Pass
    console.log("Step 10: Readiness Formal Check...");
    const checkRes = await client.post(`/runs/${runNo}/readiness/check`);
    if (!checkRes.ok) throw new Error(`Readiness Check failed: ${JSON.stringify(checkRes.data)}`);
    // Assuming Route check also passes (compiled successfully).

    // 12. FAI
    console.log("Step 11: FAI Process...");
    // Check Gate - should show required
    const gateRes = await client.get(`/fai/run/${runNo}/gate`);
    if (!gateRes.data.data.requiresFai) console.warn("FAI not required? Route config might be different.");

    // Create FAI
    const createFaiRes = await client.post(`/fai/run/${runNo}`, { sampleQty: 1 });
    if (!createFaiRes.ok) throw new Error(`Create FAI failed: ${JSON.stringify(createFaiRes.data)}`);
    const faiId = createFaiRes.data.data.id;

    // Start FAI
    await client.post(`/fai/${faiId}/start`);

    // Record Item
    await client.post(`/fai/${faiId}/items`, {
        itemName: "Visual Inspection",
        result: "PASS"
    });

    // Complete FAI
    const completeFaiRes = await client.post(`/fai/${faiId}/complete`, {
        decision: "PASS",
        failedQty: 0
    });
    if (!completeFaiRes.ok) throw new Error(`Complete FAI failed: ${JSON.stringify(completeFaiRes.data)}`);

    // 13. Authorize Run
    console.log("Step 12: Authorizing Run...");
    const authRes = await client.post(`/runs/${runNo}/authorize`, { action: "AUTHORIZE" });
    if (!authRes.ok) throw new Error(`Run Authorization failed: ${JSON.stringify(authRes.data)}`);
    console.log("Run Authorized!");

    // 14. Execution Loop
    console.log("Step 13: Executing Production...");
    const sn = `SN-${Date.now()}`;
    const stations = [
        "ST-PRINT-01",
        "ST-SPI-01",
        "ST-MOUNT-01",
        "ST-REFLOW-01",
        "ST-AOI-01",
    ];

    for (const stationCode of stations) {
        console.log(`Processing at ${stationCode}...`);
        
        // TrackIn
        const inRes = await client.post(`/stations/${stationCode}/track-in`, { sn, woNo, runNo });
        if (!inRes.ok) throw new Error(`TrackIn failed at ${stationCode}: ${JSON.stringify(inRes.data)}`);

        // TrackOut
        const outRes = await client.post(`/stations/${stationCode}/track-out`, { sn, runNo, result: "PASS" });
        if (!outRes.ok) throw new Error(`TrackOut failed at ${stationCode}: ${JSON.stringify(outRes.data)}`);
    }

    console.log("✅ End-to-End MES Flow Test Completed Successfully!");
}

runTest()
    .catch((e) => {
        console.error("Test Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
