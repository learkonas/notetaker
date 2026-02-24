import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

function sanitizeTag(rawTag: string): string | null {
  const withoutHash = rawTag.trim().replace(/^#+/, "");
  if (!withoutHash) return null;

  const normalized = withoutHash
    .replace(/\s+/g, "-")
    .toLowerCase()
    .split("/")
    .map((part) => part.replace(/[^a-z0-9_-]/g, "").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("/");

  if (!normalized) return null;
  if (!/[a-z]/.test(normalized)) return null;
  return normalized;
}

function sanitizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map(sanitizeTag)
        .filter((tag): tag is string => Boolean(tag)),
    ),
  );
}

function renderSourceLinks(
  hyperlinks: { anchorText: string; url: string; normalizedUrl: string; domain: string }[],
): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const link of hyperlinks) {
    const canonical = (link.normalizedUrl || link.url).trim();
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    const text = (link.anchorText || link.domain || canonical).replace(/\]\(/g, " ");
    lines.push(`- [${text}](${canonical})`);
  }
  return lines.length ? lines : ["- None captured from source email."];
}

function renderCallout(type: string, title: string, lines: string[]): string[] {
  if (!lines.length) return [];
  const cleaned = lines.map((line) => line.replace(/\r?\n+/g, " ").trim()).filter(Boolean);
  if (!cleaned.length) return [];
  return [`> [!${type}] ${title}`, ...cleaned.map((line) => `> - ${line}`)];
}

function renderWarningCallout(draft: LocalDraft): string[] {
  const quality = draft.quality;
  const warningLines = [
    ...(quality?.needsReview ? ["This draft is flagged for manual review."] : []),
    ...(quality?.reasons ?? []),
    ...draft.qualityFlags,
  ];
  return renderCallout("warning", "Review notes", warningLines);
}

function renderQuestionCallout(questions: string[]): string[] {
  return renderCallout("question", "Open questions", questions);
}

function renderFrontmatter(draft: LocalDraft): string {
  const safeTags = sanitizeTags(draft.tags);
  const tags = safeTags.map((tag) => `"${tag}"`).join(", ");
  const related =
    draft.relatedNotes?.map((note) => `"${note.title}"`).join(", ") ?? "";
  const qualityScore = draft.quality?.overall ?? 0;
  const styleScore = draft.quality?.styleScore ?? 0;
  const needsReview = draft.quality?.needsReview ?? false;
  return [
    "---",
    "source: ai_notetaker",
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
      const safeDraft = { ...draft, tags: sanitizeTags(draft.tags) };
      const related = draft.relatedNotes ?? [];
      const sourceLinks = renderSourceLinks(draft.hyperlinks);
      const warningCallout = renderWarningCallout(draft);
      const questionCallout = renderQuestionCallout(draft.questions);
      const supportingEvidence = draft.keyPoints.length
        ? ["## Supporting Evidence", ...draft.keyPoints.map((point) => `- ${point}`)]
        : [];
      const implications = draft.analysis.trim()
        ? ["## Why This Matters", draft.analysis.trim()]
        : [];
      const openQuestions = draft.questions.length
        ? ["## Open Questions", ...draft.questions.map((question) => `- ${question}`)]
        : [];
      const markdown = [
        renderFrontmatter(safeDraft),
        "",
        `# ${draft.subject}`,
        "",
        `> **Core argument:** ${draft.summary.trim()}`,
        ...(warningCallout.length ? ["", ...warningCallout] : []),
        ...(questionCallout.length ? ["", ...questionCallout] : []),
        ...(supportingEvidence.length ? ["", ...supportingEvidence] : []),
        ...(implications.length ? ["", ...implications] : []),
        ...(openQuestions.length ? ["", ...openQuestions] : []),
        "",
        "## Sources",
        ...sourceLinks,
        "",
        "## Related",
        ...(related.length
          ? related.map((note) => `- [[${note.title}]] - ${note.rationale}`)
          : ["- None found above confidence threshold."]),
      ].join("\n");
      return { ...safeDraft, markdown };
    });
  },
};
