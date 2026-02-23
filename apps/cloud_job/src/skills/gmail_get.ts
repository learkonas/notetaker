import type { Skill } from "../lib/skill.js";
import type { CloudContext, GmailMessageRef } from "../lib/types.js";

type GmailMessage = {
  id: string;
  threadId: string;
  internalDate: string;
  payload?: unknown;
};

export const gmailGetSkill: Skill<CloudContext, GmailMessageRef[], GmailMessage[]> = {
  name: "gmail_get",
  async run(ctx, refs) {
    const gmail = ctx.clients.gmail as {
      users: {
        messages: {
          get: (args: {
            userId: string;
            id: string;
            format: "full";
          }) => Promise<{ data: GmailMessage }>;
        };
      };
    };
    const fullMessages: GmailMessage[] = [];
    for (const ref of refs) {
      const res = await gmail.users.messages.get({
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
