import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Post a launch announcement draft to a Slack channel. If SLACK_BOT_TOKEN is configured, posts for real; otherwise returns the would-have-posted message for review. Call after `build_landing_page`.",
  inputSchema: z.object({
    headline: z.string(),
    previewUrl: z.string(),
    brief: z.string(),
  }),
  outputSchema: z.object({
    channel: z.string(),
    posted: z.boolean(),
    messageTs: z.string().optional(),
    preview: z.string(),
  }),
  async execute({ headline, previewUrl, brief }) {
    const channel = process.env.SLACK_CHANNEL_ID || "#launches";
    const text = `🚀 *Launch ready for review*\n\n*Headline:* ${headline}\n*Preview:* ${previewUrl}\n\nBrief: ${brief}`;

    if (!process.env.SLACK_BOT_TOKEN) {
      return { channel, posted: false, preview: text };
    }

    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel, text }),
    });
    const data = (await res.json()) as { ok: boolean; ts?: string };
    return {
      channel,
      posted: data.ok,
      messageTs: data.ts,
      preview: text,
    };
  },
});
