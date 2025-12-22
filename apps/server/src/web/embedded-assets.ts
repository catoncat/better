export type EmbeddedWebAsset = {
	contentType: string;
	base64: string;
	immutable?: boolean;
};

export const embeddedWebAssets: Record<string, EmbeddedWebAsset> = {};
