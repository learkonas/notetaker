import type { Skill } from "../lib/skill.js";
import type { CloudContext } from "../lib/types.js";
import type { PersistedDraft } from "./gcs_put.js";

async function ensureProcessedFolder(ctx: CloudContext): Promise<string> {
  const target = ctx.config.inboxProcessedFolder;
  const folders = await ctx.clients.inbox.getFolders();
  const existing = folders.find((f) => f.id === target || f.name === target);
  if (existing) return existing.id;

  const created = await ctx.clients.inbox.createFolder(target);
  if (created) return created.id;

  // 409 race: the folder appeared between our list and create calls.
  const refreshed = await ctx.clients.inbox.getFolders();
  const found = refreshed.find((f) => f.id === target || f.name === target);
  if (!found) throw new Error(`Failed to create processed folder "${target}"`);
  return found.id;
}

export const inboxMarkProcessedSkill: Skill<CloudContext, PersistedDraft[], PersistedDraft[]> = {
  name: "inbox_mark_processed",
  async run(ctx, persisted) {
    if (persisted.length === 0) {
      ctx.logger.info({ count: 0 }, "inbox_mark_processed complete");
      return persisted;
    }
    const folderId = await ensureProcessedFolder(ctx);
    for (const item of persisted) {
      await ctx.clients.inbox.markRead(item.draft.messageId);
      await ctx.clients.inbox.moveEmail(item.draft.messageId, folderId);
    }
    ctx.logger.info({ count: persisted.length, folderId }, "inbox_mark_processed complete");
    return persisted;
  },
};
