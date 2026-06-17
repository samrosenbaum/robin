import { defineTool } from "eve/tools";
import { generateObject } from "ai";
import { z } from "zod";

const PitchSection = z.object({
  primitive: z
    .string()
    .describe(
      'The specific Vercel primitive this section pitches — e.g. "AI Gateway", "Vercel Workflow", "Vercel Sandbox", "v0", "Fluid Compute"',
    ),
  heading: z.string().describe("Section heading — 6 to 10 words"),
  body: z
    .string()
    .describe(
      "60-90 words tying this primitive to the company's actual stack and what they do. Concrete, not abstract.",
    ),
});

const Pitch = z.object({
  headline: z.string().describe("≤ 12 words, names the company explicitly"),
  subheadline: z.string().describe("One sentence, concrete benefit"),
  hookLine: z
    .string()
    .describe(
      "One short line that sets up the pitch — e.g. 'AI safety needs durable, observable infrastructure.'",
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
      "The single business outcome the pitch is built around. Each section ties back to this outcome.",
    ),
  outcomeRationale: z
    .string()
    .describe(
      "One sentence on why this outcome is the right lead for this specific company — reference their stack or stage.",
    ),
  sections: z
    .array(PitchSection)
    .min(3)
    .max(3)
    .describe(
      "Exactly three sections. Each names a Vercel primitive AND explicitly closes by stating how it advances the chosen primaryOutcome.",
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
      system: `You are a Vercel solutions engineer writing a custom landing page for a sales meeting. Your reader is technical but their decision-making lens is **business outcomes**, not primitives. The pitch leads with an outcome and uses the primitives as evidence.

## Pick the lead outcome first

The pitch is built around exactly ONE primary outcome that matters most for this specific company:

- **ship-faster** — for teams whose competitive edge is iteration speed. Best for early-stage startups, design-led companies, anyone deploying weekly+.
- **no-devops** — for teams that don't want a platform-engineer hire. Best for under-20-engineer startups, founder-led tech orgs.
- **lower-infra-cost** — for teams with growing infra spend. Best for I/O-heavy AI workloads where Fluid Compute's active-CPU pricing dominates the savings.
- **better-dx** — for teams whose engineering hiring/retention depends on stack quality. Best for tools companies, dev-facing products, Series A+ where talent matters.
- **ai-features-faster** — for AI-native companies. Best when the company is shipping LLM features and competing on velocity of new model integrations.
- **global-performance** — for content/commerce/consumer where p95 latency dollars are visible.

## Then choose THREE primitives that support that outcome

Each section names a primitive AND closes with how it advances the chosen outcome. Don't pitch the primitive on its own — pitch what it lets the company *achieve*.

Primitives you can name:
- AI Gateway — one API across providers, fallbacks, budgets, observable.
- Vercel Sandbox — Firecracker microVMs for AI-generated/untrusted code.
- Vercel Workflow — durable execution that survives function kills.
- Fluid Compute — active-CPU pricing, in-function concurrency for I/O-heavy work.
- v0 — text-to-component generation.
- Vercel Functions — framework-defined serverless, the baseline.
- Edge / CDN — global delivery, anycast, instant invalidation.

## Voice

Confident, specific, low on adjectives. No "leverage", "empower", "unleash", "supercharge", "synergy", "next-generation". Cite the company's actual stack and recent moves. Never fabricate.

The reader is in a live meeting with a Vercel AE; they don't need to learn what Vercel is — they need to see why the move is good for *their* business.`,
      prompt: `Company: ${input.companyName}
What they do: ${input.oneLineDescription}
Target audience: ${input.targetAudience}
Stack signals: ${input.stackSignals.join(", ") || "unknown"}
Recent moves: ${input.recentMoves.join("; ") || "none captured"}
Already on Vercel: ${input.alreadyOnVercel ? "yes" : "no / unknown"}

Step 1 — Decide the single primaryOutcome that matters most for *this* company. Be opinionated. An AI-native Series B picks ai-features-faster or lower-infra-cost. A growth-stage SaaS picks ship-faster or better-dx. A content company picks global-performance. A bootstrapped 5-person startup picks no-devops.

Step 2 — Write a one-sentence outcomeRationale grounded in their actual stack or stage.

Step 3 — Pick three primitives that each clearly advance that outcome. Each section closes by stating the outcome-advancement explicitly.

If alreadyOnVercel is true, frame as "go deeper into primitives you're not using yet."
If alreadyOnVercel is false, frame as a migration story.

Produce the structured pitch.`,
    });
    return object;
  },
});
