import { defineTool } from "eve/tools";
import { generateObject } from "ai";
import { z } from "zod";

const ResearchOutput = z.object({
  companyName: z.string(),
  domain: z.string().optional(),
  oneLineDescription: z.string(),
  stackSignals: z.array(z.string()).describe(
    "What we can detect from the homepage / public info — e.g., 'Next.js (Vercel)', 'React + Tailwind', 'AWS Lambda', 'Stripe', 'Cloudflare Workers'. Empty array if nothing detected.",
  ),
  targetAudience: z.string().describe(
    "Who their product is built for, in concrete terms.",
  ),
  recentMoves: z.array(z.string()).describe(
    "Up to 3 recent product launches or notable announcements. Empty if unknown.",
  ),
  fundingStage: z.string().optional().describe(
    'e.g., "Series B", "Public", "Bootstrapped", "Unknown"',
  ),
  alreadyOnVercel: z.boolean().describe(
    "Best inference from the stack signals — true if homepage shows Vercel headers / Next.js / vercel.app domain.",
  ),
});

const MODEL = "anthropic/claude-sonnet-4.6";

export default defineTool({
  description:
    "Identify a company from a user-supplied name, domain, or URL. Fetch their homepage if accessible and extract stack signals (framework, hosting, recent moves, target audience). Call first.",
  inputSchema: z.object({
    userInput: z
      .string()
      .describe("The raw input from the AE — a domain, URL, or company name."),
  }),
  outputSchema: ResearchOutput,
  async execute({ userInput }) {
    // Try to fetch the homepage for stack signals if input looks like a URL.
    const url = inferUrl(userInput);
    let homepageSnippet = "";
    let detectedHeaders: string[] = [];
    if (url) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 PitchcraftBot/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        // Stack signals from response headers.
        const xPowered = res.headers.get("x-powered-by");
        const xVercel = res.headers.get("x-vercel-id");
        const xVercelCache = res.headers.get("x-vercel-cache");
        const server = res.headers.get("server");
        if (xVercel) detectedHeaders.push(`x-vercel-id: ${xVercel}`);
        if (xVercelCache)
          detectedHeaders.push(`x-vercel-cache: ${xVercelCache}`);
        if (xPowered) detectedHeaders.push(`x-powered-by: ${xPowered}`);
        if (server) detectedHeaders.push(`server: ${server}`);
        const html = await res.text();
        homepageSnippet = html.slice(0, 12000);
      } catch {
        // Network errors are fine — we proceed without homepage info.
      }
    }

    const { object } = await generateObject({
      model: MODEL,
      schema: ResearchOutput,
      system:
        "You are a competitive-intelligence analyst preparing a one-page brief for a sales meeting. Be terse and concrete. Never invent stack details — if uncertain, leave the field empty. Use the homepage HTML and response headers as the primary signal for the tech stack.",
      prompt: `User input: "${userInput}"

${
  url
    ? `Fetched URL: ${url}
Detected response headers:
${detectedHeaders.map((h) => "  " + h).join("\n") || "  (none)"}

Homepage HTML (first 12kb):
${homepageSnippet || "(unfetchable)"}
`
    : "No URL could be inferred from input; rely on what you know about the named company."
}

Produce a research brief.`,
    });

    if (url && !object.domain) {
      object.domain = new URL(url).hostname;
    }
    return object;
  },
});

function inferUrl(input: string): string | null {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Looks like a domain?
  const domainMatch = trimmed.match(/(?:^|\s)([a-z0-9][a-z0-9-]*\.[a-z.]{2,})/i);
  if (domainMatch) return `https://${domainMatch[1]}`;
  return null;
}
