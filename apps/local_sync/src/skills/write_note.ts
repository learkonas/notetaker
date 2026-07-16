import fs from "node:fs/promises";
import path from "node:path";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function cleanSubject(subject: string): string {
  let cleaned = subject.trim();
  let previous = "";
  while (previous !== cleaned) {
    previous = cleaned;
    cleaned = cleaned.replace(/^\s*(fwd?|fw)\s*:\s*/i, "");
  }
  return cleaned.trim() || "Untitled";
}

// Keep the subject readable (Obsidian uses the filename as the note title),
// stripping only characters invalid on Windows or in wikilinks.
function titleToFilename(title: string): string {
  const sanitized = title
    .replace(/[<>:"/\\|?*#^[\]\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")
    .slice(0, 120)
    .trim();
  return sanitized || "Untitled";
}

async function writeExclusive(targetPath: string, content: string): Promise<boolean> {
  try {
    const fh = await fs.open(targetPath, "wx");
    await fh.writeFile(content, "utf8");
    await fh.close();
    return true;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

export const writeNoteSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "write_note",
  async run(ctx, drafts) {
    const written: LocalDraft[] = [];
    for (const draft of drafts) {
      try {
        const folder = draft.quality?.needsReview
          ? path.join(ctx.config.vaultPath, ctx.config.reviewFolder)
          : path.join(ctx.config.vaultPath, ctx.config.inboxFolder);
        await fs.mkdir(folder, { recursive: true });
        const base = titleToFilename(cleanSubject(draft.subject));
        let targetPath = path.join(folder, `${base}.md`);
        let counter = 2;
        while (!(await writeExclusive(targetPath, draft.markdown ?? ""))) {
          targetPath = path.join(folder, `${base}-${counter}.md`);
          counter += 1;
        }
        written.push(draft);
      } catch (err) {
        ctx.logger.error({ messageId: draft.messageId, err }, "write_note: failed to write draft; skipping");
      }
    }
    ctx.logger.info({ count: written.length }, "write_note complete");
    return written;
  },
};
