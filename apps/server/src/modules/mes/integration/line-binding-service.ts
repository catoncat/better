import type { Prisma, PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

// ==========================================
// Types
// ==========================================

export type LineStencilBindResult = {
	id: string;
	lineId: string;
	stencilId: string;
	isCurrent: boolean;
	boundAt: string;
	boundBy: string | null;
};

export type LineStencilUnbindResult = {
	id: string;
	lineId: string;
	stencilId: string;
	isCurrent: boolean;
	unboundAt: string;
	unboundBy: string | null;
};

export type LineSolderPasteBindResult = {
	id: string;
	lineId: string;
	lotId: string;
	isCurrent: boolean;
	boundAt: string;
	boundBy: string | null;
};

export type LineSolderPasteUnbindResult = {
	id: string;
	lineId: string;
	lotId: string;
	isCurrent: boolean;
	unboundAt: string;
	unboundBy: string | null;
};

// ==========================================
// Stencil Binding
// ==========================================

/**
 * Bind a stencil to a line.
 * - Sets any existing current stencil on this line to isCurrent=false
 * - Creates new binding with isCurrent=true
 */
export const bindStencilToLine = async (
	db: PrismaClient,
	lineId: string,
	stencilId: string,
	userId?: string,
): Promise<ServiceResult<LineStencilBindResult>> => {
	// Verify line exists
	const line = await db.line.findUnique({ where: { id: lineId } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: `Line with id ${lineId} not found`,
			status: 404,
		};
	}

	const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
		// Mark any existing current stencil as not current
		await tx.lineStencil.updateMany({
			where: { lineId, isCurrent: true },
			data: { isCurrent: false, unboundAt: new Date(), unboundBy: userId ?? null },
		});

		// Create new binding
		const binding = await tx.lineStencil.create({
			data: {
				lineId,
				stencilId,
				isCurrent: true,
				boundAt: new Date(),
				boundBy: userId ?? null,
			},
		});

		return binding;
	});

	return {
		success: true,
		data: {
			id: result.id,
			lineId: result.lineId,
			stencilId: result.stencilId,
			isCurrent: result.isCurrent,
			boundAt: result.boundAt.toISOString(),
			boundBy: result.boundBy,
		},
	};
};

/**
 * Unbind the current stencil from a line.
 * - Finds the current stencil binding and sets isCurrent=false, unboundAt=now
 */
export const unbindStencilFromLine = async (
	db: PrismaClient,
	lineId: string,
	userId?: string,
): Promise<ServiceResult<LineStencilUnbindResult>> => {
	// Verify line exists
	const line = await db.line.findUnique({ where: { id: lineId } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: `Line with id ${lineId} not found`,
			status: 404,
		};
	}

	// Find current binding
	const currentBinding = await db.lineStencil.findFirst({
		where: { lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return {
			success: false,
			code: "NO_CURRENT_STENCIL",
			message: `No stencil is currently bound to line ${lineId}`,
			status: 400,
		};
	}

	const now = new Date();
	const updated = await db.lineStencil.update({
		where: { id: currentBinding.id },
		data: {
			isCurrent: false,
			unboundAt: now,
			unboundBy: userId ?? null,
		},
	});

	return {
		success: true,
		data: {
			id: updated.id,
			lineId: updated.lineId,
			stencilId: updated.stencilId,
			isCurrent: updated.isCurrent,
			unboundAt: now.toISOString(),
			unboundBy: updated.unboundBy,
		},
	};
};

// ==========================================
// Solder Paste Binding
// ==========================================

/**
 * Bind a solder paste lot to a line.
 * - Sets any existing current solder paste on this line to isCurrent=false
 * - Creates new binding with isCurrent=true
 */
export const bindSolderPasteToLine = async (
	db: PrismaClient,
	lineId: string,
	lotId: string,
	userId?: string,
): Promise<ServiceResult<LineSolderPasteBindResult>> => {
	// Verify line exists
	const line = await db.line.findUnique({ where: { id: lineId } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: `Line with id ${lineId} not found`,
			status: 404,
		};
	}

	const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
		// Mark any existing current solder paste as not current
		await tx.lineSolderPaste.updateMany({
			where: { lineId, isCurrent: true },
			data: { isCurrent: false, unboundAt: new Date(), unboundBy: userId ?? null },
		});

		// Create new binding
		const binding = await tx.lineSolderPaste.create({
			data: {
				lineId,
				lotId,
				isCurrent: true,
				boundAt: new Date(),
				boundBy: userId ?? null,
			},
		});

		return binding;
	});

	return {
		success: true,
		data: {
			id: result.id,
			lineId: result.lineId,
			lotId: result.lotId,
			isCurrent: result.isCurrent,
			boundAt: result.boundAt.toISOString(),
			boundBy: result.boundBy,
		},
	};
};

/**
 * Unbind the current solder paste from a line.
 * - Finds the current solder paste binding and sets isCurrent=false, unboundAt=now
 */
export const unbindSolderPasteFromLine = async (
	db: PrismaClient,
	lineId: string,
	userId?: string,
): Promise<ServiceResult<LineSolderPasteUnbindResult>> => {
	// Verify line exists
	const line = await db.line.findUnique({ where: { id: lineId } });
	if (!line) {
		return {
			success: false,
			code: "LINE_NOT_FOUND",
			message: `Line with id ${lineId} not found`,
			status: 404,
		};
	}

	// Find current binding
	const currentBinding = await db.lineSolderPaste.findFirst({
		where: { lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return {
			success: false,
			code: "NO_CURRENT_SOLDER_PASTE",
			message: `No solder paste is currently bound to line ${lineId}`,
			status: 400,
		};
	}

	const now = new Date();
	const updated = await db.lineSolderPaste.update({
		where: { id: currentBinding.id },
		data: {
			isCurrent: false,
			unboundAt: now,
			unboundBy: userId ?? null,
		},
	});

	return {
		success: true,
		data: {
			id: updated.id,
			lineId: updated.lineId,
			lotId: updated.lotId,
			isCurrent: updated.isCurrent,
			unboundAt: now.toISOString(),
			unboundBy: updated.unboundBy,
		},
	};
};
