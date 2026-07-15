import { z } from "zod";

const envSchema = z.object({
  GCS_BUCKET: z.string().min(1),
  INBOX_API_URL: z.string().url().default("https://inbox.leonasskau.com"),
  INBOX_MAILBOX: z.string().email().default("notetaker@leonasskau.com"),
  INBOX_PROCESSED_FOLDER: z.string().default("ai-processed"),
  CF_ACCESS_CLIENT_ID: z.string().min(1),
  CF_ACCESS_CLIENT_SECRET: z.string().min(1),
  PIPELINE_VERSION: z.string().default("0.1.0"),
  LLM_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  MAX_EMAILS_PER_RUN: z.coerce.number().int().min(1).max(100).default(25),
});

export function loadConfig() {
  const parsed = envSchema.parse(process.env);
  return {
    bucket: parsed.GCS_BUCKET,
    inboxApiUrl: parsed.INBOX_API_URL,
    inboxMailbox: parsed.INBOX_MAILBOX,
    inboxProcessedFolder: parsed.INBOX_PROCESSED_FOLDER,
    cfAccessClientId: parsed.CF_ACCESS_CLIENT_ID,
    cfAccessClientSecret: parsed.CF_ACCESS_CLIENT_SECRET,
    pipelineVersion: parsed.PIPELINE_VERSION,
    llmProvider: parsed.LLM_PROVIDER,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiModel: parsed.OPENAI_MODEL,
    maxEmailsPerRun: parsed.MAX_EMAILS_PER_RUN,
  };
}
