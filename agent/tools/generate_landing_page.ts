import { defineTool } from "eve/tools";
import { v0 } from "v0-sdk";
import { z } from "zod";

const GenerateOutput = z.object({
  previewUrl: z.string(),
  chatUrl: z.string(),
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    }),
  ),
  generationTimeMs: z.number(),
});

export default defineTool({
  description:
    "Generate a custom Next.js landing page via v0 using the tailored pitch. Returns the generated file set, the v0 preview URL, and the chat URL. Call after tailor_pitch. The output files are passed to verify_in_sandbox next.",
  inputSchema: z.object({
    companyName: z.string(),
    valueProp: z.object({
      statement: z.string(),
      explanation: z.string(),
    }),
    hookLine: z.string(),
    cta: z.string(),
    sections: z
      .array(
        z.object({
          primitive: z.string(),
          claim: z.string(),
          heading: z.string(),
          body: z.string(),
        }),
      )
      .min(3)
      .max(3),
  }),
  outputSchema: GenerateOutput,
  async execute(input) {
    if (!process.env.V0_API_KEY) {
      throw new Error(
        "V0_API_KEY is not set on the Vercel project — generation requires a v0 key.",
      );
    }
    const t0 = Date.now();

    const message = buildV0Prompt(input);

    const resp = await v0.chats.create({
      message,
      system:
        "You are an expert Next.js + Tailwind developer. Output a complete, production-ready landing page component with a hero, three feature sections, and a CTA. Use Tailwind utility classes. Dark mode background. Monospace headings. shadcn/ui Button. Return only React component code — no explanations.",
    });

    if (resp instanceof ReadableStream) {
      throw new Error("v0 returned a stream; expected an object response.");
    }

    const previewUrl = resp.latestVersion?.demoUrl ?? resp.webUrl;
    const files = (resp.latestVersion?.files ?? []).map((f) => ({
      name: f.name.replace(/^\/+/, ""),
      content: f.content,
    }));

    return {
      previewUrl,
      chatUrl: resp.webUrl,
      files,
      generationTimeMs: Date.now() - t0,
    };
  },
});

function buildV0Prompt(input: {
  companyName: string;
  valueProp: { statement: string; explanation: string };
  hookLine: string;
  cta: string;
  sections: {
    primitive: string;
    claim: string;
    heading: string;
    body: string;
  }[];
}): string {
  const sectionsText = input.sections
    .map(
      (s, i) =>
        `Section ${i + 1}:
- Claim label (top, small caps, accent color): "${s.claim}"
- Primitive (smaller, monospace, under the claim): "${s.primitive}"
- Heading (bold): "${s.heading}"
- Body: ${s.body}`,
    )
    .join("\n\n");

  return `Build a Next.js landing page for ${input.companyName}, built on Vercel.

The page has ONE big promise (the H1) and THREE supporting columns that each carry a chunk of that promise.

HERO:
- Hook line above H1 (small caps, accent color, tracking-wider): "${input.hookLine}"
- H1 (very large, monospace, tight tracking): "${input.valueProp.statement}"
- Subhead (one sentence under H1): "${input.valueProp.explanation}"
- CTA button (shadcn/ui Button, primary): "${input.cta}"

THREE SUPPORTING SECTIONS (rendered as a 3-column grid on desktop, stacked on mobile, with visible "claim" labels at the top of each card so the reader can see how each one contributes to the H1):

${sectionsText}

LAYOUT INTENT:
The reader should be able to look at the H1, then glance at the three claim labels on the columns and see them compose back into the H1. Each column's heading + body proves how that primitive delivers its claim.

STYLE:
- Dark theme (slate-950 / zinc-950 background, slate-50 / zinc-50 text)
- Monospace headings (Geist Mono via font-mono)
- Tailwind utility classes only — no inline styles
- shadcn/ui Button for CTA
- Each column has a subtle accent dot or border in a different color to mark it
- No gradient backgrounds, no hero illustration
- The company name "${input.companyName}" must appear in the hero or as eyebrow text
- Footer with a small "Built on Vercel · ${input.companyName}" line

Return ONLY the React component code. No explanation, no markdown wrappers, no installation notes.`;
}
