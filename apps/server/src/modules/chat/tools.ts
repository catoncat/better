/**
 * Tool definitions for the AI chat assistant
 * Allows the AI to query the codebase for accurate information
 */

import fs from "node:fs";
import path from "node:path";
import type OpenAI from "openai";

// Project root directory
// Use import.meta.dir (Bun-specific) to get this file's directory, then go up to project root
// This file is at: apps/server/src/modules/chat/tools.ts
// Project root is 5 levels up: ../../../../../../ or we can detect via package.json
function getProjectRoot(): string {
	// Try to find project root by looking for root package.json with "workspaces"
	let dir = path.dirname(import.meta.dir || process.cwd());
	for (let i = 0; i < 10; i++) {
		const pkgPath = path.join(dir, "package.json");
		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
				if (pkg.workspaces) {
					return dir; // Found monorepo root
				}
			} catch {
				// Continue searching
			}
		}
		const parent = path.dirname(dir);
		if (parent === dir) break; // Reached filesystem root
		dir = parent;
	}
	// Fallback: assume cwd is apps/server
	return path.resolve(process.cwd(), "../..");
}

function getConfiguredProjectRoot(): string {
	const envRoot = process.env.CHAT_REPO_ROOT;
	if (envRoot) return path.resolve(envRoot);
	return getProjectRoot();
}

const PROJECT_ROOT = getConfiguredProjectRoot();
const isChatDebugEnabled = process.env.NODE_ENV !== "production";
if (isChatDebugEnabled) {
	console.log("[Chat Tools] PROJECT_ROOT:", PROJECT_ROOT);
}

/**
 * Tool definitions for OpenAI function calling
 */
export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "read_file",
			description:
				"读取项目仓库中的文件内容。用于查看文档、代码、配置等。支持读取 markdown、typescript、json 等文件。",
			parameters: {
				type: "object",
				properties: {
					file_path: {
						type: "string",
						description:
							"相对于项目根目录的文件路径。例如：user_docs/demo/guide.md、apps/web/src/routes/_authenticated/mes/runs/index.tsx",
					},
				},
				required: ["file_path"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "list_directory",
			description: "列出目录中的文件和子目录。用于探索项目结构，了解有哪些文件可以查看。",
			parameters: {
				type: "object",
				properties: {
					dir_path: {
						type: "string",
						description: "相对于项目根目录的目录路径。例如：domain_docs/mes/、apps/web/src/routes/",
					},
				},
				required: ["dir_path"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "search_code",
			description:
				"在代码库中搜索包含特定文本的文件。用于查找特定功能的实现位置、错误码定义、状态常量等。",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "要搜索的文本或代码片段。例如：RUN_NOT_AUTHORIZED、TrackIn、上料验证",
					},
					file_pattern: {
						type: "string",
						description: "可选的文件名模式过滤。例如：*.ts、*.md、*.tsx",
					},
				},
				required: ["query"],
			},
		},
	},
];

/**
 * Allowed directories for security
 */
const ALLOWED_PREFIXES = [
	"user_docs/",
	"domain_docs/",
	"agent_docs/",
	"apps/web/src/",
	"apps/server/src/",
	"packages/",
];

/**
 * Check if a path is allowed to be accessed
 */
function isPathAllowed(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, "/");
	// Prevent path traversal
	if (normalized.includes("..")) return false;
	// Check allowed prefixes
	return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Execute a tool call and return the result
 */
