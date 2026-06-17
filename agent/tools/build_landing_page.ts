import { defineTool } from "eve/tools";
import { v0 } from "v0-sdk";
import { z } from "zod";

export default defineTool({
  description:
    "Generate a landing page component via the v0 API and verify the generated files in the agent's sandbox. Returns the preview URL plus a line count of the verified component. Call after `copywriter`.",
  inputSchema: z.object({
    headline: z.string(),
    subheadline: z.string(),
    body: z.string(),
    cta: z.string(),
    persona: z.string(),
    tone: z.string(),
  }),
  outputSchema: z.object({
    previewUrl: z.string(),
    chatUrl: z.string(),
    files: z.array(z.string()),
    totalLines: z.number(),
    sandboxId: z.string(),
    sandboxCommand: z.string(),
    sandboxStdout: z.string(),
    sandboxElapsedMs: z.number(),
  }),
  async execute(input, ctx) {
    const t0 = Date.now();
    if (!process.env.V0_API_KEY) {
      throw new Error(
        "V0_API_KEY is not set. The build_landing_page tool needs a v0 API key.",
      );
    }

    const message = `Build a Next.js landing page using Tailwind. Make it dark, minimal, with monospace headings.

Headline: "${input.headline}"
Subheadline: "${input.subheadline}"
Body: ${input.body}
CTA button: "${input.cta}"

Audience: ${input.persona}. Tone: ${input.tone}.

Return only the React component code.`;

    const chatResp = await v0.chats.create({
      message,
      system: "You are an expert Next.js + Tailwind developer.",
    });

    if (chatResp instanceof ReadableStream) {
      throw new Error("v0 returned a stream; expected an object response.");
    }

    const previewUrl = chatResp.latestVersion?.demoUrl ?? chatResp.webUrl;
    const files = chatResp.latestVersion?.files ?? [];

    // Verify in the agent's sandbox: write the generated files under
    // /workspace/v0-out/ and count total lines. This demonstrates the
    // "LLM-generated code runs in isolation" story.
    const sandbox = await ctx.getSandbox();
    const written: string[] = [];
    for (const file of files.slice(0, 8)) {
      const safeName = file.name.replace(/^\/+/, "");
      await sandbox.writeTextFile({
        path: `v0-out/${safeName}`,
        content: file.content,
      });
      written.push(safeName);
    }

    const sandboxCommand =
      "find v0-out -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.css' \\) | xargs wc -l 2>/dev/null | tail -n 1 || echo 0";
    const wcResult = await sandbox.run({ command: sandboxCommand });
    const sandboxStdout = (wcResult.stdout || "").trim();
    const totalLines = parseInt(
      sandboxStdout.split(/\s+/)[0] || "0",
      10,
    );

    return {
      previewUrl,
      chatUrl: chatResp.webUrl,
      files: written,
      totalLines: Number.isFinite(totalLines) ? totalLines : 0,
      sandboxId: sandbox.id,
      sandboxCommand,
      sandboxStdout: sandboxStdout || "(no output)",
      sandboxElapsedMs: Date.now() - t0,
    };
  },
});
