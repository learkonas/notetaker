import crypto from "node:crypto";
import { loadPrompt, loadSkillDoc, loadStyleDoc } from "../lib/skill_docs.js";
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

function buildMockDraft(ctx: CloudContext, email: SummarizationPayload): DraftNote {
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
    sourceUrl: email.hyperlinks[0]?.normalizedUrl,
    emailText: email.emailText,
    hyperlinks: email.hyperlinks,
    noteType: "article",
    sourceName: "Email",
    summary,
    keyPoints,
    analysis: "Mock analysis: run with LLM_PROVIDER=anthropic for real output.",
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
}

export const summarizeSkill: Skill<CloudContext, SummarizationPayload[], DraftNote[]> = {
  name: "summarize",
  async run(ctx, emails) {
    if (ctx.config.llmProvider === "anthropic" && !ctx.config.claudeApiKey) {
      throw new Error("CLAUDE_API_KEY is required when LLM_PROVIDER=anthropic");
    }

    const drafts: DraftNote[] = [];
    for (const email of emails) {
      const draft =
        ctx.config.llmProvider === "anthropic"
          ? await summarizeWithClaude(ctx, email)
          : buildMockDraft(ctx, email);
      drafts.push(draft);
    }
    ctx.logger.info({ count: drafts.length }, "summarize complete");
    return drafts;
  },
};

type ClaudeResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

function buildSummarizeInstructions(): string {
  return [
    loadPrompt("summary.md"),
    "The summary, keyPoints, and analysis fields will be rendered inside an Obsidian note. " +
      "Follow Obsidian Flavored Markdown conventions where formatting is needed, and follow " +
      "the tag conventions below when producing the tags field.",
    loadSkillDoc("obsidian-markdown", ["CALLOUTS.md", "PROPERTIES.md"]),
    "# Vault tag taxonomy\n\nThe type, source, and tags fields must follow these vault conventions:\n\n" +
      loadPrompt("tag_taxonomy.md"),
    "# Style rules\n\n" + loadStyleDoc("style_rules.md"),
  ].join("\n\n---\n\n");
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);

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
      throw new Error(`Claude request failed (non-retryable): ${response.status} ${await response.text()}`);
    }
    if (attempt < 3) {
      logger.warn({ attempt, status: response.status, delayMs }, "Claude request failed; retrying");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    } else {
      throw new Error(`Claude request failed after 3 attempts: ${response.status}`);
    }
  }
  // unreachable
  throw new Error("fetchWithRetry: exhausted");
}

/** Claude often wraps JSON in a markdown code fence; strip it before parsing. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

type SummarizeOutput = {
  summary?: string;
  keyPoints?: string[];
  analysis?: string;
  questions?: string[];
  type?: string;
  source?: string;
  tags?: string[];
  evidenceQuotes?: string[];
  confidence?: number;
  qualityFlags?: string[];
};

async function summarizeWithClaude(ctx: CloudContext, email: SummarizationPayload): Promise<DraftNote> {
  const prompt = [
    "Summarize and analyze this email. Return strict JSON only.",
    JSON.stringify({
      subject: email.subject,
      from: email.from,
      emailText: email.emailText,
      hyperlinks: email.hyperlinks.map((link) => ({
        anchorText: link.anchorText,
        url: link.normalizedUrl,
      })),
      linkedArticles: email.linkContents.map((content) => ({
        url: content.resolvedUrl,
        title: content.title,
        content: content.markdown,
      })),
    }),
    "Output fields: summary,keyPoints,analysis,questions,type,source,tags,evidenceQuotes,confidence,qualityFlags",
  ].join("\n\n");

  const response = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ctx.config.claudeApiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ctx.config.claudeModel,
        max_tokens: 16000,
        thinking: { type: "disabled" },
        system: buildSummarizeInstructions(),
        messages: [{ role: "user", content: prompt }],
      }),
    },
    ctx.logger,
  );

  const payload = (await response.json()) as ClaudeResponse;
  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new Error(`Claude returned an empty response for message ${email.messageId}`);
  }

  let parsed: SummarizeOutput;
  try {
    parsed = JSON.parse(extractJson(text)) as SummarizeOutput;
  } catch {
    throw new Error(`Claude response was not valid JSON for message ${email.messageId}`);
  }
  if (!parsed.summary || !parsed.keyPoints?.length || !parsed.analysis) {
    throw new Error(`Claude response missing required fields for message ${email.messageId}`);
  }

  return {
    messageId: email.messageId,
    threadId: email.threadId,
    internalDate: email.internalDate,
    from: email.from,
    subject: email.subject,
    sourceUrl: email.linkContents[0]?.resolvedUrl ?? email.hyperlinks[0]?.normalizedUrl,
    emailText: email.emailText,
    hyperlinks: email.hyperlinks,
    noteType: parsed.type?.trim() || "article",
    sourceName: parsed.source?.trim() || "AI Notetaker",
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    analysis: parsed.analysis,
    questions: parsed.questions ?? [],
    tags: sanitizeTags(parsed.tags ?? []),
    evidenceQuotes: parsed.evidenceQuotes ?? [],
    confidence: parsed.confidence ?? 0.5,
    qualityFlags: parsed.qualityFlags ?? [],
    contentHash: crypto.createHash("sha256").update(email.emailText).digest("hex"),
    pipelineVersion: ctx.config.pipelineVersion,
    createdAt: new Date().toISOString(),
  };
}
