#!/usr/bin/env bun
/**
 * Kingdee FieldKeys Verification
 *
 * Goal: produce a list of FieldKeys that are actually queryable via ExecuteBillQuery.
 * This uses form metadata + View structure to generate candidates, then validates
 * them with ExecuteBillQuery using a split-and-test strategy.
 *
 * Usage:
 *   bun scripts/kingdee-fieldkeys-verified.ts [FORM_ID]
 */

import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin, kingdeeView } from "../apps/server/src/modules/mes/integration/kingdee";

const FORMS = {
	PRD_MO: { name: "生产订单 (Work Order)", numberField: "FBillNo" },
	BD_Material: { name: "物料主数据 (Material)", numberField: "FNumber" },
	ENG_BOM: { name: "BOM (Bill of Materials)", numberField: "FNumber" },
	ENG_WorkCenter: { name: "工作中心 (Engineering Work Center)", numberField: "FNumber" },
	ENG_Route: { name: "工艺路线 (Routing)", numberField: "FNumber" },
} as const;

type FormId = keyof typeof FORMS;

const EXTRA_CANDIDATES: Partial<Record<FormId, string[]>> = {
	BD_Material: [
		"FNumber",
		"FName",
		"FSpecification",
		"FModel",
		"FBarCode",
		"FDescription",
		"FCategoryID.FNumber",
		"FCategoryID.FName",
		"FBaseUnitId.FNumber",
		"FBaseUnitId.FName",
		"FProduceUnitId.FNumber",
		"FProduceUnitId.FName",
		"FIsBatchManage",
		"FIsKFPeriod",
		"FIsProduce",
		"FIsPurchase",
		"FDocumentStatus",
		"FForbidStatus",
		"FForbidDate",
	],
	ENG_BOM: [
		"FNumber",
		"FMATERIALID.FNumber",
		"FMATERIALID.FName",
		"FMATERIALIDCHILD.FNumber",
		"FMATERIALIDCHILD.FName",
		"FNumerator",
		"FDENOMINATOR",
		"FSCRAPRATE",
		"FFIXSCRAPQTY",
		"FISKEYCOMPONENT",
		"FISSUETYPE",
		"FBACKFLUSHTYPE",
		"FDocumentStatus",
		"FForbidStatus",
	],
	ENG_Route: [
		"FID",
		"FNumber",
		"FName",
		"FMATERIALID.FNumber",
		"FMATERIALID.FName",
		"FUseOrgId.FNumber",
		"FCreateOrgId.FNumber",
		"FEFFECTDATE",
		"FExpireDate",
		"FRouteSrc",
		"FBomId.FNumber",
		"FModifyDate",
		"FOperNumber",
		"FProcessId.FNumber",
		"FProcessId.FName",
		"FWorkCenterId.FNumber",
		"FWorkCenterId.FName",
		"FDepartmentId.FNumber",
		"FDepartmentId.FName",
		"FOperDescription",
		"FKeyOper",
		"FIsFirstPieceInspect",
		"FIsProcessRecordStation",
		"FIsQualityInspectStation",
	],
};

const BASE_DATA_SUFFIXES = [
	"FNumber",
	"FName",
	"FSpecification",
	"FModel",
	"FFullName",
	"FDescription",
	"Number",
	"Name",
	"Id",
	"FID",
	"msterID",
];

