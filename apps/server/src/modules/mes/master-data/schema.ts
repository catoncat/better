import { t } from "elysia";

export const masterDataListBaseQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ default: 1 })),
	pageSize: t.Optional(t.Numeric({ default: 30 })),
	search: t.Optional(t.String()),
	sort: t.Optional(t.String()),
});

export const materialListQuerySchema = t.Composite([
	masterDataListBaseQuerySchema,
	t.Object({
		category: t.Optional(t.String()),
		unit: t.Optional(t.String()),
		model: t.Optional(t.String()),
		synced: t.Optional(t.String()),
		updatedFrom: t.Optional(t.String({ format: "date-time" })),
		updatedTo: t.Optional(t.String({ format: "date-time" })),
	}),
]);

export const bomParentListQuerySchema = t.Composite([
	masterDataListBaseQuerySchema,
	t.Object({
		parentCode: t.Optional(t.String()),
		synced: t.Optional(t.String()),
		updatedFrom: t.Optional(t.String({ format: "date-time" })),
		updatedTo: t.Optional(t.String({ format: "date-time" })),
	}),
]);

export const workCenterListQuerySchema = t.Composite([
	masterDataListBaseQuerySchema,
	t.Object({
		departmentCode: t.Optional(t.String()),
		stationGroupCode: t.Optional(t.String()),
		synced: t.Optional(t.String()),
		updatedFrom: t.Optional(t.String({ format: "date-time" })),
		updatedTo: t.Optional(t.String({ format: "date-time" })),
	}),
]);
