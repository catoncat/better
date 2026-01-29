import { Prisma, type PrismaClient, type ProcessType } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	faiTemplateCreateSchema,
	faiTemplateListQuerySchema,
	faiTemplateUpdateSchema,
} from "./schema";

type FaiTemplateCreateInput = Static<typeof faiTemplateCreateSchema>;
type FaiTemplateUpdateInput = Static<typeof faiTemplateUpdateSchema>;
type FaiTemplateListQuery = Static<typeof faiTemplateListQuerySchema>;

type FaiTemplateRecord = Prisma.FaiTemplateGetPayload<{
	include: { items: true };
}>;

type FaiTemplateListRecord = Prisma.FaiTemplateGetPayload<{
	include: { _count: { select: { items: true } } };
}>;

type FaiTemplateDetail = {
	id: string;
	code: string;
	name: string;
	productCode: string;
	processType: ProcessType;
	version: string | null;
	isActive: boolean;
	meta: Prisma.JsonValue | null;
	items: Array<{
		id: string;
		templateId: string;
		seq: number;
		itemName: string;
		itemSpec: string | null;
		required: boolean;
		meta: Prisma.JsonValue | null;
		createdAt: string;
		updatedAt: string;
	}>;
	createdAt: string;
	updatedAt: string;
};

type FaiTemplateSummary = {
	id: string;
	code: string;
	name: string;
	productCode: string;
	processType: ProcessType;
	version: string | null;
	isActive: boolean;
	itemCount: number;
	updatedAt: string;
};

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(safeJsonStringify(value)) as Prisma.InputJsonValue;

const toOptionalJsonValue = (value: unknown) => {
	if (value === undefined) return undefined;
	if (value === null) return Prisma.DbNull;
	return toJsonValue(value);
};

const normalizeItems = (items: FaiTemplateCreateInput["items"]) => {
	const seen = new Set<number>();
	const normalized = items
		.map((item) => ({
			seq: item.seq,
			itemName: item.itemName.trim(),
			itemSpec: item.itemSpec?.trim() || null,
			required: item.required ?? true,
			meta: item.meta ?? null,
		}))
		.sort((a, b) => a.seq - b.seq);

	for (const item of normalized) {
		if (!item.itemName) return { error: "ITEM_NAME_REQUIRED" as const };
		if (seen.has(item.seq)) return { error: "ITEM_SEQ_DUPLICATE" as const };
		seen.add(item.seq);
	}

	return { items: normalized } as const;
};

const toDetail = (template: FaiTemplateRecord): FaiTemplateDetail => ({
	id: template.id,
	code: template.code,
	name: template.name,
	productCode: template.productCode,
	processType: template.processType,
	version: template.version ?? null,
	isActive: template.isActive,
	meta: template.meta ?? null,
	items: template.items
		.slice()
		.sort((a, b) => a.seq - b.seq)
		.map((item) => ({
			id: item.id,
			templateId: item.templateId,
			seq: item.seq,
			itemName: item.itemName,
			itemSpec: item.itemSpec ?? null,
			required: item.required,
			meta: item.meta ?? null,
			createdAt: item.createdAt.toISOString(),
			updatedAt: item.updatedAt.toISOString(),
		})),
	createdAt: template.createdAt.toISOString(),
	updatedAt: template.updatedAt.toISOString(),
});

const toSummary = (template: FaiTemplateListRecord): FaiTemplateSummary => ({
	id: template.id,
	code: template.code,
	name: template.name,
	productCode: template.productCode,
	processType: template.processType,
	version: template.version ?? null,
	isActive: template.isActive,
	itemCount: template._count.items,
	updatedAt: template.updatedAt.toISOString(),
});

