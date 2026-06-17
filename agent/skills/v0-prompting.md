---
description: How to prompt v0 effectively for production-quality landing pages. Load before calling build_landing_page.
---

# Skill: Prompting v0 for production pages

Use this skill before calling the `build_landing_page` tool. The
difference between a v0 output that ships and one that gets thrown
away is almost entirely in the prompt.

## The four-block prompt

Every v0 prompt should have exactly these four blocks, in this order:

```
1. Identity — who is reading this page
2. Outcome — what they should feel/do
3. Content — the actual copy (headline, subhead, body, CTA)
4. Constraints — style + framework + components
```

### 1. Identity

Be specific about the *role* and *seniority*. "Engineers" is too broad.
"Backend engineers evaluating infra for a 50-person team" is right.

### 2. Outcome

Name the action you want, not the abstract feeling. Not "trust", but
"click the CTA before scrolling past the hero".

### 3. Content

Pass through the structured copy brief from the `copywriter` tool
verbatim. Do not let v0 rewrite your headline — it will get worse.

### 4. Constraints

These constraints reliably produce production-ready output:

- "Use Tailwind. Use shadcn/ui Button and Card. Dark mode by default."
- "Minimal, monospace headings. No gradient backgrounds."
- "Hero section, 3-tier pricing table, FAQ accordion, footer."
- "Return only the React component code. No explanation."

## Anti-patterns

- **Over-constraining color** — v0 picks dark palettes well. If you
  pass specific hex codes it gets stuck. Let it pick within "dark".
- **Asking for animation** — v0's animation defaults are noisy. Better
  to ask for "minimal hover states only".
- **Including layout instructions in the headline** — v0 will literally
  put the words "above the fold" into the page. Keep layout in block 4.

## Sandbox verification

After v0 returns, the `build_landing_page` tool writes the output into
the agent's sandbox and runs `wc -l` (or `next build` in a future
version) to confirm the code parses. If you see fewer than 100 lines
returned, the prompt was probably too vague — re-prompt with more
specific content.
