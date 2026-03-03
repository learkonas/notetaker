import crypto from "node:crypto";
import type { Skill } from "../lib/skill.js";
import type { CloudContext, DraftNote, SummarizationPayload } from "../lib/types.js";

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const split = cleaned.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  return split[0] ? `${split[0]}.` : cleaned.slice(0, 300);
}

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
  if (!/[a-z]/.test(normalized)) return null; // avoid numeric-only tags like 1984
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

export const summarizeSkill: Skill<CloudContext, SummarizationPayload[], DraftNote[]> = {
  name: "summarize",
  async run(ctx, emails) {
    if (ctx.config.llmProvider === "openai" && !ctx.config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
    }

    const drafts: DraftNote[] = emails.map((email) => {
      const sourceUrl = email.hyperlinks[0]?.normalizedUrl;
      const summary = firstSentence(email.emailText);
      const keyPoints = email.emailText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 40)
        .slice(0, 5);
      const evidenceQuotes = keyPoints.slice(0, 3).map((line) => `"${line.slice(0, 220)}"`);
      const confidence = Math.min(1, Math.max(0.5, keyPoints.length / 5));

      return {
        messageId: email.messageId,
        threadId: email.threadId,
        internalDate: email.internalDate,
        from: email.from,
        subject: email.subject,
        sourceUrl,
        emailText: email.emailText,
        hyperlinks: email.hyperlinks,
        summary,
        keyPoints,
        analysis: "Mock analysis: replace with LLM provider integration in summarize skill.",
        questions: [
          "What assumption in this email is least supported?",
          "How does this connect to existing strategy notes?",
        ],
        tags: sanitizeTags(["inbox", "email", "summary"]),
        evidenceQuotes,
        confidence,
        qualityFlags: confidence < 0.7 ? ["low-confidence"] : [],
        contentHash: crypto.createHash("sha256").update(email.emailText).digest("hex"),
        pipelineVersion: ctx.config.pipelineVersion,
        createdAt: new Date().toISOString(),
      };
    });

    ctx.logger.info({ count: drafts.length }, "summarize complete");
    if (ctx.config.llmProvider === "openai") {
      return summarizeWithOpenAI(ctx, drafts);
    }
    return drafts;
  },
};

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  logger: CloudContext["logger"],
): Promise<Response> {
  let delayMs = 1000;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, init);
    if (response.ok) return response;
    if (!RETRYABLE_STATUS.has(response.status)) {
      throw new Error(`OpenAI request failed (non-retryable): ${response.status} ${await response.text()}`);
    }
    if (attempt < 3) {
      logger.warn({ attempt, status: response.status, delayMs }, "OpenAI request failed; retrying");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    } else {
      throw new Error(`OpenAI request failed after 3 attempts: ${response.status}`);
    }
  }
  // unreachable
  throw new Error("fetchWithRetry: exhausted");
}

async function summarizeWithOpenAI(ctx: CloudContext, drafts: DraftNote[]): Promise<DraftNote[]> {
  const updated: DraftNote[] = [];
  for (const draft of drafts) {
    const prompt = [
      "Summarize and analyze this email. Return strict JSON only.",
      JSON.stringify({
        subject: draft.subject,
        from: draft.from,
        emailText: draft.emailText,
        hyperlinks: draft.hyperlinks,
      }),
      "Output fields: summary,keyPoints,analysis,questions,tags,evidenceQuotes,confidence,qualityFlags",
    ].join("\n\n");

    const response = await fetchWithRetry(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: ctx.config.openaiModel,
          input: prompt,
        }),
      },
      ctx.logger,
    );
    const payload = (await response.json()) as OpenAIResponse;
    const text = payload.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text
      ?? payload.output?.flatMap((o) => o.content ?? []).find((c) => Boolean(c.text))?.text;
    if (!text) {
      ctx.logger.warn({ messageId: draft.messageId }, "OpenAI returned empty response; using mock draft");
      updated.push(draft);
      continue;
    }
    try {
      const parsed = JSON.parse(text) as {
        summary?: string;
        keyPoints?: string[];
        analysis?: string;
        questions?: string[];
        tags?: string[];
        evidenceQuotes?: string[];
        confidence?: number;
        qualityFlags?: string[];
      };
      updated.push({
        ...draft,
        summary: parsed.summary ?? draft.summary,
        keyPoints: parsed.keyPoints ?? draft.keyPoints,
        analysis: parsed.analysis ?? draft.analysis,
        questions: parsed.questions ?? draft.questions,
        tags: sanitizeTags(parsed.tags ?? draft.tags),
        evidenceQuotes: parsed.evidenceQuotes ?? draft.evidenceQuotes,
        confidence: parsed.confidence ?? draft.confidence,
        qualityFlags: parsed.qualityFlags ?? draft.qualityFlags,
      });
    } catch {
      ctx.logger.warn({ messageId: draft.messageId }, "OpenAI response JSON parse failed; using mock draft");
      updated.push(draft);
    }
  }
  return updated;
}
