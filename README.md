# Email Inbox to Obsidian Agent

Daily email ingestion (via the self-hosted Cloudflare `email_inbox` worker) + local Obsidian note finalization pipeline.

## What this does

- Cloud job pulls unprocessed emails from `notetaker@leonasskau.com` via the inbox API at `https://inbox.leonasskau.com` once per day.
- Converts email HTML to clean markdown with Defuddle, extracts hyperlinks (query strings stripped), and fetches the actual content of up to 5 linked pages per email.
- Summarizes with Claude (`claude-opus-4-8` by default), guided by the vault's Tag Taxonomy, the quality rubric, and the style rules. No fallback: failed emails stay in the inbox for the next run and a failure digest is emailed to `NOTIFY_EMAIL`.
- Stores drafts in GCS under `drafts/YYYY-MM-DD/<messageId>.json`.
- Local runner pulls drafts, finds related vault notes via embeddings then re-ranks them with a small OpenAI call (`enrich_links`), applies style/quality gates, and writes notes with Tag Taxonomy frontmatter (`type`/`source`/`status`/`tags`) and title-only filenames.
- Emails are marked read and moved to the `ai-processed` folder only after draft persistence succeeds.

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
   - `CF_ACCESS_CLIENT_ID`
   - `CF_ACCESS_CLIENT_SECRET`
   - `GCS_BUCKET`
5. Fill required local settings in `apps/local_sync/.env`:
   - `GCS_BUCKET`
   - `OBSIDIAN_VAULT_PATH`
   - optional retention: `RETAIN_DRAFT_DAYS=30`

## Cloudflare Access service token

The inbox API sits behind Cloudflare Access. The cloud job authenticates with a service token:

1. In the Zero Trust dashboard: Access -> Service auth -> Service Tokens -> Create Service Token. Save the Client ID and Client Secret (the secret is shown only once).
2. On the Access application for `inbox.leonasskau.com`, add a policy with action **Service Auth** and rule Selector = "Service Token" -> your new token.
3. Put the Client ID and Secret into `apps/cloud_job/.env` as `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`.

The job sends these as `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers on every request.

## Run commands

- Cloud local test:
  - `npm run cloud:run`
- Local sync + finalize:
  - `npm run local:run`
- Local index/style profile only:
  - `npm run local:index`

Optional pnpm usage:
- `corepack pnpm cloud:run`
- `corepack pnpm local:run`

## Processing model

- The job lists emails in the `inbox` folder of the `notetaker@leonasskau.com` mailbox (oldest first, capped by `MAX_EMAILS_PER_RUN`).
- Each email runs through the pipeline in isolation: a failure (e.g. Claude error) leaves that email in the inbox for the next run and never blocks the others. Failures are reported in a single digest email to `NOTIFY_EMAIL` (default `leo.nasskau@gmail.com`), sent through the inbox API's compose endpoint.
- After a draft is persisted to GCS, the email is marked read and moved to the folder named by `INBOX_PROCESSED_FOLDER` (default `ai-processed`; created automatically on first run).
- Anything still in `inbox` is unprocessed, so re-runs are idempotent.

## Prompts and taxonomy

- The summarize call's system prompt combines `shared/prompts/summary.md`, the `obsidian-markdown` skill doc, `shared/prompts/tag_taxonomy.md`, and `shared/style/style_rules.md`.
- `shared/prompts/tag_taxonomy.md` is a snapshot of the vault's `Tag Taxonomy.md`; `scripts/cloud-deploy.ps1` refreshes it from the vault on every deploy.

## Lockdown checklist

- Rotate any keys/tokens shared in chat or logs.
- Keep `apps/*/.env` out of source control (already in `.gitignore`).
- Only send to `notetaker@leonasskau.com` from addresses you trust; anyone who emails it gets a note drafted.
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
