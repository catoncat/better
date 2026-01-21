import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	type DataCollectionSpec,
	useDataCollectionSpecList,
} from "@/hooks/use-data-collection-specs";

interface DataSpecSelectorProps {
	/**
	 * 当前选中的采集项 ID 列表
	 */
	value: string[];
	/**
	 * 值变化时的回调
	 */
	onChange: (ids: string[]) => void;
	/**
	 * 可选：按工序代码过滤（用于步骤级配置时自动过滤）
	 */
	operationCode?: string;
	/**
	 * 是否允许加载采集项（权限不足时禁用）
	 */
	enabled?: boolean;
}

/**
 * 采集项多选组件
 *
 * 支持：
 * - 按工序分组显示
 * - 搜索过滤
 * - 可选按 operationCode 过滤
 */
export function DataSpecSelector({
	value,
	onChange,
	operationCode,
	enabled = true,
}: DataSpecSelectorProps) {
	const [search, setSearch] = useState("");

	// 获取采集项列表（启用状态）
	const { data, isLoading } = useDataCollectionSpecList({
		pageSize: 100,
		isActive: "true",
		operationCode: operationCode || undefined,
	}, { enabled });

	const specs = data?.items ?? [];

	// 按工序分组
	const groupedSpecs = useMemo(() => {
		const searchLower = search.toLowerCase();
		const filtered = specs.filter((spec) => {
			if (!search) return true;
			return (
				spec.name.toLowerCase().includes(searchLower) ||
				spec.operationCode.toLowerCase().includes(searchLower) ||
				spec.operationName.toLowerCase().includes(searchLower)
			);
		});

		const groups = new Map<
			string,
			{ operationCode: string; operationName: string; specs: DataCollectionSpec[] }
		>();

		for (const spec of filtered) {
			const key = spec.operationCode;
			if (!groups.has(key)) {
				groups.set(key, {
					operationCode: spec.operationCode,
					operationName: spec.operationName,
					specs: [],
				});
			}
			const group = groups.get(key);
			if (group) {
				group.specs.push(spec);
			}
		}

		// 按工序代码排序
		return Array.from(groups.values()).sort((a, b) =>
			a.operationCode.localeCompare(b.operationCode),
		);
	}, [specs, search]);

	const handleToggle = (specId: string, checked: boolean) => {
		const next = new Set(value);
		if (checked) {
			next.add(specId);
		} else {
			next.delete(specId);
		}
		onChange(Array.from(next));
	};

	const selectedSet = new Set(value);

	if (!enabled) {
		return <div className="text-sm text-muted-foreground py-4 text-center">无权限查看采集项</div>;
	}

	if (isLoading) {
		return <div className="text-sm text-muted-foreground py-4 text-center">加载采集项...</div>;
	}

	if (specs.length === 0) {
		return (
			<div className="text-sm text-muted-foreground py-4 text-center">
				{operationCode ? `工序 ${operationCode} 暂无可用采集项` : "暂无可用采集项"}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* 搜索框 */}
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="搜索采集项名称或工序..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-8 h-8"
				/>
			</div>

			{/* 已选计数 */}
			{value.length > 0 && (
				<div className="text-xs text-muted-foreground">已选 {value.length} 项</div>
			)}

			{/* 分组列表 */}
			<div className="max-h-56 overflow-auto rounded-md border border-border">
				{groupedSpecs.length === 0 ? (
					<div className="text-sm text-muted-foreground py-4 text-center">无匹配结果</div>
				) : (
					groupedSpecs.map((group) => (
						<div key={group.operationCode}>
							{/* 工序标题 */}
							<div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
								{group.operationCode} · {group.operationName}
							</div>
							{/* 采集项列表 */}
							<div className="p-2 space-y-1">
								{group.specs.map((spec) => {
									const checked = selectedSet.has(spec.id);
									const checkboxId = `spec-${spec.id}`;
									return (
										<div key={spec.id} className="flex items-start gap-2 px-1 py-0.5">
											<Checkbox
												id={checkboxId}
												checked={checked}
												onCheckedChange={(val) => handleToggle(spec.id, Boolean(val))}
												className="mt-0.5"
											/>
											<label
												htmlFor={checkboxId}
												className="flex-1 cursor-pointer text-sm leading-tight"
											>
												<span className="font-medium">{spec.name}</span>
												<span className="ml-2 text-xs text-muted-foreground">
													{spec.itemType} · {spec.dataType}
													{spec.isRequired && <span className="text-destructive ml-1">*必填</span>}
												</span>
											</label>
										</div>
									);
								})}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
