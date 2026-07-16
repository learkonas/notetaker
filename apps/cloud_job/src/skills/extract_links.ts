import { load } from "cheerio";
import type { Skill } from "../lib/skill.js";
import type { CloudContext, Hyperlink, LinkedEmail, ParsedEmail } from "../lib/types.js";

const TRACKING_DOMAINS = new Set([
  "click.email.substack.com",
  "t.co",
  "mailchi.mp",
]);

function cleanUrl(raw: string): string {
  // Drop the query string (and anything after it) entirely — it is almost
  // always tracking noise in newsletter links.
  const withoutQuery = raw.split("?")[0] ?? raw;
  return withoutQuery.replace(/[.,;)\]]+$/, "");
}

function hyperlinkFromUrl(raw: string): Hyperlink | null {
  try {
    const normalizedUrl = cleanUrl(raw);
    const url = new URL(normalizedUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const domain = url.hostname.toLowerCase();
    if (domain.includes("unsubscribe") || TRACKING_DOMAINS.has(domain)) return null;
    return { anchorText: normalizedUrl, url: raw, normalizedUrl, domain };
  } catch {
    return null;
  }
}

export const extractLinksSkill: Skill<CloudContext, ParsedEmail[], LinkedEmail[]> = {
  name: "extract_links",
  async run(ctx, emails) {
    const withLinks = emails.map((email) => {
      const matches = Array.from(email.emailText.matchAll(/https?:\/\/[^\s)]+/g)).map((m) => m[0]);
      const links = new Map<string, Hyperlink>();

      for (const match of matches) {
        const parsed = hyperlinkFromUrl(match);
        if (parsed) links.set(parsed.normalizedUrl, parsed);
      }

      if (email.html) {
        const $ = load(email.html);
        $("a").each((_, element) => {
          const href = $(element).attr("href");
          if (!href) return;
          const parsed = hyperlinkFromUrl(href);
          if (!parsed) return;
          parsed.anchorText = $(element).text().trim() || parsed.anchorText;
          links.set(parsed.normalizedUrl, parsed);
        });
      }

      return {
        ...email,
        hyperlinks: Array.from(links.values()),
      };
    });

    ctx.logger.info({ count: withLinks.length }, "extract_links complete");
    return withLinks;
  },
};
