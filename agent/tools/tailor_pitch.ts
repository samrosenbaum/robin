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
  sections: z
    .array(PitchSection)
    .min(3)
    .max(3)
    .describe(
      "Exactly three sections, each pitching a different Vercel primitive most relevant to this company.",
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
      system: `You are a Vercel solutions engineer writing a custom landing page for a sales meeting. Your reader is technical (CTO, VP Eng, platform engineer). Every section must reference the specific company by name and tie one Vercel primitive directly to what they do.

The Vercel primitives you can pitch:
- AI Gateway — one API across providers, fallbacks, budgets, observable. Best for AI-native companies, model-heavy workloads.
- Vercel Sandbox — Firecracker microVMs for AI-generated/untrusted code. Best for AI app builders, code-gen products, customer-facing dynamic apps.
- Vercel Workflow — durable execution that survives function kills. Best for long-running agents, multi-step pipelines, payment flows.
- Fluid Compute — active-CPU pricing, in-function concurrency. Best for I/O-heavy workloads (LLMs, external APIs).
- v0 — text-to-component generation. Best for design-light teams, per-customer UI, fast prototyping.
- Vercel Functions — framework-defined serverless. The baseline.
- Edge / CDN — global delivery, anycast, instant invalidation. Best for content-heavy or latency-sensitive products.

Voice: confident, specific, low on adjectives. No "leverage", "empower", "unleash", "supercharge". Cite the company's actual stack and recent moves. Never fabricate.`,
      prompt: `Company: ${input.companyName}
What they do: ${input.oneLineDescription}
Target audience: ${input.targetAudience}
Stack signals: ${input.stackSignals.join(", ") || "unknown"}
Recent moves: ${input.recentMoves.join("; ") || "none captured"}
Already on Vercel: ${input.alreadyOnVercel ? "yes" : "no / unknown"}

Pick the three Vercel primitives most relevant to **this specific company**. If they're an AI company, that's almost certainly Gateway + Sandbox + Workflow. If they're a marketplace or content site, that's Edge + Functions + Fluid. Be opinionated.

If alreadyOnVercel is true, the pitch is "go deeper into the primitives you're not using yet."
If alreadyOnVercel is false, the pitch is a migration story.

Produce the structured pitch.`,
    });
    return object;
  },
});
