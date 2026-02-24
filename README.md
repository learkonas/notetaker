# Gmail to Obsidian Agent

Daily Gmail ingestion + local Obsidian note finalization pipeline.

## What this does

- Cloud job scans Gmail inbox once per day (`in:inbox -label:ai-processed`).
- Parses full email text, extracts hyperlink values, summarizes to draft JSON.
- Stores drafts in GCS under `drafts/YYYY-MM-DD/<messageId>.json`.
- Local runner pulls drafts, links to existing vault notes, applies style/quality gates, writes notes.
- Messages are labeled and archived only after draft persistence succeeds.

## Monorepo structure

- `apps/cloud_job`: scheduled cloud ingestion and draft creation.
- `apps/local_sync`: local vault indexing, enrichment, and writing.
- `shared`: schema/prompt/style artifacts.

## Documentation

- `docs/PIPELINE_DEEP_DIVE.md`: detailed explanation of each pipeline step, including summary generation, quality/style scoring, related-note retrieval, and style learning.

## Setup

1. Install Node.js 20+ and npm.
2. Install dependencies:
   - `npm install`
3. Create env files from examples:
   - `apps/cloud_job/.env.example` -> `apps/cloud_job/.env`
   - `apps/local_sync/.env.example` -> `apps/local_sync/.env`
4. Fill required cloud credentials in `apps/cloud_job/.env`:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REFRESH_TOKEN`
   - `GCS_BUCKET`
5. Fill required local settings in `apps/local_sync/.env`:
   - `GCS_BUCKET`
   - `OBSIDIAN_VAULT_PATH`
   - optional retention: `RETAIN_DRAFT_DAYS=30`

## Run commands

- Get Gmail refresh token (one-time):
  - `npm run cloud:oauth-token`
- Cloud local test:
  - `npm run cloud:run`
- Local sync + finalize:
  - `npm run local:run`
- Local index/style profile only:
  - `npm run local:index`

Optional pnpm usage:
- `corepack pnpm cloud:run`
- `corepack pnpm local:run`

## Gmail refresh token

- Run `npm run cloud:oauth-token`
- Open the URL printed in terminal
- Approve Gmail access
- Copy the printed `GMAIL_REFRESH_TOKEN` into `apps/cloud_job/.env`

## Query for today's emails

- Set `GMAIL_QUERY` in `apps/cloud_job/.env` to:
  - `in:inbox after:{TODAY_START_UNIX} -label:ai-processed`
- `{TODAY_START_UNIX}` is replaced automatically at runtime with local midnight.
- Add `MAX_EMAILS_PER_RUN` (for example `100`) to cap each daily run.

## Lockdown checklist

- Rotate any keys/tokens shared in chat or logs.
- Keep `apps/*/.env` out of source control (already in `.gitignore`).
- Use a dedicated Gmail inbox account, not your primary mailbox.
- Set narrow query filters in `GMAIL_QUERY` (date + labels/senders).
- Keep `MAX_EMAILS_PER_RUN` low initially (10-25) while validating.
- Set a monthly budget alert in GCP Billing.
- Run local finalize (`npm run local:run`) after cloud job schedule.
- Old cloud drafts already written locally are auto-cleaned after `RETAIN_DRAFT_DAYS`.

## Style onboarding

- Put sample notes in `Example notes` (or set `STYLE_SAMPLE_PATH`).
- Run `npm run local:index` to generate `shared/style/style_profile.json`.

## Acceptance checks

- Re-run cloud job: no duplicate drafts by `messageId`.
- Re-run local run: no duplicate notes by frontmatter `message_id`.
- Low quality/style drafts route to `Inbox Notes/Needs Review`.
