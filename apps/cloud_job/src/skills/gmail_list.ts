import type { Skill } from "../lib/skill.js";
import type { CloudContext, GmailMessageRef } from "../lib/types.js";

export const gmailListSkill: Skill<CloudContext, void, GmailMessageRef[]> = {
  name: "gmail_list",
  async run(ctx) {
    const gmail = ctx.clients.gmail as {
      users: {
        messages: {
          list: (args: {
            userId: string;
            q: string;
            maxResults: number;
          }) => Promise<{ data: { messages?: GmailMessageRef[] } }>;
        };
      };
    };
    const res = await gmail.users.messages.list({
      userId: ctx.config.gmailUser,
      q: ctx.config.gmailQuery,
      maxResults: ctx.config.maxEmailsPerRun,
    });
    const messages = res.data.messages ?? [];
    ctx.logger.info({ count: messages.length }, "gmail_list complete");
    return messages;
  },
};
