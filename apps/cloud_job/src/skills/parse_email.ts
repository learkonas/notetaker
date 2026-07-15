import type { InboxEmailFull } from "../lib/inbox.js";
import type { Skill } from "../lib/skill.js";
import type { CloudContext, ParsedEmail } from "../lib/types.js";

function htmlToTextFallback(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHtml(body: string): boolean {
  return /<\s*(html|body|div|p|a|table|br|span)[\s>/]/i.test(body);
}

export const parseEmailSkill: Skill<CloudContext, InboxEmailFull[], ParsedEmail[]> = {
  name: "parse_email",
  async run(ctx, emails) {
    const parsed: ParsedEmail[] = emails.map((email) => {
      // The inbox worker stores a single body field containing HTML when
      // available, otherwise plain text.
      const body = email.body ?? "";
      const isHtml = looksLikeHtml(body);
      const emailText = isHtml ? htmlToTextFallback(body) : body;

      return {
        messageId: email.id,
        threadId: email.thread_id ?? email.id,
        internalDate: email.date ?? new Date().toISOString(),
        from: email.sender ?? "",
        subject: email.subject || "(no subject)",
        emailText,
        html: isHtml ? body : undefined,
      };
    });
    ctx.logger.info({ count: parsed.length }, "parse_email complete");
    return parsed;
  },
};
