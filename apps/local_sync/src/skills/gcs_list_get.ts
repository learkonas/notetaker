import type { Skill } from "../lib/skill.js";
import type { DraftNote, LocalContext, LocalDraft } from "../lib/types.js";
import { isProcessed } from "./checkpoint.js";

type GcsFile = {
  name: string;
  download: () => Promise<[Buffer]>;
};

// The LLM occasionally returns `analysis` as a structured object instead of
// the expected string; flatten it so downstream skills can treat it as prose.
function normalizeAnalysis(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAnalysis(item)).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const text = normalizeAnalysis(entry);
        return text ? `${key}: ${text}` : "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return String(value);
}

export const gcsListGetSkill: Skill<LocalContext, void, LocalDraft[]> = {
  name: "gcs_list_get",
  async run(ctx) {
    const storage = ctx.clients.storage as {
      bucket: (bucketName: string) => {
        getFiles: (args: { prefix: string }) => Promise<[GcsFile[]]>;
      };
    };
    const [files] = await storage.bucket(ctx.config.bucket).getFiles({ prefix: "drafts/" });
    const draftFiles = files.filter((file) => file.name.endsWith(".json"));
    const drafts: LocalDraft[] = [];

    for (const file of draftFiles) {
      const [data] = await file.download();
      const parsed = JSON.parse(data.toString("utf8")) as DraftNote;
      parsed.analysis = normalizeAnalysis(parsed.analysis);
      if (await isProcessed(ctx, parsed.messageId)) continue;
      drafts.push(parsed);
    }

    ctx.logger.info({ count: drafts.length }, "gcs_list_get complete");
    return drafts;
  },
};
