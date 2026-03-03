import type { Skill } from "../lib/skill.js";
import type { LocalContext, LocalDraft } from "../lib/types.js";

type EmbeddingResponse = {
  data: Array<{ embedding: number[]; index: number }>;
};

const EMBED_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;

async function fetchEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  const results: number[][] = new Array(texts.length);
  let offset = 0;
  for (const batch of batches) {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    if (!response.ok) {
      throw new Error(`Embeddings request failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as EmbeddingResponse;
    for (const item of payload.data) {
      results[offset + item.index] = item.embedding;
    }
    offset += batch.length;
  }
  return results;
}

export const embedSkill: Skill<LocalContext, LocalDraft[], LocalDraft[]> = {
  name: "embed",
  async run(ctx, drafts) {
    if (ctx.config.llmProvider !== "openai" || !ctx.config.openaiApiKey) {
      ctx.logger.info({ drafts: drafts.length }, "embed step skipped (lexical mode)");
      return drafts;
    }

    const apiKey = ctx.config.openaiApiKey;
    const noteIndex = ctx.noteIndex ?? [];

    // Build text representations
    const noticeTexts = noteIndex.map(
      (n) => `${n.title} ${n.aliases.join(" ")} ${n.body.slice(0, 500)}`.trim(),
    );
    const draftTexts = drafts.map(
      (d) => `${d.subject} ${d.summary} ${d.analysis}`.trim(),
    );
    const allTexts = [...noticeTexts, ...draftTexts];

    ctx.logger.info(
      { notes: noticeTexts.length, drafts: draftTexts.length },
      "embed: fetching embeddings",
    );
    const allEmbeddings = await fetchEmbeddings(allTexts, apiKey);

    // Write embeddings back to noteIndex
    for (let i = 0; i < noteIndex.length; i++) {
      noteIndex[i].embedding = allEmbeddings[i];
    }

    // Write embeddings onto drafts
    const updatedDrafts = drafts.map((draft, i) => ({
      ...draft,
      embedding: allEmbeddings[noteIndex.length + i],
    }));

    ctx.logger.info({ drafts: updatedDrafts.length }, "embed complete");
    return updatedDrafts;
  },
};
