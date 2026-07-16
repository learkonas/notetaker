import { htmlToMarkdown } from "../lib/defuddle.js";
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

function cleanSubject(rawSubject: string | null): string {
  let subject = (rawSubject ?? "").trim();
  let previous = "";
  // Strip repeated forward prefixes, e.g. "Fwd: FW: Fwd: Title".
  while (previous !== subject) {
    previous = subject;
    subject = subject.replace(/^\s*(fwd?|fw)\s*:\s*/i, "");
  }
  return subject.trim() || "(no subject)";
}

async function extractEmailText(ctx: CloudContext, messageId: string, body: string): Promise<string> {
  const fallback = htmlToTextFallback(body);
  try {
    const extracted = await htmlToMarkdown(body);
    const markdown = extracted?.markdown ?? "";
    // Defuddle can over-prune sparse newsletter layouts; keep its output only
    // when it retained a reasonable share of the raw text.
    if (markdown.length >= 200 || markdown.length >= fallback.length * 0.3) {
      return markdown;
    }
    ctx.logger.warn(
      { messageId, defuddleChars: markdown.length, fallbackChars: fallback.length },
      "parse_email: defuddle output too thin; using plain-text fallback",
    );
  } catch (err) {
    ctx.logger.warn({ messageId, err }, "parse_email: defuddle failed; using plain-text fallback");
  }
  return fallback;
}

export const parseEmailSkill: Skill<CloudContext, InboxEmailFull[], ParsedEmail[]> = {
  name: "parse_email",
  async run(ctx, emails) {
    const parsed: ParsedEmail[] = [];
    for (const email of emails) {
      // The inbox worker stores a single body field containing HTML when
      // available, otherwise plain text.
      const body = email.body ?? "";
      const isHtml = looksLikeHtml(body);
      const emailText = isHtml ? await extractEmailText(ctx, email.id, body) : body;

      parsed.push({
        messageId: email.id,
        threadId: email.thread_id ?? email.id,
        internalDate: email.date ?? new Date().toISOString(),
        from: email.sender ?? "",
        subject: cleanSubject(email.subject),
        emailText,
        html: isHtml ? body : undefined,
      });
    }
    ctx.logger.info({ count: parsed.length }, "parse_email complete");
    return parsed;
  },
};
