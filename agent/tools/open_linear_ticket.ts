import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Open a Linear ticket for engineering review of the generated landing page. If LINEAR_API_KEY + LINEAR_TEAM_ID are configured, creates the issue; otherwise returns the would-have-created payload. Call after `post_to_slack`.",
  inputSchema: z.object({
    headline: z.string(),
    previewUrl: z.string(),
    subheadline: z.string(),
    cta: z.string(),
  }),
  outputSchema: z.object({
    posted: z.boolean(),
    identifier: z.string().optional(),
    url: z.string().optional(),
    preview: z.object({
      title: z.string(),
      description: z.string(),
    }),
  }),
  async execute({ headline, previewUrl, subheadline, cta }) {
    const title = `Review landing page: "${headline}"`;
    const description = `**Preview:** ${previewUrl}\n\n**Subheadline:** ${subheadline}\n\n**CTA:** ${cta}`;
    const preview = { title, description };

    const apiKey = process.env.LINEAR_API_KEY;
    const teamId = process.env.LINEAR_TEAM_ID;
    if (!apiKey || !teamId) {
      return { posted: false, preview };
    }

    const query = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `;

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { input: { title, description, teamId } },
      }),
    });
    const json = (await res.json()) as {
      data?: {
        issueCreate?: {
          success: boolean;
          issue?: { identifier: string; url: string };
        };
      };
    };
    const issue = json.data?.issueCreate?.issue;
    return {
      posted: !!issue,
      identifier: issue?.identifier,
      url: issue?.url,
      preview,
    };
  },
});
