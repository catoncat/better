import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";

export const Route = createFileRoute("/_authenticated/system/test-upload")({
	component: TestUploadPage,
});

function TestUploadPage() {
	const [images, setImages] = useState<string[]>([]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">图像优化测试</h1>
				<p className="text-muted-foreground">
					演示双层图像压缩方案（Canvas 前端压缩 + Jimp 后端处理）。
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>上传区域</CardTitle>
					<CardDescription>上传一张 3MB+ 的大图，前端会自动压缩至 ~100KB。</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<ImageUpload value={images} onChange={setImages} maxFiles={6} />

						{images.length > 0 && (
							<div className="mt-8 space-y-4 border-t pt-6">
								<h3 className="text-lg font-medium">缩略图生成演示</h3>
								<p className="text-sm text-muted-foreground">
									下面展示的是带参数的缩略图 (?w=200)，由后端动态生成并缓存。
								</p>
								<div className="flex flex-wrap gap-4">
									{images.map((url) => (
										<div key={url} className="space-y-2">
											<div className="w-[200px] h-[200px] rounded-lg overflow-hidden border bg-muted">
												<img
													src={`${url}${url.includes("?") ? "&" : "?"}w=200`}
													alt="Thumbnail"
													className="w-full h-full object-cover"
												/>
											</div>
											<p className="text-[10px] text-center text-muted-foreground truncate w-[200px]">
												?w=200 (Auto Cache)
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
