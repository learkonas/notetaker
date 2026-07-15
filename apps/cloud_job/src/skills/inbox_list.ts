import type { InboxEmailSummary } from "../lib/inbox.js";
import type { Skill } from "../lib/skill.js";
import type { CloudContext } from "../lib/types.js";

export const inboxListSkill: Skill<CloudContext, void, InboxEmailSummary[]> = {
  name: "inbox_list",
  async run(ctx) {
    const emails = await ctx.clients.inbox.listInboxEmails(ctx.config.maxEmailsPerRun);
    ctx.logger.info({ count: emails.length }, "inbox_list complete");
    return emails;
  },
};
