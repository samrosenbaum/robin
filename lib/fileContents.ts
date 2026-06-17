export const FILE_CONTENTS: Record<string, string> = {
  "agent.ts": `import { Agent } from "@vercel/eve";
import { workflow } from "@vercel/workflow";
import { gateway } from "@vercel/ai-gateway";
import { sandbox } from "@vercel/sandbox";
import { connect } from "@vercel/connect";

import { research } from "./agent/tools/research";
import { copywriter } from "./agent/tools/copywriter";
import { v0Builder } from "./agent/tools/v0-builder";
import { slackChannel } from "./agent/channels/slack";
import { linearChannel } from "./agent/channels/linear";

import systemPrompt from "./agent/instructions/system.md";

export const launchAgent = new Agent({
  name: "launch-intelligence",
  model: gateway("anthropic/claude-sonnet-4-6"),
  instructions: systemPrompt,

  tools: [research, copywriter, v0Builder],
  channels: [slackChannel, linearChannel],

  workflow: workflow({
    steps: ["research", "brief", "copy", "v0-build", "outreach"],
    checkpoint: "after-each-step",
    storage: "vercel-kv",
  }),

  sandbox: sandbox({
    runtime: "node20",
    timeout: 120_000,
  }),

  connect: connect({
    integrations: ["slack", "linear"],
  }),
});

export default launchAgent;
`,

  "system.md": `# Launch Intelligence — System Prompt

You are **Eve**, an autonomous launch agent operating inside Vercel's
agent framework. You ship marketing artifacts end-to-end: research,
positioning, copy, a v0-generated landing page, and outreach.

## Operating principles

1. **Checkpoint everything.** Every meaningful step writes state to
   the workflow. Assume the function will be killed at any moment —
   leave behind enough state to resume cleanly.
2. **Defer to humans on tone, not on speed.** Draft, ship, then ask
   for review via Slack and Linear.
3. **Cite competitors.** No positioning claim should be made without
   a competitor reference pulled in the research step.

## Workflow

\`research → brief → copy → v0-build → outreach\`

Each step is a durable workflow node. The agent must call
\`workflow.checkpoint()\` before transitioning.

## Tone

Technical, specific, slightly opinionated. Talk to CTOs and VPs of
Engineering at Series A/B AI-native startups. Do not write marketing
filler. If you cannot back a claim with a number, cut the sentence.
`,

  "slack.ts": `import { channel } from "@vercel/eve";
import { connect } from "@vercel/connect";

export const slackChannel = channel({
  id: "slack",
  auth: connect.oauth("slack", {
    scopes: ["chat:write", "channels:read"],
  }),

  async post({ token, message, channel: target }) {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${token}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: target,
        text: message.text,
        blocks: message.blocks,
      }),
    });

    if (!res.ok) {
      throw new Error(\`slack post failed: \${res.status}\`);
    }

    return res.json();
  },
});
`,

  "linear.ts": `import { channel } from "@vercel/eve";
import { connect } from "@vercel/connect";

const LINEAR_API = "https://api.linear.app/graphql";

export const linearChannel = channel({
  id: "linear",
  auth: connect.oauth("linear", {
    scopes: ["issues:write", "teams:read"],
  }),

  async createIssue({ token, title, description, teamId, labels }) {
    const query = \`
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    \`;

    const res = await fetch(LINEAR_API, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { input: { title, description, teamId, labelIds: labels } },
      }),
    });

    return res.json();
  },
});
`,

  "research.ts": `import { tool } from "@vercel/eve";
import { gateway } from "@vercel/ai-gateway";
import { z } from "zod";

export const research = tool({
  name: "research",
  description: "Research competitors and current positioning for a launch.",

  input: z.object({
    topic: z.string(),
    competitors: z.array(z.string()).optional(),
  }),

  async run({ input, workflow }) {
    const model = gateway("anthropic/claude-sonnet-4-6");

    const competitors = input.competitors ?? [
      "Vercel",
      "Netlify",
      "Render",
      "Railway",
    ];

    const findings = await model.generate({
      system: "You are a competitive research analyst.",
      prompt: \`Topic: \${input.topic}. Competitors: \${competitors.join(", ")}.\`,
    });

    await workflow.checkpoint("research", { findings, competitors });
    return { findings, competitors };
  },
});
`,

  "copywriter.ts": `import { tool } from "@vercel/eve";
import { gateway } from "@vercel/ai-gateway";
import { z } from "zod";

export const copywriter = tool({
  name: "copywriter",
  description: "Draft launch copy: headline, subhead, body, CTA.",

  input: z.object({
    brief: z.string(),
    persona: z.string(),
    tone: z.enum(["technical", "playful", "executive"]),
  }),

  async run({ input, workflow }) {
    const model = gateway("anthropic/claude-sonnet-4-6");

    const draft = await model.generate({
      system: \`You write launch copy for \${input.persona}. Tone: \${input.tone}.\`,
      prompt: input.brief,
      maxTokens: 1500,
    });

    await workflow.checkpoint("copy", { draft });
    return draft;
  },
});
`,

  "v0-builder.ts": `import { tool } from "@vercel/eve";
import { sandbox } from "@vercel/sandbox";
import { v0 } from "@v0-sdk/core";
import { z } from "zod";

export const v0Builder = tool({
  name: "v0-builder",
  description: "Generate and preview a landing page component via v0.",

  input: z.object({
    copy: z.object({
      headline: z.string(),
      subhead: z.string(),
      body: z.string(),
      cta: z.string(),
    }),
    style: z.enum(["minimal", "bold", "editorial"]).default("minimal"),
  }),

  async run({ input, workflow }) {
    // Spin a sandbox to scaffold the page in isolation.
    const sb = await sandbox.create({ runtime: "node20" });

    const generation = await v0.generate({
      prompt: \`Landing page. Headline: \${input.copy.headline}.
               Subhead: \${input.copy.subhead}.
               Style: \${input.style}.\`,
      framework: "next",
    });

    await sb.write("/workspace/page.tsx", generation.code);
    const build = await sb.exec("pnpm build", { cwd: "/workspace" });

    if (build.exitCode !== 0) {
      throw new Error(\`v0 build failed: \${build.stderr}\`);
    }

    const preview = await v0.deploy(generation.id);

    await workflow.checkpoint("v0-build", {
      previewUrl: preview.url,
      lines: generation.code.split("\\n").length,
    });

    await sb.destroy();
    return { previewUrl: preview.url };
  },
});
`,

  "sandbox.ts": `import { sandbox as base } from "@vercel/sandbox";

export const sandbox = base.configure({
  runtime: "node20",
  timeout: 120_000,
  resources: {
    cpu: 2,
    memoryMb: 2048,
  },

  // Mount the agent's workspace into every sandbox so generated
  // artifacts can be inspected after a run.
  mounts: [
    {
      source: "./agent/sandbox/workspace",
      target: "/workspace",
      mode: "rw",
    },
  ],

  // Network policy: only allow outbound to v0 + npm.
  network: {
    egress: ["v0.dev", "registry.npmjs.org"],
  },
});
`,

  "catalog.yml": `version: 2

models:
  - name: launches
    description: One row per launch run, with status + costs.
    columns:
      - name: run_id
        type: string
        primary_key: true
      - name: agent
        type: string
      - name: started_at
        type: timestamp
      - name: finished_at
        type: timestamp
      - name: status
        type: enum
        values: [running, interrupted, succeeded, failed]
      - name: total_tokens
        type: integer
      - name: cost_usd
        type: numeric

  - name: checkpoints
    description: Per-step checkpoints written by the workflow primitive.
    columns:
      - name: run_id
        type: string
      - name: step
        type: string
      - name: payload
        type: jsonb
      - name: created_at
        type: timestamp
`,

  "gateway.json": `{
  "$schema": "https://vercel.com/schemas/ai-gateway.json",
  "routes": [
    {
      "match": { "tool": "research" },
      "model": "anthropic/claude-sonnet-4-6",
      "fallback": "anthropic/claude-haiku-4-5"
    },
    {
      "match": { "tool": "copywriter" },
      "model": "anthropic/claude-sonnet-4-6",
      "temperature": 0.7
    },
    {
      "match": { "tool": "v0-builder" },
      "model": "anthropic/claude-sonnet-4-6",
      "maxTokens": 4000
    }
  ],
  "budgets": {
    "perRun": { "tokens": 50000, "usd": 0.50 },
    "perDay": { "usd": 25.00 }
  },
  "observability": {
    "logTokens": true,
    "logLatency": true,
    "sink": "vercel-otel"
  }
}
`,

  "connect.json": `{
  "$schema": "https://vercel.com/schemas/connect.json",
  "integrations": [
    {
      "id": "slack",
      "provider": "slack",
      "scopes": ["chat:write", "channels:read"],
      "tokenStorage": "vercel-kv",
      "rotateOnExpiry": true
    },
    {
      "id": "linear",
      "provider": "linear",
      "scopes": ["issues:write", "teams:read"],
      "tokenStorage": "vercel-kv",
      "rotateOnExpiry": true
    }
  ],
  "audit": {
    "logResolutions": true,
    "sink": "vercel-otel"
  }
}
`,

  "workflow.json": `{
  "$schema": "https://vercel.com/schemas/workflow.json",
  "name": "launch-intelligence",
  "steps": [
    { "id": "research",  "timeout": 60000,  "retries": 2 },
    { "id": "brief",     "timeout": 30000,  "retries": 1 },
    { "id": "copy",      "timeout": 60000,  "retries": 2 },
    { "id": "v0-build",  "timeout": 180000, "retries": 1 },
    { "id": "outreach",  "timeout": 30000,  "retries": 3 }
  ],
  "checkpoint": {
    "strategy": "after-each-step",
    "storage": "vercel-kv",
    "ttlSeconds": 86400
  },
  "resumption": {
    "enabled": true,
    "maxAgeSeconds": 3600
  }
}
`,

  "page.tsx": `import { launchAgent } from "@/agent";
import { AgentRunner } from "@vercel/eve/react";

export default function LaunchPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="font-mono text-sm">launch-intelligence</h1>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <AgentRunner
          agent={launchAgent}
          defaultPrompt="Ship the v2 pricing page — tie it to our Series B announcement, target CTO/VP Eng personas"
        />
      </section>
    </main>
  );
}
`,

  "vercel.json": `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "app/agent/route.ts": {
      "memory": 1024,
      "maxDuration": 300
    }
  },
  "primitives": {
    "workflow": { "enabled": true },
    "sandbox":  { "enabled": true },
    "gateway":  { "enabled": true, "config": "./config/gateway.json" },
    "connect":  { "enabled": true, "config": "./config/connect.json" }
  }
}
`,

  "competitor-research.md": `---
description: A repeatable methodology for analyzing competitors when researching
  a launch — what to pull, in what order, and how to structure the output.
---

# Skill: Competitor research

Use this skill when you need to map a competitive landscape for a launch
brief. Load when the user mentions a category that already has incumbents
(devtools, AI infra, SaaS, etc.).

## Procedure

For each candidate competitor, capture exactly four things — no more, no
less. The model is wasting context if it pulls more than this.

1. **Positioning headline** — the line they actually lead their site with.
2. **Pricing tier shape** — number of tiers, lowest paid tier, whether
   pricing is published or "contact us". Hidden pricing is itself a signal.
3. **Key differentiator** — the single property they bet on that nothing
   else in the space has. One sentence.
4. **Recent move** — most recent shipped feature or launch (≤ 90 days).

## Output shape

Return strict JSON. The downstream copywriter skill expects this shape:

\\\`\\\`\\\`json
{
  "summary": "one-sentence read on the competitive landscape",
  "competitors": [
    {
      "name": "Linear",
      "positioning": "The issue tracker built for high-performance teams.",
      "pricingShape": "3 tiers, $8/seat min, fully published",
      "differentiator": "Speed and design discipline over feature breadth."
    }
  ]
}
\\\`\\\`\\\`

## Heuristics

- **Cap at 4 competitors.** Beyond 4, ROI on additional research falls fast.
- **Skip the obvious decoys.** If a "competitor" is 50× larger than the
  user, they're a market — not a competitor. Exclude.
- **Prefer current over comprehensive.** A 6-month-old comparison is noise.
`,

  "copy-craft.md": `---
description: Conversion copywriting principles for technical SaaS landing
  pages. Load when generating headline/subhead/body for a launch targeting
  engineers or technical leaders.
---

# Skill: Copy craft

Use this skill when writing copy for technical buyers (CTOs, VP Eng,
platform engineers, founding engineers).

## The 5-second test

A reader scans the headline + subhead and decides in five seconds whether
to keep reading. The test: would the reader you actually want feel a
specific tension *resolve* in those five seconds?

A passing headline:
- Names the specific category (pricing page, eval suite, billing infra)
- Promises one concrete outcome (predictable cost, faster iteration)
- Sounds like the user could quote it in a Slack thread without embarrassment

## Structure

| Field      | Length      | What it does                                    |
|------------|-------------|-------------------------------------------------|
| headline   | ≤ 12 words  | Names the problem and the resolution            |
| subhead    | 1 sentence  | Concrete benefit with a verb that isn't "enable"|
| body       | 60-90 words | The proof. Numbers, names, before/after.        |
| cta        | ≤ 4 words   | Verb-first. "See live pricing"                  |
| valueProps | 3 × ≤ 8 wds | Concrete features, not adjectives               |

## Words to never ship

- "leverage" — say "use"
- "empower" — say "let"
- "unleash", "unlock", "supercharge", "transform"
- "seamless", "robust", "scalable" (without a number attached)
- "10x", "best-in-class", "next-gen", "industry-leading"
`,

  "v0-prompting.md": `---
description: How to prompt v0 effectively for production-quality landing
  pages. Load before calling build_landing_page.
---

# Skill: Prompting v0 for production pages

Use this skill before calling the build_landing_page tool. The difference
between a v0 output that ships and one that gets thrown away is almost
entirely in the prompt.

## The four-block prompt

1. **Identity** — who is reading this page
2. **Outcome** — what they should feel/do
3. **Content** — the actual copy (headline, subhead, body, CTA)
4. **Constraints** — style + framework + components

### Constraints that reliably produce production output

- "Use Tailwind. Use shadcn/ui Button and Card. Dark mode by default."
- "Minimal, monospace headings. No gradient backgrounds."
- "Hero section, 3-tier pricing table, FAQ accordion, footer."
- "Return only the React component code. No explanation."

## Anti-patterns

- **Over-constraining color** — v0 picks dark palettes well.
- **Asking for animation** — v0's animation defaults are noisy.
- **Including layout in the headline** — v0 will literally put the words
  "above the fold" into the page.
`,

  "slack-formatting.md": `---
description: Slack Block Kit patterns for launch announcements. Load when
  calling post_to_slack so the message renders richly.
---

# Skill: Slack Block Kit for launch announcements

A plain-text Slack message is fine for a heads-up; a launch announcement
needs structure.

## Rules

- **Always link, never paste** raw URLs. Use \\\`<url|label>\\\` mrkdwn.
- **Header block first.** Slack collapses long messages — header always shows.
- **Actions block last.** Buttons at the bottom; CTA after content.
- **Keep total blocks ≤ 8.** Beyond that Slack truncates and buttons hide.
- **Use mrkdwn for sections.** plain_text doesn't parse markdown bold.

## Common mistakes

- Sending the v0 preview URL with its query string. Slack tries to unfurl;
  unfurl times out; message looks broken. Strip query, wrap in a button.
- Posting to #general. Always post to a launch-specific channel
  (#launches, #product-changes) so audience self-selects.
`,
};
