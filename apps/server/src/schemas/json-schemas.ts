/**
 * JSON 字段 Schema 定义
 *
 * 用于 API response 类型定义，使 Eden Treaty 能正确推断前端类型。
 */
import { t } from "elysia";

// ============ Notification Data ============

export const notificationDataSchema = t.Object({
	link: t.Optional(t.Object({ url: t.String(), label: t.Optional(t.String()) })),
	entityType: t.Optional(t.String()),
	entityId: t.Optional(t.String()),
	action: t.Optional(t.String()),
});

// ============ Audit Log Diff ============

export const auditDiffSchema = t.Array(
	t.Object({
		op: t.Union([t.Literal("add"), t.Literal("remove"), t.Literal("replace")]),
		path: t.String(),
		before: t.Optional(t.Any()),
		after: t.Optional(t.Any()),
	}),
);
