# AI Assistant Guide

> Read this file at the start of every session. 
This file provides guidance for AI assistants working on this repository.

## Rules for working with the human

- Read `AGENTS.md` and relevant directory-level READMEs when needed, specially before embarking on big changes

- Follow a structured workflow: brainstorm → plan → execute → document

- Give concise, direct answers to direct questions

- When completing a feature, update the relevant READMEs — do NOT put codebase-specific knowledge in this file

- Never recommend destructive or risky commands (`DROP TABLE`, `git push --force`, `rm -rf`, etc.) without an explicit warning about what will be lost — default to safe, data-preserving alternatives


## Principles

- Ask, don't assume. If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.

- Simplest solution first. Always implement the simplest thing that could work. Do not add abstractions or flexibility that weren't explicitly requested.

- Don't touch unrelated code. If a file or function is not directly part of the current task, do not modify it, even if you think it could be improved.

- Flag uncertainty explicitly. If you are not confident about an approach or technical detail, say so before proceeding. Confidence without certainty causes more damage than admitting a gap.

- I'm always open to ideas on better ways to do things. Please don't hesitate to suggest a better way, or one that has long lasting impact over a tactical change.


## Code Style

- Favour the simplest possible implementation — always ask "is there a simpler way?" before settling on an approach
- Keep diffs small — change only what's necessary rather than restructuring surrounding code
- Clean up dead code proactively — unused imports, variables, and props should be removed during or after feature work
- Use British English spelling throughout code, UI copy, docs, and comments (e.g. analyse, colour, favourite, organised)

## Frontend

- When a change is requested for mobile, always scope it behind a responsive breakpoint — never apply mobile-only changes unconditionally to all screen sizes

## Git Workflow

- Never commit on the user's behalf — stage changes and let the user commit themselves
- Use git worktrees for working on multiple features in parallel on separate branches
- Keep documentation current: READMEs should be updated after every plan execution