import type { InboxEmailFull, InboxEmailSummary } from "../lib/inbox.js";
import type { Skill } from "../lib/skill.js";
import type { CloudContext } from "../lib/types.js";

export const inboxGetSkill: Skill<CloudContext, InboxEmailSummary[], InboxEmailFull[]> = {
  name: "inbox_get",
  async run(ctx, refs) {
    const fullEmails: InboxEmailFull[] = [];
    for (const ref of refs) {
      fullEmails.push(await ctx.clients.inbox.getEmail(ref.id));
    }
    ctx.logger.info({ count: fullEmails.length }, "inbox_get complete");
    return fullEmails;
  },
};
