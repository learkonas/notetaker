# CLAUDE.md — Gmail to Obsidian Agent

This file provides guidance for AI assistants working in this codebase.

## Project overview

A two-stage pipeline that ingests Gmail newsletters/emails, summarizes them with an LLM, and writes them as structured Markdown notes into an Obsidian vault.

- **Stage 1 (`apps/cloud_job`)**: runs on Google Cloud Run (scheduled daily). Reads Gmail, produces draft JSON/Markdown, stores in GCS.
- **Stage 2 (`apps/local_sync`)**: runs locally on Windows. Pulls GCS drafts, enriches with vault context, and writes Obsidian notes.
- **`shared/`**: shared TypeScript types, JSON schemas, and prompts consumed by both apps.

## Repository structure

```
/
├── apps/
│   ├── cloud_job/          # Cloud Run job: Gmail ingestion → GCS drafts
│   │   ├── src/
│   │   │   ├── main.ts         # Entry point; wires pipeline
│   │   │   ├── lib/
│   │   │   │   ├── config.ts   # Zod env validation + loadConfig()
│   │   │   │   ├── log.ts      # Pino logger factory
│   │   │   │   ├── skill.ts    # Skill<Ctx,In,Out> interface + runPipeline()
│   │   │   │   └── types.ts    # CloudContext, DraftNote, ParsedEmail, etc.
│   │   │   ├── skills/         # One file per pipeline step
│   │   │   └── tools/
│   │   │       └── get_refresh_token.ts   # One-time OAuth helper
│   │   ├── .env.example
│   │   └── tsconfig.json
│   └── local_sync/         # Local runner: GCS drafts → Obsidian vault notes
│       ├── src/
│       │   ├── main.ts         # Entry point; three sub-commands: run|sync|index
│       │   ├── lib/            # Same structure: config, log, skill, types
│       │   └── skills/         # One file per pipeline step
│       ├── .env.example
│       └── tsconfig.json
├── shared/
│   ├── src/index.ts        # Re-exported shared types (DraftNote, QualityScore, etc.)
│   ├── schemas/
│   │   └── draft_note.json # JSON Schema for DraftNote (used by AJV validation)
│   ├── prompts/            # Markdown prompt templates
│   └── style/
│       ├── style_rules.md
│       ├── style_examples/ # Sample notes for style learning
│       └── style_profile.json   # Generated; do not edit manually
├── docs/
│   ├── PIPELINE_DEEP_DIVE.md   # Detailed step-by-step pipeline explanation
│   ├── HOUSE_STYLE.md          # Obsidian note style guide
│   └── OPERATIONS.md           # Cloud deploy + Windows Task Scheduler runbook
├── Example notes/          # Sample Obsidian notes used for style profiling
├── scripts/
│   ├── cloud-deploy.ps1
│   ├── cloud-trigger.ps1
│   └── local-run.ps1
├── Dockerfile              # Multi-stage build for cloud_job only
├── tsconfig.base.json      # Shared TS compiler options
├── pnpm-workspace.yaml
└── package.json            # Root workspace; delegates to app workspaces
```

## Core architectural pattern: Skills + Pipeline

Every pipeline step is a **Skill**:

```ts
// apps/*/src/lib/skill.ts
export interface Skill<Ctx, Input, Output> {
  name: string;
  run(ctx: Ctx, input: Input): Promise<Output>;
}
```

Skills are chained with `runPipeline`, which passes each skill's output as the next skill's input:

```ts
export async function runPipeline<Ctx, T>(
  ctx: Ctx,
  skills: Skill<Ctx, unknown, unknown>[],
  initialInput: T,
): Promise<unknown>
```

**Rules when adding or modifying a skill:**
- Export a single `const <name>Skill: Skill<Ctx, Input, Output>` from the file.
- Skills must not mutate `ctx` except for attaching derived data defined on the context type (e.g., `ctx.styleProfile`, `ctx.noteIndex`).
- Skills may throw — `runPipeline` does not catch; a thrown error aborts the rest of the pipeline.
- Keep each skill file focused on one responsibility.

## Cloud pipeline skill order

`apps/cloud_job/src/main.ts`:

1. `gmailListSkill` — queries Gmail, returns `GmailMessageRef[]`
2. `gmailGetSkill` — fetches full message payloads
3. `parseEmailSkill` — decodes MIME, extracts headers → `ParsedEmail[]`
4. `extractLinksSkill` — pulls and deduplicates hyperlinks
5. `summarizeSkill` — builds `DraftNote[]`; mock heuristics or OpenAI
6. `renderDraftSkill` — creates GCS key prefix + Markdown preview
7. `gcsPutSkill` — writes `.json` + `.md` under `drafts/YYYY-MM-DD/<messageId>`
8. `gmailMarkProcessedSkill` — applies `ai-processed` label, removes from INBOX

