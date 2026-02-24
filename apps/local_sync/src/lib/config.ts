import { z } from "zod";

const envSchema = z.object({
  GCS_BUCKET: z.string().min(1),
  OBSIDIAN_VAULT_PATH: z.string().min(1),
  INBOX_FOLDER: z.string().default("Inbox Notes"),
  REVIEW_FOLDER: z.string().default("Inbox Notes/Needs Review"),
  STYLE_SAMPLE_PATH: z.string().default("Example notes"),
  PIPELINE_VERSION: z.string().default("0.1.0"),
  RETAIN_DRAFT_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
});

export function loadConfig() {
  const parsed = envSchema.parse(process.env);
  return {
    bucket: parsed.GCS_BUCKET,
    vaultPath: parsed.OBSIDIAN_VAULT_PATH,
    inboxFolder: parsed.INBOX_FOLDER,
    reviewFolder: parsed.REVIEW_FOLDER,
    styleSamplePath: parsed.STYLE_SAMPLE_PATH,
    pipelineVersion: parsed.PIPELINE_VERSION,
    retainDraftDays: parsed.RETAIN_DRAFT_DAYS,
  };
}
