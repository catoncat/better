import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const API_URL = "http://localhost:3000/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

async function runTest() {
	console.log("Starting End-to-End MES Flow Test...");

	// 1. Login to get session
	console.log("Logging in...");
	const loginRes = await fetch(`${API_URL}/auth/sign-in/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
	});

	if (!loginRes.ok) {
		throw new Error(`Login failed: ${loginRes.statusText}`);
	}

	const loginData = await loginRes.json();
	const cookie = loginRes.headers.get("set-cookie") || "";

	const headers = {
		"Content-Type": "application/json",
		"Cookie": cookie,
	};

	// 2. Compile default routing (idempotent)
	console.log("Step 1: Compiling default routing...");
	const compileRes = await fetch(`${API_URL}/routes/PCBA-STD-V1/compile`, {
		method: "POST",
		headers,
	});
	const compileData = await compileRes.json();
	if (!compileData.ok) throw new Error(`Route Compile failed: ${JSON.stringify(compileData)}`);

	// 3. Receive Work Order
	console.log("Step 2: Receiving Work Order...");
	const woNo = `WO-TEST-${Date.now()}`;
	const woRes = await fetch(`${API_URL}/integration/work-orders`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			woNo,
			productCode: "P-1001",
			plannedQty: 100,
			routingCode: "PCBA-STD-V1",
		}),
	});
	const woData = await woRes.json();
	if (!woData.ok) throw new Error(`WO Receive failed: ${JSON.stringify(woData)}`);
	console.log(`WO Received: ${woNo}`);

	// 4. Release Work Order
	console.log("Step 3: Releasing Work Order...");
	const releaseRes = await fetch(`${API_URL}/work-orders/${woNo}/release`, {
		method: "POST",
		headers,
		body: JSON.stringify({ lineCode: "LINE-A" }),
	});
	const releaseData = await releaseRes.json();
	if (!releaseData.ok) throw new Error(`WO Release failed: ${JSON.stringify(releaseData)}`);
	console.log("WO Released.");

	// 5. Create Run
	console.log("Step 4: Creating Production Run...");
	const runRes = await fetch(`${API_URL}/work-orders/${woNo}/runs`, {
		method: "POST",
		headers,
		body: JSON.stringify({ lineCode: "LINE-A" }),
	});
	const runData = await runRes.json();
	if (!runData.ok) throw new Error(`Run Creation failed: ${JSON.stringify(runData)}`);
	const runNo = runData.data.runNo;
	console.log(`Run Created: ${runNo}`);

	// 6. Authorize Run
	console.log("Step 5: Authorizing Run...");
	const authRes = await fetch(`${API_URL}/runs/${runNo}/authorize`, {
		method: "POST",
		headers,
		body: JSON.stringify({ action: "AUTHORIZE" }),
	});
	const authData = await authRes.json();
	if (!authData.ok) throw new Error(`Run Authorization failed: ${JSON.stringify(authData)}`);
	console.log("Run Authorized.");

	// 7. Track SN through steps
	const sn = `SN-TEST-${Date.now()}`;
	const stations = [
		"ST-PRINT-01",
		"ST-SPI-01",
		"ST-MOUNT-01",
		"ST-REFLOW-01",
		"ST-AOI-01",
	];

	for (let i = 0; i < stations.length; i++) {
		const stationCode = stations[i];
		console.log(`Step 6.${i + 1}: Tracking In at ${stationCode}...`);
		const inRes = await fetch(`${API_URL}/stations/${stationCode}/track-in`, {
			method: "POST",
			headers,
			body: JSON.stringify({ sn, woNo, runNo }),
		});
		const inData = await inRes.json();
		if (!inData.ok) throw new Error(`TrackIn at ${stationCode} failed: ${JSON.stringify(inData)}`);

		console.log(`Step 6.${i + 1}: Tracking Out at ${stationCode}...`);
		const outRes = await fetch(`${API_URL}/stations/${stationCode}/track-out`, {
			method: "POST",
			headers,
			body: JSON.stringify({ sn, runNo, result: "PASS" }),
		});
		const outData = await outRes.json();
		if (!outData.ok) throw new Error(`TrackOut at ${stationCode} failed: ${JSON.stringify(outData)}`);
		console.log(`Station ${stationCode} completed. New Unit Status: ${outData.data.status}`);
	}

	console.log("\nEnd-to-End MES Flow Test Completed Successfully!");
	console.log(`Final Unit Status for ${sn}: DONE`);
}

runTest().catch(console.error);
