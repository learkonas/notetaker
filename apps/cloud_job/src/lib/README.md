# lib

Infrastructure shared by the pipeline skills. Nothing in here contains pipeline business logic — that lives in `../skills`.

| File | Purpose |
| --- | --- |
| `config.ts` | Loads and validates environment variables with zod (`loadConfig`). Defines defaults for the inbox API URL, mailbox, LLM provider, batch size, etc. Fails fast on missing required values like `GCS_BUCKET` and the Cloudflare Access credentials. |
| `inbox.ts` | HTTP client for the inbox API (`createInboxClient`). Authenticates with Cloudflare Access service-token headers and exposes list/get/move/mark-read/folder/send operations (`sendEmail` posts to the compose endpoint; `from` must equal the mailbox address). Detects redirects to the Access login page and raises a descriptive error. |
| `defuddle.ts` | `htmlToMarkdown` helper: runs Defuddle over an HTML string (via jsdom) to strip navigation/ads/boilerplate and return the main content as markdown plus a title. Used by `parse_email` and `fetch_links`. |
| `skill.ts` | The `Skill` interface and `runPipeline`, which chains skills by feeding each skill's output into the next. |
| `skill_docs.ts` | Loads skill documents and prompts from the repo-level `shared/` directory (`shared/skills/<name>/SKILL.md`, `shared/prompts/`). Walks up from the compiled file location so it works both locally and inside the Docker image. Results are cached in memory. |
| `log.ts` | Builds the pino logger. Level is controlled by `LOG_LEVEL` (default `info`). |
| `types.ts` | Shared types: `CloudContext` (config + logger + clients passed to every skill), and the data shapes that flow through the pipeline (`ParsedEmail`, `Hyperlink`, `SummarizationPayload`, `DraftNote`). |