const BLOCKED_SUBSTRINGS = [
	"MultiLanguageText",
	"LocaleId",
	"PkId",
	".Name.Key",
	".Name.Value",
	".Description.Key",
	".Description.Value",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const uniqueSorted = (values: Iterable<string>) =>
	Array.from(new Set(values)).filter(Boolean).sort();

const filterCandidates = (fieldKeys: string[]) =>
	fieldKeys.filter((fieldKey) => {
		if (!fieldKey) return false;
		if (fieldKey.includes("__")) return false;
		if (BLOCKED_SUBSTRINGS.some((blocked) => fieldKey.includes(blocked))) return false;
		if (fieldKey.endsWith(".Key") || fieldKey.endsWith(".Value")) return false;
		if (fieldKey.split(".").length > 3) return false;
		return true;
	});

const extractFieldPaths = (obj: unknown, prefix = ""): string[] => {
	if (obj === null || obj === undefined) return [prefix];
	if (Array.isArray(obj)) {
		if (obj.length === 0) return [prefix];
		return extractFieldPaths(obj[0], prefix);
	}
	if (isRecord(obj)) {
		const paths: string[] = [];
		for (const [key, value] of Object.entries(obj)) {
			const fieldPath = prefix ? `${prefix}.${key}` : key;
			if (Array.isArray(value)) {
				paths.push(`${fieldPath}[*]`);
				if (value.length > 0) {
					const itemPaths = extractFieldPaths(value[0], fieldPath);
					paths.push(...itemPaths.filter((item) => item !== fieldPath));
				}
			} else if (isRecord(value)) {
				paths.push(...extractFieldPaths(value, fieldPath));
			} else {
				paths.push(fieldPath);
			}
		}
		return paths;
	}
	return [prefix];
};

const convertPathsToFieldKeys = (paths: string[], entryKeys: string[]) => {
	const fieldKeys = new Set<string>();
	for (const path of paths) {
		if (!path) continue;
		if (path.includes(".__")) continue;
		const parts = path
			.replace(/\[\*\]/g, "")
			.split(".")
			.filter(Boolean);

		if (parts.some((part) => part.includes("_") && !part.startsWith("F"))) continue;

		const normalizedParts = parts.map((part) => (part.startsWith("F") ? part : `F${part}`));
		const normalized = normalizedParts.join(".");
		if (normalized) fieldKeys.add(normalized);

		const first = parts[0];
		if (first && entryKeys.includes(first)) {
			const withoutEntry = parts.slice(1).map((part) => (part.startsWith("F") ? part : `F${part}`));
			const withoutEntryKey = withoutEntry.join(".");
			if (withoutEntryKey) fieldKeys.add(withoutEntryKey);
		}
	}
	return uniqueSorted(fieldKeys);
};

const getFieldKey = (value: Record<string, unknown>): string | null => {
	const candidates = ["FieldKey", "Key", "fieldKey", "key", "Name", "name", "FieldName", "fieldName"];
	for (const key of candidates) {
		const candidate = value[key];
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate.trim();
		}
	}
	return null;
};

const collectFieldKeysFromArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	const keys: string[] = [];
	for (const item of value) {
		if (!isRecord(item)) continue;
		const key = getFieldKey(item);
		if (key) keys.push(key);
	}
	return keys;
};

const collectFieldKeysFromObject = (value: unknown): string[] => {
	if (!isRecord(value)) return [];
	const keys: string[] = [];
	for (const entry of Object.values(value)) {
		keys.push(...collectFieldKeysFromArray(entry));
	}
	return keys;
};

const extractMetadataCandidates = (metadata: Record<string, unknown> | null) => {
	if (!metadata) {
		return { candidates: [], entryEntityKeys: [] as string[] };
	}
	const businessInfo =
		(metadata.BusinessInfo as Record<string, unknown> | undefined) ??
		(metadata.Businessinfo as Record<string, unknown> | undefined) ??
		(metadata.businessInfo as Record<string, unknown> | undefined) ??
		null;

	const candidates = new Set<string>();
	const entryEntityKeys = new Set<string>();

	if (businessInfo) {
		const entryEntities =
			(businessInfo.EntryEntity as unknown[] | undefined) ??
			(businessInfo.EntryEntities as unknown[] | undefined) ??
			(businessInfo.entryEntity as unknown[] | undefined);

		if (Array.isArray(entryEntities)) {
			for (const entry of entryEntities) {
				if (!isRecord(entry)) continue;
				const entryKey = getFieldKey(entry);
				if (entryKey) entryEntityKeys.add(entryKey);

				const entryFieldKeys = [
					...collectFieldKeysFromArray(entry.Field),
					...collectFieldKeysFromArray(entry.Fields),
					...collectFieldKeysFromObject(entry),
				];

				for (const fieldKey of entryFieldKeys) {
					candidates.add(fieldKey);
					if (entryKey && !fieldKey.startsWith(`${entryKey}.`)) {
						candidates.add(`${entryKey}.${fieldKey}`);
					}
				}
			}
		}

		const mainFieldKeys = [
			...collectFieldKeysFromArray(businessInfo.Field),
			...collectFieldKeysFromArray(businessInfo.Fields),
			...collectFieldKeysFromObject(businessInfo),
		];

		for (const fieldKey of mainFieldKeys) {
			candidates.add(fieldKey);
		}
	}

	return {
		candidates: uniqueSorted(candidates),
		entryEntityKeys: uniqueSorted(entryEntityKeys),
	};
};

