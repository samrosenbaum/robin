import { defineTool } from "eve/tools";
import { generateObject } from "ai";
import { z } from "zod";

const CopyBrief = z.object({
  headline: z
    .string()
    .describe("Hero headline, max 12 words, passes the 5-second test."),
  subheadline: z
    .string()
    .describe("One sentence, expands the headline with a concrete benefit."),
  body: z
    .string()
    .describe("60-90 word supporting paragraph. No marketing filler."),
  cta: z.string().describe("Button text, max 4 words."),
  valueProps: z
    .array(z.string())
    .min(3)
    .max(3)
    .describe("Three concrete value propositions, each <= 8 words."),
});

export default defineTool({
  description:
    "Generate a structured copy brief (headline, subhead, body, CTA, three value props) from the launch brief, research, persona, and tone. Call after `research`.",
  inputSchema: z.object({
    brief: z.string(),
    persona: z.string().describe('e.g. "CTO/VP Eng at Series B AI startups"'),
    tone: z.string().describe('e.g. "technical", "executive", "playful"'),
    research: z.string().describe("The summary returned by the research tool."),
  }),
  outputSchema: CopyBrief,
  async execute(input) {
    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4.6",
      schema: CopyBrief,
      system: `You are a conversion copywriter for technical products. Write copy a ${input.persona} would respect: no jargon, no filler, concrete numbers or claims you could back.`,
      prompt: `Launch brief:\n${input.brief}\n\nPersona: ${input.persona}\nTone: ${input.tone}\n\nCompetitive context:\n${input.research}\n\nWrite the copy brief.`,
    });
    return object;
  },
});
