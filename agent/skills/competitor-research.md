---
description: A repeatable methodology for analyzing competitors when researching a launch — what to pull, in what order, and how to structure the output.
---

# Skill: Competitor research

Use this skill when you need to map a competitive landscape for a launch
brief. Load when the user mentions a category that already has incumbents
(devtools, AI infra, SaaS, etc.).

## Procedure

For each candidate competitor, capture exactly four things — no more, no
less. The model is wasting context if it pulls more than this.

1. **Positioning headline** — the line they actually lead their site with.
   This is the version of the pitch they decided is most defensible. Do not
   paraphrase; quote.
2. **Pricing tier shape** — number of tiers, the lowest paid tier, whether
   pricing is published or "contact us". Hidden pricing is itself a signal.
3. **Key differentiator** — the single property they bet on that nothing
   else in the space has. One sentence.
4. **Recent move** — most recent shipped feature or launch (≤ 90 days). If
   nothing in that window, the company is stalled and that's notable.

## Output shape

Return strict JSON. The downstream `copywriter` skill expects this shape:

```json
{
  "summary": "one-sentence read on the competitive landscape",
  "competitors": [
    {
      "name": "Linear",
      "positioning": "The issue tracker built for high-performance teams.",
      "pricingShape": "3 tiers, $8/seat min, fully published",
      "differentiator": "Speed and design discipline over feature breadth.",
      "recentMove": "Linear Asks (Slack → issues), Sep 2024"
    }
  ]
}
```

## Heuristics

- **Cap at 4 competitors.** Beyond 4, ROI on additional research falls
  fast and the copywriter step ignores them anyway.
- **Skip the obvious decoys.** If a "competitor" is 50× larger than the
  user, they're a market — not a competitor. Exclude.
- **Prefer current over comprehensive.** A 6-month-old comparison is
  noise. A this-quarter read is signal.