**Important**: Gmail archiving happens only after successful GCS write. Never reorder steps 7 and 8.

## Local pipeline skill order

`apps/local_sync/src/main.ts` (sub-command `run`):

1. `gcsListGetSkill` — downloads all unprocessed drafts from GCS
2. `vaultScanSkill` — indexes all `.md` files in vault → `ctx.noteIndex`
3. `embedSkill` — placeholder (no-op today)
4. `retrieveRelatedSkill` — lexical token overlap → top-5 related notes per draft
5. `styleProfileSkill` — reads sample notes, extracts `StyleProfile` → `ctx.styleProfile`
6. `qualityScoreSkill` — deterministic heuristic scoring (1–5 buckets per dimension)
7. `enrichMarkdownSkill` — builds full Markdown with frontmatter + fixed sections
8. `styleRewriteSkill` — appends TODO stubs for any missing `requiredSections`
9. `styleValidateSkill` — computes `styleScore`; sets `needsReview` if `< 0.8`
10. `writeNoteSkill` — routes to inbox or review folder; slugified filename
11. `checkpointSkill` — records `messageId` to `.local/checkpoint.json`
12. `gcsCleanupSkill` — deletes GCS drafts older than `RETAIN_DRAFT_DAYS`

Sub-commands:
- `sync` — only runs `gcsListGetSkill` (download drafts without processing)
- `index` — runs `vaultScanSkill` + `styleProfileSkill` only (rebuild style profile)

## TypeScript conventions

- **Strict mode** everywhere: `strict: true`, `noUncheckedIndexedAccess: true`.
- **Module system**: `"type": "module"` in all `package.json`. Always use `.js` extensions in imports (resolves to `.ts` at dev time via tsx, `.js` at runtime).
- **Target**: `ES2022`, `NodeNext` module + resolution.
- **No path aliases** — use relative imports only.
- **Types live in `lib/types.ts`** per app; shared types are re-exported from `shared/src/index.ts`.
- Do not use `any`; use `unknown` and narrow explicitly.
- Prefer `const` assertions and discriminated unions over loose typing.

## Configuration

Config is loaded and validated with **Zod** at startup in `lib/config.ts` per app. If required env vars are missing, the process throws immediately.

### `apps/cloud_job` environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GCS_BUCKET` | yes | — | GCS bucket name |
| `GMAIL_CLIENT_ID` | yes | — | OAuth2 client ID |
| `GMAIL_CLIENT_SECRET` | yes | — | OAuth2 client secret |
| `GMAIL_REFRESH_TOKEN` | yes | — | OAuth2 refresh token |
| `GMAIL_USER` | no | `me` | Gmail user identifier |
| `GMAIL_QUERY` | no | `in:inbox -label:ai-processed` | Supports `{TODAY_START_UNIX}` placeholder |
| `GMAIL_PROCESSED_LABEL` | no | `ai-processed` | Label applied after processing |
| `LLM_PROVIDER` | no | `mock` | `mock` or `openai` |
| `OPENAI_API_KEY` | if openai | — | Required when `LLM_PROVIDER=openai` |
| `OPENAI_MODEL` | no | `gpt-4.1-mini` | OpenAI model name |
| `MAX_EMAILS_PER_RUN` | no | `25` | Cap 1–500 |
| `PIPELINE_VERSION` | no | `0.1.0` | Stamped onto drafts |

### `apps/local_sync` environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GCS_BUCKET` | yes | — | GCS bucket name |
| `OBSIDIAN_VAULT_PATH` | yes | — | Absolute path to Obsidian vault |
| `INBOX_FOLDER` | no | `Inbox Notes` | Vault-relative destination |
| `REVIEW_FOLDER` | no | `Inbox Notes/Needs Review` | For low-quality/style notes |
| `STYLE_SAMPLE_PATH` | no | `Example notes` | Relative to cwd or repo root |
| `PIPELINE_VERSION` | no | `0.1.0` | |
| `RETAIN_DRAFT_DAYS` | no | `30` | Days before GCS draft deletion |

## Logging

Both apps use **pino** (structured JSON). Logger interface on context:

```ts
logger.info(obj: unknown, msg?: string)
logger.warn(obj: unknown, msg?: string)
logger.error(obj: unknown, msg?: string)
```

Always pass a structured object as the first argument and the message string second:

```ts
ctx.logger.info({ count: drafts.length, messageId }, "skill complete");
```

Do not use `console.log` — use `ctx.logger`.

## Data contract: DraftNote

`DraftNote` is the central data structure exchanged between both stages via GCS. The canonical schema is `shared/schemas/draft_note.json`. The TypeScript type is defined in both `apps/*/src/lib/types.ts` and `shared/src/index.ts` (keep them in sync).

