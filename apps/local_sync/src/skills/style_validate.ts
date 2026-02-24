import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function computeArgumentClarity(draft: LocalDraft): number {
  const summaryScore = draft.summary.trim().length >= 30 ? 0.35 : 0.2;
  const keyIdeasScore = draft.keyPoints.length >= 2 ? 0.25 : draft.keyPoints.length === 1 ? 0.15 : 0;
  const analysisScore = draft.analysis.trim().length >= 80 ? 0.25 : draft.analysis.trim().length >= 30 ? 0.15 : 0;
  const questionScore = draft.questions.length >= 1 ? 0.15 : 0;
  return Math.min(1, summaryScore + keyIdeasScore + analysisScore + questionScore);
}

export const styleValidateSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "style_validate",
  async run(_ctx, drafts) {
    return drafts.map((draft) => {
      const styleScore = computeArgumentClarity(draft);
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
      if (styleScore < 0.6) {
        quality.needsReview = true;
        quality.reasons.push("Argument clarity is weak; tighten thesis, evidence, or implications");
      }
      return { ...draft, quality };
    });
  },
};
