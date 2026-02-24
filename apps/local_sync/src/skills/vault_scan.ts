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

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseFrontmatter(text: string): { frontmatter: string[]; body: string } {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: [], body: text };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }

  if (end === -1) {
    return { frontmatter: [], body: text };
  }

  return {
    frontmatter: lines.slice(1, end),
    body: lines.slice(end + 1).join("\n"),
  };
}

function cleanYamlScalar(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, "").trim();
}

function extractYamlStringList(frontmatterLines: string[], key: string): string[] {
  const out: string[] = [];
  const keyPattern = new RegExp(`^${key}:\\s*(.*)$`);
  for (let i = 0; i < frontmatterLines.length; i += 1) {
    const line = frontmatterLines[i] ?? "";
    const match = line.match(keyPattern);
    if (!match) continue;

    const rawValue = (match[1] ?? "").trim();
    if (!rawValue) {
      for (let j = i + 1; j < frontmatterLines.length; j += 1) {
        const listLine = frontmatterLines[j] ?? "";
        const itemMatch = listLine.match(/^\s*-\s+(.+)$/);
        if (!itemMatch) break;
        out.push(cleanYamlScalar(itemMatch[1] ?? ""));
      }
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const items = rawValue
        .slice(1, -1)
        .split(",")
        .map((item) => cleanYamlScalar(item))
        .filter(Boolean);
      out.push(...items);
      continue;
    }

    out.push(cleanYamlScalar(rawValue));
  }

  return unique(out);
}

export const vaultScanSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "vault_scan",
  async run(ctx, drafts) {
    const markdownFiles = await collectMarkdownFiles(ctx.config.vaultPath);
    const noteIndex = await Promise.all(
      markdownFiles.map(async (filePath) => {
        const fileText = await fs.readFile(filePath, "utf8");
        const { frontmatter, body } = parseFrontmatter(fileText);
        const title = path.basename(filePath, ".md");
        const inlineTags = extractTags(body);
        const frontmatterTags = extractYamlStringList(frontmatter, "tags").map((tag) =>
          tag.replace(/^#+/, ""),
        );
        const aliases = extractYamlStringList(frontmatter, "aliases");
        return {
          title,
          path: filePath,
          body,
          tags: unique([...inlineTags, ...frontmatterTags]),
          aliases,
        };
      }),
    );
    ctx.noteIndex = noteIndex;
    ctx.logger.info({ notes: noteIndex.length }, "vault_scan complete");
    return drafts;
  },
};
