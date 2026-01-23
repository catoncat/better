import prisma, { TimeRuleScope, TimeRuleType } from "@better-app/db";

/**
 * Preset time rule definitions for SMT Gap Phase 2
 */
const PRESET_TIME_RULES = [
	{
		code: "SOLDER_PASTE_24H",
		name: "锡膏暴露时间限制",
		description: "锡膏发出后 24 小时内必须使用完毕",
		ruleType: TimeRuleType.SOLDER_PASTE_EXPOSURE,
		durationMinutes: 1440, // 24 hours
		warningMinutes: 120, // 2 hours before expiry
		startEvent: "PASTE_ISSUED",
		endEvent: "PASTE_CONSUMED",
		scope: TimeRuleScope.GLOBAL,
		scopeValue: null,
		requiresWashStep: false,
		isWaivable: true,
		isActive: true,
		priority: 10,
	},
	{
		code: "WASH_4H",
		name: "水洗时间限制",
		description: "回流焊完成后 4 小时内必须完成水洗（仅适用于配置了水洗工序的路由）",
		ruleType: TimeRuleType.WASH_TIME_LIMIT,
		durationMinutes: 240, // 4 hours
		warningMinutes: 30, // 30 minutes before expiry
		startEvent: "REFLOW_TRACKOUT",
		endEvent: "WASH_TRACKIN",
		scope: TimeRuleScope.GLOBAL,
		scopeValue: null,
		requiresWashStep: true,
		isWaivable: true,
		isActive: true,
		priority: 10,
	},
];

/**
 * Seed preset time rule definitions into the database
 */
export async function seedTimeRules() {
	console.log("Seeding time rule definitions...");

	for (const rule of PRESET_TIME_RULES) {
		await prisma.timeRuleDefinition.upsert({
			where: { code: rule.code },
			update: {
				name: rule.name,
				description: rule.description,
				ruleType: rule.ruleType,
				durationMinutes: rule.durationMinutes,
				warningMinutes: rule.warningMinutes,
				startEvent: rule.startEvent,
				endEvent: rule.endEvent,
				scope: rule.scope,
				scopeValue: rule.scopeValue,
				requiresWashStep: rule.requiresWashStep,
				isWaivable: rule.isWaivable,
				isActive: rule.isActive,
				priority: rule.priority,
			},
			create: {
				code: rule.code,
				name: rule.name,
				description: rule.description,
				ruleType: rule.ruleType,
				durationMinutes: rule.durationMinutes,
				warningMinutes: rule.warningMinutes,
				startEvent: rule.startEvent,
				endEvent: rule.endEvent,
				scope: rule.scope,
				scopeValue: rule.scopeValue,
				requiresWashStep: rule.requiresWashStep,
				isWaivable: rule.isWaivable,
				isActive: rule.isActive,
				priority: rule.priority,
			},
		});
		console.log(`  - Seeded time rule: ${rule.code}`);
	}

	console.log(`Seeded ${PRESET_TIME_RULES.length} preset time rule definitions`);
}

// Run if executed directly
if (import.meta.main) {
	await seedTimeRules();
	await prisma.$disconnect();
	console.log("Seed time rules completed");
}
