import { ImagePlus, Loader2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { client } from "@/lib/eden";

/**
 * 客户端图片压缩工具
 */
async function compressImage(file: File, maxWidth = 1024, quality = 0.5): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = (e) => {
			const img = new Image();
			img.src = e.target?.result as string;
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;

				// 如果宽度超过限制，按比例缩放
				if (width > maxWidth) {
					height = (height * maxWidth) / width;
					width = maxWidth;
				}

				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				ctx?.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (blob) resolve(blob);
						else reject(new Error("Canvas toBlob failed"));
					},
					"image/jpeg",
					quality,
				);
			};
			img.onerror = reject;
		};
		reader.onerror = reject;
	});
}

interface ImageUploadProps {
	value?: string[];
	onChange: (value: string[]) => void;
	disabled?: boolean;
	maxFiles?: number;
	accept?: string;
	allowedMimeTypes?: string[];
	maxFileSizeMB?: number | null;
}

export function ImageUpload({
	value = [],
	onChange,
	disabled,
	maxFiles = 5,
	accept = "image/*",
	allowedMimeTypes,
	maxFileSizeMB = 5,
}: ImageUploadProps) {
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = React.useState(false);
	const [previewOpen, setPreviewOpen] = React.useState(false);
	const [previewIndex, setPreviewIndex] = React.useState(0);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		let filesToUpload = Array.from(files).slice(0, maxFiles - value.length);
		if (filesToUpload.length === 0) {
			toast.warning("已达到最大上传数量");
			return;
		}

		const maxFileBytes = maxFileSizeMB && maxFileSizeMB > 0 ? maxFileSizeMB * 1024 * 1024 : null;
		if (maxFileBytes) {
			const filteredFiles = filesToUpload.filter((file) => file.size <= maxFileBytes);
			if (filteredFiles.length !== filesToUpload.length) {
				toast.error(`单个文件大小不能超过 ${maxFileSizeMB}MB`);
			}
			filesToUpload = filteredFiles;
			if (filesToUpload.length === 0) return;
		}

		const allowedTypes = allowedMimeTypes?.map((type) => type.toLowerCase()) ?? [];
		if (
			allowedTypes.length > 0 &&
			filesToUpload.some((file) => !allowedTypes.includes(file.type.toLowerCase()))
		) {
			toast.error("仅支持 JPG/PNG 格式");
			return;
		}

		setUploading(true);

		try {
			const uploadPromises = filesToUpload.map(async (file) => {
				// 1. 尝试前端压缩
				let fileToProcess: File | Blob = file;
				try {
					if (file.type.startsWith("image/")) {
						const compressedBlob = await compressImage(file);
						fileToProcess = new File([compressedBlob], file.name, {
							type: "image/jpeg",
						});
					}
				} catch (compressError) {
					console.warn("图片压缩失败，将上传原图:", compressError);
				}

				// 2. 尝试上传到服务器
				try {
					const response = await client.api.system.upload.post({
						file: fileToProcess as File,
					});

					// 适配 better 项目的后端包装格式 { ok: true, data: { url: "..." } }
					const result = response.data as
						| { ok: true; data: { url: string } }
						| { ok: false; error?: { message?: string } }
						| null;

					if (response.error || !result?.ok || !result?.data?.url) {
						const errorValue = response.error?.value;
						const errorMessage = (() => {
							if (errorValue && typeof errorValue === "object") {
								if ("error" in errorValue) {
									const nested = (errorValue as { error?: { message?: string } }).error;
									if (nested?.message) return nested.message;
								}
								if ("message" in errorValue) {
									const message = (errorValue as { message?: unknown }).message;
									if (typeof message === "string") return message;
								}
							}
							return result?.ok === false ? result.error?.message : undefined;
						})();
						throw new Error(errorMessage);
					}

					// Use server URL
					const baseUrl =
						import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "") || window.location.origin;
					return baseUrl + result.data.url;
				} catch (uploadError) {
					console.error("服务器上传失败:", uploadError);
					throw uploadError;
				}
			});

			const newImages = await Promise.all(uploadPromises);
			const updatedImages = [...value, ...newImages].slice(0, maxFiles);
			onChange(updatedImages);
			toast.success(`成功上传 ${newImages.length} 张图片`);
		} catch (error) {
			console.error("图片上传失败:", error);
			toast.error("图片上传失败", {
				description: error instanceof Error ? error.message : "未知错误",
			});
		} finally {
			setUploading(false);
			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleRemove = (index: number) => {
		const newValue = [...value];
		newValue.splice(index, 1);
		onChange(newValue);
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-4">
				{value.map((url, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Simple list of images
						key={`${url}-${index}`}
						className="relative w-[100px] h-[100px] rounded-md overflow-hidden border"
					>
						<button
							type="button"
							className="h-full w-full"
							onClick={() => {
								setPreviewIndex(index);
								setPreviewOpen(true);
							}}
							disabled={disabled}
						>
							<img src={url} alt="Upload" className="object-cover w-full h-full" />
						</button>
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								handleRemove(index);
							}}
							className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-md hover:bg-red-600 transition-colors"
							disabled={disabled}
						>
							<X className="h-3 w-3" />
						</button>
					</div>
				))}
				{value.length < maxFiles && (
					<Button
						type="button"
						variant="outline"
						className="w-[100px] h-[100px] border-dashed flex flex-col gap-2"
						onClick={() => fileInputRef.current?.click()}
						disabled={disabled || uploading}
					>
						{uploading ? (
							<Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
						) : (
							<ImagePlus className="h-6 w-6 text-muted-foreground" />
						)}
						<span className="text-xs text-muted-foreground">
							{uploading ? "上传中..." : "上传图片"}
						</span>
					</Button>
				)}
			</div>
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept={accept}
				multiple
				onChange={handleFileSelect}
				disabled={disabled}
			/>
			<ImagePreviewDialog
				images={value}
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				initialIndex={previewIndex}
			/>
		</div>
	);
}
