import prisma, { PRESET_ROLES } from "@better-app/db";

/**
 * Seed preset roles into the database
 */
export async function seedRoles() {
	console.log("Seeding roles...");

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
}

/**
 * Assign admin role to a user if they don't have any roles
 */
export async function assignAdminRoleToUser(userId: string) {
	const existingRoles = await prisma.userRoleAssignment.findMany({
		where: { userId },
	});

	if (existingRoles.length > 0) {
		return; // User already has roles
	}

	const adminRole = await prisma.role.findUnique({
		where: { code: "admin" },
	});

	if (!adminRole) {
		console.warn("Admin role not found, skipping role assignment");
		return;
	}

	await prisma.userRoleAssignment.create({
		data: {
			userId,
			roleId: adminRole.id,
		},
	});

	console.log(`Assigned admin role to user ${userId}`);
}

// Run if executed directly
if (import.meta.main) {
	await seedRoles();
	await prisma.$disconnect();
	console.log("Seed roles completed");
}
