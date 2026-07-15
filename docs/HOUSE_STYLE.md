# House Style Guide (Derived from Vault)

This guide is inferred from `154` markdown notes in your Obsidian vault at `C:\dev\obsidian_vault`.

## Quantitative profile

- Average note length: ~`2271` characters
- Average bullet density: ~`6.18` bullets per note
- Preferred tag style: inline hashtags with `#` prefix
- Most stable recurring blocks: thesis, key evidence, interpretation, and open questions.

## Voice and tone

- Write as a thinking partner: practical, exploratory, and opinionated.
- Prefer compressed insight over polished prose.
- Use direct language, first-principles framing, and concrete examples.
- Keep uncertainty visible when confidence is low (state assumptions and unknowns).

## Structure defaults

- Start with a strong title that names the core idea.
- Use bullets as the primary unit of thought.
- Keep paragraphs short; use section headers only when they clarify navigation.
- End with action-oriented prompts or open questions.

## Formatting conventions

- Tags are lowercase hashtags (for example: `#startup`, `#systemdesign`).
- Lists should be scannable and specific (avoid generic bullets).
- Links can appear inline near the claim they support.
- Keep note bodies mostly plain markdown without heavy formatting.

## Content heuristics

- Emphasize transferable principles over one-off facts.
- When summarizing sources, separate:
  - what happened,
  - why it matters,
  - what to do next.
- For strategy or product notes, prefer:
  - problem -> mechanism -> implication.

## Flexible note shape

```md
# <Title>

## Summary
**Core argument:** <one-line thesis>
- 2-5 bullets with the core thesis and stakes.

## Supporting Evidence & Key Ideas (optional)
- Main mechanisms, examples, or claims.

## Analysis
- Interpretation, trade-offs, and second-order effects.

## Open Questions (optional)
- Follow-ups, tests, or unresolved uncertainties.
```

## Rewrite rubric (for automated style rewrite)

- Preserve source meaning and evidence.
- Prefer concise bullets over long prose blocks.
- Do not force headers; include only blocks that improve comprehension or analysis.
- Add explicit "why this matters" language when missing.
- End with at least one concrete next-step question.
