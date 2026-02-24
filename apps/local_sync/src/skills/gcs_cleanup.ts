import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";
import { loadCheckpoint } from "./checkpoint.js";

type GcsFile = {
  name: string;
  metadata?: {
    timeCreated?: string;
  };
  delete: () => Promise<unknown>;
};

function extractMessageId(fileName: string): string | null {
  const match = fileName.match(/^drafts\/\d{4}-\d{2}-\d{2}\/(.+)\.(json|md)$/);
  return match?.[1] ?? null;
}

export const gcsCleanupSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "gcs_cleanup",
  async run(ctx, drafts) {
    const storage = ctx.clients.storage as {
      bucket: (bucketName: string) => {
        getFiles: (args: { prefix: string }) => Promise<[GcsFile[]]>;
      };
    };

    const checkpoint = await loadCheckpoint(ctx.checkpointPath);
    const processedIds = new Set(checkpoint.processedMessageIds);
    if (processedIds.size === 0) return drafts;

    const nowMs = Date.now();
    const cutoffMs = nowMs - ctx.config.retainDraftDays * 24 * 60 * 60 * 1000;
    const [files] = await storage.bucket(ctx.config.bucket).getFiles({ prefix: "drafts/" });

    let deleted = 0;
    for (const file of files) {
      const messageId = extractMessageId(file.name);
      if (!messageId || !processedIds.has(messageId)) continue;

      const timeCreated = file.metadata?.timeCreated;
      if (!timeCreated) continue;
      const createdMs = new Date(timeCreated).getTime();
      if (Number.isNaN(createdMs) || createdMs > cutoffMs) continue;

      await file.delete();
      deleted += 1;
    }

    ctx.logger.info(
      { deleted, retainDraftDays: ctx.config.retainDraftDays },
      "gcs_cleanup complete",
    );
    return drafts;
  },
};
