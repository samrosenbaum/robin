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
    brand: z
      .object({
        primaryColor: z.string().optional(),
        accentColors: z.array(z.string()).optional(),
        visualStyle: z.string().optional(),
        typographyVibe: z.string().optional(),
        voiceSamples: z.array(z.string()).optional(),
        logoUrl: z.string().optional(),
        domain: z.string().optional(),
      })
      .describe(
        "Pass through the brand object from research_company.brand plus the company's domain so v0 can match their visual identity.",
      ),
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
  brand?: {
    primaryColor?: string;
    accentColors?: string[];
    visualStyle?: string;
    typographyVibe?: string;
    voiceSamples?: string[];
    logoUrl?: string;
    domain?: string;
  };
}): string {
  const brand = input.brand ?? {};
  const brandBlock = [
    `Style direction — make this look like a page ${input.companyName} would actually publish, not a generic Vercel template:`,
    brand.primaryColor &&
      `- Primary brand color: ${brand.primaryColor}. Use it for the CTA button and one accent (e.g. claim labels, border highlights).`,
    brand.accentColors && brand.accentColors.length > 0
      ? `- Secondary brand colors: ${brand.accentColors.join(", ")}. Use sparingly for the three claim labels so they visually distinguish.`
      : null,
    brand.visualStyle &&
      `- Visual style to match: ${brand.visualStyle}.`,
    brand.typographyVibe &&
      `- Typography vibe: ${brand.typographyVibe}. Pick fonts that match — e.g. if it's "serif editorial", use a serif H1; if "monospace technical", use mono headings.`,
    brand.voiceSamples && brand.voiceSamples.length > 0
      ? `- Tone-of-voice reference (quotes from their actual site):\n${brand.voiceSamples.map((v) => `    "${v}"`).join("\n")}\n  Write button labels, footers, and any UI copy in a similar register.`
      : null,
    brand.logoUrl &&
      `- Small logo image (top-left of the page header): <img src="${brand.logoUrl}" alt="${input.companyName} logo" width="24" height="24" />`,
    brand.domain &&
      `- Eyebrow text or footer should reference ${brand.domain}.`,
  ]
    .filter(Boolean)
    .join("\n");
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

${brandBlock}

LAYOUT BASELINE (apply only where brand direction doesn't override):
- Tailwind utility classes only — no inline styles
- shadcn/ui Button for CTA
- Each column has a subtle accent dot or border so the three claims visually distinguish
- No hero illustration; rely on type + color
- The company name "${input.companyName}" must appear in the hero or as eyebrow text
- Footer with a small "Built on Vercel · ${input.companyName}" line

Return ONLY the React component code. No explanation, no markdown wrappers, no installation notes.`;
}
