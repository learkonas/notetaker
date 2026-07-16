import { loadPrompt } from "../lib/skill_docs.js";
import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft, RelatedNote } from "../lib/types.js";

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type AgentPick = {
  title?: string;
  rationale?: string;
};

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

function candidateSnippet(
  note: RelatedNote,
  noteIndex: LocalContext["noteIndex"],
): { title: string; path: string; tags: string[]; snippet: string; score: number } {
  const indexed = noteIndex?.find((n) => n.title === note.title || n.path === note.path);
  return {
    title: note.title,
    path: note.path,
    tags: indexed?.tags ?? [],
    snippet: (indexed?.body ?? "").replace(/\s+/g, " ").trim().slice(0, 400),
    score: Number(note.score.toFixed(3)),
  };
}

function fallbackRelated(candidates: RelatedNote[]): RelatedNote[] {
  return candidates.slice(0, 5);
}

async function pickRelatedWithOpenAI(
  ctx: LocalContext,
  draft: LocalDraft,
  candidates: RelatedNote[],
): Promise<RelatedNote[]> {
  const byTitle = new Map(candidates.map((c) => [c.title, c]));
  const prompt = [
    loadPrompt("enrich_links.md"),
    "",
    "Draft note:",
    JSON.stringify({
      subject: draft.subject,
      summary: draft.summary,
      analysis: draft.analysis,
      tags: draft.tags,
      keyPoints: draft.keyPoints.slice(0, 5),
    }),
    "",
    "Candidate notes (choose only from these titles):",
    JSON.stringify(candidates.map((c) => candidateSnippet(c, ctx.noteIndex))),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: ctx.config.openaiModel,
      instructions:
        "Return strict JSON only. Choose related notes only from the provided candidates.",
      input: prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`enrich_links OpenAI request failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const text =
    payload.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text ??
    payload.output?.flatMap((o) => o.content ?? []).find((c) => Boolean(c.text))?.text;

  if (!text) {
    throw new Error("enrich_links: OpenAI returned an empty response");
  }

  const parsed = JSON.parse(extractJson(text)) as { related?: AgentPick[] };
  const picks = Array.isArray(parsed.related) ? parsed.related : [];
  const selected: RelatedNote[] = [];
  const seen = new Set<string>();

  for (const pick of picks) {
    const title = pick.title?.trim();
    if (!title || seen.has(title)) continue;
    const candidate = byTitle.get(title);
    if (!candidate) continue;
    seen.add(title);
    selected.push({
      ...candidate,
      rationale: pick.rationale?.trim() || candidate.rationale,
    });
    if (selected.length >= 5) break;
  }

  if (selected.length < 3) {
    for (const candidate of candidates) {
      if (seen.has(candidate.title)) continue;
      selected.push(candidate);
      seen.add(candidate.title);
      if (selected.length >= 3) break;
    }
  }

  return selected.slice(0, 5);
}

export const enrichLinksSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "enrich_links",
  async run(ctx, drafts) {
    if (ctx.config.llmProvider !== "openai" || !ctx.config.openaiApiKey) {
      const updated = drafts.map((draft) => ({
        ...draft,
        relatedNotes: fallbackRelated(draft.relatedNotes ?? []),
      }));
      ctx.logger.info({ drafts: updated.length }, "enrich_links skipped (no OpenAI); kept top shortlist");
      return updated;
    }

    const updated: LocalDraft[] = [];
    for (const draft of drafts) {
      const candidates = draft.relatedNotes ?? [];
      if (candidates.length === 0) {
        updated.push(draft);
        continue;
      }
      try {
        const relatedNotes = await pickRelatedWithOpenAI(ctx, draft, candidates);
        updated.push({ ...draft, relatedNotes });
      } catch (err) {
        ctx.logger.warn(
          { messageId: draft.messageId, err: err instanceof Error ? err.message : err },
          "enrich_links failed; falling back to embedding shortlist",
        );
        updated.push({ ...draft, relatedNotes: fallbackRelated(candidates) });
      }
    }

    ctx.logger.info({ drafts: updated.length }, "enrich_links complete");
    return updated;
  },
};
