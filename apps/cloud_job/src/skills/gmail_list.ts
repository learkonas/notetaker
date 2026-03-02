import type { Skill } from "../lib/skill.js";
import type { CloudContext, GmailMessageRef } from "../lib/types.js";

export const gmailListSkill: Skill<CloudContext, void, GmailMessageRef[]> = {
  name: "gmail_list",
  async run(ctx) {
    const res = await ctx.clients.gmail.users.messages.list({
      userId: ctx.config.gmailUser,
      q: ctx.config.gmailQuery,
      maxResults: ctx.config.maxEmailsPerRun,
    });
    const messages = res.data.messages ?? [];
    ctx.logger.info({ count: messages.length }, "gmail_list complete");
    return messages;
  },
};
