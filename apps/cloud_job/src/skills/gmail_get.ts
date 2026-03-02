import type { Skill } from "../lib/skill.js";
import type { CloudContext, GmailMessageRef, GmailRawMessage } from "../lib/types.js";

export const gmailGetSkill: Skill<CloudContext, GmailMessageRef[], GmailRawMessage[]> = {
  name: "gmail_get",
  async run(ctx, refs) {
    const fullMessages: GmailRawMessage[] = [];
    for (const ref of refs) {
      const res = await ctx.clients.gmail.users.messages.get({
        userId: ctx.config.gmailUser,
        id: ref.id,
        format: "full",
      });
      fullMessages.push(res.data);
    }
    ctx.logger.info({ count: fullMessages.length }, "gmail_get complete");
    return fullMessages;
  },
};
