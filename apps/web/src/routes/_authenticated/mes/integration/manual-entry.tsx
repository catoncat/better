import { Permission } from "@better-app/db/permissions";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Can } from "@/components/ability/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLines } from "@/hooks/use-lines";
import {
	type SolderPasteStatus,
	type StencilStatus,
	useBindSolderPasteToLine,
	useBindStencilToLine,
	useRecordSolderPasteStatus,
	useRecordStencilStatus,
} from "@/hooks/use-manual-status-entry";

export const Route = createFileRoute("/_authenticated/mes/integration/manual-entry")({
	component: ManualEntryPage,
});

const STENCIL_STATUS_OPTIONS: { value: StencilStatus; label: string }[] = [
	{ value: "READY", label: "就绪" },
	{ value: "NOT_READY", label: "未就绪" },
	{ value: "MAINTENANCE", label: "维护中" },
];

const SOLDER_PASTE_STATUS_OPTIONS: { value: SolderPasteStatus; label: string }[] = [
	{ value: "COMPLIANT", label: "合规" },
	{ value: "NON_COMPLIANT", label: "不合规" },
	{ value: "EXPIRED", label: "已过期" },
];

function ManualEntryPage() {
	const { data: lines } = useLines();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">耗材状态录入</h1>
				<p className="text-muted-foreground">手动录入钢网/锡膏状态（无自动集成时使用）</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<StencilStatusCard />
				<SolderPasteStatusCard />
			</div>

			<LineBindingCard lines={lines?.items ?? []} />
		</div>
	);
}

// =============================================
// Stencil Status Entry Card
// =============================================

