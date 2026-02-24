import { z } from "zod";

const envSchema = z.object({
  GCS_BUCKET: z.string().min(1),
  GMAIL_USER: z.string().default("me"),
  GMAIL_QUERY: z.string().default("in:inbox -label:ai-processed"),
  GMAIL_PROCESSED_LABEL: z.string().default("ai-processed"),
  GMAIL_CLIENT_ID: z.string().min(1),
  GMAIL_CLIENT_SECRET: z.string().min(1),
  GMAIL_REFRESH_TOKEN: z.string().min(1),
  PIPELINE_VERSION: z.string().default("0.1.0"),
  LLM_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  MAX_EMAILS_PER_RUN: z.coerce.number().int().min(1).max(500).default(25),
});

export function loadConfig() {
  const parsed = envSchema.parse(process.env);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartUnix = Math.floor(startOfToday.getTime() / 1000);
  return {
    bucket: parsed.GCS_BUCKET,
    gmailUser: parsed.GMAIL_USER,
    gmailQuery: parsed.GMAIL_QUERY.replace("{TODAY_START_UNIX}", String(todayStartUnix)),
    gmailProcessedLabel: parsed.GMAIL_PROCESSED_LABEL,
    gmailClientId: parsed.GMAIL_CLIENT_ID,
    gmailClientSecret: parsed.GMAIL_CLIENT_SECRET,
    gmailRefreshToken: parsed.GMAIL_REFRESH_TOKEN,
    pipelineVersion: parsed.PIPELINE_VERSION,
    llmProvider: parsed.LLM_PROVIDER,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiModel: parsed.OPENAI_MODEL,
    maxEmailsPerRun: parsed.MAX_EMAILS_PER_RUN,
  };
}
