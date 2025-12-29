import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type * as React from "react";

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

 /**
  * 增强版的 useTheme
  * 支持 View Transitions API 的圆圈扩散效果
  */
 export function useTheme() {
 	const { setTheme, ...rest } = useNextTheme();
 
 	const setThemeWithTransition = (theme: string, _event?: React.MouseEvent | MouseEvent) => {
 		// 如果浏览器不支持 View Transition API，直接切换
 		if (typeof document.startViewTransition !== "function") {
 			setTheme(theme);
 			return;
 		}
 
 		const transition = document.startViewTransition(() => {
 			setTheme(theme);
 		});
 
 		transition.ready.then(() => {
 			// 真正的对角线扫抹：
 			// 利用一个巨大的三角形，其斜边作为扫抹的对角线
 			document.documentElement.animate(
 				{
 					clipPath: [
 						"polygon(0 100%, 0 100%, 0 100%)", // 起点：左下角的一个点
 						"polygon(0 100%, 0 -150%, 250% 100%)", // 终点：巨大的三角形，确保斜边扫过右上角并覆盖全屏
 					],
 				},
 				{
 					duration: 600,
 					easing: "cubic-bezier(0.25, 1, 0.5, 1)", // 更加丝滑的减速曲线
 					pseudoElement: "::view-transition-new(root)",
 				},
 			);
 		});
 	};
 
 	return { ...rest, setTheme: setThemeWithTransition };
 }
