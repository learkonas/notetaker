import fs from "node:fs/promises";
import path from "node:path";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft, StyleProfile } from "../lib/types.js";

async function listMarkdown(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdown(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseSections(content: string): string[] {
  return Array.from(content.matchAll(/^##\s+(.+)$/gm)).map((m) => (m[1] ?? "").trim());
}

function pickRequiredSections(contents: string[]): string[] {
  const counts = new Map<string, number>();
  for (const text of contents) {
    const seenInDoc = new Set<string>();
    for (const section of parseSections(text)) {
      // Skip pathological headings that are usually accidental paste artifacts.
      if (!section || section.length > 80) continue;
      if (seenInDoc.has(section)) continue;
      seenInDoc.add(section);
      counts.set(section, (counts.get(section) ?? 0) + 1);
    }
  }

  const ranked = Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([section]) => section)
    .slice(0, 8);

  const defaults = ["TL;DR", "Key Ideas", "Analysis", "Questions"];
  if (ranked.length === 0) return defaults;
  const merged = [...ranked];
  for (const section of defaults) {
    if (!merged.includes(section)) merged.push(section);
    if (merged.length >= 8) break;
  }
  return merged.slice(0, 8);
}

export const styleProfileSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "style_profile",
  async run(ctx, drafts) {
    const sampleDir = path.isAbsolute(ctx.config.styleSamplePath)
      ? ctx.config.styleSamplePath
      : path.join(process.cwd(), ctx.config.styleSamplePath);
    const fallbackSampleDir = path.join(process.cwd(), "..", "..", ctx.config.styleSamplePath);
    let sampleFiles: string[] = [];
    try {
      sampleFiles = await listMarkdown(sampleDir);
    } catch {
      try {
        sampleFiles = await listMarkdown(fallbackSampleDir);
      } catch {
        ctx.logger.warn({ sampleDir, fallbackSampleDir }, "style sample folder not found; using defaults");
      }
    }

    const contents = await Promise.all(sampleFiles.map((file) => fs.readFile(file, "utf8")));
    const avgLength = contents.length
      ? contents.reduce((sum, text) => sum + text.length, 0) / contents.length
      : 2000;
    const avgBullets = contents.length
      ? contents.reduce((sum, text) => sum + (text.match(/^\s*-\s+/gm)?.length ?? 0), 0) /
        contents.length
      : 8;

    const profile: StyleProfile = {
      requiredSections: pickRequiredSections(contents),
      avgLength,
      avgBullets,
      preferredTagPrefix: "#",
    };
    ctx.styleProfile = profile;
    await fs.mkdir(path.join(process.cwd(), "shared/style"), { recursive: true });
    await fs.writeFile(
      path.join(process.cwd(), "shared/style/style_profile.json"),
      JSON.stringify(profile, null, 2),
      "utf8",
    );
    ctx.logger.info({ sampleFiles: sampleFiles.length }, "style_profile complete");
    return drafts;
  },
};
