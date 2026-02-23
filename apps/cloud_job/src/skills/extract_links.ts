import { load } from "cheerio";
import type { Skill } from "../lib/skill.js";
import type { CloudContext, Hyperlink, ParsedEmail, SummarizationPayload } from "../lib/types.js";

const TRACKING_DOMAINS = new Set([
  "click.email.substack.com",
  "t.co",
  "mailchi.mp",
]);

function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const paramsToDrop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const key of paramsToDrop) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return raw;
  }
}

function hyperlinkFromUrl(raw: string): Hyperlink | null {
  try {
    const normalizedUrl = cleanUrl(raw);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();
    if (domain.includes("unsubscribe") || TRACKING_DOMAINS.has(domain)) return null;
    return { anchorText: normalizedUrl, url: raw, normalizedUrl, domain };
  } catch {
    return null;
  }
}

export const extractLinksSkill: Skill<CloudContext, ParsedEmail[], SummarizationPayload[]> = {
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
