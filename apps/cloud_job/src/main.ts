import path from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import { loadConfig } from "./lib/config.js";
import { createInboxClient } from "./lib/inbox.js";
import { buildLogger } from "./lib/log.js";
import { runPipeline } from "./lib/skill.js";
import type { CloudContext, StorageClient } from "./lib/types.js";
import { extractLinksSkill } from "./skills/extract_links.js";
import { fetchLinksSkill } from "./skills/fetch_links.js";
import { gcsPutSkill } from "./skills/gcs_put.js";
import { inboxGetSkill } from "./skills/inbox_get.js";
import { inboxListSkill } from "./skills/inbox_list.js";
import { inboxMarkProcessedSkill } from "./skills/inbox_mark_processed.js";
import { parseEmailSkill } from "./skills/parse_email.js";
import { renderDraftSkill } from "./skills/render_draft.js";
import { summarizeSkill } from "./skills/summarize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type Failure = {
  messageId: string;
  subject: string;
  error: string;
};

async function sendFailureNotification(ctx: CloudContext, failures: Failure[]): Promise<void> {
  const lines = failures.map(
    (failure) => `- "${failure.subject}" (message ${failure.messageId})\n  ${failure.error}`,
  );
  const text = [
    `${failures.length} email(s) failed processing in the notetaker cloud job.`,
    "They were left in the inbox and will be retried on the next run.",
    "",
    ...lines,
  ].join("\n");

  try {
    await ctx.clients.inbox.sendEmail({
      to: ctx.config.notifyEmail,
      subject: `Notetaker: ${failures.length} email(s) failed processing`,
      text,
    });
    ctx.logger.info({ to: ctx.config.notifyEmail, failures: failures.length }, "failure notification sent");
  } catch (err) {
    ctx.logger.error({ err }, "failed to send failure notification email");
  }
}

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
    clients: { inbox, storage: storage as unknown as StorageClient },
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

  // Each email runs through the pipeline in isolation: a failure leaves that
  // email in the inbox (unprocessed) for the next run and never blocks others.
  const failures: Failure[] = [];
  let processed = 0;
  for (const ref of refs) {
    try {
      await runPipeline(ctx, [
        inboxGetSkill,
        parseEmailSkill,
        extractLinksSkill,
        fetchLinksSkill,
        summarizeSkill,
        renderDraftSkill,
        gcsPutSkill,
        inboxMarkProcessedSkill,
      ], [ref]);
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ messageId: ref.id, subject: ref.subject, error: message }, "email processing failed");
      failures.push({ messageId: ref.id, subject: ref.subject ?? "(no subject)", error: message });
    }
  }

  logger.info({ processed, failed: failures.length }, "cloud job complete");

  if (failures.length > 0) {
    await sendFailureNotification(ctx, failures);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // Cloud Run will mark this run as failed.
  console.error(error);
  process.exitCode = 1;
});
