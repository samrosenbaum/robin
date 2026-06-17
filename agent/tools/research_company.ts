import { defineTool } from "eve/tools";
import { generateObject } from "ai";
import { z } from "zod";

const ResearchOutput = z.object({
  companyName: z.string(),
  domain: z.string().optional(),
  oneLineDescription: z.string(),
  wedge: z.string().describe(
    "The specific problem this company solves that competitors don't, or the angle they own. One sentence. Examples: 'Reliability and safety guarantees for frontier AI deployments.' / 'A code editor that knows your whole codebase.' / 'Payments that just work, across borders.' Be specific to *this* company; never generic.",
  ),
  stackSignals: z.array(z.string()).describe(
    "Concrete signals from the homepage — e.g. 'x-vercel-id present', '__NEXT_DATA__ in HTML', 'server: cloudflare'. Don't infer or paraphrase.",
  ),
  targetAudience: z.string().describe(
    "Who their product is built for, in concrete terms.",
  ),
  recentMoves: z.array(z.string()).describe(
    "Up to 3 recent product launches or notable announcements.",
  ),
  fundingStage: z.string().optional(),
  alreadyOnVercel: z.boolean(),
  brand: z.object({
    primaryColor: z
      .string()
      .optional()
      .describe(
        "Hex code (#RRGGBB) of the company's primary brand color. Pull from <meta name='theme-color'>, common CSS variables, or visible UI cues. Skip if uncertain.",
      ),
    accentColors: z
      .array(z.string())
      .describe(
        "0-3 secondary brand colors as hex codes. Empty if uncertain.",
      ),
    visualStyle: z
      .string()
      .describe(
        "1 short phrase describing the visual style — e.g. 'minimalist dark with mono accents', 'editorial light with serif headings', 'maximalist with neon gradients'. Be specific.",
      ),
    typographyVibe: z
      .string()
      .describe(
        "1 phrase — e.g. 'sans-serif geometric (Inter/Söhne family)', 'monospace headings', 'serif editorial'.",
      ),
    voiceSamples: z
      .array(z.string())
      .describe(
        "1-3 short sentences pulled VERBATIM from their homepage that capture their voice. Quotes from their actual copy. Empty if uncertain.",
      ),
    logoUrl: z
      .string()
      .optional()
      .describe(
        "Absolute URL to their favicon or apple-touch-icon, if found in <link> tags.",
      ),
  }),
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
    // Try to fetch the homepage for stack + brand signals if input looks
    // like a URL.
    const url = inferUrl(userInput);
    let homepageSnippet = "";
    let visibleText = "";
    let detectedHeaders: string[] = [];
    const brandHints: string[] = [];
    if (url) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 PitchcraftBot/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });
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

        // Strip script + style tags before sending to the model so we
        // spend the context budget on visible content + brand markup.
        const stripped = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
        homepageSnippet = stripped.slice(0, 32000);

        // Extract brand-signal tags from the <head> for the model to use.
        const themeColor = html.match(
          /<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i,
        )?.[1];
        if (themeColor) brandHints.push(`meta theme-color: ${themeColor}`);

        const ogImage = html.match(
          /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        )?.[1];
        if (ogImage) brandHints.push(`og:image: ${ogImage}`);

        const favicon =
          html.match(
            /<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
          )?.[1] ||
          html.match(
            /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i,
          )?.[1];
        if (favicon) {
          const resolved = favicon.startsWith("http")
            ? favicon
            : new URL(favicon, url).toString();
          brandHints.push(`favicon: ${resolved}`);
        }

        const fontFamily = html.match(
          /font-family\s*:\s*([^;"]{5,80})/i,
        )?.[1];
        if (fontFamily) brandHints.push(`font-family seen: ${fontFamily.trim()}`);

        // Pull the visible text (loose — just to help the model capture
        // the voice/tone). Cap at 4kb.
        visibleText = stripped
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
      } catch {
        // Network errors are fine — proceed without homepage info.
      }
    }

    const { object } = await generateObject({
      model: MODEL,
      schema: ResearchOutput,
      system: `You are a competitive-intelligence analyst preparing a one-page brief for a Vercel sales meeting. Two jobs:

(1) Find the WEDGE — the specific problem this company solves better than anyone else, or the angle they own. A pitch built around the wedge resonates; a pitch built around generic "AI features" doesn't. Be specific: "Reliability and safety for frontier AI deployments" beats "an AI company."

(2) Capture BRAND SIGNALS so the generated landing page can match their visual identity:
- primaryColor: pull from theme-color meta, common CSS variables (--brand, --primary, etc.), or visible UI cues. Leave empty if uncertain.
- visualStyle: a phrase that captures the aesthetic ("minimalist dark with mono accents", "editorial light with serif headings", "playful with bold gradients").
- typographyVibe: what font family feels they use (serif/sans/mono).
- voiceSamples: 1-3 SHORT sentences quoted VERBATIM from their homepage that capture how they write about themselves.
- logoUrl: the favicon URL if found.

Never invent stack or brand details — if uncertain, leave fields empty or pass an empty array.`,
      prompt: `User input: "${userInput}"

${
  url
    ? `Fetched URL: ${url}
Response headers (verbatim):
${detectedHeaders.map((h) => "  " + h).join("\n") || "  (none)"}

Brand markers from <head>:
${brandHints.map((b) => "  " + b).join("\n") || "  (none)"}

Visible text from the page (tags stripped, first 4kb — use for voice samples):
${visibleText || "(none)"}

Raw HTML (first 32kb, scripts/styles stripped):
${homepageSnippet || "(unfetchable)"}
`
    : "No URL could be inferred from input. Use what you know about the named company; leave brand fields empty."
}

Produce a research brief. The wedge field is the most important — read the homepage carefully and capture what makes this specific company distinct.`,
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
