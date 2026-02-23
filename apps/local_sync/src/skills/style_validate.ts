import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

export const styleValidateSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "style_validate",
  async run(ctx, drafts) {
    const requiredSections = ctx.styleProfile?.requiredSections ?? [];
    return drafts.map((draft) => {
      const markdown = draft.markdown ?? "";
      const missing = requiredSections.filter((section) => !markdown.includes(`## ${section}`));
      const styleScore = missing.length === 0 ? 1 : Math.max(0, 1 - missing.length * 0.15);
      const quality = draft.quality ?? {
        accuracy: 4,
        coverage: 4,
        insight: 4,
        clarity: 4,
        actionability: 4,
        overall: 4,
        styleScore,
        needsReview: false,
        reasons: [],
      };
      quality.styleScore = styleScore;
      if (styleScore < 0.8) {
        quality.needsReview = true;
        quality.reasons.push("Style score below threshold");
      }
      return { ...draft, quality };
    });
  },
};
