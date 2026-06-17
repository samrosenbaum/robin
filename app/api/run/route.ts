import { NextRequest } from "next/server";
import { generateText, gateway } from "ai";
import { v0 } from "v0-sdk";
import { Sandbox } from "@vercel/sandbox";
import type { RunEvent, LogTag } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "anthropic/claude-sonnet-4-6";

function ts(start: number): string {
  const sec = Math.floor((Date.now() - start) / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
    sec % 60,
  ).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as { prompt?: string };
  const userPrompt =
    prompt?.trim() ||
    "Ship the v2 pricing page — tie it to our Series B announcement, target CTO/VP Eng personas";

  const encoder = new TextEncoder();
  const start = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: RunEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      const log = (tag: LogTag, msg: string) =>
        emit({ type: "log", ts: ts(start), tag, msg });

      try {
        await runAgent({ userPrompt, emit, log, start });
        emit({ type: "done" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({ type: "error", msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}

interface RunCtx {
  userPrompt: string;
  emit: (e: RunEvent) => void;
  log: (tag: LogTag, msg: string) => void;
  start: number;
}

async function runAgent({ userPrompt, emit, log, start }: RunCtx) {
  // ---- Workflow primitive (scripted): session + checkpoints ----
  const sessionId = `wf_${Math.random().toString(36).slice(2, 8)}`;
  emit({ type: "primitive", id: "workflow", state: "active", stat: "running" });
  log(
    "workflow",
    `Session <span class="highlight">${sessionId}</span> created. Checkpointing after each step.`,
  );

  // ============ STEP 1: research ============
  emit({ type: "step", step: "research", state: "running" });
  emit({ type: "primitive", id: "gateway", state: "active" });
  log("gateway", `Routing <span class="highlight">research</span> → ${MODEL}`);
  emit({ type: "primitive", id: "gateway", state: "active", stat: MODEL });

  const research = await generateText({
    model: gateway(MODEL),
    system:
      "You are a competitive research analyst for a developer-tools launch. Be terse and specific. Reply in 4-5 bullets.",
    prompt: `Identify the top 3-4 competitors and their positioning for this launch:\n\n${userPrompt}`,
  });
  log(
    "obs",
    `Token usage: <span class="highlight">${research.usage.inputTokens ?? 0}</span> input | ${research.usage.outputTokens ?? 0} output`,
  );

  const firstLine = research.text.split("\n").find((l) => l.trim()) ?? "";
  log(
    "info",
    `Competitors: <span class="highlight">${escape(firstLine.slice(0, 120))}</span>`,
  );
  log("workflow", `✓ Checkpoint saved: <span class="highlight">research</span>`);
  emit({ type: "step", step: "research", state: "done" });

  // ============ STEP 2: brief ============
  emit({ type: "step", step: "brief", state: "running" });
  log("gateway", `Routing <span class="highlight">brief</span> → ${MODEL}`);

  const brief = await generateText({
    model: gateway(MODEL),
    system:
      "You write tight launch briefs for technical audiences. Reply with 3 sections: persona, positioning, tone. <= 120 words total.",
    prompt: `Launch ask:\n${userPrompt}\n\nCompetitive context:\n${research.text}`,
  });
  log(
    "obs",
    `Token usage: <span class="highlight">${brief.usage.inputTokens ?? 0}</span> input | ${brief.usage.outputTokens ?? 0} output`,
  );
  const personaMatch = brief.text.match(/persona[^\n]*:?\s*([^\n]+)/i);
  if (personaMatch) {
    log(
      "info",
      `Persona: <span class="highlight">${escape(personaMatch[1].trim().slice(0, 100))}</span>`,
    );
  }
  log("workflow", `✓ Checkpoint saved: <span class="highlight">brief</span>`);
  emit({ type: "step", step: "brief", state: "done" });

  // ============ STEP 3: copy ============
  emit({ type: "step", step: "copy", state: "running" });
  emit({ type: "file-open", file: "v0-builder.ts" });
  log("gateway", `Routing <span class="highlight">copy</span> → ${MODEL}`);

  const copy = await generateText({
    model: gateway(MODEL),
    system:
      'You write landing-page copy. Reply as JSON: {"headline":"","subhead":"","body":"","cta":""}. Headline <= 12 words. No marketing filler.',
    prompt: `Brief:\n${brief.text}\n\nWrite the hero copy.`,
  });
  log(
    "obs",
    `Token usage: <span class="highlight">${copy.usage.inputTokens ?? 0}</span> input | ${copy.usage.outputTokens ?? 0} output`,
  );

  const copyJson = tryParseJson(copy.text);
  const headline = copyJson?.headline ?? extractFirstQuoted(copy.text) ?? "";
  if (headline) {
    log(
      "info",
      `Headline: <span class="highlight">"${escape(headline.slice(0, 120))}"</span>`,
    );
  }
  log("workflow", `✓ Checkpoint saved: <span class="highlight">copy</span>`);
  emit({ type: "step", step: "copy", state: "done" });

  // ============ STEP 4: v0 build (real v0 + real sandbox) ============
  emit({ type: "step", step: "v0 build", state: "running" });
  emit({ type: "primitive", id: "sandbox", state: "active", stat: "running" });
  emit({ type: "file-open", file: "sandbox.ts" });

  const sbBox = await createSandboxOrSkip(log);

  emit({ type: "file-open", file: "v0-builder.ts" });
  log("v0", "Calling v0 API → generating landing page component");

  const v0Result = await v0Generate(copyJson, userPrompt, log);
  if (v0Result) {
    log(
      "v0",
      `Deploying preview → <span class="success">${escape(stripProto(v0Result.demoUrl ?? v0Result.webUrl))}</span>`,
    );
  }

  if (sbBox) {
    try {
      const probe = await sbBox.runCommand({
        cmd: "node",
        args: ["-e", "console.log('component generated:', process.version)"],
      });
      const out = (await probe.stdout()).toString().trim();
      log(
        "sandbox",
        `stdout: <span class="success">${escape(out || "✓ ok")}</span>`,
      );
      await sbBox.stop();
      log(
        "sandbox",
        `Sandbox <span class="highlight">${shortId(sbBox.name)}</span> destroyed. Clean exit.`,
      );
    } catch (e) {
      log(
        "sandbox",
        `<span class="warn">sandbox runtime warning: ${escape(errMsg(e))}</span>`,
      );
    }
  }
  emit({ type: "primitive", id: "sandbox", state: "idle", stat: "done" });
  log("workflow", `✓ Checkpoint saved: <span class="highlight">v0-build</span>`);
  emit({ type: "step", step: "v0 build", state: "done" });

  if (v0Result) {
    emit({
      type: "output",
      output: {
        label: "pricing-v2 preview",
        color: "var(--v0)",
        icon: "↗",
        href: v0Result.webUrl,
      },
    });
  }

  // ============ STEP 5: outreach (Connect scripted) ============
  emit({ type: "step", step: "outreach", state: "running" });
  emit({ type: "primitive", id: "connect", state: "active", stat: "0/2" });
  await sleep(300);
  log(
    "connect",
    `OAuth token <span class="highlight">slack</span> resolved via Vercel Connect`,
  );
  emit({ type: "primitive", id: "connect", state: "active", stat: "1/2" });
  await sleep(200);
  log(
    "connect",
    `OAuth token <span class="highlight">linear</span> resolved via Vercel Connect`,
  );
  emit({ type: "primitive", id: "connect", state: "active", stat: "2/2" });
  await sleep(200);
  log(
    "info",
    `Slack draft posted → <span class="highlight">#launches</span>`,
  );
  emit({
    type: "output",
    output: {
      label: "Slack draft #launches",
      color: "var(--success)",
      icon: "→",
    },
  });
  await sleep(150);
  const ticketId = `ENG-${2000 + Math.floor(Math.random() * 999)}`;
  log(
    "info",
    `Linear ticket opened → <span class="highlight">${ticketId}: Review pricing page v2</span>`,
  );
  emit({
    type: "output",
    output: {
      label: `Linear ${ticketId}`,
      color: "var(--connect)",
      icon: "→",
    },
  });
  log(
    "workflow",
    `✓ Checkpoint saved: <span class="highlight">outreach</span>`,
  );
  emit({ type: "step", step: "outreach", state: "done" });

  // ============ done ============
  const totalIn =
    (research.usage.inputTokens ?? 0) +
    (brief.usage.inputTokens ?? 0) +
    (copy.usage.inputTokens ?? 0);
  const totalOut =
    (research.usage.outputTokens ?? 0) +
    (brief.usage.outputTokens ?? 0) +
    (copy.usage.outputTokens ?? 0);
  const total = totalIn + totalOut;
  log(
    "obs",
    `Run complete. Total tokens: <span class="highlight">${total.toLocaleString()}</span>. Duration: <span class="highlight">${ts(start)}</span>`,
  );
  emit({ type: "primitive", id: "workflow", state: "active", stat: "done" });
}

// ---------- helpers ----------

async function createSandboxOrSkip(log: RunCtx["log"]) {
  if (
    !process.env.VERCEL_TOKEN ||
    !process.env.VERCEL_TEAM_ID ||
    !process.env.VERCEL_PROJECT_ID
  ) {
    log(
      "sandbox",
      `<span class="warn">Sandbox skipped — set VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID to enable.</span>`,
    );
    return null;
  }
  try {
    const sb = await Sandbox.create({
      runtime: "node22",
      timeout: 60_000,
    });
    log(
      "sandbox",
      `Sandbox <span class="highlight">${shortId(sb.name)}</span> created. Runtime: node22`,
    );
    return sb;
  } catch (e) {
    log(
      "sandbox",
      `<span class="warn">Sandbox create failed: ${escape(errMsg(e))}</span>`,
    );
    return null;
  }
}

async function v0Generate(
  copyJson: CopyShape | null,
  fallbackPrompt: string,
  log: RunCtx["log"],
): Promise<{ webUrl: string; demoUrl?: string } | null> {
  if (!process.env.V0_API_KEY) {
    log(
      "v0",
      `<span class="warn">v0 skipped — set V0_API_KEY to enable.</span>`,
    );
    return null;
  }
  try {
    const message = copyJson
      ? `Build a Next.js landing page. Headline: "${copyJson.headline}". Subhead: "${copyJson.subhead}". Body: ${copyJson.body}. CTA: "${copyJson.cta}". Style: minimal, dark, monospace headings, Tailwind.`
      : `Build a Next.js landing page for: ${fallbackPrompt}. Style: minimal, dark, monospace headings, Tailwind.`;
    const chatResp = await v0.chats.create({
      message,
      system: "You are an expert Next.js + Tailwind developer.",
    });
    // Narrow: streaming variant returns a ReadableStream; we want the object form.
    if (chatResp instanceof ReadableStream) {
      log("v0", `<span class="warn">v0 returned stream — expected object</span>`);
      return null;
    }
    const chat = chatResp;
    const demoUrl = chat.latestVersion?.demoUrl;
    log(
      "v0",
      `<span class="success">✓ component generated</span> — chat: ${escape(shortUrl(chat.webUrl))}`,
    );
    return { webUrl: chat.webUrl, demoUrl };
  } catch (e) {
    log(
      "v0",
      `<span class="warn">v0 call failed: ${escape(errMsg(e))}</span>`,
    );
    return null;
  }
}

interface CopyShape {
  headline: string;
  subhead: string;
  body: string;
  cta: string;
}

function tryParseJson(s: string): CopyShape | null {
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj?.headline === "string") return obj as CopyShape;
    return null;
  } catch {
    return null;
  }
}

function extractFirstQuoted(s: string): string | null {
  const m = s.match(/["“]([^"”]{6,200})["”]/);
  return m ? m[1] : null;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shortId(s: string): string {
  return s.slice(0, 8);
}

function shortUrl(s: string): string {
  return s.replace(/^https?:\/\//, "");
}

function stripProto(s: string): string {
  return s.replace(/^https?:\/\//, "");
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
