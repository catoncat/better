import { t } from "elysia";
import * as Prismabox from "@better-app/db/prismabox";

export const runAuthorizeSchema = t.Object({
	action: t.String(), // AUTHORIZE or REVOKE
	reason: t.Optional(t.String()),
});

export const runResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.RunPlain,
});

export const runListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ default: 1 })),
	pageSize: t.Optional(t.Numeric({ default: 30 })),
	status: t.Optional(t.String()),
	search: t.Optional(t.String()),
	sort: t.Optional(t.String()),
	woNo: t.Optional(t.String()),
});
