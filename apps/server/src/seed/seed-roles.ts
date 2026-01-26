import type { PrismaClient } from "@better-app/db";
import { PRESET_ROLES } from "@better-app/db";

export const seedPresetRoles = async ({ prisma }: { prisma: PrismaClient }) => {
	console.log("Seeding preset roles...");

	for (const role of PRESET_ROLES) {
		await prisma.role.upsert({
			where: { code: role.code },
			update: {
				name: role.name,
				description: role.description,
				permissions: JSON.stringify(role.permissions),
				dataScope: role.dataScope,
				isSystem: role.isSystem,
			},
			create: {
				code: role.code,
				name: role.name,
				description: role.description,
				permissions: JSON.stringify(role.permissions),
				dataScope: role.dataScope,
				isSystem: role.isSystem,
			},
		});
	}

	console.log(`Seeded ${PRESET_ROLES.length} preset roles`);
};
