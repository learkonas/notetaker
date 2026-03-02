import path from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import { google } from "googleapis";
import { loadConfig } from "./lib/config.js";
import { buildLogger } from "./lib/log.js";
import { runPipeline } from "./lib/skill.js";
import type { CloudContext, GmailClient, StorageClient } from "./lib/types.js";
import { extractLinksSkill } from "./skills/extract_links.js";
import { gcsPutSkill } from "./skills/gcs_put.js";
import { gmailGetSkill } from "./skills/gmail_get.js";
import { gmailListSkill } from "./skills/gmail_list.js";
import { gmailMarkProcessedSkill } from "./skills/gmail_mark_processed.js";
import { parseEmailSkill } from "./skills/parse_email.js";
import { renderDraftSkill } from "./skills/render_draft.js";
import { summarizeSkill } from "./skills/summarize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const config = loadConfig();
  const logger = buildLogger();
  const oauth2 = new google.auth.OAuth2(config.gmailClientId, config.gmailClientSecret);
  oauth2.setCredentials({ refresh_token: config.gmailRefreshToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const storage = new Storage();

  const ctx: CloudContext = {
    config,
    logger,
    clients: { gmail: gmail as unknown as GmailClient, storage: storage as unknown as StorageClient },
  };

  logger.info({ query: config.gmailQuery, maxEmailsPerRun: config.maxEmailsPerRun }, "cloud job started");

  const refs = await gmailListSkill.run(ctx, undefined);
  if (refs.length === 0) {
    logger.info({}, "no messages to process");
    return;
  }

  const finalResult = await runPipeline(ctx, [
    gmailGetSkill,
    parseEmailSkill,
    extractLinksSkill,
    summarizeSkill,
    renderDraftSkill,
    gcsPutSkill,
    gmailMarkProcessedSkill,
  ], refs);

  logger.info({ processed: Array.isArray(finalResult) ? finalResult.length : 0 }, "cloud job complete");
}

main().catch((error) => {
  // Cloud Run will mark this run as failed.
  console.error(error);
  process.exitCode = 1;
});
