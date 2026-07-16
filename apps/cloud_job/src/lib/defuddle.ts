import { Defuddle } from "defuddle/node";
import { JSDOM, VirtualConsole } from "jsdom";

// Newsletters and web pages ship CSS that jsdom cannot parse and logs loudly
// about; a blank virtual console discards that noise.
const virtualConsole = new VirtualConsole();

export type ExtractedContent = {
  markdown: string;
  title?: string;
};

/**
 * Runs Defuddle over an HTML document to strip navigation, ads, and boilerplate,
 * returning the main content as markdown. Returns null when nothing meaningful
 * could be extracted.
 */
export async function htmlToMarkdown(html: string, url?: string): Promise<ExtractedContent | null> {
  const dom = new JSDOM(html, { url, virtualConsole });
  const result = await Defuddle(dom.window.document, url, { markdown: true });
  const markdown = result?.content?.trim();
  if (!markdown) return null;
  return { markdown, title: result.title?.trim() || undefined };
}
