import type { LogEntry, LogEffect } from "./types";

export const LOG_SCRIPT: LogEntry[] = [
  {
    index: 0,
    ts: "00:01",
    tag: "workflow",
    msg: 'Session <span class="highlight">wf_8x2k9</span> created. Checkpointing after each step.',
  },
  {
    index: 1,
    ts: "00:01",
    tag: "gateway",
    msg: 'Routing <span class="highlight">research</span> → claude-sonnet-4-6',
  },
  {
    index: 2,
    ts: "00:02",
    tag: "obs",
    msg: 'Token usage: <span class="highlight">1,240</span> input | 380 output',
  },
  {
    index: 3,
    ts: "00:03",
    tag: "info",
    msg: 'Competitors found: <span class="highlight">Vercel, Netlify, Render, Railway</span>',
  },
  {
    index: 4,
    ts: "00:04",
    tag: "workflow",
    msg: '✓ Checkpoint saved: <span class="highlight">research</span>',
  },
  {
    index: 5,
    ts: "00:05",
    tag: "gateway",
    msg: 'Routing <span class="highlight">brief</span> → claude-sonnet-4-6',
  },
  {
    index: 6,
    ts: "00:06",
    tag: "obs",
    msg: 'Token usage: <span class="highlight">2,100</span> input | 820 output',
  },
  {
    index: 7,
    ts: "00:07",
    tag: "info",
    msg: 'Persona: <span class="highlight">CTO/VP Eng</span> at Series B AI startup. Tone: technical.',
  },
  {
    index: 8,
    ts: "00:08",
    tag: "workflow",
    msg: '✓ Checkpoint saved: <span class="highlight">brief</span>',
  },
  {
    index: 9,
    ts: "00:09",
    tag: "gateway",
    msg: 'Routing <span class="highlight">copy</span> → claude-sonnet-4-6',
  },
  {
    index: 10,
    ts: "00:10",
    tag: "obs",
    msg: 'Token usage: <span class="highlight">3,800</span> input | 1,420 output',
  },
  {
    index: 11,
    ts: "00:11",
    tag: "info",
    msg: 'Headline: <span class="highlight">"Ship AI agents your infra team will actually love"</span>',
  },
  {
    index: 12,
    ts: "00:12",
    tag: "workflow",
    msg: '⚡ <span class="warn">Function interrupted at step copy. State persisted to KV.</span>',
  },
  {
    index: 13,
    ts: "00:13",
    tag: "workflow",
    msg: '↺ <span class="success">Resuming from checkpoint: copy</span>',
  },
  {
    index: 14,
    ts: "00:14",
    tag: "workflow",
    msg: '✓ Checkpoint saved: <span class="highlight">copy</span>',
  },
  {
    index: 15,
    ts: "00:15",
    tag: "sandbox",
    msg: 'Sandbox <span class="highlight">sb_4mz1</span> created. Runtime: node20',
  },
  {
    index: 16,
    ts: "00:16",
    tag: "v0",
    msg: "Calling v0 API → generating landing page component",
  },
  {
    index: 17,
    ts: "00:17",
    tag: "sandbox",
    msg: 'stdout: <span class="success">✓ component generated (847 lines)</span>',
  },
  {
    index: 18,
    ts: "00:18",
    tag: "v0",
    msg: 'Deploying preview → <span class="success">v0.dev/r/pricing-v2-xK9</span>',
  },
  {
    index: 19,
    ts: "00:19",
    tag: "sandbox",
    msg: 'Sandbox <span class="highlight">sb_4mz1</span> destroyed. Clean exit.',
  },
  {
    index: 20,
    ts: "00:20",
    tag: "workflow",
    msg: '✓ Checkpoint saved: <span class="highlight">v0-build</span>',
  },
  {
    index: 21,
    ts: "00:21",
    tag: "connect",
    msg: 'OAuth token <span class="highlight">slack</span> resolved via Vercel Connect',
  },
  {
    index: 22,
    ts: "00:22",
    tag: "connect",
    msg: 'OAuth token <span class="highlight">linear</span> resolved via Vercel Connect',
  },
  {
    index: 23,
    ts: "00:23",
    tag: "info",
    msg: 'Slack draft posted → <span class="highlight">#launches</span>',
  },
  {
    index: 24,
    ts: "00:24",
    tag: "info",
    msg: 'Linear ticket opened → <span class="highlight">ENG-2847: Review pricing page v2</span>',
  },
  {
    index: 25,
    ts: "00:25",
    tag: "workflow",
    msg: '✓ Checkpoint saved: <span class="highlight">outreach</span>',
  },
  {
    index: 26,
    ts: "00:26",
    tag: "obs",
    msg: 'Run complete. Total tokens: <span class="highlight">12,840</span>. Cost: <span class="highlight">$0.031</span>. Duration: <span class="highlight">26s</span>',
  },
];

export const LOG_EFFECTS: Record<number, LogEffect[]> = {
  0: [
    { activatePrimitive: "workflow" },
    { primitiveStatUpdate: { primitive: "workflow", value: "running" } },
    { stepTransition: { step: "research", state: "running" } },
  ],
  1: [{ activatePrimitive: "gateway" }],
  2: [
    {
      primitiveStatUpdate: { primitive: "gateway", value: "claude-sonnet-4-6" },
    },
  ],
  4: [
    { stepTransition: { step: "research", state: "done" } },
    { stepTransition: { step: "brief", state: "running" } },
  ],
  7: [
    { stepTransition: { step: "brief", state: "done" } },
    { stepTransition: { step: "copy", state: "running" } },
  ],
  11: [{ showKillButton: true }, { openFile: "v0-builder.ts" }],
  13: [{ stepTransition: { step: "copy", state: "running" } }],
  14: [
    { stepTransition: { step: "copy", state: "done" } },
    { stepTransition: { step: "v0 build", state: "running" } },
  ],
  15: [
    { activatePrimitive: "sandbox" },
    { primitiveStatUpdate: { primitive: "sandbox", value: "running" } },
    { openFile: "sandbox.ts" },
  ],
  16: [{ openFile: "v0-builder.ts" }],
  19: [
    { deactivatePrimitive: "sandbox" },
    { primitiveStatUpdate: { primitive: "sandbox", value: "done" } },
    { stepTransition: { step: "v0 build", state: "done" } },
    { stepTransition: { step: "outreach", state: "running" } },
  ],
  20: [
    { activatePrimitive: "connect" },
    { primitiveStatUpdate: { primitive: "connect", value: "2/2" } },
  ],
  24: [
    { stepTransition: { step: "outreach", state: "done" } },
    { primitiveStatUpdate: { primitive: "workflow", value: "done" } },
  ],
};
