import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function usage(): never {
  console.error("Usage: bun scripts/conversation-new.ts <topic>");
  process.exit(1);
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  return `${year}-${month}-${day}_${hour}${minute}${second}`;
}

function slugify(input: string): string {
  const cleaned = input
    .trim()
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 64);

  return cleaned.length > 0 ? cleaned : "note";
}

const topicRaw = process.argv.slice(2).join(" ").replaceAll(/\s+/g, " ").trim();
if (!topicRaw) usage();

const repoRoot = process.cwd();
const conversationDir = path.join(repoRoot, "conversation");
mkdirSync(conversationDir, { recursive: true });

const timestamp = formatTimestamp(new Date());
const slug = slugify(topicRaw);
const baseName = `${timestamp}_${slug}`;

let counter = 0;
while (true) {
  const suffix = counter === 0 ? "" : `_${counter}`;
  const fileName = `${baseName}${suffix}.md`;
  const outPath = path.join(conversationDir, fileName);

  if (!existsSync(outPath)) {
    const content = [
      `# ${topicRaw}`,
      "",
      "## Context",
      "-",
      "",
      "## Decisions",
      "-",
      "",
      "## Plan",
      "-",
      "",
      "## Findings",
      "-",
      "",
      "## Progress",
      "-",
      "",
      "## Errors",
      "-",
      "",
      "## Open Questions",
      "-",
      "",
      "## References",
      "-",
      "",
    ].join("\n");

    writeFileSync(outPath, content, { encoding: "utf8", flag: "wx" });
    console.log(outPath);
    break;
  }

  counter += 1;
}
