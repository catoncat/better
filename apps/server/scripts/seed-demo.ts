/**
 * seed-demo.ts - 管理层演示数据脚本
 *
 * 在 bun run db:seed 之后运行，添加多状态工单/批次以展示系统能力
 *
 * 使用方法:
 *   bun apps/server/scripts/seed-demo.ts
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

type Db = typeof import("@better-app/db");

const NOW = new Date();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const run = async () => {
	console.log("Creating management demo data...\n");

	const db = (await import("@better-app/db")) as Db;
	const prisma = db.default;

	// 1. 查找必要的基础数据
	const lineA = await prisma.line.findUnique({ where: { code: "LINE-A" } });
	const dipLineA = await prisma.line.findUnique({ where: { code: "LINE-DIP-A" } });
	if (!lineA || !dipLineA) {
		throw new Error("Missing lines. Run bun run db:seed first.");
	}

	const smtRouting = await prisma.routing.findUnique({ where: { code: "PCBA-STD-V1" } });
	const dipRouting = await prisma.routing.findUnique({ where: { code: "PCBA-DIP-V1" } });
	if (!smtRouting || !dipRouting) {
		throw new Error("Missing routings. Run bun run db:seed first.");
	}

	const smtVersion = await prisma.executableRouteVersion.findFirst({
		where: { routingId: smtRouting.id, status: "READY" },
		orderBy: { versionNo: "desc" },
	});
	const dipVersion = await prisma.executableRouteVersion.findFirst({
		where: { routingId: dipRouting.id, status: "READY" },
		orderBy: { versionNo: "desc" },
	});
	if (!smtVersion || !dipVersion) {
		throw new Error("Missing route versions. Run bun run db:seed first.");
	}

	// 获取工位（用于 Track 记录）
	const smtStations = await prisma.station.findMany({
		where: { lineId: lineA.id },
		orderBy: { code: "asc" },
	});
	const dipStations = await prisma.station.findMany({
		where: { lineId: dipLineA.id },
		orderBy: { code: "asc" },
	});

	// 获取用户
	const qualityUser = await prisma.user.findFirst({ where: { email: "quality@example.com" } });
	const leaderUser = await prisma.user.findFirst({ where: { email: "leader@example.com" } });
	const operatorUser = await prisma.user.findFirst({ where: { email: "operator@example.com" } });

	// 2. 创建多状态工单
	console.log("Creating demo work orders...");

	// ========== WO-MGMT-SMT-QUEUE: 待分配 ==========
	await prisma.workOrder.upsert({
		where: { woNo: "WO-MGMT-SMT-QUEUE" },
		update: {},
		create: {
			woNo: "WO-MGMT-SMT-QUEUE",
			productCode: "P-1001",
			plannedQty: 50,
			pickStatus: "2",
			routingId: smtRouting.id,
			status: db.WorkOrderStatus.RECEIVED,
			createdAt: new Date(NOW.getTime() - 2 * DAY),
		},
	});
	console.log("  ✓ WO-MGMT-SMT-QUEUE (RECEIVED)");

	// ========== WO-MGMT-SMT-PREP: 已下发，批次准备中 ==========
	const woPrepData = {
		woNo: "WO-MGMT-SMT-PREP",
		productCode: "P-1001",
		plannedQty: 30,
		pickStatus: "2",
		routingId: smtRouting.id,
		status: db.WorkOrderStatus.RELEASED,
		createdAt: new Date(NOW.getTime() - 1 * DAY),
	};
	const woPrep = await prisma.workOrder.upsert({
		where: { woNo: woPrepData.woNo },
		update: { status: woPrepData.status },
		create: woPrepData,
	});
	await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-SMT-PREP" },
		update: {},
		create: {
			runNo: "RUN-MGMT-SMT-PREP",
			woId: woPrep.id,
			lineId: lineA.id,
			routeVersionId: smtVersion.id,
			status: db.RunStatus.PREP,
			shiftCode: "D1",
			changeoverNo: "MGMT-SMT-PREP-001",
		},
	});
	console.log("  ✓ WO-MGMT-SMT-PREP (RELEASED) → RUN-MGMT-SMT-PREP (PREP)");

	// ========== WO-MGMT-SMT-AUTH: FAI 通过，已授权可执行 ==========
	const woAuthData = {
		woNo: "WO-MGMT-SMT-AUTH",
		productCode: "P-1001",
		plannedQty: 20,
		pickStatus: "2",
		routingId: smtRouting.id,
		status: db.WorkOrderStatus.IN_PROGRESS,
		createdAt: new Date(NOW.getTime() - 8 * HOUR),
	};
	const woAuth = await prisma.workOrder.upsert({
		where: { woNo: woAuthData.woNo },
		update: { status: woAuthData.status },
		create: woAuthData,
	});
	const runAuth = await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-SMT-AUTH" },
		update: { status: db.RunStatus.AUTHORIZED },
		create: {
			runNo: "RUN-MGMT-SMT-AUTH",
			woId: woAuth.id,
			lineId: lineA.id,
			routeVersionId: smtVersion.id,
			status: db.RunStatus.AUTHORIZED,
			shiftCode: "D1",
			changeoverNo: "MGMT-SMT-AUTH-001",
		},
	});
	// 创建 FAI 通过记录
	const existingFaiAuth = await prisma.inspection.findFirst({
		where: { runId: runAuth.id, type: db.InspectionType.FAI },
	});
	if (!existingFaiAuth) {
		await prisma.inspection.create({
			data: {
				runId: runAuth.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 3,
				passedQty: 3,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				startedAt: new Date(NOW.getTime() - 6 * HOUR),
				decidedAt: new Date(NOW.getTime() - 5 * HOUR),
				decidedBy: qualityUser?.id,
				remark: "首件检验通过，可以批量生产",
			},
		});
	}
	// 创建单件
	for (let i = 1; i <= 5; i++) {
		const sn = `SN-MGMT-AUTH-${String(i).padStart(4, "0")}`;
		await prisma.unit.upsert({
			where: { sn },
			update: {},
			create: {
				sn,
				woId: woAuth.id,
				runId: runAuth.id,
				status: db.UnitStatus.QUEUED,
				currentStepNo: 1,
			},
		});
	}
	console.log("  ✓ WO-MGMT-SMT-AUTH (IN_PROGRESS) → RUN-MGMT-SMT-AUTH (AUTHORIZED) + FAI PASS");

	// ========== WO-MGMT-SMT-EXEC: 生产执行中 ==========
	const woExecData = {
		woNo: "WO-MGMT-SMT-EXEC",
		productCode: "P-1001",
		plannedQty: 10,
		pickStatus: "2",
		routingId: smtRouting.id,
		status: db.WorkOrderStatus.IN_PROGRESS,
		createdAt: new Date(NOW.getTime() - 4 * HOUR),
	};
	const woExec = await prisma.workOrder.upsert({
		where: { woNo: woExecData.woNo },
		update: { status: woExecData.status },
		create: woExecData,
	});
	const runExec = await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-SMT-EXEC" },
		update: { status: db.RunStatus.IN_PROGRESS },
		create: {
			runNo: "RUN-MGMT-SMT-EXEC",
			woId: woExec.id,
			lineId: lineA.id,
			routeVersionId: smtVersion.id,
			status: db.RunStatus.IN_PROGRESS,
			shiftCode: "D1",
			changeoverNo: "MGMT-SMT-EXEC-001",
		},
	});
	// 创建 FAI
	const existingFaiExec = await prisma.inspection.findFirst({
		where: { runId: runExec.id, type: db.InspectionType.FAI },
	});
	if (!existingFaiExec) {
		await prisma.inspection.create({
			data: {
				runId: runExec.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 2,
				passedQty: 2,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				startedAt: new Date(NOW.getTime() - 3 * HOUR),
				decidedAt: new Date(NOW.getTime() - 2.5 * HOUR),
				decidedBy: qualityUser?.id,
			},
		});
	}
	// 创建执行中的单件，有不同过站进度
	const unitExecStates = [
		{ sn: "SN-MGMT-EXEC-0001", status: db.UnitStatus.DONE, currentStepNo: 5 },
		{ sn: "SN-MGMT-EXEC-0002", status: db.UnitStatus.DONE, currentStepNo: 5 },
		{ sn: "SN-MGMT-EXEC-0003", status: db.UnitStatus.IN_STATION, currentStepNo: 3 },
		{ sn: "SN-MGMT-EXEC-0004", status: db.UnitStatus.IN_STATION, currentStepNo: 2 },
		{ sn: "SN-MGMT-EXEC-0005", status: db.UnitStatus.QUEUED, currentStepNo: 1 },
	];
	for (const unitData of unitExecStates) {
		const unit = await prisma.unit.upsert({
			where: { sn: unitData.sn },
			update: { status: unitData.status, currentStepNo: unitData.currentStepNo },
			create: {
				sn: unitData.sn,
				woId: woExec.id,
				runId: runExec.id,
				status: unitData.status,
				currentStepNo: unitData.currentStepNo,
			},
		});
		// 为已完成的单件创建 Track 记录
		if (unitData.status === db.UnitStatus.DONE || unitData.currentStepNo > 1) {
			for (let stepNo = 1; stepNo <= unitData.currentStepNo; stepNo++) {
				const station = smtStations[stepNo - 1];
				if (!station) continue;
				const existingTrack = await prisma.track.findFirst({
					where: { unitId: unit.id, stepNo },
				});
				if (!existingTrack) {
					const inAt = new Date(NOW.getTime() - (6 - stepNo) * 30 * 60 * 1000);
					const outAt =
						stepNo < unitData.currentStepNo ||
						unitData.status === db.UnitStatus.DONE
							? new Date(inAt.getTime() + 20 * 60 * 1000)
							: null;
					await prisma.track.create({
						data: {
							unitId: unit.id,
							stepNo,
							stationId: station.id,
							source: db.TrackSource.MANUAL,
							inAt,
							outAt,
							result: outAt ? db.TrackResult.PASS : null,
							operatorId: operatorUser?.id,
						},
					});
				}
			}
		}
	}
	console.log("  ✓ WO-MGMT-SMT-EXEC (IN_PROGRESS) → RUN-MGMT-SMT-EXEC (IN_PROGRESS) + 5 units with tracks");

	// ========== WO-MGMT-SMT-HOLD: OQC 不合格，ON_HOLD 待 MRB ==========
	const woHoldData = {
		woNo: "WO-MGMT-SMT-HOLD",
		productCode: "P-1001",
		plannedQty: 8,
		pickStatus: "2",
		routingId: smtRouting.id,
		status: db.WorkOrderStatus.IN_PROGRESS,
		createdAt: new Date(NOW.getTime() - 1 * DAY),
	};
	const woHold = await prisma.workOrder.upsert({
		where: { woNo: woHoldData.woNo },
		update: { status: woHoldData.status },
		create: woHoldData,
	});
	const runHold = await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-SMT-HOLD" },
		update: { status: db.RunStatus.ON_HOLD },
		create: {
			runNo: "RUN-MGMT-SMT-HOLD",
			woId: woHold.id,
			lineId: lineA.id,
			routeVersionId: smtVersion.id,
			status: db.RunStatus.ON_HOLD,
			shiftCode: "D1",
			changeoverNo: "MGMT-SMT-HOLD-001",
		},
	});
	// FAI 通过
	const existingFaiHold = await prisma.inspection.findFirst({
		where: { runId: runHold.id, type: db.InspectionType.FAI },
	});
	if (!existingFaiHold) {
		await prisma.inspection.create({
			data: {
				runId: runHold.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 2,
				passedQty: 2,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				decidedAt: new Date(NOW.getTime() - 20 * HOUR),
				decidedBy: qualityUser?.id,
			},
		});
	}
	// OQC 不合格
	const existingOqcHold = await prisma.inspection.findFirst({
		where: { runId: runHold.id, type: db.InspectionType.OQC },
	});
	if (!existingOqcHold) {
		await prisma.inspection.create({
			data: {
				runId: runHold.id,
				type: db.InspectionType.OQC,
				status: db.InspectionStatus.FAIL,
				sampleQty: 3,
				passedQty: 1,
				failedQty: 2,
				inspectorId: qualityUser?.id,
				startedAt: new Date(NOW.getTime() - 3 * HOUR),
				decidedAt: new Date(NOW.getTime() - 2 * HOUR),
				decidedBy: qualityUser?.id,
				remark: "抽检发现 2 件不合格，需 MRB 评审",
			},
		});
	}
	// 创建单件（已完成生产，等待质量决策）
	for (let i = 1; i <= 8; i++) {
		const sn = `SN-MGMT-HOLD-${String(i).padStart(4, "0")}`;
		const unit = await prisma.unit.upsert({
			where: { sn },
			update: {},
			create: {
				sn,
				woId: woHold.id,
				runId: runHold.id,
				status: db.UnitStatus.DONE,
				currentStepNo: 5,
			},
		});
		// 创建完整过站记录
		for (let stepNo = 1; stepNo <= 5; stepNo++) {
			const station = smtStations[stepNo - 1];
			if (!station) continue;
			const existingTrack = await prisma.track.findFirst({
				where: { unitId: unit.id, stepNo },
			});
			if (!existingTrack) {
				const inAt = new Date(NOW.getTime() - 18 * HOUR - (5 - stepNo) * 30 * 60 * 1000);
				await prisma.track.create({
					data: {
						unitId: unit.id,
						stepNo,
						stationId: station.id,
						source: db.TrackSource.MANUAL,
						inAt,
						outAt: new Date(inAt.getTime() + 20 * 60 * 1000),
						result: db.TrackResult.PASS,
						operatorId: operatorUser?.id,
					},
				});
			}
		}
	}
	console.log("  ✓ WO-MGMT-SMT-HOLD (IN_PROGRESS) → RUN-MGMT-SMT-HOLD (ON_HOLD) + OQC FAIL");

	// ========== WO-MGMT-SMT-DONE: 已完成，可追溯 ==========
	const woDoneData = {
		woNo: "WO-MGMT-SMT-DONE",
		productCode: "P-1001",
		plannedQty: 5,
		pickStatus: "2",
		routingId: smtRouting.id,
		status: db.WorkOrderStatus.COMPLETED,
		createdAt: new Date(NOW.getTime() - 3 * DAY),
	};
	const woDone = await prisma.workOrder.upsert({
		where: { woNo: woDoneData.woNo },
		update: { status: woDoneData.status },
		create: woDoneData,
	});
	const runDone = await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-SMT-DONE" },
		update: { status: db.RunStatus.COMPLETED },
		create: {
			runNo: "RUN-MGMT-SMT-DONE",
			woId: woDone.id,
			lineId: lineA.id,
			routeVersionId: smtVersion.id,
			status: db.RunStatus.COMPLETED,
			shiftCode: "D1",
			changeoverNo: "MGMT-SMT-DONE-001",
		},
	});
	// FAI 通过
	const existingFaiDone = await prisma.inspection.findFirst({
		where: { runId: runDone.id, type: db.InspectionType.FAI },
	});
	if (!existingFaiDone) {
		await prisma.inspection.create({
			data: {
				runId: runDone.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 2,
				passedQty: 2,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				decidedAt: new Date(NOW.getTime() - 2.5 * DAY),
				decidedBy: qualityUser?.id,
			},
		});
	}
	// OQC 通过
	const existingOqcDone = await prisma.inspection.findFirst({
		where: { runId: runDone.id, type: db.InspectionType.OQC },
	});
	if (!existingOqcDone) {
		await prisma.inspection.create({
			data: {
				runId: runDone.id,
				type: db.InspectionType.OQC,
				status: db.InspectionStatus.PASS,
				sampleQty: 2,
				passedQty: 2,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				startedAt: new Date(NOW.getTime() - 2 * DAY),
				decidedAt: new Date(NOW.getTime() - 2 * DAY + HOUR),
				decidedBy: qualityUser?.id,
				remark: "抽检合格，批次放行",
			},
		});
	}
	// 创建完成的单件
	for (let i = 1; i <= 5; i++) {
		const sn = `SN-MGMT-DONE-${String(i).padStart(4, "0")}`;
		const unit = await prisma.unit.upsert({
			where: { sn },
			update: {},
			create: {
				sn,
				woId: woDone.id,
				runId: runDone.id,
				status: db.UnitStatus.DONE,
				currentStepNo: 5,
			},
		});
		// 创建完整过站记录
		for (let stepNo = 1; stepNo <= 5; stepNo++) {
			const station = smtStations[stepNo - 1];
			if (!station) continue;
			const existingTrack = await prisma.track.findFirst({
				where: { unitId: unit.id, stepNo },
			});
			if (!existingTrack) {
				const inAt = new Date(NOW.getTime() - 2.5 * DAY - (5 - stepNo) * 30 * 60 * 1000);
				await prisma.track.create({
					data: {
						unitId: unit.id,
						stepNo,
						stationId: station.id,
						source: db.TrackSource.MANUAL,
						inAt,
						outAt: new Date(inAt.getTime() + 20 * 60 * 1000),
						result: db.TrackResult.PASS,
						operatorId: operatorUser?.id,
					},
				});
			}
		}
	}
	console.log("  ✓ WO-MGMT-SMT-DONE (COMPLETED) → RUN-MGMT-SMT-DONE (COMPLETED) + FAI/OQC PASS");

	// ========== DIP 产线演示数据 ==========
	console.log("\nCreating DIP line demo data...");

	// WO-MGMT-DIP-EXEC: DIP 执行中
	const woDipExecData = {
		woNo: "WO-MGMT-DIP-EXEC",
		productCode: "P-2001",
		plannedQty: 15,
		pickStatus: "2",
		routingId: dipRouting.id,
		status: db.WorkOrderStatus.IN_PROGRESS,
		createdAt: new Date(NOW.getTime() - 6 * HOUR),
	};
	const woDipExec = await prisma.workOrder.upsert({
		where: { woNo: woDipExecData.woNo },
		update: { status: woDipExecData.status },
		create: woDipExecData,
	});
	const runDipExec = await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-DIP-EXEC" },
		update: { status: db.RunStatus.IN_PROGRESS },
		create: {
			runNo: "RUN-MGMT-DIP-EXEC",
			woId: woDipExec.id,
			lineId: dipLineA.id,
			routeVersionId: dipVersion.id,
			status: db.RunStatus.IN_PROGRESS,
			shiftCode: "D1",
			changeoverNo: "MGMT-DIP-EXEC-001",
		},
	});
	// FAI
	const existingFaiDipExec = await prisma.inspection.findFirst({
		where: { runId: runDipExec.id, type: db.InspectionType.FAI },
	});
	if (!existingFaiDipExec) {
		await prisma.inspection.create({
			data: {
				runId: runDipExec.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 2,
				passedQty: 2,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				decidedAt: new Date(NOW.getTime() - 4 * HOUR),
				decidedBy: qualityUser?.id,
			},
		});
	}
	// 单件
	for (let i = 1; i <= 6; i++) {
		const sn = `SN-MGMT-DIP-EXEC-${String(i).padStart(4, "0")}`;
		const status =
			i <= 2 ? db.UnitStatus.DONE : i <= 4 ? db.UnitStatus.IN_STATION : db.UnitStatus.QUEUED;
		const currentStepNo = i <= 2 ? 4 : i <= 4 ? 2 : 1;
		const unit = await prisma.unit.upsert({
			where: { sn },
			update: { status, currentStepNo },
			create: {
				sn,
				woId: woDipExec.id,
				runId: runDipExec.id,
				status,
				currentStepNo,
			},
		});
		// Track
		if (currentStepNo > 1 || status === db.UnitStatus.DONE) {
			for (let stepNo = 1; stepNo <= currentStepNo; stepNo++) {
				const station = dipStations[stepNo - 1];
				if (!station) continue;
				const existingTrack = await prisma.track.findFirst({
					where: { unitId: unit.id, stepNo },
				});
				if (!existingTrack) {
					const inAt = new Date(NOW.getTime() - (5 - stepNo) * 40 * 60 * 1000);
					const outAt =
						stepNo < currentStepNo || status === db.UnitStatus.DONE
							? new Date(inAt.getTime() + 25 * 60 * 1000)
							: null;
					await prisma.track.create({
						data: {
							unitId: unit.id,
							stepNo,
							stationId: station.id,
							source: db.TrackSource.MANUAL,
							inAt,
							outAt,
							result: outAt ? db.TrackResult.PASS : null,
							operatorId: operatorUser?.id,
						},
					});
				}
			}
		}
	}
	console.log("  ✓ WO-MGMT-DIP-EXEC (IN_PROGRESS) → RUN-MGMT-DIP-EXEC (IN_PROGRESS)");

	// WO-MGMT-DIP-DONE: DIP 已完成
	const woDipDoneData = {
		woNo: "WO-MGMT-DIP-DONE",
		productCode: "P-2001",
		plannedQty: 10,
		pickStatus: "2",
		routingId: dipRouting.id,
		status: db.WorkOrderStatus.COMPLETED,
		createdAt: new Date(NOW.getTime() - 2 * DAY),
	};
	const woDipDone = await prisma.workOrder.upsert({
		where: { woNo: woDipDoneData.woNo },
		update: { status: woDipDoneData.status },
		create: woDipDoneData,
	});
	const runDipDone = await prisma.run.upsert({
		where: { runNo: "RUN-MGMT-DIP-DONE" },
		update: { status: db.RunStatus.COMPLETED },
		create: {
			runNo: "RUN-MGMT-DIP-DONE",
			woId: woDipDone.id,
			lineId: dipLineA.id,
			routeVersionId: dipVersion.id,
			status: db.RunStatus.COMPLETED,
			shiftCode: "D1",
			changeoverNo: "MGMT-DIP-DONE-001",
		},
	});
	// FAI/OQC
	const existingFaiDipDone = await prisma.inspection.findFirst({
		where: { runId: runDipDone.id, type: db.InspectionType.FAI },
	});
	if (!existingFaiDipDone) {
		await prisma.inspection.create({
			data: {
				runId: runDipDone.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 2,
				passedQty: 2,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				decidedAt: new Date(NOW.getTime() - 1.8 * DAY),
				decidedBy: qualityUser?.id,
			},
		});
	}
	const existingOqcDipDone = await prisma.inspection.findFirst({
		where: { runId: runDipDone.id, type: db.InspectionType.OQC },
	});
	if (!existingOqcDipDone) {
		await prisma.inspection.create({
			data: {
				runId: runDipDone.id,
				type: db.InspectionType.OQC,
				status: db.InspectionStatus.PASS,
				sampleQty: 3,
				passedQty: 3,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				decidedAt: new Date(NOW.getTime() - 1.5 * DAY),
				decidedBy: qualityUser?.id,
			},
		});
	}
	// 单件
	for (let i = 1; i <= 10; i++) {
		const sn = `SN-MGMT-DIP-DONE-${String(i).padStart(4, "0")}`;
		const unit = await prisma.unit.upsert({
			where: { sn },
			update: {},
			create: {
				sn,
				woId: woDipDone.id,
				runId: runDipDone.id,
				status: db.UnitStatus.DONE,
				currentStepNo: 4,
			},
		});
		// Track
		for (let stepNo = 1; stepNo <= 4; stepNo++) {
			const station = dipStations[stepNo - 1];
			if (!station) continue;
			const existingTrack = await prisma.track.findFirst({
				where: { unitId: unit.id, stepNo },
			});
			if (!existingTrack) {
				const inAt = new Date(NOW.getTime() - 1.6 * DAY - (4 - stepNo) * 40 * 60 * 1000);
				await prisma.track.create({
					data: {
						unitId: unit.id,
						stepNo,
						stationId: station.id,
						source: db.TrackSource.MANUAL,
						inAt,
						outAt: new Date(inAt.getTime() + 25 * 60 * 1000),
						result: db.TrackResult.PASS,
						operatorId: operatorUser?.id,
					},
				});
			}
		}
	}
	console.log("  ✓ WO-MGMT-DIP-DONE (COMPLETED) → RUN-MGMT-DIP-DONE (COMPLETED)");

	// 3. 统计
	console.log("\n========== Demo Data Summary ==========");
	const woCount = await prisma.workOrder.count({ where: { woNo: { startsWith: "WO-MGMT" } } });
	const runCount = await prisma.run.count({ where: { runNo: { startsWith: "RUN-MGMT" } } });
	const unitCount = await prisma.unit.count({ where: { sn: { startsWith: "SN-MGMT" } } });
	const trackCount = await prisma.track.count({
		where: { unit: { sn: { startsWith: "SN-MGMT" } } },
	});
	const inspCount = await prisma.inspection.count({
		where: { run: { runNo: { startsWith: "RUN-MGMT" } } },
	});

	console.log(`  Work Orders: ${woCount}`);
	console.log(`  Runs: ${runCount}`);
	console.log(`  Units: ${unitCount}`);
	console.log(`  Track Records: ${trackCount}`);
	console.log(`  Inspections: ${inspCount}`);
	console.log("========================================\n");

	console.log("Demo data created successfully!");
	console.log("\nRecommended trace SN for demo: SN-MGMT-DONE-0001");
};

await run();