export const listFaiTemplates = async (db: PrismaClient, query: FaiTemplateListQuery) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);

	const where: Prisma.FaiTemplateWhereInput = {};
	if (query.search) {
		where.OR = [
			{ code: { contains: query.search } },
			{ name: { contains: query.search } },
			{ productCode: { contains: query.search } },
		];
	}
	if (query.productCode) where.productCode = query.productCode;
	if (query.processType) where.processType = query.processType;
	if (query.isActive) where.isActive = query.isActive === "true";

	const [items, total] = await Promise.all([
		db.faiTemplate.findMany({
			where,
			include: { _count: { select: { items: true } } },
			orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.faiTemplate.count({ where }),
	]);

	return {
		items: items.map(toSummary),
		total,
		page,
		pageSize,
	};
};

export const getFaiTemplate = async (
	db: PrismaClient,
	templateId: string,
): Promise<ServiceResult<FaiTemplateDetail>> => {
	const template = await db.faiTemplate.findUnique({
		where: { id: templateId },
		include: { items: true },
	});

	if (!template) {
		return {
			success: false,
			code: "FAI_TEMPLATE_NOT_FOUND",
			message: "FAI template not found",
			status: 404,
		};
	}

	return { success: true, data: toDetail(template) };
};

export const createFaiTemplate = async (
	db: PrismaClient,
	input: FaiTemplateCreateInput,
): Promise<ServiceResult<FaiTemplateDetail>> => {
	const normalizedItems = normalizeItems(input.items);
	if ("error" in normalizedItems) {
		return {
			success: false,
			code:
				normalizedItems.error === "ITEM_SEQ_DUPLICATE"
					? "FAI_TEMPLATE_ITEM_SEQ_DUPLICATE"
					: "FAI_TEMPLATE_ITEM_NAME_REQUIRED",
			message: "Invalid FAI template items",
			status: 400,
		};
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.faiTemplate.findUnique({
			where: { code: input.code },
			select: { id: true },
		});
		if (existing) {
			return {
				success: false,
				code: "FAI_TEMPLATE_CODE_EXISTS",
				message: "FAI template code already exists",
				status: 409,
			};
		}

		const created = await tx.faiTemplate.create({
			data: {
				code: input.code,
				name: input.name,
				productCode: input.productCode,
				processType: input.processType,
				version: input.version ?? null,
				isActive: input.isActive ?? true,
				meta: toOptionalJsonValue(input.meta),
				items: {
					create: normalizedItems.items.map((item) => ({
						seq: item.seq,
						itemName: item.itemName,
						itemSpec: item.itemSpec,
						required: item.required,
						meta: toOptionalJsonValue(item.meta),
					})),
				},
			},
			include: { items: true },
		});

		return { success: true, data: toDetail(created) };
	});
};

export const updateFaiTemplate = async (
	db: PrismaClient,
	templateId: string,
	input: FaiTemplateUpdateInput,
): Promise<ServiceResult<FaiTemplateDetail>> => {
	const normalizedItems = input.items ? normalizeItems(input.items) : null;
	if (normalizedItems && "error" in normalizedItems) {
		return {
			success: false,
			code:
				normalizedItems.error === "ITEM_SEQ_DUPLICATE"
					? "FAI_TEMPLATE_ITEM_SEQ_DUPLICATE"
					: "FAI_TEMPLATE_ITEM_NAME_REQUIRED",
			message: "Invalid FAI template items",
			status: 400,
		};
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.faiTemplate.findUnique({
			where: { id: templateId },
			include: { items: true },
		});
		if (!existing) {
			return {
				success: false,
				code: "FAI_TEMPLATE_NOT_FOUND",
				message: "FAI template not found",
				status: 404,
			};
		}

		if (input.code && input.code !== existing.code) {
			const codeExists = await tx.faiTemplate.findUnique({
				where: { code: input.code },
				select: { id: true },
			});
			if (codeExists) {
				return {
					success: false,
					code: "FAI_TEMPLATE_CODE_EXISTS",
					message: "FAI template code already exists",
					status: 409,
				};
			}
		}

		const updated = await tx.faiTemplate.update({
			where: { id: templateId },
			data: {
				code: input.code,
				name: input.name,
				productCode: input.productCode,
				processType: input.processType,
				version: input.version ?? undefined,
				isActive: input.isActive,
				meta: toOptionalJsonValue(input.meta),
			},
		});

		if (normalizedItems) {
			await tx.faiTemplateItem.deleteMany({ where: { templateId } });
			await tx.faiTemplateItem.createMany({
				data: normalizedItems.items.map((item) => ({
					templateId,
					seq: item.seq,
					itemName: item.itemName,
					itemSpec: item.itemSpec,
					required: item.required,
					meta: toOptionalJsonValue(item.meta),
				})),
			});
		}

		const refreshed = await tx.faiTemplate.findUnique({
			where: { id: updated.id },
			include: { items: true },
		});

		if (!refreshed) {
			return {
				success: false,
				code: "FAI_TEMPLATE_NOT_FOUND",
				message: "FAI template not found",
				status: 404,
			};
		}

		return { success: true, data: toDetail(refreshed) };
	});
};
