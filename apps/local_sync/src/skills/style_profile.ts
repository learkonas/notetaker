import fs from "node:fs/promises";
import path from "node:path";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft, StyleProfile } from "../lib/types.js";

async function listMarkdown(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dirPath, entry.name));
}

function parseSections(content: string): string[] {
  return Array.from(content.matchAll(/^##\s+(.+)$/gm)).map((m) => (m[1] ?? "").trim());
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
    const allSections = contents.flatMap(parseSections);
    const avgLength = contents.length
      ? contents.reduce((sum, text) => sum + text.length, 0) / contents.length
      : 2000;
    const avgBullets = contents.length
      ? contents.reduce((sum, text) => sum + (text.match(/^\s*-\s+/gm)?.length ?? 0), 0) /
        contents.length
      : 8;

    const profile: StyleProfile = {
      requiredSections: Array.from(new Set(allSections)).slice(0, 8),
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
