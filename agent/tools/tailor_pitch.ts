import { defineTool } from "eve/tools";
import { generateObject } from "ai";
import { z } from "zod";

const PitchSection = z.object({
  primitive: z
    .string()
    .describe(
      'The specific Vercel primitive this section pitches — e.g. "AI Gateway", "Vercel Workflow", "Vercel Sandbox", "v0", "Fluid Compute"',
    ),
  claim: z
    .string()
    .describe(
      "The single word or 1-2 word chunk of the valueProp this section owns. E.g. if valueProp is 'Smarter agents shipped faster', claims might be 'Smarter', 'Reliable', 'Faster'. Together the three claims should map back to the valueProp.",
    ),
  heading: z.string().describe("Section heading — 6 to 10 words"),
  body: z
    .string()
    .describe(
      "60-90 words. Open by stating *how* this primitive delivers the claim concretely (with their stack), then back it up with a specific capability. Never just list the primitive's features — always frame as 'because Sandbox does X, your agents get Y'.",
    ),
});

const Pitch = z.object({
  valueProp: z.object({
    statement: z
      .string()
      .describe(
        "The single value-prop sentence in the company's own language. 4-9 words. This is the page's H1. Examples: 'Smarter agents shipped faster.' / 'Lower latency. Higher conversion.' / 'Compliant, observable, fast.'",
      ),
    explanation: z
      .string()
      .describe(
        "One sentence (20-40 words) explaining what that means specifically for this company — references their product or stack.",
      ),
  }),
  hookLine: z
    .string()
    .describe(
      "One short line that sets up the pitch above the H1 — e.g. 'For AI-native teams.' or '${company}, on Vercel.'",
    ),
  cta: z.string().describe("≤ 4 words, verb-first"),
  primaryOutcome: z
    .enum([
      "ship-faster",
      "no-devops",
      "lower-infra-cost",
      "better-dx",
      "ai-features-faster",
      "global-performance",
    ])
    .describe(
      "Internal taxonomy: the business outcome category this value prop falls under. Used for downstream routing.",
    ),
  outcomeRationale: z
    .string()
    .describe(
      "One sentence on why this value prop is the right lead for this specific company — reference their stack, stage, or product.",
    ),
  sections: z
    .array(PitchSection)
    .min(3)
    .max(3)
    .describe(
      "Exactly three sections. The three sections together should *deliver* the valueProp — each one owns a distinct chunk (its `claim`). Pick primitives such that the claims combine to support the value prop.",
    ),
  migrationAngle: z
    .enum(["already-on-vercel", "from-aws", "from-cloudflare", "greenfield"])
    .describe(
      "How to frame the pitch. If detected as already on Vercel, lean into deeper primitives. If on AWS/Cloudflare, frame as migration.",
    ),
});

const MODEL = "anthropic/claude-sonnet-4.6";

