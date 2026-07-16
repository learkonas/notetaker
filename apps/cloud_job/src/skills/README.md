# skills

Each file exports one `Skill` (see `../lib/skill.ts`): a named step with a `run(ctx, input)` function. `main.ts` chains them with `runPipeline`, so each skill's output type must match the next skill's input type.

Pipeline order and data flow:

| Skill | Input → Output | What it does |
| --- | --- | --- |
| `inbox_list.ts` | `void` → `InboxEmailSummary[]` | Lists up to `MAX_EMAILS_PER_RUN` unprocessed inbox emails, oldest first. |
| `inbox_get.ts` | summaries → `InboxEmailFull[]` | Fetches the full body for each listed email. |
| `parse_email.ts` | full emails → `ParsedEmail[]` | Normalizes each email: strips `Fwd:`/`Fw:` prefixes from subjects, converts HTML bodies to clean markdown with Defuddle (falling back to plain tag-stripping when Defuddle over-prunes), fills in fallback subject/date/thread values. |
| `extract_links.ts` | parsed → `LinkedEmail[]` | Extracts hyperlinks from text (regex) and HTML (cheerio anchors), strips everything after `?` in URLs, dedupes by normalized URL, and drops known tracking domains. |
| `fetch_links.ts` | linked → `SummarizationPayload[]` | Follows up to 5 links per email, extracts each page's main content as markdown with Defuddle (20s timeout, 15k chars per link), and attaches it as `linkContents` so the summariser sees the actual linked articles. Fetch failures skip the link, never the email. |
| `summarize.ts` | payloads → `DraftNote[]` | Builds a draft note per email via the Claude Messages API (`CLAUDE_MODEL`, default `claude-opus-4-8`): summary, key points, analysis, questions, note type, source, sanitized tags, evidence quotes, confidence. Instructions combine `shared/prompts/summary.md`, the `obsidian-markdown` skill doc, `shared/prompts/tag_taxonomy.md`, and `shared/style/style_rules.md`. There is no fallback: an empty/invalid response throws, leaving the email unprocessed for the next run. `LLM_PROVIDER=mock` keeps a heuristic draft for local testing. |
| `render_draft.ts` | drafts → `RenderedDraft[]` | Renders each draft to markdown and assigns a GCS object prefix of the form `drafts/<date>/<messageId>`. |
| `gcs_put.ts` | rendered → `PersistedDraft[]` | Writes two objects per draft to the configured bucket: `<prefix>.json` (full draft data) and `<prefix>.md` (rendered note). |
| `inbox_mark_processed.ts` | persisted → `PersistedDraft[]` | Marks each processed email as read and moves it to the processed folder (default `ai-processed`), creating the folder if needed and handling the create/list race. |

To add a skill: export a `Skill<CloudContext, In, Out>` from a new file here and insert it at the right point in the chain in `main.ts`.
