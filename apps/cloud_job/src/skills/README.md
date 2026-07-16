# skills

Each file exports one `Skill` (see `../lib/skill.ts`): a named step with a `run(ctx, input)` function. `main.ts` chains them with `runPipeline`, so each skill's output type must match the next skill's input type.

Pipeline order and data flow:

| Skill | Input → Output | What it does |
| --- | --- | --- |
| `inbox_list.ts` | `void` → `InboxEmailSummary[]` | Lists up to `MAX_EMAILS_PER_RUN` unprocessed inbox emails, oldest first. |
| `inbox_get.ts` | summaries → `InboxEmailFull[]` | Fetches the full body for each listed email. |
| `parse_email.ts` | full emails → `ParsedEmail[]` | Normalizes each email: detects HTML bodies, strips tags to plain text, fills in fallback subject/date/thread values. |
| `extract_links.ts` | parsed → `SummarizationPayload[]` | Extracts hyperlinks from text (regex) and HTML (cheerio anchors), strips UTM params, dedupes by normalized URL, and drops known tracking domains. |
| `summarize.ts` | payloads → `DraftNote[]` | Builds a draft note per email: summary, key points, analysis, questions, sanitized tags, evidence quotes, confidence, and a content hash. Uses a heuristic mock by default; with `LLM_PROVIDER=openai` it calls the OpenAI Responses API (with retry/backoff) and falls back to the mock draft on empty or unparseable responses. Prompt instructions come from `shared/prompts/summary.md` plus the `obsidian-markdown` skill doc. |
| `render_draft.ts` | drafts → `RenderedDraft[]` | Renders each draft to markdown and assigns a GCS object prefix of the form `drafts/<date>/<messageId>`. |
| `gcs_put.ts` | rendered → `PersistedDraft[]` | Writes two objects per draft to the configured bucket: `<prefix>.json` (full draft data) and `<prefix>.md` (rendered note). |
| `inbox_mark_processed.ts` | persisted → `PersistedDraft[]` | Marks each processed email as read and moves it to the processed folder (default `ai-processed`), creating the folder if needed and handling the create/list race. |

To add a skill: export a `Skill<CloudContext, In, Out>` from a new file here and insert it at the right point in the chain in `main.ts`.
