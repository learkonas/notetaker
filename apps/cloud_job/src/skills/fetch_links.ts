import { htmlToMarkdown } from "../lib/defuddle.js";
import type { Skill } from "../lib/skill.js";
import type { CloudContext, LinkContent, LinkedEmail, SummarizationPayload } from "../lib/types.js";

const MAX_LINKS_PER_EMAIL = 5;
const MAX_CONTENT_CHARS = 15_000;
const FETCH_TIMEOUT_MS = 20_000;
const NON_ARTICLE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|mp3|mp4|css|js)$/i;

async function fetchLinkContent(ctx: CloudContext, url: string): Promise<LinkContent | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ObsidianNotetaker/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      ctx.logger.warn({ url, status: response.status }, "fetch_links: request failed; skipping link");
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    const extracted = await htmlToMarkdown(html, response.url);
    if (!extracted) return null;

    return {
      url,
      resolvedUrl: response.url,
      title: extracted.title,
      markdown: extracted.markdown.slice(0, MAX_CONTENT_CHARS),
    };
  } catch (err) {
    ctx.logger.warn({ url, err: err instanceof Error ? err.message : err }, "fetch_links: fetch error; skipping link");
    return null;
  }
}

export const fetchLinksSkill: Skill<CloudContext, LinkedEmail[], SummarizationPayload[]> = {
  name: "fetch_links",
  async run(ctx, emails) {
    const withContent: SummarizationPayload[] = [];
    for (const email of emails) {
      const candidates = email.hyperlinks
        .filter((link) => !NON_ARTICLE_EXTENSIONS.test(link.normalizedUrl))
        .slice(0, MAX_LINKS_PER_EMAIL);

      const linkContents: LinkContent[] = [];
      for (const link of candidates) {
        const content = await fetchLinkContent(ctx, link.normalizedUrl);
        if (content) linkContents.push(content);
      }
      ctx.logger.info(
        { messageId: email.messageId, candidates: candidates.length, fetched: linkContents.length },
        "fetch_links: link content fetched",
      );
      withContent.push({ ...email, linkContents });
    }
    return withContent;
  },
};