Key fields:
- `messageId` — Gmail message ID; used as idempotency key on both sides
- `contentHash` — SHA-256 of raw `emailText`
- `pipelineVersion` — stamped at creation; enables schema migration tracking
- `confidence` — float `[0.5, 1.0]` from mock; `[0, 1]` from OpenAI

## Idempotency guarantees

- **Cloud side**: `gmailListSkill` queries `in:inbox -label:ai-processed`, so messages already labeled are never re-fetched. GCS objects are overwritten by `messageId` prefix, so re-runs are safe.
- **Local side**: `.local/checkpoint.json` tracks processed `messageId`s. Drafts matching a checkpointed ID are skipped entirely. Never delete this file unless you intend to reprocess all history.

## LLM integration

The summarize skill has two modes toggled by `LLM_PROVIDER`:

- **`mock`** (default): fully deterministic heuristics, no external calls, safe for testing.
- **`openai`**: calls `POST https://api.openai.com/v1/responses` with structured JSON prompt. Falls back to mock output on parse failure.

When adding new LLM integrations, follow the same pattern: build mock heuristics first, add the LLM path as an opt-in, keep deterministic fallback.

## File naming and note output

Output note filenames follow: `<YYYY-MM-DD> - <slugified-subject>.md`

- Numeric suffixes (`-2`, `-3`) are appended on filename collision.
- Notes go to `INBOX_FOLDER` by default; `REVIEW_FOLDER` when `needsReview=true`.
- `needsReview` is triggered by: quality `accuracy < 4` OR `overall < 4`, or `styleScore < 0.8`.

## Tag sanitization rules

Applied in `summarizeSkill` and must be applied wherever tags are produced:

- Strip leading `#` characters.
- Replace whitespace with `-`.
- Lowercase entire tag.
- Preserve `/` path separators; sanitize each segment separately.
- Remove non-`[a-z0-9_-]` characters.
- Drop empty tags and purely numeric tags (must contain at least one letter).
- Deduplicate.

## Package manager and scripts

**Package manager**: pnpm (via corepack). `npm` workspace commands also work.

```bash
# Install all dependencies
npm install
# or: corepack pnpm install

# Cloud job — local test run (uses tsx, reads .env)
npm run cloud:run

# Cloud job — get Gmail OAuth token (one-time setup)
npm run cloud:oauth-token

# Local sync — full run (process all new drafts)
npm run local:run

# Local sync — rebuild style profile only
npm run local:index

# Build for production (both apps)
npm run build --workspace=@apps/cloud_job
npm run build --workspace=@apps/local_sync
```

There are no test scripts in this project currently. When adding tests, add a `test` script to the relevant workspace `package.json`.

## Docker / Cloud deployment

The `Dockerfile` builds only `apps/cloud_job` using a two-stage build (build → runtime on `node:20-slim`). The runtime image runs `node apps/cloud_job/dist/main.js`.

Deployment uses Google Cloud Run Jobs + Cloud Scheduler. See `docs/OPERATIONS.md` for the full gcloud command sequence. Scripts in `scripts/cloud-deploy.ps1` and `scripts/cloud-trigger.ps1` automate this on Windows.

## Shared artifacts

- `shared/prompts/` — Markdown prompt templates referenced by skills. Keep prompts in files rather than hardcoded strings.
- `shared/style/style_rules.md` — Canonical style rules for note generation.
- `shared/style/style_profile.json` — Auto-generated by `styleProfileSkill`; **do not edit manually**. Regenerate with `npm run local:index`.
- `shared/schemas/draft_note.json` — JSON Schema (draft 2020-12) for `DraftNote`. Update when adding new required fields.

## Key docs

- `docs/PIPELINE_DEEP_DIVE.md` — exhaustive step-by-step explanation of both pipelines including scoring formulas, quality gates, and known limits.
- `docs/HOUSE_STYLE.md` — note style guide inferred from the vault (voice, structure, formatting).
- `docs/OPERATIONS.md` — Cloud Run Job deploy commands, scheduler setup, Windows Task Scheduler config, and troubleshooting.

## What to avoid

- Do not commit `.env` files (already in `.gitignore`).
- Do not commit `shared/style/style_profile.json` if it contains local vault paths.
- Do not reorder `gcsPutSkill` and `gmailMarkProcessedSkill` — archiving must follow successful persistence.
- Do not bypass the checkpoint — deleting `.local/checkpoint.json` will cause duplicate note writes.
- Do not use `any` types; use `unknown` and narrow.
- Do not use `console.log`; use `ctx.logger`.
- Do not mutate `ctx.config`; it is read-only after `loadConfig()`.
- Never add `avgLength`/`avgBullets` enforcement without updating `StyleProfile` type and downstream callers.
