import path from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import { loadConfig } from "./lib/config.js";
import { buildLogger } from "./lib/log.js";
import { runPipeline } from "./lib/skill.js";
import type { LocalContext, StorageClient } from "./lib/types.js";
import { checkpointSkill } from "./skills/checkpoint.js";
import { embedSkill } from "./skills/embed.js";
import { enrichLinksSkill } from "./skills/enrich_links.js";
import { enrichMarkdownSkill } from "./skills/enrich_markdown.js";
import { gcsCleanupSkill } from "./skills/gcs_cleanup.js";
import { gcsListGetSkill } from "./skills/gcs_list_get.js";
import { qualityScoreSkill } from "./skills/quality_score.js";
import { retrieveRelatedSkill } from "./skills/retrieve_related.js";
import { styleProfileSkill } from "./skills/style_profile.js";
import { styleRewriteSkill } from "./skills/style_rewrite.js";
import { styleValidateSkill } from "./skills/style_validate.js";
import { vaultScanSkill } from "./skills/vault_scan.js";
import { writeNoteSkill } from "./skills/write_note.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runAll(ctx: LocalContext) {
  const drafts = await gcsListGetSkill.run(ctx, undefined);
  if (drafts.length === 0) {
    ctx.logger.info({}, "no new drafts found");
    return;
  }
  await runPipeline(ctx, [
    vaultScanSkill,
    embedSkill,
    retrieveRelatedSkill,
    enrichLinksSkill,
    styleProfileSkill,
    qualityScoreSkill,
    enrichMarkdownSkill,
    styleRewriteSkill,
    styleValidateSkill,
    writeNoteSkill,
    checkpointSkill,
    gcsCleanupSkill,
  ], drafts);
}

async function runSyncOnly(ctx: LocalContext) {
  await gcsListGetSkill.run(ctx, undefined);
}

async function runIndexOnly(ctx: LocalContext) {
  await runPipeline(ctx, [vaultScanSkill, styleProfileSkill], []);
}

async function main() {
  const command = process.argv[2] ?? "run";
  const config = loadConfig();
  const logger = buildLogger();
  const storage = new Storage();

  const ctx: LocalContext = {
    config,
    logger,
    clients: { storage: storage as unknown as StorageClient },
    checkpointPath: path.join(process.cwd(), ".local", "checkpoint.json"),
  };

  if (command === "sync") {
    await runSyncOnly(ctx);
    return;
  }
  if (command === "index") {
    await runIndexOnly(ctx);
    return;
  }
  await runAll(ctx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
