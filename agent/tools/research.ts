import { defineTool } from "eve/tools";
import { generateText } from "ai";
import { z } from "zod";

export default defineTool({
  description:
    "Research competitors and positioning for a launch. Returns 3-4 direct competitors with their tagline and key differentiator. Always call this first.",
  inputSchema: z.object({
    brief: z
      .string()
      .describe("The user's launch brief, verbatim."),
  }),
  outputSchema: z.object({
    summary: z.string(),
    competitors: z.array(
      z.object({
        name: z.string(),
        positioning: z.string(),
      }),
    ),
  }),
  async execute({ brief }) {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      system:
        "You are a competitive research analyst for developer-tools launches. Be terse and specific. Output JSON only: {\"summary\": string, \"competitors\": [{\"name\": string, \"positioning\": string}]}. Limit to 4 competitors.",
      prompt: `Identify the direct competitors for this launch and how each positions themselves:\n\n${brief}`,
    });

    const parsed = extractJson(text);
    return {
      summary: parsed?.summary ?? text.slice(0, 400),
      competitors: parsed?.competitors ?? [],
    };
  },
});

interface ResearchShape {
  summary: string;
  competitors: { name: string; positioning: string }[];
}

function extractJson(s: string): ResearchShape | null {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]) as Partial<ResearchShape>;
    if (
      typeof obj?.summary === "string" &&
      Array.isArray(obj?.competitors)
    ) {
      return obj as ResearchShape;
    }
    return null;
  } catch {
    return null;
  }
}
