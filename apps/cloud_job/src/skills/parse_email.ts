import type { Skill } from "../lib/skill.js";
import type { CloudContext, ParsedEmail } from "../lib/types.js";

type Header = { name?: string; value?: string };
type Body = { data?: string };
type Part = { mimeType?: string; body?: Body; parts?: Part[] };
type GmailMessage = {
  id: string;
  threadId: string;
  internalDate: string;
  payload?: { headers?: Header[]; body?: Body; parts?: Part[] };
};

function decodeBase64Url(input: string | undefined): string {
  if (!input) return "";
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function flattenParts(part?: Part): Part[] {
  if (!part) return [];
  const children = part.parts ?? [];
  return [part, ...children.flatMap(flattenParts)];
}

function htmlToTextFallback(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const parseEmailSkill: Skill<CloudContext, GmailMessage[], ParsedEmail[]> = {
  name: "parse_email",
  async run(ctx, messages) {
    const parsed: ParsedEmail[] = messages.map((message) => {
      const headers = message.payload?.headers ?? [];
      const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(no subject)";

      const parts = flattenParts({
        mimeType: "root",
        body: message.payload?.body,
        parts: message.payload?.parts,
      });
      const textPart = parts.find((p) => p.mimeType === "text/plain");
      const htmlPart = parts.find((p) => p.mimeType === "text/html");

      const text = decodeBase64Url(textPart?.body?.data);
      const html = decodeBase64Url(htmlPart?.body?.data);
      const emailText = text || (html ? htmlToTextFallback(html) : "");

      return {
        messageId: message.id,
        threadId: message.threadId,
        internalDate: new Date(Number(message.internalDate)).toISOString(),
        from,
        subject,
        emailText,
        html: html || undefined,
      };
    });
    ctx.logger.info({ count: parsed.length }, "parse_email complete");
    return parsed;
  },
};
