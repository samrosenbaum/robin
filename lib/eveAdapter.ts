// Adapter: Eve session NDJSON stream events → demo UI RunEvents.
//
// Eve emits a typed lifecycle (session.started, actions.requested,
// action.result, step.completed, message.completed, session.completed, …).
// The UI is built around our own RunEvent shape (logs, primitive states,
// workflow step states, file-open, output cards). This module is the
// translator — one Eve event in, zero-or-more RunEvents out.

import type {
  LogTag,
  OutputCard,
  PrimitiveId,
  RunEvent,
  StepName,
} from "./types";

interface ToolMeta {
  step: StepName;
  primitive: PrimitiveId;
  file: string;
  label: string; // human display name used in log lines
}

// Maps each tool the agent might call → the step / primitive / left-tree
// file we want to highlight. File names match entries in
// lib/fileContents.ts (the illustrative files shown in the viewer).
const TOOL_MAP: Record<string, ToolMeta> = {
  research: {
    step: "research",
    primitive: "gateway",
    file: "research.ts",
    label: "research",
  },
  copywriter: {
    step: "copy",
    primitive: "gateway",
    file: "copywriter.ts",
    label: "copywriter",
  },
  build_landing_page: {
    step: "v0 build",
    primitive: "sandbox",
    file: "v0-builder.ts",
    label: "build_landing_page",
  },
  post_to_slack: {
    step: "outreach",
    primitive: "connect",
    file: "slack.ts",
    label: "post_to_slack",
  },
  open_linear_ticket: {
    step: "outreach",
    primitive: "connect",
    file: "linear.ts",
    label: "open_linear_ticket",
  },
};

interface AdapterState {
  start: number;
  callToTool: Map<string, string>;
  outreachRemaining: number;
  sessionId?: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  // Number of NDJSON lines consumed — used to resume the stream after a
  // mid-run disconnect via ?startIndex=eventCount.
  eventCount: number;
}

export function createAdapter(opts?: {
  sessionId?: string;
  start?: number;
  startIndex?: number;
}): {
  state: AdapterState;
  handle: (raw: unknown) => RunEvent[];
} {
  const state: AdapterState = {
    start: opts?.start ?? Date.now(),
    callToTool: new Map(),
    outreachRemaining: 2,
    sessionId: opts?.sessionId,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    eventCount: opts?.startIndex ?? 0,
  };
  return {
    state,
    handle: (raw) => {
      state.eventCount += 1;
      return handleEvent(raw, state);
    },
  };
}

