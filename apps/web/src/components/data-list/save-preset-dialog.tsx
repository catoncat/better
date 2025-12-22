import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavePresetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string) => void;
	defaultName?: string;
}

export function SavePresetDialog({
	open,
	onOpenChange,
	onSave,
	defaultName,
}: SavePresetDialogProps) {
	const [name, setName] = useState("");

	// Set default name when dialog opens
	useEffect(() => {
		if (open && defaultName) {
			setName(defaultName);
		}
	}, [open, defaultName]);

	const handleSave = () => {
		if (name.trim()) {
			onSave(name.trim());
			setName("");
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setName("");
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>保存查询</DialogTitle>
				</DialogHeader>
				<DialogBody className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="preset-name">预设名称</Label>
						<Input
							id="preset-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="输入预设名称"
							onKeyDown={(e) => {
								if (e.key === "Enter" && name.trim()) {
									handleSave();
								}
							}}
							autoFocus
						/>
						<p className="text-xs text-muted-foreground">如果名称已存在，将覆盖原有预设</p>
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						取消
					</Button>
					<Button onClick={handleSave} disabled={!name.trim()}>
						保存
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
