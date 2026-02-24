import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function normalizeSpacing(markdown: string): string {
  return markdown.replace(/\n{3,}/g, "\n\n").trimEnd();
}

export const styleRewriteSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "style_rewrite",
  async run(_ctx, drafts) {
    return drafts.map((draft) => {
      if (!draft.markdown) return draft;
      return { ...draft, markdown: normalizeSpacing(draft.markdown) };
    });
  },
};
