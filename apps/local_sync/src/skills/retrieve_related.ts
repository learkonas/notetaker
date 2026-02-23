import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft, RelatedNote } from "../lib/types.js";

function tokenSet(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((x) => x.length > 2),
  );
}

function scoreSimilarity(a: Set<string>, b: Set<string>): number {
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(1, Math.min(a.size, b.size));
}

export const retrieveRelatedSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "retrieve_related",
  async run(ctx, drafts) {
    const noteIndex = ctx.noteIndex ?? [];
    const updated = drafts.map((draft) => {
      const sourceTokens = tokenSet(`${draft.subject} ${draft.summary} ${draft.analysis}`);
      const candidates: RelatedNote[] = noteIndex.map((note) => {
        const noteTokens = tokenSet(`${note.title} ${note.body.slice(0, 1000)}`);
        const score = scoreSimilarity(sourceTokens, noteTokens);
        return {
          title: note.title,
          path: note.path,
          score,
          rationale: "Shared topics and terminology with this draft.",
        };
      });

      const relatedNotes = candidates
        .filter((candidate) => candidate.score >= 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return { ...draft, relatedNotes };
    });

    ctx.logger.info({ drafts: updated.length }, "retrieve_related complete");
    return updated;
  },
};