const extractViewCandidates = (model: Record<string, unknown>, entryKeys: string[]) => {
	const paths = extractFieldPaths(model);
	const converted = convertPathsToFieldKeys(paths, entryKeys);
	return {
		candidates: converted,
		topLevelKeys: uniqueSorted(Object.keys(model)),
	};
};

const expandBaseDataFields = (fieldKeys: string[]) => {
	const candidates = new Set(fieldKeys);
	for (const fieldKey of fieldKeys) {
		if (!fieldKey.match(/Id$/) && !fieldKey.match(/ID$/)) continue;
		for (const suffix of BASE_DATA_SUFFIXES) {
			candidates.add(`${fieldKey}.${suffix}`);
		}
	}
	return uniqueSorted(candidates);
};

const testFieldChunk = async (
	config: ReturnType<typeof getKingdeeConfig>["data"],
	cookie: string,
	formId: string,
	baseField: string,
	fields: string[],
) => {
	const fieldKeys = [baseField, ...fields].join(",");
	const result = await kingdeeExecuteBillQuery(config, cookie, {
		formId,
		fieldKeys,
		startRow: 0,
		limit: 1,
	});
	return result;
};

const validateFields = async (
	config: ReturnType<typeof getKingdeeConfig>["data"],
	cookie: string,
	formId: string,
	baseField: string,
	fields: string[],
): Promise<{ valid: string[]; invalid: Array<{ field: string; message: string }> }> => {
	if (fields.length === 0) return { valid: [], invalid: [] };

	const valid: string[] = [];
	const invalid: Array<{ field: string; message: string }> = [];
	const queue = [...fields];
	const concurrency = 8;

	const workers = Array.from({ length: concurrency }, async () => {
		while (queue.length > 0) {
			const field = queue.shift();
			if (!field) continue;
			const result = await testFieldChunk(config, cookie, formId, baseField, [field]);
			if (result.success) {
				valid.push(field);
			} else {
				invalid.push({ field, message: result.message });
			}
		}
	});

	await Promise.all(workers);

	return { valid, invalid };
};

const fetchFormMetadata = async (
	config: ReturnType<typeof getKingdeeConfig>["data"],
	cookie: string,
	formId: string,
) => {
	const url = `${config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.GetFormMetadata.common.kdsvc`;
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: cookie,
		},
		body: JSON.stringify({ data: { FormId: formId } }),
	});

	if (!response.ok) {
		return { success: false, message: `Metadata failed: ${response.status}` };
	}

	const text = await response.text();
	let raw: unknown;
	try {
		raw = JSON.parse(text) as unknown;
	} catch {
		const preview = text.slice(0, 200);
		return { success: false, message: `Metadata response is not JSON. Preview=${preview}` };
	}

	const result =
		raw && typeof raw === "object" && "Result" in raw
			? (raw as { Result?: unknown }).Result
			: raw;
	const parsed =
		typeof result === "string" ? (JSON.parse(result) as Record<string, unknown>) : result;

	if (!isRecord(parsed)) {
		return { success: false, message: "Metadata response is not an object." };
	}

	return { success: true, data: parsed };
};

const summarizeStructure = (model: Record<string, unknown>) => {
	const arrays = Object.entries(model)
		.filter(([, value]) => Array.isArray(value))
		.map(([key, value]) => {
			const sample = Array.isArray(value) && value.length > 0 && isRecord(value[0])
				? Object.keys(value[0] as Record<string, unknown>)
				: [];
			return { key, count: Array.isArray(value) ? value.length : 0, sampleKeys: sample.slice(0, 20) };
		});

	return {
		topLevelKeys: Object.keys(model).slice(0, 200),
		arrayEntities: arrays,
	};
};

