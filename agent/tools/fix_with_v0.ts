import { defineTool } from "eve/tools";
import { v0 } from "v0-sdk";
import { z } from "zod";

const FixOutput = z.object({
  previewUrl: z.string(),
  chatUrl: z.string(),
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    }),
  ),
  elapsedMs: z.number(),
});

export default defineTool({
  description:
    "Ask v0 to fix the v0-generated landing page given a sandbox error. Only call after verify_in_sandbox returns passed=false. Pass the errorSummary from verify. Returns a new file set that should be re-verified.",
  inputSchema: z.object({
    previousChatUrl: z
      .string()
      .describe("The chat URL from the previous generate_landing_page call."),
    errorSummary: z.string().describe(
      "The errorSummary from verify_in_sandbox — paste verbatim.",
    ),
    companyName: z.string(),
  }),
  outputSchema: FixOutput,
  async execute({ previousChatUrl, errorSummary, companyName }) {
    const t0 = Date.now();

    const message = `Fix the previous landing page for ${companyName}. The sandbox build reported:

\`\`\`
${errorSummary}
\`\`\`

Return a corrected, complete landing page component. Same style and content as before, but address the error. Return only React component code.`;

    const resp = await v0.chats.create({
      message,
      system:
        "You are an expert Next.js + Tailwind developer fixing a previously-generated component. Return only the corrected code — no commentary.",
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
      elapsedMs: Date.now() - t0,
    };
  },
});

// previousChatUrl is reserved for future use (forking the v0 chat for
// continuity). Currently we open a fresh chat with the error as the
// message — simpler and produces clean output.
export {};
