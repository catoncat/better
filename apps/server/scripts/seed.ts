import "dotenv/config";
import prisma, {
	CalibrationType,
	NotificationPriority,
	NotificationStatus,
	UserRole,
} from "@better-app/db";
import { auth } from "@better-app/auth";
import { compileRouteExecution } from "../src/modules/mes/routing/service";
import { seedMESMasterData } from "./seed-mes";
import { seedRoles, assignAdminRoleToUser } from "./seed-roles";

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const DEFAULT_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";

const WECOM_CONFIG_KEY = "wecom_notifications";
const APP_BRANDING_KEY = "app.branding";

const ensureAdminUser = async () => {
	process.env.AUTH_EMAIL_DEV_FALLBACK ||= "true";
	process.env.APP_URL ||= "http://localhost:3001";

	const existing = await prisma.user.findUnique({
		where: { email: DEFAULT_ADMIN_EMAIL },
	});

	let adminId = existing?.id;

	if (!existing) {
		await auth.api.signUpEmail({
			body: {
				email: DEFAULT_ADMIN_EMAIL,
				password: DEFAULT_ADMIN_PASSWORD,
				name: DEFAULT_ADMIN_NAME,
			},
		});

		const created = await prisma.user.findUnique({
			where: { email: DEFAULT_ADMIN_EMAIL },
		});

		if (!created) {
			throw new Error("Failed to create admin user");
		}

		adminId = created.id;
	}

	if (!adminId) {
		throw new Error("Missing admin user id");
	}

	const username = existing?.username || DEFAULT_ADMIN_EMAIL.split("@")[0] || "admin";

	await prisma.user.update({
		where: { id: adminId },
		data: {
			name: DEFAULT_ADMIN_NAME,
			username,
			role: UserRole.admin,
			isActive: true,
			emailVerified: true,
			enableWecomNotification: true,
		},
	});

	return adminId;
};

const seedSystemConfig = async (adminId: string) => {
	await prisma.systemConfig.upsert({
		where: { key: WECOM_CONFIG_KEY },
		update: {
			value: { enabled: false, webhookUrl: "", mentionAll: false },
			updatedBy: adminId,
		},
		create: {
			key: WECOM_CONFIG_KEY,
			name: "企业微信通知配置",
			value: { enabled: false, webhookUrl: "", mentionAll: false },
			updatedBy: adminId,
		},
	});

	await prisma.systemConfig.upsert({
		where: { key: APP_BRANDING_KEY },
		update: {
			value: { appName: "Better APP", shortName: "Better" },
			updatedBy: adminId,
		},
		create: {
			key: APP_BRANDING_KEY,
			name: "应用品牌配置",
			value: { appName: "Better APP", shortName: "Better" },
			updatedBy: adminId,
		},
	});
};

const seedInstruments = async (adminId: string) => {
	const existing = await prisma.instrument.count();
	if (existing > 0) return;

	const now = new Date();
	const performedAt = new Date(now);
	performedAt.setDate(performedAt.getDate() - 30);

	const intervalDays = 180;
	const nextCalibrationDate = new Date(performedAt);
	nextCalibrationDate.setDate(nextCalibrationDate.getDate() + intervalDays);

	const instrumentA = await prisma.instrument.create({
		data: {
			instrumentNo: "INS-001",
			manufacturer: "Mitutoyo",
			model: "500-196-30",
			description: "Digital Caliper",
			serialNo: "SN-DC-001",
			department: "Quality",
			owner: { connect: { id: adminId } },
			lastCalibrationDate: performedAt,
			intervalDays,
			reminderDays: 15,
			calibrationType: CalibrationType.internal,
			nextCalibrationDate,
			status: "normal",
			remarks: "Seed data",
		},
	});

	await prisma.instrument.create({
		data: {
			instrumentNo: "INS-002",
			manufacturer: "Fluke",
			model: "87V",
			description: "Multimeter",
			serialNo: "SN-MM-002",
			department: "Maintenance",
			owner: { connect: { id: adminId } },
			intervalDays: 365,
			reminderDays: 30,
			calibrationType: CalibrationType.external,
			status: "normal",
			remarks: "Seed data",
		},
	});

	await prisma.calibrationRecord.create({
		data: {
			instrumentId: instrumentA.id,
			calibrationType: CalibrationType.internal,
			performedAt,
			nextCalibrationDate,
			result: "pass",
			certificateNo: "CERT-001",
			certificateUrl: "",
			attachments: [],
			providerName: "Internal Lab",
			operator: adminId,
			createdBy: adminId,
			remarks: "Initial calibration",
		},
	});

	await prisma.notification.create({
		data: {
			recipientId: adminId,
			type: "system",
			title: "欢迎使用仪器计量模块",
			message: "已为你准备示例仪器与校准记录。",
			status: NotificationStatus.unread,
			priority: NotificationPriority.normal,
			data: {
				entityType: "instrument",
				entityId: instrumentA.id,
				action: "view",
			},
		},
	});
};

const ensureDefaultRouteVersion = async () => {
	const routingCode = "PCBA-STD-V1";
	const result = await compileRouteExecution(prisma, routingCode);
	if (!result.success) {
		throw new Error(`Failed to compile route ${routingCode}: ${result.code} ${result.message}`);
	}
	if (result.data.status !== "READY") {
		const errors = Array.isArray(result.data.errorsJson)
			? JSON.stringify(result.data.errorsJson)
			: "Unknown compile errors";
		throw new Error(`Route ${routingCode} is not READY: ${errors}`);
	}
};

const run = async () => {
	const adminId = await ensureAdminUser();
	await seedSystemConfig(adminId);
	await seedInstruments(adminId);
	await seedMESMasterData();
	await seedRoles();
	await assignAdminRoleToUser(adminId);
	await ensureDefaultRouteVersion();
};

run()
	.then(async () => {
		console.log("Seed completed");
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error("Seed failed", error);
		await prisma.$disconnect();
		process.exitCode = 1;
	});
