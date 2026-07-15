import path from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import { loadConfig } from "./lib/config.js";
import { createInboxClient } from "./lib/inbox.js";
import { buildLogger } from "./lib/log.js";
import { runPipeline } from "./lib/skill.js";
import type { CloudContext } from "./lib/types.js";
import { extractLinksSkill } from "./skills/extract_links.js";
import { gcsPutSkill } from "./skills/gcs_put.js";
import { inboxGetSkill } from "./skills/inbox_get.js";
import { inboxListSkill } from "./skills/inbox_list.js";
import { inboxMarkProcessedSkill } from "./skills/inbox_mark_processed.js";
import { parseEmailSkill } from "./skills/parse_email.js";
import { renderDraftSkill } from "./skills/render_draft.js";
import { summarizeSkill } from "./skills/summarize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const config = loadConfig();
  const logger = buildLogger();
  const inbox = createInboxClient({
    apiUrl: config.inboxApiUrl,
    mailbox: config.inboxMailbox,
    cfAccessClientId: config.cfAccessClientId,
    cfAccessClientSecret: config.cfAccessClientSecret,
  });
  const storage = new Storage();

  const ctx: CloudContext = {
    config,
    logger,
    clients: { inbox, storage },
  };

  logger.info(
    { mailbox: config.inboxMailbox, apiUrl: config.inboxApiUrl, maxEmailsPerRun: config.maxEmailsPerRun },
    "cloud job started",
  );

  const refs = await inboxListSkill.run(ctx, undefined);
  if (refs.length === 0) {
    logger.info({}, "no messages to process");
    return;
  }

  const finalResult = await runPipeline(ctx, [
    inboxGetSkill,
    parseEmailSkill,
    extractLinksSkill,
    summarizeSkill,
    renderDraftSkill,
    gcsPutSkill,
    inboxMarkProcessedSkill,
  ], refs);

  logger.info({ processed: Array.isArray(finalResult) ? finalResult.length : 0 }, "cloud job complete");
}

main().catch((error) => {
  // Cloud Run will mark this run as failed.
  console.error(error);
  process.exitCode = 1;
});