export async function executeTool(
	toolName: string,
	args: Record<string, unknown>,
): Promise<string> {
	try {
		switch (toolName) {
			case "read_file":
				return await readFile(args.file_path as string);
			case "list_directory":
				return await listDirectory(args.dir_path as string);
			case "search_code":
				return await searchCode(args.query as string, args.file_pattern as string | undefined);
			default:
				return `未知工具: ${toolName}`;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return `工具执行错误: ${message}`;
	}
}

/**
 * Read a file from the repository
 */
async function readFile(filePath: string): Promise<string> {
	if (!filePath) {
		return "错误: 请提供文件路径";
	}

	if (!isPathAllowed(filePath)) {
		return `错误: 不允许访问该路径。只能访问以下目录: ${ALLOWED_PREFIXES.join(", ")}`;
	}

	const fullPath = path.join(PROJECT_ROOT, filePath);

	if (!fs.existsSync(fullPath)) {
		return `错误: 文件不存在: ${filePath}`;
	}

	const stat = fs.statSync(fullPath);
	if (stat.isDirectory()) {
		return `错误: 这是一个目录，请使用 list_directory 工具`;
	}

	// Limit file size to prevent huge responses
	const MAX_SIZE = 50000; // 50KB
	if (stat.size > MAX_SIZE) {
		const content = fs.readFileSync(fullPath, "utf-8").slice(0, MAX_SIZE);
		return `${content}\n\n... (文件过大，仅显示前 ${MAX_SIZE} 字符)`;
	}

	return fs.readFileSync(fullPath, "utf-8");
}

/**
 * List contents of a directory
 */
async function listDirectory(dirPath: string): Promise<string> {
	if (!dirPath) {
		return "错误: 请提供目录路径";
	}

	if (!isPathAllowed(dirPath)) {
		return `错误: 不允许访问该路径。只能访问以下目录: ${ALLOWED_PREFIXES.join(", ")}`;
	}

	const fullPath = path.join(PROJECT_ROOT, dirPath);

	if (!fs.existsSync(fullPath)) {
		return `错误: 目录不存在: ${dirPath}`;
	}

	const stat = fs.statSync(fullPath);
	if (!stat.isDirectory()) {
		return `错误: 这是一个文件，请使用 read_file 工具`;
	}

	const entries = fs.readdirSync(fullPath, { withFileTypes: true });
	const result: string[] = [`目录: ${dirPath}\n`];

	for (const entry of entries) {
		const icon = entry.isDirectory() ? "📁" : "📄";
		result.push(`${icon} ${entry.name}`);
	}

	return result.join("\n");
}

/**
 * Search for text in the codebase
 */
async function searchCode(query: string, filePattern?: string): Promise<string> {
	if (!query) {
		return "错误: 请提供搜索关键词";
	}

	const results: string[] = [];
	const MAX_RESULTS = 20;

	function searchInDir(dir: string, relativePath: string) {
		if (results.length >= MAX_RESULTS) return;

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (results.length >= MAX_RESULTS) break;

				const fullPath = path.join(dir, entry.name);
				const relPath = path.join(relativePath, entry.name).replace(/\\/g, "/");

				if (entry.isDirectory()) {
					// Skip node_modules and other irrelevant dirs
					if (
						entry.name === "node_modules" ||
						entry.name === ".git" ||
						entry.name === "dist" ||
						entry.name === "build"
					) {
						continue;
					}
					searchInDir(fullPath, relPath);
				} else {
					// Check file pattern
					if (filePattern) {
						const pattern = filePattern.replace("*", ".*");
						if (!new RegExp(pattern).test(entry.name)) continue;
					}

					// Only search text files
					const ext = path.extname(entry.name).toLowerCase();
					if (![".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".prisma"].includes(ext)) {
						continue;
					}

					try {
						const content = fs.readFileSync(fullPath, "utf-8");
						if (content.includes(query)) {
							// Find the line containing the query
							const lines = content.split("\n");
							for (let i = 0; i < lines.length; i++) {
								const line = lines[i];
								if (line?.includes(query)) {
									results.push(`📄 ${relPath}:${i + 1}\n   ${line.trim().slice(0, 100)}`);
									if (results.length >= MAX_RESULTS) break;
								}
							}
						}
					} catch {
						// Skip unreadable files
					}
				}
			}
		} catch {
			// Skip unreadable directories
		}
	}

	// Search in allowed directories
	for (const prefix of ALLOWED_PREFIXES) {
		const searchDir = path.join(PROJECT_ROOT, prefix);
		if (fs.existsSync(searchDir)) {
			searchInDir(searchDir, prefix);
		}
	}

	if (results.length === 0) {
		return `未找到包含 "${query}" 的文件`;
	}

	return `搜索结果 (共 ${results.length} 处匹配):\n\n${results.join("\n\n")}`;
}
