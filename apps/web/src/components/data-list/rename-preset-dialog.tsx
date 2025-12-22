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

interface RenamePresetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRename: (newName: string) => void;
	currentName: string;
}

export function RenamePresetDialog({
	open,
	onOpenChange,
	onRename,
	currentName,
}: RenamePresetDialogProps) {
	const [name, setName] = useState(currentName);

	useEffect(() => {
		if (open) {
			setName(currentName);
		}
	}, [open, currentName]);

	const handleRename = () => {
		if (name.trim() && name.trim() !== currentName) {
			onRename(name.trim());
			onOpenChange(false);
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setName(currentName);
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>重命名预设</DialogTitle>
				</DialogHeader>
				<DialogBody className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="preset-rename">预设名称</Label>
						<Input
							id="preset-rename"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="输入新名称"
							onKeyDown={(e) => {
								if (e.key === "Enter" && name.trim()) {
									handleRename();
								}
							}}
							autoFocus
						/>
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						取消
					</Button>
					<Button onClick={handleRename} disabled={!name.trim() || name.trim() === currentName}>
						确定
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
