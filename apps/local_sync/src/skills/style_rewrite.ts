import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function normalizeSpacing(markdown: string): string {
  return markdown.replace(/\n{3,}/g, "\n\n").trimEnd();
}

function insertMissingSections(markdown: string, requiredSections: string[]): string {
  let result = markdown;
  for (const section of requiredSections) {
    if (!new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(result)) {
      result += `\n\n## ${section}\n\nTODO: complete this section.`;
    }
  }
  return result;
}

export const styleRewriteSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "style_rewrite",
  async run(ctx, drafts) {
    const requiredSections = ctx.styleProfile?.requiredSections ?? [];
    return drafts.map((draft) => {
      if (!draft.markdown) return draft;
      let markdown = draft.markdown;
      if (requiredSections.length > 0) {
        markdown = insertMissingSections(markdown, requiredSections);
      }
      return { ...draft, markdown: normalizeSpacing(markdown) };
    });
  },
};
