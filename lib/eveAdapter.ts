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
    file: "build_landing_page.ts",
    label: "build_landing_page",
  },
  post_to_slack: {
    step: "outreach",
    primitive: "connect",
    file: "post_to_slack.ts",
    label: "post_to_slack",
  },
  open_linear_ticket: {
    step: "outreach",
    primitive: "connect",
    file: "open_linear_ticket.ts",
    label: "open_linear_ticket",
  },
};

interface AdapterState {
  start: number;
  // toolName → callId, so action.result can advance the right step.
  callToTool: Map<string, string>;
  // We don't want to mark "outreach" done until BOTH outreach tools resolve.
  outreachRemaining: number;
}

export function createAdapter(): {
  state: AdapterState;
  handle: (raw: unknown) => RunEvent[];
} {
  const state: AdapterState = {
    start: Date.now(),
    callToTool: new Map(),
    outreachRemaining: 2,
  };
  return { state, handle: (raw) => handleEvent(raw, state) };
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
      out.push({
        type: "primitive",
        id: "workflow",
        state: "active",
        stat: "running",
      });
      log(
        "workflow",
        `Session <span class="highlight">${getStr(evt.data, "sessionId")?.slice(0, 8) ?? "wf"}</span> started. Durable checkpointing enabled.`,
      );
      return out;
    }

    case "turn.started":
      return out;

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
        if (!meta) {
          log("info", `Calling tool <span class="highlight">${tc.toolName}</span>`);
          continue;
        }
        state.callToTool.set(tc.callId, tc.toolName);

        out.push({ type: "step", step: meta.step, state: "running" });
        out.push({ type: "primitive", id: meta.primitive, state: "active" });
        out.push({ type: "file-open", file: meta.file });
        log(
          tagForTool(tc.toolName),
          `Calling <span class="highlight">${meta.label}</span>`,
        );
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
      return out;
    }

    case "step.completed": {
      const usage = evt.data?.usage as
        | { inputTokens?: number; outputTokens?: number }
        | undefined;
      if (usage && (usage.inputTokens || usage.outputTokens)) {
        log(
          "obs",
          `Token usage: <span class="highlight">${(usage.inputTokens ?? 0).toLocaleString()}</span> input | ${(usage.outputTokens ?? 0).toLocaleString()} output`,
        );
      }
      return out;
    }

    case "message.completed": {
      const message = (evt.data?.message as string | null) ?? "";
      const finishReason = evt.data?.finishReason as string | undefined;
      // Skip interim tool-call narration; only show terminal assistant text.
      if (finishReason && finishReason !== "stop") return out;
      if (message.trim()) {
        log("info", escapeHtml(message.slice(0, 400)));
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
    logs.push(
      posted
        ? `Slack draft posted → <span class="highlight">${escapeHtml(channel)}</span>`
        : `Slack draft prepared → <span class="highlight">${escapeHtml(channel)}</span> (no token configured)`,
    );
    cards.push({
      label: `Slack draft ${channel}`,
      color: "var(--success)",
      icon: "→",
    });
  }
  if (toolName === "open_linear_ticket") {
    const id = o.identifier as string | undefined;
    const url = o.url as string | undefined;
    logs.push(
      id
        ? `Linear ticket opened → <span class="highlight">${escapeHtml(id)}</span>`
        : `Linear ticket drafted (no API key configured)`,
    );
    cards.push({
      label: id ? `Linear ${id}` : "Linear draft",
      color: "var(--connect)",
      icon: "→",
      href: url,
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
