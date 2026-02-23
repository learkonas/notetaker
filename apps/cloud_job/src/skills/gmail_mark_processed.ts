import type { Skill } from "../lib/skill.js";
import type { CloudContext } from "../lib/types.js";
import type { PersistedDraft } from "./gcs_put.js";

type GmailModify = {
  id: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
};

type GmailLabel = {
  id?: string;
  name?: string;
};

async function getOrCreateLabel(
  ctx: CloudContext,
  gmail: {
    users: {
      labels: {
        list: (args: { userId: string }) => Promise<{ data: { labels?: GmailLabel[] } }>;
        create: (args: {
          userId: string;
          requestBody: { name: string; labelListVisibility: string; messageListVisibility: string };
        }) => Promise<{ data: GmailLabel }>;
      };
    };
  },
): Promise<string> {
  const listed = await gmail.users.labels.list({ userId: ctx.config.gmailUser });
  const existing = listed.data.labels?.find((label) => label.name === ctx.config.gmailProcessedLabel);
  if (existing?.id) return existing.id;

  const created = await gmail.users.labels.create({
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
    const gmail = ctx.clients.gmail as {
      users: {
        labels: {
          list: (args: { userId: string }) => Promise<{ data: { labels?: GmailLabel[] } }>;
          create: (args: {
            userId: string;
            requestBody: {
              name: string;
              labelListVisibility: string;
              messageListVisibility: string;
            };
          }) => Promise<{ data: GmailLabel }>;
        };
        messages: {
          modify: (args: {
            userId: string;
            id: string;
            requestBody: GmailModify;
          }) => Promise<unknown>;
        };
      };
    };

    const labelId = await getOrCreateLabel(ctx, gmail);
    for (const item of persisted) {
      await gmail.users.messages.modify({
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
