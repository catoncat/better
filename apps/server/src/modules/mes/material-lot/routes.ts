import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	materialLotIdParamSchema,
	materialLotListQuerySchema,
	materialLotUpdateBodySchema,
} from "./schema";
import {
	getMaterialLot,
	getMaterialLotUsage,
	listMaterialLots,
	updateMaterialLot,
} from "./service";

export const materialLotModule = new Elysia({ prefix: "/material-lots" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	// 列表查询
	.get(
		"/",
		async ({ db, query, set }) => {
			const result = await listMaterialLots(db, query);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			query: materialLotListQuerySchema,
			detail: { tags: ["MES - Material Lot"] },
		},
	)
	// 详情
	.get(
		"/:id",
		async ({ db, params, set }) => {
			const result = await getMaterialLot(db, params.id);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			params: materialLotIdParamSchema,
			detail: { tags: ["MES - Material Lot"] },
		},
	)
	// 编辑
	.patch(
		"/:id",
		async ({ db, params, body, set }) => {
			const result = await updateMaterialLot(db, params.id, body);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ, // TODO: 可考虑新增 MATERIAL_LOT_EDIT 权限
			params: materialLotIdParamSchema,
			body: materialLotUpdateBodySchema,
			detail: { tags: ["MES - Material Lot"] },
		},
	)
	// 使用记录
	.get(
		"/:id/usage",
		async ({ db, params, set }) => {
			const result = await getMaterialLotUsage(db, params.id);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.ROUTE_READ,
			params: materialLotIdParamSchema,
			detail: { tags: ["MES - Material Lot"] },
		},
	);
