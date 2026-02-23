import fs from "node:fs/promises";
import path from "node:path";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractTags(text: string): string[] {
  return Array.from(text.matchAll(/(^|\s)#([a-zA-Z0-9/_-]+)/g)).map((m) => m[2] ?? "");
}

export const vaultScanSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "vault_scan",
  async run(ctx, drafts) {
    const markdownFiles = await collectMarkdownFiles(ctx.config.vaultPath);
    const noteIndex = await Promise.all(
      markdownFiles.map(async (filePath) => {
        const body = await fs.readFile(filePath, "utf8");
        const title = path.basename(filePath, ".md");
        return { title, path: filePath, body, tags: extractTags(body) };
      }),
    );
    ctx.noteIndex = noteIndex;
    ctx.logger.info({ notes: noteIndex.length }, "vault_scan complete");
    return drafts;
  },
};
