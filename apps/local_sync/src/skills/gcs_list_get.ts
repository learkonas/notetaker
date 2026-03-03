import { z } from "zod";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";
import { isProcessed } from "./checkpoint.js";

const hyperlinkSchema = z.object({
  anchorText: z.string(),
  url: z.string(),
  normalizedUrl: z.string(),
  domain: z.string(),
});

const draftNoteSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
  internalDate: z.string(),
  from: z.string(),
  subject: z.string(),
  sourceUrl: z.string().optional(),
  emailText: z.string(),
  hyperlinks: z.array(hyperlinkSchema),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  analysis: z.string(),
  questions: z.array(z.string()),
  tags: z.array(z.string()),
  evidenceQuotes: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  qualityFlags: z.array(z.string()),
  contentHash: z.string(),
  pipelineVersion: z.string(),
  createdAt: z.string(),
});

export const gcsListGetSkill: Skill<LocalContext, void, LocalDraft[]> = {
  name: "gcs_list_get",
  async run(ctx) {
    const [files] = await ctx.clients.storage.bucket(ctx.config.bucket).getFiles({ prefix: "drafts/" });
    const draftFiles = files.filter((file) => file.name.endsWith(".json"));
    const drafts: LocalDraft[] = [];

    for (const file of draftFiles) {
      try {
        const [data] = await file.download();
        let raw: unknown;
        try {
          raw = JSON.parse(data.toString("utf8"));
        } catch (err) {
          ctx.logger.warn({ file: file.name, err }, "gcs_list_get: skipping file with invalid JSON");
          continue;
        }
        const result = draftNoteSchema.safeParse(raw);
        if (!result.success) {
          ctx.logger.warn(
            { file: file.name, errors: result.error.errors },
            "gcs_list_get: skipping file that failed schema validation",
          );
          continue;
        }
        const parsed = result.data;
        if (await isProcessed(ctx, parsed.messageId)) continue;
        drafts.push(parsed);
      } catch (err) {
        ctx.logger.error({ file: file.name, err }, "gcs_list_get: failed to download file; skipping");
      }
    }

    ctx.logger.info({ count: drafts.length }, "gcs_list_get complete");
    return drafts;
  },
};
