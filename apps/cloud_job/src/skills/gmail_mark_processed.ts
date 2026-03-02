import type { Skill } from "../lib/skill.js";
import type { CloudContext } from "../lib/types.js";
import type { PersistedDraft } from "./gcs_put.js";

async function getOrCreateLabel(ctx: CloudContext): Promise<string> {
  const listed = await ctx.clients.gmail.users.labels.list({ userId: ctx.config.gmailUser });
  const existing = listed.data.labels?.find((label) => label.name === ctx.config.gmailProcessedLabel);
  if (existing?.id) return existing.id;

  const created = await ctx.clients.gmail.users.labels.create({
    userId: ctx.config.gmailUser,
    requestBody: {
      name: ctx.config.gmailProcessedLabel,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });
  if (!created.data.id) {
    throw new Error("Failed to create processed label");
  }
  return created.data.id;
}

export const gmailMarkProcessedSkill: Skill<CloudContext, PersistedDraft[], PersistedDraft[]> = {
  name: "gmail_mark_processed",
  async run(ctx, persisted) {
    const labelId = await getOrCreateLabel(ctx);
    for (const item of persisted) {
      await ctx.clients.gmail.users.messages.modify({
        userId: ctx.config.gmailUser,
        id: item.draft.messageId,
        requestBody: {
          id: item.draft.messageId,
          addLabelIds: [labelId],
          removeLabelIds: ["INBOX"],
        },
      });
    }
    ctx.logger.info({ count: persisted.length }, "gmail_mark_processed complete");
    return persisted;
  },
};