function StencilStatusCard() {
	const recordStatus = useRecordStencilStatus();

	const form = useForm({
		defaultValues: {
			stencilId: "",
			status: "READY" as StencilStatus,
			tensionValue: undefined as number | undefined,
			lastCleanedAt: "",
		},
		onSubmit: async ({ value }) => {
			await recordStatus.mutateAsync({
				eventId: crypto.randomUUID(),
				eventTime: new Date().toISOString(),
				stencilId: value.stencilId.trim(),
				status: value.status,
				tensionValue: value.tensionValue,
				lastCleanedAt: value.lastCleanedAt || undefined,
			});
			form.reset();
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>钢网状态录入</CardTitle>
				<CardDescription>录入钢网张力检测和清洗状态</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field
						form={form}
						name="stencilId"
						label="钢网ID"
						validators={{ onChange: z.string().min(1, "钢网ID不能为空") }}
					>
						{(field) => (
							<Input
								placeholder="扫码或输入钢网ID"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="status" label="状态">
						{(field) => (
							<Select
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v as StencilStatus)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STENCIL_STATUS_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</Field>

					<Field form={form} name="tensionValue" label="张力值 (N/cm²) - 选填">
						{(field) => (
							<Input
								type="number"
								step="0.1"
								placeholder="例如: 35.5"
								value={field.state.value ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) =>
									field.handleChange(e.target.value ? Number(e.target.value) : undefined)
								}
							/>
						)}
					</Field>

					<Field form={form} name="lastCleanedAt" label="最后清洗时间 - 选填">
						{(field) => (
							<Input
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Can permissions={Permission.SYSTEM_INTEGRATION}>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, _isSubmitting]) => (
								<Button
									type="submit"
									className="w-full"
									disabled={!canSubmit || recordStatus.isPending}
								>
									{recordStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									录入钢网状态
								</Button>
							)}
						</form.Subscribe>
					</Can>
				</form>
			</CardContent>
		</Card>
	);
}

// =============================================
// Solder Paste Status Entry Card
// =============================================

function SolderPasteStatusCard() {
	const recordStatus = useRecordSolderPasteStatus();

	const form = useForm({
		defaultValues: {
			lotId: "",
			status: "COMPLIANT" as SolderPasteStatus,
			expiresAt: "",
			thawedAt: "",
			stirredAt: "",
		},
		onSubmit: async ({ value }) => {
			await recordStatus.mutateAsync({
				eventId: crypto.randomUUID(),
				eventTime: new Date().toISOString(),
				lotId: value.lotId.trim(),
				status: value.status,
				expiresAt: value.expiresAt || undefined,
				thawedAt: value.thawedAt || undefined,
				stirredAt: value.stirredAt || undefined,
			});
			form.reset();
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>锡膏状态录入</CardTitle>
				<CardDescription>录入锡膏解冻、搅拌和有效期状态</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field
						form={form}
						name="lotId"
						label="批次号"
						validators={{ onChange: z.string().min(1, "批次号不能为空") }}
					>
						{(field) => (
							<Input
								placeholder="扫码或输入锡膏批次号"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="status" label="状态">
						{(field) => (
							<Select
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v as SolderPasteStatus)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SOLDER_PASTE_STATUS_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</Field>

					<Field form={form} name="thawedAt" label="解冻时间 - 选填">
						{(field) => (
							<Input
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="stirredAt" label="搅拌时间 - 选填">
						{(field) => (
							<Input
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="expiresAt" label="有效期至 - 选填">
						{(field) => (
							<Input
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Can permissions={Permission.SYSTEM_INTEGRATION}>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, _isSubmitting]) => (
								<Button
									type="submit"
									className="w-full"
									disabled={!canSubmit || recordStatus.isPending}
								>
									{recordStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									录入锡膏状态
								</Button>
							)}
						</form.Subscribe>
					</Can>
				</form>
			</CardContent>
		</Card>
	);
}

// =============================================
// Line Binding Card
// =============================================

interface Line {
	id: string;
	code: string;
	name: string;
}

function LineBindingCard({ lines }: { lines: Line[] }) {
	const [selectedLineId, setSelectedLineId] = useState<string>("");
	const [stencilId, setStencilId] = useState("");
	const [lotId, setLotId] = useState("");

	const bindStencil = useBindStencilToLine();
	const bindSolderPaste = useBindSolderPasteToLine();

	const handleBindStencil = async () => {
		if (!selectedLineId || !stencilId.trim()) return;
		await bindStencil.mutateAsync({ lineId: selectedLineId, stencilId: stencilId.trim() });
		setStencilId("");
	};

	const handleBindSolderPaste = async () => {
		if (!selectedLineId || !lotId.trim()) return;
		await bindSolderPaste.mutateAsync({ lineId: selectedLineId, lotId: lotId.trim() });
		setLotId("");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>产线绑定</CardTitle>
				<CardDescription>将耗材绑定到指定产线，用于就绪检查</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-3">
						<div>
							<label htmlFor="line-select" className="text-sm font-medium mb-2 block">
								选择产线
							</label>
							<Select value={selectedLineId} onValueChange={setSelectedLineId}>
								<SelectTrigger id="line-select">
									<SelectValue placeholder="选择产线" />
								</SelectTrigger>
								<SelectContent>
									{lines.map((line) => (
										<SelectItem key={line.id} value={line.id}>
											{line.name} ({line.code})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="stencil-id" className="text-sm font-medium mb-2 block">
								钢网ID
							</label>
							<div className="flex gap-2">
								<Input
									id="stencil-id"
									placeholder="输入钢网ID"
									value={stencilId}
									onChange={(e) => setStencilId(e.target.value)}
								/>
								<Can permissions={Permission.LOADING_CONFIG}>
									<Button
										onClick={handleBindStencil}
										disabled={!selectedLineId || !stencilId.trim() || bindStencil.isPending}
									>
										{bindStencil.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
									</Button>
								</Can>
							</div>
						</div>

						<div>
							<label htmlFor="solder-paste-lot" className="text-sm font-medium mb-2 block">
								锡膏批次号
							</label>
							<div className="flex gap-2">
								<Input
									id="solder-paste-lot"
									placeholder="输入锡膏批次号"
									value={lotId}
									onChange={(e) => setLotId(e.target.value)}
								/>
								<Can permissions={Permission.LOADING_CONFIG}>
									<Button
										onClick={handleBindSolderPaste}
										disabled={!selectedLineId || !lotId.trim() || bindSolderPaste.isPending}
									>
										{bindSolderPaste.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
									</Button>
								</Can>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
