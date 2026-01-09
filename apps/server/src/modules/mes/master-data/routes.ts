import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	bomParentListQuerySchema,
	materialListQuerySchema,
	workCenterListQuerySchema,
} from "./schema";
import { listBomParents, listMaterials, listWorkCenters } from "./service";

export const masterDataModule = new Elysia()
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/materials",
		async ({ db, query }) => {
			return listMaterials(db, query);
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			query: materialListQuerySchema,
			detail: { tags: ["MES - Master Data"] },
		},
	)
	.get(
		"/boms",
		async ({ db, query }) => {
			return listBomParents(db, query);
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			query: bomParentListQuerySchema,
			detail: { tags: ["MES - Master Data"] },
		},
	)
	.get(
		"/work-centers",
		async ({ db, query }) => {
			return listWorkCenters(db, query);
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			query: workCenterListQuerySchema,
			detail: { tags: ["MES - Master Data"] },
		},
	);
