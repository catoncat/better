import { t } from "elysia";
import { Prismabox } from "@better-app/db";

export const runAuthorizeSchema = t.Object({
	action: t.String(), // AUTHORIZE or REVOKE
	reason: t.Optional(t.String()),
});

export const runResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.RunPlain,
});