export default defineTool({
  description:
    "Write a Vercel-on-their-stack pitch tailored to a specific company. Takes the research output and returns a structured pitch: headline, subhead, 3 sections each emphasizing one Vercel primitive most relevant to the company. Call after research_company.",
  inputSchema: z.object({
    companyName: z.string(),
    oneLineDescription: z.string(),
    stackSignals: z.array(z.string()),
    targetAudience: z.string(),
    recentMoves: z.array(z.string()),
    alreadyOnVercel: z.boolean(),
  }),
  outputSchema: Pitch,
  async execute(input) {
    const { object } = await generateObject({
      model: MODEL,
      schema: Pitch,
      system: `You are a Vercel solutions engineer writing a custom landing page for a sales meeting. The page leads with a **value prop in the company's own language**, then proves it with three Vercel primitives — each primitive owns a labeled chunk of the value prop.

## Structure the pitch like this

1. **valueProp.statement** — the page's H1. The single promise to this specific company, said in 4-9 words in their language. Examples:
   - For an agent-building company: "Smarter agents shipped faster."
   - For a fintech: "Compliant. Observable. Fast."
   - For a marketplace: "Lower latency. Higher conversion."
   - For an AI infra company: "Production-grade AI, from prompt to user."

2. **Three sections, each owning a labeled chunk of the value prop.** The chunks must compose back into the value prop. For "Smarter agents shipped faster":
   - "Smarter" → Vercel Sandbox (because agents can safely run code → expanded capability)
   - "Reliable" → Vercel Workflow (because durable sessions don't drop mid-run)
   - "Shipped faster" → AI Gateway (because one API → no provider integration tax)

Each section's body opens by stating **how** the primitive delivers its claim concretely, citing the company's stack or product. Never list primitive features in the abstract — always "because this primitive does X, your agents/users/team get Y."

## Pick the value prop first

Think about what would actually matter to this company's CTO/CEO/founder watching this page in a meeting:

- **AI-native / agent builders** — "Smarter agents shipped faster" / "Production-grade AI, fast." Primitives: Sandbox + Workflow + Gateway.
- **Dev tools** — "Better DX, faster ship" / "Tools your engineers actually want to use." Primitives: Functions + v0 + Preview URLs.
- **Marketplaces/commerce** — "Lower latency. Higher conversion." Primitives: Edge + Fluid + ISR.
- **Fintech/regulated** — "Compliant, observable, fast." Primitives: Workflow + Observability + Edge.
- **AI-native + small team** — "Production AI without a platform team." Primitives: Functions + Gateway + Workflow.
- **Bootstrapped / founder-led** — "Ship like a team twice your size." Primitives: Functions + v0 + Preview URLs.

If they're already on Vercel, the value prop pivots to "what they can unlock that they aren't using yet." If on AWS, frame as the migration outcome.

## Primitives you can name

- **AI Gateway** — one API across providers, fallbacks, budgets, observable.
- **Vercel Sandbox** — Firecracker microVMs for AI-generated/untrusted code.
- **Vercel Workflow** — durable execution that survives function kills.
- **Fluid Compute** — active-CPU pricing, in-function concurrency.
- **v0** — text-to-component generation.
- **Vercel Functions** — framework-defined serverless, the baseline.
- **Edge / CDN** — global delivery, anycast, instant invalidation.
- **Vercel Observability** — runs, traces, vitals built in.

## Voice

Confident, specific, low on adjectives. No "leverage", "empower", "unleash", "supercharge", "synergy". Cite the company's actual stack and recent moves. Never fabricate. The reader is in a live meeting with a Vercel AE; they don't need to learn what Vercel is — they need to see why this move makes their product better.`,
      prompt: `Company: ${input.companyName}
What they do: ${input.oneLineDescription}
Target audience: ${input.targetAudience}
Stack signals: ${input.stackSignals.join(", ") || "unknown"}
Recent moves: ${input.recentMoves.join("; ") || "none captured"}
Already on Vercel: ${input.alreadyOnVercel ? "yes" : "no / unknown"}

Step 1 — Write the value prop in **this company's own language**. What would matter to their CTO/CEO watching this page? An agent-building company gets "Smarter agents shipped faster" — not "AI features faster." A commerce company gets "Lower latency. Higher conversion." — not "global performance." Make the H1 sound like something you'd put on *their* homepage.

Step 2 — Pick three primitives that *together* deliver that value prop. Each primitive owns one chunk of the H1 (the section's "claim"). The three claims should compose back into the value prop.

Step 3 — Write each section's body so it opens with **how** the primitive concretely delivers its claim for this specific company (their stack, their product), then states the supporting capability.

Step 4 — Set primaryOutcome to the closest match in the taxonomy — this is internal categorization, not the surfaced copy.

If alreadyOnVercel is true: frame as "deeper into the platform." If false: frame as the migration outcome they'd unlock.

Produce the structured pitch.`,
    });
    return object;
  },
});
