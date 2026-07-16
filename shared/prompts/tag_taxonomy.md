---
type: reference
tags:
  - meta
---

# Tag Taxonomy

This note defines the metadata strategy for this vault. All notes should follow it.

## Structure

Every note has YAML frontmatter with **properties** for single-valued metadata and **tags** for multi-valued subjects:

```yaml
---
type: article        # required, exactly one
source: Stratechery  # optional
status: needs-review # optional
tags:
  - political-economy
  - history
  - europe
  - italy
  - vatican
---
```

## type (required, pick exactly one)


| Value       | Use for                                                          |
| ----------- | ---------------------------------------------------------------- |
| `article`   | Notes on an article, newsletter issue, or blog post              |
| `book`      | Book notes                                                       |
| `talk`      | Talks, webinars, conference sessions, podcasts                   |
| `meeting`   | Meetings, calls, chats with people                               |
| `event`     | An event where the notes are on speakers and what they presented |
| `idea`      | Own thinking, essays, hypotheses                                 |
| `reference` | Templates, checklists, how-tos, lists, evergreen reference       |
| `personal`  | Personal admin, self-assessments, misc private notes             |


## source (optional)

Where the note came from. Title Case. By type:

- **Articles/talks**: the publication or community — `Noahpinion`, `Stratechery`, `Bismarck Brief`, `The Diff`, `Not Boring`, `Lenny`, `Palladium`, `ACX`, `Works in Progress`, `Roote`, `Culture3`
- **Books** (`type: book`): the author's name — `John Keay`, `Henry Kissinger`, `George Gilder`
- **Captured notes**: the capture channel — `Email`, `AI Notetaker`
- **Other**: blank

Add new ones in the same style.

## status (optional)

- `needs-review` — captured but not yet processed (e.g. Inbox Notes)
- `stub` — note is empty or too thin to tag/link meaningfully

## tags

Two kinds of tags, both lowercase kebab-case, all in frontmatter:

**1. Broad topic tags** — pick a few. Prefer these existing ones but create new ones if none are appropriate:

`startups`, `business-strategy`, `product`, `marketing`, `management`, `leadership`, `teams`, `hiring`, `organisational-design`, `ai`, `web3`, `technology`, `economy`, `political-economy`, `history`, `economic-history`, `geopolitics`, `china` (or another country), `politics`, `culture`, `society`, `personal-development`, `progress`, `writing`, `career`

**2. Niche tags** — unlimited, for precise retrieval: specific entities, concepts, people, places (`tsmc`, `polygyny`, `kissinger`, `taiwan`, `quantum-computing`). Add freely; keep kebab-case.

Do not use inline `#tags` in the note body.

## Linking

Every note should contain **at least 3 wikilinks** to other notes in the vault. Prefer inline links where the connection is natural; otherwise add a `## Related` section at the end with linked notes. Links must point to notes that actually exist.

## Tag index

All tags currently in use, with note counts. Generated 2026-07-16 — regenerate when tags change (ask the agent, or check the Tags pane for a live view).

**Topics (5+ notes):** `startups` (33) · `management` (23) · `technology` (23) · `culture` (21) · `politics` (21) · `economy` (19) · `ai` (18) · `business-strategy` (18) · `teams` (18) · `web3` (18) · `marketing` (14) · `geopolitics` (13) · `career` (12) · `history` (11) · `society` (11) · `political-economy` (10) · `china` (8) · `progress` (8) · `product` (7) · `stub` (7) · `personal-development` (6)

**Recurring (2–4 notes):** `niches` (4) · `ai-alignment` (3) · `empowered-belonging` (3) · `important` (3) · `writing` (3) · `ai-governance` (2) · `anthropology` (2) · `climate` (2) · `coding` (2) · `distribution-products` (2) · `emerging-economies` (2) · `finance` (2) · `future-of-work` (2) · `govai` (2) · `hse` (2) · `migration` (2) · `mimetics` (2) · `moderation` (2) · `norway` (2) · `pakistan` (2) · `platforms` (2) · `quantum-computing` (2) · `storytelling` (2) · `stripe` (2) · `ukraine` (2) · `usa` (2) · `web-summit` (2)

**Niche (1 note each):** `acausal-trade` · `advice` · `aging` · `ai-adoption` · `american-democracy` · `antitrust` · `art` · `asml` · `automation` · `b2c` · `batteries` · `big-tech` · `bitcoin` · `bnpl` · `boundless-leadership` · `bridewealth` · `bundling` · `bureaucracy` · `bureaucratic-capacity` · `c-suite` · `cardano` · `career-development` · `celo` · `chairing` · `charity` · `citizen-engagement` · `civil-war` · `collective-memory` · `collectivization` · `constitutional-republic` · `cultural-evolution` · `cybersecurity` · `deliberative-democracy` · `design` · `digital-capitalism` · `digital-markets-act` · `direct-democracy` · `drones` · `economic-incentives` · `economic-stagnation` · `education` · `effective-altruism` · `elite-capture` · `elk` · `emotional-intelligence` · `ethereum` · `eu-regulation` · `europe-economy` · `executive-coaching` · `family-dynamics` · `gaming-industry` · `gdpr` · `gen-z-economy` · `gender-roles` · `germany` · `governance-reform` · `hardware` · `healthcare-employment` · `heureka-labs` · `historical-analysis` · `historical-research` · `huawei` · `hunter-gatherers` · `identity` · `identity-politics` · `india` · `inflation` · `inheritance` · `innovation-policy` · `investing` · `jenkins-the-valet` · `jobs` · `jumpstart` · `kissinger` · `labor-market-regulation` · `labour` · `layer-2` · `local-elites` · `market-volatility` · `marriage-systems` · `media` · `meditation` · `metaverse` · `minerals` · `modern-relationships` · `monogamy` · `nationalism` · `north-korea` · `obspoken` · `oil` · `oxford` · `palantir` · `pastoralism` · `peptides-market` · `philippines` · `poetry` · `political-polarization` · `polygyny` · `populism` · `prediction-markets` · `programming` · `progressive-era` · `qing-dynasty` · `racial-animus` · `research` · `sales` · `semiconductors` · `side-hustles` · `silicon-valley` · `slavery` · `social-identity` · `social-media` · `social-structure` · `startup-liquidity` · `state-building` · `state-capacity-reversal` · `strava` · `superhero-workforce` · `system-design` · `taiwan` · `tally-labs` · `taxation` · `team-dynamics` · `tech-industry` · `technology-trends` · `toucan` · `tsmc` · `twitter` · `uk` · `unions` · `unireach` · `ussr` · `vc` · `venture-capital` · `watching-the-english` · `waterstones` · `works-council`

## Related

- [[Things to read]]
- [[Small Notes]]
- [[Inspiration]]

