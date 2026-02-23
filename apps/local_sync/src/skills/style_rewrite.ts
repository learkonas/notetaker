import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

export const styleRewriteSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "style_rewrite",
  async run(ctx, drafts) {
    const preferredSections = ctx.styleProfile?.requiredSections ?? [];
    return drafts.map((draft) => {
      if (!draft.markdown) return draft;
      let rewritten = draft.markdown;
      for (const section of preferredSections) {
        if (!rewritten.includes(`## ${section}`)) {
          rewritten += `\n\n## ${section}\n- TODO: section added by style rewrite`;
        }
      }
      return { ...draft, markdown: rewritten };
    });
  },
};
