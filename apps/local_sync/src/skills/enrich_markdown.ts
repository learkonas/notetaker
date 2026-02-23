import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function renderFrontmatter(draft: LocalDraft): string {
  const tags = draft.tags.map((tag) => `"${tag}"`).join(", ");
  const related =
    draft.relatedNotes?.map((note) => `"${note.title}"`).join(", ") ?? "";
  const qualityScore = draft.quality?.overall ?? 0;
  const styleScore = draft.quality?.styleScore ?? 0;
  const needsReview = draft.quality?.needsReview ?? false;
  return [
    "---",
    "source: gmail",
    `message_id: "${draft.messageId}"`,
    `thread_id: "${draft.threadId}"`,
    `date: "${draft.internalDate}"`,
    `url: "${draft.sourceUrl ?? ""}"`,
    `tags: [${tags}]`,
    `pipeline_version: "${draft.pipelineVersion}"`,
    `related_note_ids: [${related}]`,
    `quality_score: ${qualityScore.toFixed(2)}`,
    `style_score: ${styleScore.toFixed(2)}`,
    `needs_review: ${needsReview}`,
    "---",
  ].join("\n");
}

export const enrichMarkdownSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "enrich_markdown",
  async run(_ctx, drafts) {
    return drafts.map((draft) => {
      const related = draft.relatedNotes ?? [];
      const markdown = [
        renderFrontmatter(draft),
        "",
        `# ${draft.subject}`,
        "",
        "## TL;DR",
        draft.summary,
        "",
        "## Key Ideas",
        ...draft.keyPoints.map((point) => `- ${point}`),
        "",
        "## Analysis",
        draft.analysis,
        "",
        "## Questions",
        ...draft.questions.map((question) => `- ${question}`),
        "",
        "## Related Notes",
        ...(related.length
          ? related.map((note) => `- [[${note.title}]] - ${note.rationale}`)
          : ["- None found above confidence threshold."]),
      ].join("\n");
      return { ...draft, markdown };
    });
  },
};
