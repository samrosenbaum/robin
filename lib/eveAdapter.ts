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
  research_company: {
    step: "research",
    primitive: "gateway",
    file: "research_company.ts",
    label: "research_company",
  },
  tailor_pitch: {
    step: "tailor",
    primitive: "gateway",
    file: "tailor_pitch.ts",
    label: "tailor_pitch",
  },
  generate_landing_page: {
    step: "generate",
    primitive: "sandbox",
    file: "generate_landing_page.ts",
    label: "generate_landing_page",
  },
  verify_in_sandbox: {
    step: "verify",
    primitive: "sandbox",
    file: "verify_in_sandbox.ts",
    label: "verify_in_sandbox",
  },
  fix_with_v0: {
    step: "generate",
    primitive: "sandbox",
    file: "fix_with_v0.ts",
    label: "fix_with_v0",
  },
};

interface AdapterState {
  start: number;
  callToTool: Map<string, string>;
  // Was used to gate the outreach step's completion until both Slack and
  // Linear tools finished. The new agent has one tool per step, so this is
  // effectively unused but kept for type compatibility.
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
        if (tc.toolName === "verify_in_sandbox") {
          out.push({ type: "sandbox-start" });
        }
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
      if (outputs.sandbox) {
        out.push({ type: "sandbox-result", snapshot: outputs.sandbox });
      }

      out.push({ type: "step", step: meta.step, state: "done" });

      // Transition primitive to "done" (lit but not pulsing) so prospects
      // can see at run-end that every primitive was exercised. Workflow
      // stays active for the whole run.
      if (meta.primitive !== "workflow") {
        const doneStat = doneStatFor(toolName, result.output);
        out.push({
          type: "primitive",
          id: meta.primitive,
          state: "done",
          stat: doneStat,
        });
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

function doneStatFor(toolName: string, output: unknown): string {
  if (!output || typeof output !== "object") return "✓";
  const o = output as Record<string, unknown>;
  if (toolName === "verify_in_sandbox") {
    const lines = o.totalLines as number | undefined;
    const elapsed = o.elapsedMs as number | undefined;
    return `${lines ?? 0} lines · ${elapsed ? (elapsed / 1000).toFixed(1) + "s" : "✓"}`;
  }
  if (toolName === "generate_landing_page" || toolName === "fix_with_v0") {
    const elapsed = o.generationTimeMs as number | undefined;
    return elapsed ? `v0 · ${(elapsed / 1000).toFixed(1)}s` : "✓ v0";
  }
  return "✓";
}

function tagForTool(toolName: string): LogTag {
  switch (toolName) {
    case "research_company":
    case "tailor_pitch":
      return "gateway";
    case "generate_landing_page":
    case "fix_with_v0":
      return "v0";
    case "verify_in_sandbox":
      return "sandbox";
    default:
      return "info";
  }
}

function describeOutput(
  toolName: string,
  output: unknown,
): {
  logs: string[];
  cards: OutputCard[];
  sandbox?: import("./types").SandboxSnapshot;
} {
  const logs: string[] = [];
  const cards: OutputCard[] = [];
  let sandbox: import("./types").SandboxSnapshot | undefined;
  if (!output || typeof output !== "object")
    return { logs: [`<span class="success">✓ ${toolName} returned</span>`], cards };
  const o = output as Record<string, unknown>;

  if (toolName === "research_company") {
    const name = o.companyName as string | undefined;
    const desc = o.oneLineDescription as string | undefined;
    const signals = (o.stackSignals as string[] | undefined) ?? [];
    const onVercel = o.alreadyOnVercel as boolean | undefined;
    if (name) {
      logs.push(`identified <span class="highlight">${escapeHtml(name)}</span>`);
    }
    if (desc) {
      logs.push(`one-liner: ${escapeHtml(desc)}`);
    }
    if (signals.length) {
      logs.push(
        `stack signals: <span class="highlight">${escapeHtml(signals.slice(0, 4).join(", "))}</span>`,
      );
    }
    if (onVercel) {
      logs.push(
        `<span class="success">✓ already on Vercel — pitch will lean into deeper primitives</span>`,
      );
    }
  }
  if (toolName === "tailor_pitch") {
    const headline = o.headline as string | undefined;
    const angle = o.migrationAngle as string | undefined;
    const sections = (o.sections as Array<{ primitive?: string }> | undefined) ?? [];
    if (headline) {
      logs.push(
        `headline: <span class="highlight">"${escapeHtml(headline)}"</span>`,
      );
    }
    if (sections.length) {
      const prims = sections.map((s) => s.primitive).filter(Boolean).join(" · ");
      logs.push(
        `pitching: <span class="highlight">${escapeHtml(prims)}</span> (${escapeHtml(angle ?? "?")})`,
      );
    }
  }
  if (toolName === "generate_landing_page" || toolName === "fix_with_v0") {
    const preview = o.previewUrl as string | undefined;
    const files = (o.files as Array<{ name?: string }> | undefined) ?? [];
    const elapsed = o.generationTimeMs as number | undefined;
    if (files.length) {
      logs.push(
        `v0 returned <span class="highlight">${files.length} files</span>${elapsed ? ` in ${(elapsed / 1000).toFixed(1)}s` : ""}`,
      );
    }
    if (preview) {
      logs.push(
        `preview → <span class="success">${escapeHtml(preview.replace(/^https?:\/\//, "").slice(0, 60))}…</span>`,
      );
      cards.push({
        label: "v0 preview",
        color: "var(--v0)",
        icon: "↗",
        href: preview,
      });
    }
  }
  if (toolName === "verify_in_sandbox") {
    const passed = o.passed as boolean | undefined;
    const sbId = o.sandboxId as string | undefined;
    const lines = o.totalLines as number | undefined;
    const elapsed = o.elapsedMs as number | undefined;
    const files = (o.fileList as string[] | undefined) ?? [];
    const cmds = (o.commands as Array<{
      cmd?: string;
      stdoutTail?: string;
      exitCode?: number;
      durationMs?: number;
    }> | undefined) ?? [];

    if (sbId) {
      logs.push(
        `sandbox <span class="highlight">${escapeHtml(sbId.slice(0, 16))}</span> · ${files.length} files · ${lines ?? 0} lines${elapsed ? ` · ${(elapsed / 1000).toFixed(1)}s` : ""}`,
      );
    }
    if (passed) {
      logs.push(
        `<span class="success">✓ verify passed — component is well-formed</span>`,
      );
    } else {
      const err = o.errorSummary as string | undefined;
      logs.push(
        `<span class="warn">verify failed: ${escapeHtml(err ?? "see sandbox output")}</span>`,
      );
    }

    if (sbId) {
      sandbox = {
        id: sbId,
        command: cmds.map((c) => c.cmd).filter(Boolean).join(" && "),
        stdout: cmds.map((c) => c.stdoutTail || "").join("\n").slice(-1500),
        files,
        totalLines: lines ?? 0,
        elapsedMs: elapsed ?? 0,
      };
    }
  }
  if (logs.length === 0)
    logs.push(`<span class="success">✓ ${toolName} returned</span>`);
  return { logs, cards, sandbox };
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