function ts(start: number): string {
  const sec = Math.floor((Date.now() - start) / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
    sec % 60,
  ).padStart(2, "0")}`;
}

function handleEvent(raw: unknown, state: AdapterState): RunEvent[] {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return [];
  const evt = raw as { type: string; data?: Record<string, unknown> };
  const out: RunEvent[] = [];
  const log = (tag: LogTag, msg: string) =>
    out.push({ type: "log", ts: ts(state.start), tag, msg });

  switch (evt.type) {
    case "session.started": {
      // Eve sessions ARE Vercel Workflow runs. The sessionId is a real
      // workflow run identifier (wrun_*). Surface it so prospects can see
      // we're not faking durability.
      const runtime = evt.data?.runtime as
        | { agentName?: string; modelId?: string }
        | undefined;
      const sessionId =
        state.sessionId ??
        getStr(evt.data, "sessionId") ??
        "wrun_unknown";
      out.push({
        type: "primitive",
        id: "workflow",
        state: "active",
        stat: sessionId.startsWith("wrun_")
          ? `${sessionId.slice(0, 12)}…`
          : "running",
      });
      log(
        "workflow",
        `Vercel Workflow run <span class="highlight">${escapeHtml(sessionId)}</span> created. Event log persisted; each step is a durable checkpoint.`,
      );
      if (runtime?.modelId) {
        log(
          "workflow",
          `Agent <span class="highlight">${escapeHtml(runtime.agentName ?? "?")}</span> · model <span class="highlight">${escapeHtml(runtime.modelId)}</span>`,
        );
      }
      return out;
    }

    case "turn.started": {
      log("workflow", `turn started`);
      return out;
    }

    case "message.received": {
      const msg = (evt.data?.message as string | undefined) ?? "";
      log("info", `→ user: <span class="highlight">${escapeHtml(msg.slice(0, 160))}</span>`);
      return out;
    }

    case "step.started": {
      const idx = evt.data?.stepIndex as number | undefined;
      log("gateway", `step ${idx ?? "?"} started — model thinking…`);
      return out;
    }

    case "actions.requested": {
      const actions = (evt.data?.actions as unknown[] | undefined) ?? [];
      for (const a of actions) {
        if (
          !a ||
          typeof a !== "object" ||
          (a as { kind?: string }).kind !== "tool-call"
        )
          continue;
        const tc = a as {
          callId: string;
          toolName: string;
          input?: Record<string, unknown>;
        };
        const meta = TOOL_MAP[tc.toolName];
        const inputKeys = Object.keys(tc.input ?? {});
        if (!meta) {
          log(
            "info",
            `→ call <span class="highlight">${escapeHtml(tc.toolName)}</span>(${inputKeys.join(", ")})`,
          );
          continue;
        }
        state.callToTool.set(tc.callId, tc.toolName);

        out.push({ type: "step", step: meta.step, state: "running" });
        out.push({ type: "primitive", id: meta.primitive, state: "active" });
        out.push({ type: "file-open", file: meta.file });
        out.push({ type: "file-running", file: meta.file });
        log(
          tagForTool(tc.toolName),
          `→ call <span class="highlight">${escapeHtml(meta.label)}</span>(${inputKeys.join(", ")})`,
        );
        // Preview a fragment of the input so prospects see real data flowing.
        const previewKey = inputKeys.find((k) =>
          ["brief", "headline", "previewUrl"].includes(k),
        );
        if (previewKey && typeof tc.input?.[previewKey] === "string") {
          const v = (tc.input[previewKey] as string).slice(0, 100);
          log(
            tagForTool(tc.toolName),
            `  ${previewKey}: <span class="highlight">${escapeHtml(v)}</span>`,
          );
        }
      }
      return out;
    }

    case "action.result": {
      const result = evt.data?.result as
        | {
            callId?: string;
            kind?: string;
            output?: unknown;
            isError?: boolean;
          }
        | undefined;
      if (!result || result.kind !== "tool-result") return out;
      const callId = result.callId ?? "";
      const toolName = state.callToTool.get(callId);
      if (!toolName) return out;
      const meta = TOOL_MAP[toolName];
      if (!meta) return out;

      const outputs = describeOutput(toolName, result.output);
      for (const o of outputs.logs) {
        log(tagForTool(toolName), o);
      }
      for (const card of outputs.cards) {
        out.push({ type: "output", output: card });
      }

      // Mark step done — but outreach needs both tools.
      if (meta.step === "outreach") {
        state.outreachRemaining -= 1;
        if (state.outreachRemaining <= 0) {
          out.push({ type: "step", step: "outreach", state: "done" });
        }
      } else {
        out.push({ type: "step", step: meta.step, state: "done" });
      }

      // Drop the primitive's "active" glow on result. (Workflow stays active
      // for the whole run.)
      if (meta.primitive !== "workflow") {
        out.push({ type: "primitive", id: meta.primitive, state: "idle" });
      }
      // Clear the "now-running" file highlight for this tool.
      out.push({ type: "file-running", file: null });
      return out;
    }

    case "step.completed": {
      const usage = evt.data?.usage as
        | {
            inputTokens?: number;
            outputTokens?: number;
            cacheReadTokens?: number;
            cacheWriteTokens?: number;
          }
        | undefined;
      const finishReason = evt.data?.finishReason as string | undefined;
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        state.totalInputTokens += usage.inputTokens ?? 0;
        state.totalOutputTokens += usage.outputTokens ?? 0;
        const cache = usage.cacheReadTokens
          ? ` · <span class="highlight">${usage.cacheReadTokens.toLocaleString()}</span> cache read`
          : "";
        log(
          "obs",
          `step: <span class="highlight">${(usage.inputTokens ?? 0).toLocaleString()}</span> in / <span class="highlight">${(usage.outputTokens ?? 0).toLocaleString()}</span> out${cache} · total <span class="highlight">${(state.totalInputTokens + state.totalOutputTokens).toLocaleString()}</span>`,
        );
        // Surface running totals on the AI Gateway primitive card too.
        out.push({
          type: "primitive",
          id: "gateway",
          state: "active",
          stat: `${(state.totalInputTokens + state.totalOutputTokens).toLocaleString()} tok`,
        });
      }
      log(
        "workflow",
        `✓ checkpoint persisted (reason: <span class="highlight">${escapeHtml(finishReason ?? "?")}</span>)`,
      );
      return out;
    }

    case "message.appended": {
      // Stream the model's tokens as they arrive — feels alive in the log.
      const delta = (evt.data?.messageDelta as string | undefined) ?? "";
      if (!delta.trim()) return out;
      log("gateway", `…${escapeHtml(delta.slice(0, 120))}`);
      return out;
    }

    case "message.completed": {
      const message = (evt.data?.message as string | null) ?? "";
      const finishReason = evt.data?.finishReason as string | undefined;
      if (finishReason && finishReason !== "stop") return out;
      if (message.trim()) {
        log(
          "info",
          `← agent: <span class="highlight">${escapeHtml(message.slice(0, 600))}</span>`,
        );
      }
      return out;
    }

    case "reasoning.completed": {
      const text = (evt.data?.reasoning as string | undefined) ?? "";
      if (text.trim()) {
        log("gateway", `reasoning: ${escapeHtml(text.slice(0, 200))}`);
      }
      return out;
    }

    case "session.waiting":
    case "session.completed": {
      out.push({
        type: "primitive",
        id: "workflow",
        state: "active",
        stat: "done",
      });
      log("workflow", '<span class="success">✓ Run complete.</span>');
      out.push({ type: "done" });
      return out;
    }

    case "session.failed":
    case "turn.failed":
    case "step.failed": {
      const err = evt.data?.message as string | undefined;
      log(
        "workflow",
        `<span class="warn">${evt.type}: ${escapeHtml(err ?? "unknown error")}</span>`,
      );
      out.push({ type: "error", msg: err ?? evt.type });
      return out;
    }
  }
  return out;
}

function tagForTool(toolName: string): LogTag {
  switch (toolName) {
    case "research":
    case "copywriter":
      return "gateway";
    case "build_landing_page":
      return "v0";
    case "post_to_slack":
    case "open_linear_ticket":
      return "connect";
    default:
      return "info";
  }
}

function describeOutput(
  toolName: string,
  output: unknown,
): { logs: string[]; cards: OutputCard[] } {
  const logs: string[] = [];
  const cards: OutputCard[] = [];
  if (!output || typeof output !== "object")
    return { logs: [`<span class="success">✓ ${toolName} returned</span>`], cards };
  const o = output as Record<string, unknown>;

  if (toolName === "research") {
    const competitors = (o.competitors as Array<{ name?: string }> | undefined) ?? [];
    const names = competitors
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
    if (names)
      logs.push(`Competitors: <span class="highlight">${escapeHtml(names)}</span>`);
  }
  if (toolName === "copywriter") {
    const headline = o.headline as string | undefined;
    if (headline)
      logs.push(
        `Headline: <span class="highlight">"${escapeHtml(headline)}"</span>`,
      );
  }
  if (toolName === "build_landing_page") {
    const preview = o.previewUrl as string | undefined;
    const lines = o.totalLines as number | undefined;
    if (lines)
      logs.push(
        `stdout: <span class="success">✓ component generated (${lines} lines)</span>`,
      );
    if (preview) {
      logs.push(
        `Deploying preview → <span class="success">${escapeHtml(preview.replace(/^https?:\/\//, ""))}</span>`,
      );
      cards.push({
        label: "landing-page preview",
        color: "var(--v0)",
        icon: "↗",
        href: preview,
      });
    }
  }
  if (toolName === "post_to_slack") {
    const channel = (o.channel as string | undefined) ?? "#launches";
    const posted = o.posted as boolean | undefined;
    const preview = (o.preview as string | undefined) ?? "";
    logs.push(
      posted
        ? `Slack draft posted → <span class="highlight">${escapeHtml(channel)}</span>`
        : `Slack draft prepared → <span class="highlight">${escapeHtml(channel)}</span> <span class="warn">(no SLACK_BOT_TOKEN — preview only)</span>`,
    );
    cards.push({
      label: `Slack draft ${channel}`,
      color: "var(--success)",
      icon: "→",
      draftKind: "slack",
      draftTitle: channel,
      draftBody: preview,
      draftMeta: posted ? "posted" : "preview only",
    });
  }
  if (toolName === "open_linear_ticket") {
    const id = o.identifier as string | undefined;
    const url = o.url as string | undefined;
    const previewObj = o.preview as
      | { title?: string; description?: string }
      | undefined;
    logs.push(
      id
        ? `Linear ticket opened → <span class="highlight">${escapeHtml(id)}</span>`
        : `Linear ticket drafted <span class="warn">(no LINEAR_API_KEY — preview only)</span>`,
    );
    cards.push({
      label: id ? `Linear ${id}` : "Linear draft",
      color: "var(--connect)",
      icon: "→",
      href: url,
      draftKind: "linear",
      draftTitle: previewObj?.title ?? "Review landing page",
      draftBody: previewObj?.description ?? "",
      draftMeta: id ?? "preview only",
    });
  }
  if (logs.length === 0)
    logs.push(`<span class="success">✓ ${toolName} returned</span>`);
  return { logs, cards };
}

function getStr(
  data: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!data) return undefined;
  const v = data[key];
  return typeof v === "string" ? v : undefined;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