const discoverForm = async (
	config: ReturnType<typeof getKingdeeConfig>["data"],
	cookie: string,
	formId: FormId,
) => {
	const form = FORMS[formId];
	console.log(`\n${"=".repeat(80)}`);
	console.log(`🔎 ${form.name}`);
	console.log(`   FormId: ${formId}`);
	console.log(`${"=".repeat(80)}`);

	const sampleQuery = await kingdeeExecuteBillQuery(config, cookie, {
		formId,
		fieldKeys: form.numberField,
		startRow: 0,
		limit: 5,
	});
	if (!sampleQuery.success || sampleQuery.data.length === 0) {
		console.error(`❌ Sample query failed: ${sampleQuery.message}`);
		return;
	}
	const sampleNumber = String(sampleQuery.data[0][0]);
	console.log(`✅ Sample number: ${sampleNumber}`);

	const viewResult = await kingdeeView(config, cookie, formId, {
		CreateOrgId: 0,
		Number: sampleNumber,
	});
	if (!viewResult.success) {
		console.error(`❌ View failed: ${viewResult.message}`);
		return;
	}

	const structureSummary = summarizeStructure(viewResult.data);
	const entryKeys = structureSummary.arrayEntities.map((entry) => entry.key);

	const metadataResult = await fetchFormMetadata(config, cookie, formId);
	if (!metadataResult.success) {
		console.warn(`⚠️  Metadata unavailable: ${metadataResult.message}`);
	}

	const metadataCandidates = extractMetadataCandidates(
		metadataResult.success ? metadataResult.data : null,
	);
	const viewCandidates = extractViewCandidates(viewResult.data, entryKeys);

	let candidates = uniqueSorted([
		...metadataCandidates.candidates,
		...viewCandidates.candidates,
		...(EXTRA_CANDIDATES[formId] ?? []),
	]);
	candidates = expandBaseDataFields(candidates);
	candidates = filterCandidates(candidates);

	console.log(`📌 Candidate fields: ${candidates.length}`);
	console.log(`📌 Entry entities: ${metadataCandidates.entryEntityKeys.join(", ") || "(none)"}`);

	const validation = await validateFields(config, cookie, formId, form.numberField, candidates);
	const validFields = uniqueSorted(validation.valid);
	const invalidFields = validation.invalid;

	console.log(`✅ Queryable fields: ${validFields.length}`);
	console.log(`⚠️  Invalid fields: ${invalidFields.length}`);

	const outputPath = `./kingdee-${formId}-verified-fields.json`;
	await Bun.write(
		outputPath,
		JSON.stringify(
			{
				formId,
				formName: form.name,
				sampleNumber,
				baseField: form.numberField,
				candidateCount: candidates.length,
				queryableCount: validFields.length,
				invalidCount: invalidFields.length,
				queryableFields: validFields,
				invalidFields,
				entryEntities: metadataCandidates.entryEntityKeys,
				structureSummary,
			},
			null,
			2,
		),
	);

	console.log(`💾 Saved: ${outputPath}`);
};

const main = async () => {
	const target = process.argv[2] as FormId | undefined;
	if (target && !FORMS[target]) {
		console.error(`Unknown FormId: ${target}`);
		console.error(`Available: ${Object.keys(FORMS).join(", ")}`);
		process.exit(1);
	}

	const configResult = getKingdeeConfig();
	if (!configResult.success) {
		console.error(`Kingdee config missing: ${configResult.message}`);
		process.exit(1);
	}

	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) {
		console.error(`Kingdee login failed: ${loginResult.message}`);
		process.exit(1);
	}

	const formIds = target ? [target] : (Object.keys(FORMS) as FormId[]);
	for (const formId of formIds) {
		await discoverForm(configResult.data, loginResult.data.cookie, formId);
	}
};

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
