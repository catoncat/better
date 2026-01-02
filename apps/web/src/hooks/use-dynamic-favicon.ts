import { useEffect, useRef } from "react";

/**
 * 动态 Favicon Hook - 优化版
 */
export function useDynamicFavicon() {
	const frameRef = useRef<number>(0);

	useEffect(() => {
		// 1. 监听系统主题 (不依赖 App 内主题)
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		let isDark = mediaQuery.matches;

		const handleThemeChange = (e: MediaQueryListEvent) => {
			isDark = e.matches;
		};
		mediaQuery.addEventListener("change", handleThemeChange);

		// 2. 初始化 Canvas
		const canvas = document.createElement("canvas");
		canvas.width = 32;
		canvas.height = 32;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const faviconLinks = Array.from(
			document.querySelectorAll("link[rel*='icon']"),
		) as HTMLLinkElement[];
		if (faviconLinks.length === 0) {
			const link = document.createElement("link");
			link.rel = "icon";
			document.head.appendChild(link);
			faviconLinks.push(link);
		}

		const animate = (time: number) => {
			ctx.clearRect(0, 0, 32, 32);

			// 配色
			const bgShell = isDark ? "#1e293b" : "#334155";
			const bgWindow = isDark ? "#0f172a" : "#f1f5f9";
			const colorPending = "#94a3b8"; // 灰
			const colorBusy = "#f59e0b"; // 琥珀
			const colorDone = "#22c55e"; // 绿

			// 节奏控制
			const CYCLE_TIME = 2200;
			const MOVE_TIME = 900;
			const globalT = time % CYCLE_TIME;
			const isMoving = globalT < MOVE_TIME;
			const moveProgress = isMoving ? (globalT / MOVE_TIME) * (2 - globalT / MOVE_TIME) : 1;

			// 1. 绘制机器外壳
			ctx.fillStyle = bgShell;
			if (ctx.roundRect) {
				ctx.beginPath();
				ctx.roundRect(0, 0, 32, 32, 6);
				ctx.fill();
			} else {
				ctx.fillRect(0, 0, 32, 32);
			}

			// 2. 绘制顶部宽体状态条 (The Visor)
			const barH = 5;
			const barW = 24;
			const barX = (32 - barW) / 2;
			const barY = 4;
			let barColor = isMoving ? colorBusy : colorDone;

			if (!isMoving) {
				// 闪烁一下白，表示"加工完成"
				const processT = globalT - MOVE_TIME;
				if (processT > 200 && processT < 400) barColor = "#ffffff";
			}

			ctx.fillStyle = barColor;
			if (ctx.roundRect) {
				ctx.beginPath();
				ctx.roundRect(barX, barY, barW, barH, 2);
				ctx.fill();
			} else {
				ctx.fillRect(barX, barY, barW, barH);
			}

			// 3. 绘制视窗 (Clipping)
			const winX = 4;
			const winY = 12;
			const winW = 24;
			const winH = 16;
			ctx.fillStyle = bgWindow;
			ctx.fillRect(winX, winY, winW, winH);

			ctx.save();
			ctx.beginPath();
			ctx.rect(winX, winY, winW, winH);
			ctx.clip();

			// 4. 绘制物品 (多形状)
			const ITEM_SIZE = 11; // 稍微调大1px以看清形状
			const SPACING = 24;
			const CENTER_X = 16;
			const TRACK_Y = winY + winH - 2;

			for (let i = -1; i <= 1; i++) {
				const cycleCount = Math.floor(time / CYCLE_TIME);
				const itemId = cycleCount - i;

				// 形状切换: 0=方, 1=圆, 2=三角
				const shapeType = Math.abs(itemId) % 3;

				const offset = (moveProgress - 1) * SPACING;
				const x = CENTER_X + i * SPACING + offset;
				let y = TRACK_Y - ITEM_SIZE / 2;

				let color = colorPending;

				// 中间物品逻辑
				if (i === 0 && !isMoving) {
					const processP = (globalT - MOVE_TIME) / (CYCLE_TIME - MOVE_TIME);
					if (processP > 0.3) color = colorDone;

					// 跳动效果
					if (processP > 0.3 && processP < 0.6) {
						y -= Math.sin((processP - 0.3) * 10) * 2;
					}
				} else if (i > 0) {
					color = colorDone;
				}

				ctx.fillStyle = color;
				ctx.translate(x, y);

				// --- 形状绘制 ---
				const r = ITEM_SIZE / 2;
				if (shapeType === 0) {
					// 圆角方块
					if (ctx.roundRect) {
						ctx.beginPath();
						ctx.roundRect(-r, -r, ITEM_SIZE, ITEM_SIZE, 3);
						ctx.fill();
					} else {
						ctx.fillRect(-r, -r, ITEM_SIZE, ITEM_SIZE);
					}
				} else if (shapeType === 1) {
					// 圆形
					ctx.beginPath();
					ctx.arc(0, 0, r, 0, Math.PI * 2);
					ctx.fill();
				} else {
					// 三角形 (稍微加宽底座)
					ctx.beginPath();
					ctx.moveTo(0, -r);
					ctx.lineTo(r, r);
					ctx.lineTo(-r, r);
					ctx.fill();
				}

				ctx.translate(-x, -y);
			}

			ctx.restore();

			// 5. 装饰线
			ctx.fillStyle = "rgba(255,255,255,0.1)";
			ctx.fillRect(winX, winY, winW, 2);

			// 3. 更新 Favicon
			const dataUrl = canvas.toDataURL("image/png");
			for (const link of faviconLinks) {
				link.href = dataUrl;
			}

			frameRef.current = requestAnimationFrame(animate);
		};

		frameRef.current = requestAnimationFrame(animate);

		return () => {
			mediaQuery.removeEventListener("change", handleThemeChange);
			if (frameRef.current) cancelAnimationFrame(frameRef.current);
		};
	}, []);
}
