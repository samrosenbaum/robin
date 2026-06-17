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
    headline: z.string(),
    subheadline: z.string(),
    hookLine: z.string(),
    cta: z.string(),
    sections: z
      .array(
        z.object({
          primitive: z.string(),
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
  headline: string;
  subheadline: string;
  hookLine: string;
  cta: string;
  sections: { primitive: string; heading: string; body: string }[];
}): string {
  const sectionsText = input.sections
    .map(
      (s, i) =>
        `Section ${i + 1} — ${s.primitive}\nHeading: "${s.heading}"\nBody: ${s.body}`,
    )
    .join("\n\n");

  return `Build a Next.js landing page for ${input.companyName}, pitching Vercel.

Hero:
- Hook line above headline (small caps, accent color): "${input.hookLine}"
- Headline (large, monospace): "${input.headline}"
- Subheadline (one sentence): "${input.subheadline}"
- CTA button: "${input.cta}"

Three feature sections, each titled by the Vercel primitive being pitched. Style: cards in a row on desktop, stacked on mobile.

${sectionsText}

Style:
- Dark theme by default (slate-950 / zinc-950 background, slate-50 / zinc-50 text)
- Monospace for headings (Geist Mono or similar)
- Tailwind utility classes only — no inline styles
- shadcn/ui Button for the CTA
- Minimal animations — no gradient backgrounds, no large hero illustration
- The company name "${input.companyName}" must appear in the hero
- Footer with small "Built on Vercel · powered by Eve" line

Return only the React component code. No explanation, no markdown wrappers, no installation notes.`;
}
