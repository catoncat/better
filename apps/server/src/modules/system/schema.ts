import { t } from "elysia";

// --- Helpers ---
type SchemaType = Parameters<typeof t.Object>[0][string];

const createResponseSchema = <T extends SchemaType>(schema: T) =>
	t.Object({
		ok: t.Boolean(),
		data: schema,
	});

// --- Body Schemas ---
export const wecomConfigSchema = t.Object({
	enabled: t.Boolean(),
	webhookUrl: t.Optional(t.String()),
	mentionAll: t.Boolean(),
});

export const wecomTestSchema = t.Object({
	webhookUrl: t.Optional(t.String()),
	mentionAll: t.Boolean(),
});

export const uploadSchema = t.Object({
	file: t.File(),
});

export const appBrandingSchema = t.Object({
	appName: t.String(),
	shortName: t.String(),
});

export const demoSeedDatasetSchema = t.Union([
	t.Literal("base"),
	t.Literal("mgmt_demo"),
	t.Literal("loading_config"),
	t.Literal("data_collection"),
]);

export const demoSeedRequestSchema = t.Object({
	mode: t.Union([t.Literal("append"), t.Literal("overwrite")]),
	datasets: t.Array(demoSeedDatasetSchema),
});

// --- Response Schemas ---
export const appBrandingResponseSchema = createResponseSchema(appBrandingSchema);
export const wecomConfigResponseSchema = createResponseSchema(wecomConfigSchema);
export const wecomTestResponseSchema = createResponseSchema(t.Object({ message: t.String() }));
export const uploadResponseSchema = createResponseSchema(t.Object({ url: t.String() }));
export const saveConfigResponseSchema = createResponseSchema(t.Object({ message: t.String() }));
export const demoSeedResponseSchema = createResponseSchema(
	t.Object({
		message: t.String(),
		mode: t.Union([t.Literal("append"), t.Literal("overwrite")]),
		requestedDatasets: t.Array(demoSeedDatasetSchema),
		executedDatasets: t.Array(demoSeedDatasetSchema),
		warnings: t.Array(t.String()),
	}),
);

export const systemErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
