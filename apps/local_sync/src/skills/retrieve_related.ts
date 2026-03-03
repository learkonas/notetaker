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

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export const retrieveRelatedSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "retrieve_related",
  async run(ctx, drafts) {
    const noteIndex = ctx.noteIndex ?? [];
    const useEmbeddings =
      drafts.length > 0 &&
      drafts.every((d) => d.embedding != null) &&
      noteIndex.length > 0 &&
      noteIndex.every((n) => n.embedding != null);

    const updated = drafts.map((draft) => {
      let candidates: RelatedNote[];

      if (useEmbeddings) {
        const draftEmb = draft.embedding!;
        candidates = noteIndex.map((note) => ({
          title: note.title,
          path: note.path,
          score: cosineSimilarity(draftEmb, note.embedding!),
          rationale: "Semantically similar to this draft.",
        }));
      } else {
        const sourceTokens = tokenSet(`${draft.subject} ${draft.summary} ${draft.analysis}`);
        candidates = noteIndex.map((note) => {
          const noteTokens = tokenSet(
            `${note.title} ${note.aliases.join(" ")} ${note.body.slice(0, 1000)}`,
          );
          return {
            title: note.title,
            path: note.path,
            score: scoreSimilarity(sourceTokens, noteTokens),
            rationale: "Shared topics and terminology with this draft.",
          };
        });
      }

      const relatedNotes = candidates
        .filter((candidate) => candidate.score >= 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return { ...draft, relatedNotes };
    });

    ctx.logger.info({ drafts: updated.length, mode: useEmbeddings ? "semantic" : "lexical" }, "retrieve_related complete");
    return updated;
  },
};
