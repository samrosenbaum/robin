<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Launch Intelligence — Eve Agent

This project uses the [Eve framework](https://vercel.com/docs/eve). Before
editing the agent, read the relevant guide in `node_modules/eve/docs/`.

- Agent definition: `agent/agent.ts`
- System prompt: `agent/instructions.md`
- Tools: `agent/tools/*.ts` (filename = tool name)
- Channels: `agent/channels/eve.ts`
- HTTP API: `POST /eve/v1/session` to start, `GET /eve/v1/session/:id/stream`
  for NDJSON lifecycle events.

The demo UI lives in `app/` + `components/` and consumes the Eve session
stream — it is not a parallel implementation.
