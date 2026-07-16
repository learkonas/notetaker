# cloud_job source

TypeScript source for the cloud job that turns inbox emails into draft Obsidian notes. Runs as a one-shot batch process (designed for Cloud Run jobs): it reads unprocessed emails from the inbox API, summarizes them, writes draft notes to a GCS bucket, then files the emails away.

## Layout

| Path | Purpose |
| --- | --- |
| `main.ts` | Entry point. Loads config and clients, then runs the skill pipeline. |
| `lib/` | Infrastructure: config loading, inbox API client, logging, the pipeline runner, and shared types. See `lib/README.md`. |
| `skills/` | The pipeline steps, each a self-contained `Skill`. See `skills/README.md`. |

## How it works

`main.ts` lists inbox emails, then runs each email individually through this skill chain, where each skill's output is the next skill's input:

```
inbox_list -> [per email] inbox_get -> parse_email -> extract_links -> fetch_links -> summarize -> render_draft -> gcs_put -> inbox_mark_processed
```

If the inbox is empty the job exits early. Each email is processed in isolation: when one fails (e.g. the Claude call errors), it is left in the inbox for the next run, the remaining emails still process, and a failure digest email is sent to `NOTIFY_EMAIL` at the end of the run. Any failures also set a non-zero exit code so Cloud Run marks the run as failed.

## Running

- `npm run dev` — run directly from source with `tsx` (loads `../.env`).
- `npm run typecheck` — type-check with `tsc` (no output; the deploy script runs this automatically). The deployed container also runs straight from source with `tsx`, so there is no build step.
- Configuration is environment variables validated in `lib/config.ts` (bucket name, inbox API URL and credentials, LLM provider, etc.).
