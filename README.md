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

## Style onboarding

- Put sample notes in `Example notes` (or set `STYLE_SAMPLE_PATH`).
- Run `npm run local:index` to generate `shared/style/style_profile.json`.

## Acceptance checks

- Re-run cloud job: no duplicate drafts by `messageId`.
- Re-run local run: no duplicate notes by frontmatter `message_id`.
- Low quality/style drafts route to `Inbox Notes/Needs Review`.
