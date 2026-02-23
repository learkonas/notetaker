import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function clampScore(score: number): number {
  return Math.max(1, Math.min(5, score));
}

export const qualityScoreSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "quality_score",
  async run(_ctx, drafts) {
    return drafts.map((draft) => {
      const evidenceCoverage = draft.evidenceQuotes.length / Math.max(1, draft.keyPoints.length);
      const accuracy = clampScore(evidenceCoverage >= 0.8 ? 4.5 : 3.5);
      const coverage = clampScore(draft.keyPoints.length >= 3 ? 4 : 3);
      const insight = clampScore(draft.analysis.length > 80 ? 4 : 3);
      const clarity = clampScore(draft.summary.length > 40 ? 4 : 3);
      const actionability = clampScore(draft.questions.length >= 2 ? 4 : 3);
      const overall = (accuracy + coverage + insight + clarity + actionability) / 5;
      const needsReview = accuracy < 4 || overall < 4;
      return {
        ...draft,
        quality: {
          accuracy,
          coverage,
          insight,
          clarity,
          actionability,
          overall,
          styleScore: draft.quality?.styleScore ?? 1,
          needsReview: needsReview || (draft.quality?.needsReview ?? false),
          reasons: [
            ...(draft.quality?.reasons ?? []),
            ...(needsReview ? ["Quality gate did not pass"] : []),
          ],
        },
      };
    });
  },
};
