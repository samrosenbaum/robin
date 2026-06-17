"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import type {
  LogEntry,
  OutputCard,
  PrimitiveId,
  PrimitiveState,
  RunEvent,
  RunState,
  SandboxSnapshot,
  StepName,
  StepState,
} from "@/lib/types";
import { PrimitivesGrid } from "./PrimitivesGrid";
import { WorkflowSteps } from "./WorkflowSteps";
import { FluidMeter } from "./FluidMeter";
import { createAdapter } from "@/lib/eveAdapter";

const DEFAULT_PROMPT =
  "Ship the v2 pricing page — tie it to our Series B announcement, target CTO/VP Eng personas";

const INITIAL_STEPS: Record<StepName, StepState> = {
  research: "pending",
  copy: "pending",
  "v0 build": "pending",
  outreach: "pending",
};

const INITIAL_PRIMS: Record<PrimitiveId, PrimitiveState> = {
  workflow: "idle",
  sandbox: "idle",
  gateway: "idle",
  connect: "idle",
};

const INITIAL_STATS: Record<PrimitiveId, string> = {
  workflow: "",
  sandbox: "",
  gateway: "",
  connect: "",
};

interface Props {
  onAutoOpenFile: (file: string) => void;
  onFileRunning: (file: string | null) => void;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  // Visual artifacts lifted to DemoApp so the center panel can render them.
  sandboxActive: boolean;
  setSandboxActive: React.Dispatch<React.SetStateAction<boolean>>;
  sandboxSnapshot: SandboxSnapshot | null;
  setSandboxSnapshot: React.Dispatch<
    React.SetStateAction<SandboxSnapshot | null>
  >;
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  outputs: OutputCard[];
  setOutputs: React.Dispatch<React.SetStateAction<OutputCard[]>>;
}

export function AgentRunPanel({
  onAutoOpenFile,
  onFileRunning,
  logs,
  setLogs,
  sandboxActive: _sandboxActive,
  setSandboxActive,
  sandboxSnapshot: _sandboxSnapshot,
  setSandboxSnapshot,
  previewUrl: _previewUrl,
  setPreviewUrl,
  outputs,
  setOutputs,
}: Props) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [runState, setRunState] = useState<RunState>("idle");
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [prims, setPrims] = useState(INITIAL_PRIMS);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [error, setError] = useState<string | null>(null);
  const [runSessionId, setRunSessionId] = useState<string | null>(null);
  // Fluid Compute meter — tracks elapsed wall time and estimated active CPU.
  // A burst of events within 200ms counts as ~"active"; longer gaps are I/O
  // wait on the model (the part Fluid does not bill).
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeMs, setActiveMs] = useState(0);
  const runStartRef = useRef<number | null>(null);
  const lastEventAtRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  void logs;
  void _sandboxActive;
  void _sandboxSnapshot;
  void _previewUrl;
  void outputs;

  function reset() {
    setLogs([]);
    setSteps(INITIAL_STEPS);
    setPrims(INITIAL_PRIMS);
    setStats(INITIAL_STATS);
    setOutputs([]);
    setError(null);
    setRunSessionId(null);
    setPreviewUrl(null);
    setSandboxActive(false);
    setSandboxSnapshot(null);
    setElapsedMs(0);
    setActiveMs(0);
    runStartRef.current = null;
    lastEventAtRef.current = null;
  }

  // Tick the wall-clock elapsed counter while a run is in flight, so the
  // Fluid Compute meter shows live I/O wait accumulating in real time.
  useEffect(() => {
    if (runState !== "running") return;
    const id = setInterval(() => {
      if (runStartRef.current) {
        setElapsedMs(Date.now() - runStartRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  }, [runState]);

  // Bump the "active CPU" estimate each time we actually process an event.
  // Long gaps (model thinking) don't contribute; only the work-per-event does.
  function recordEventActivity() {
    if (!runStartRef.current) return;
    setActiveMs((prev) => prev + 80);
  }

  async function startRun() {
    reset();
    setRunState("running");
    runStartRef.current = Date.now();
    lastEventAtRef.current = Date.now();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // 1) Start a durable Eve session.
      const startRes = await fetch("/eve/v1/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
        signal: ac.signal,
      });
      if (!startRes.ok) {
        throw new Error(
          `eve session create failed: ${startRes.status} ${await startRes.text().catch(() => "")}`,
        );
      }
      const sessionId =
        startRes.headers.get("x-eve-session-id") ??
        ((await startRes
          .clone()
          .json()
          .catch(() => ({}))) as { sessionId?: string }).sessionId;
      if (!sessionId) throw new Error("no x-eve-session-id returned");

      setRunSessionId(sessionId);

      // 2) Attach to the durable stream, reconnecting on premature close
      //    (Vercel functions may cut a long stream; the session itself is
      //    durable so we just re-attach with ?startIndex=<eventsSeen>).
      const adapter = createAdapter({ sessionId });
      let finished = false;
      const MAX_RECONNECTS = 8;
      let reconnects = 0;

      while (!finished) {
        const url = `/eve/v1/session/${sessionId}/stream${
          adapter.state.eventCount > 0
            ? `?startIndex=${adapter.state.eventCount}`
            : ""
        }`;
        const streamRes = await fetch(url, { signal: ac.signal });
        if (!streamRes.ok || !streamRes.body) {
          throw new Error(`eve stream attach failed: ${streamRes.status}`);
        }

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedAny = false;

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          receivedAny = true;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            let parsed: unknown;
            try {
              parsed = JSON.parse(line);
            } catch {
              continue;
            }
            recordEventActivity();
            for (const ev of adapter.handle(parsed)) {
              applyEvent(ev);
              if (ev.type === "done") finished = true;
            }
          }
        }

        if (finished) break;
        if (reconnects >= MAX_RECONNECTS) {
          setError(
            `stream closed after ${reconnects} reconnects without session.completed`,
          );
          break;
        }
        reconnects += 1;
        setLogs((prev) => [
          ...prev,
          {
            ts: hhmmss(adapter.state.start),
            tag: "workflow",
            msg: `<span class="warn">stream cut — reconnecting at event ${adapter.state.eventCount}</span>`,
          },
        ]);
        if (!receivedAny) await new Promise((r) => setTimeout(r, 800));
      }
      setRunState("done");
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        setRunState("idle");
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setRunState("done");
      }
    } finally {
      abortRef.current = null;
    }
  }

  function hhmmss(start: number): string {
    const sec = Math.floor((Date.now() - start) / 1000);
    return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }

  function applyEvent(evt: RunEvent) {
    switch (evt.type) {
      case "log":
        setLogs((prev) => [
          ...prev,
          { ts: evt.ts, tag: evt.tag, msg: evt.msg },
        ]);
        return;
      case "step":
        setSteps((prev) => ({ ...prev, [evt.step]: evt.state }));
        return;
      case "primitive":
        setPrims((prev) => ({ ...prev, [evt.id]: evt.state }));
        if (evt.stat !== undefined) {
          setStats((prev) => ({ ...prev, [evt.id]: evt.stat! }));
        }
        return;
      case "file-open":
        onAutoOpenFile(evt.file);
        return;
      case "file-running":
        onFileRunning(evt.file);
        return;
      case "sandbox-start":
        setSandboxActive(true);
        setSandboxSnapshot(null);
        return;
      case "sandbox-result":
        setSandboxSnapshot(evt.snapshot);
        return;
      case "output":
        setOutputs((prev) => [...prev, evt.output]);
        // Capture the v0 preview URL for the embedded iframe.
        if (evt.output.label?.toLowerCase().includes("preview") && evt.output.href) {
          setPreviewUrl(evt.output.href);
        }
        return;
      case "error":
        setError(evt.msg);
        return;
      case "done":
        return;
    }
  }

  const running = runState === "running";

  return (
    <aside
      style={{
        width: 380,
        flexShrink: 0,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* Prompt area (fixed top) */}
      <div style={{ padding: 14, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: 1,
            color: "var(--text3)",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Agent prompt
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={running}
          style={{
            width: "100%",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
          }}
        />
        <button
          onClick={startRun}
          disabled={running}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            background: running ? "var(--surface2)" : "var(--workflow)",
            color: running ? "var(--text2)" : "var(--text)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: running ? "default" : "pointer",
            transition: "background 150ms ease",
          }}
        >
          {running ? (
            <>
              <Loader2 size={13} className="animate-spin" /> running…
            </>
          ) : (
            <>
              <Play size={12} /> Run agent
            </>
          )}
        </button>
      </div>

      {/* Scrollable middle — everything from the workflow badge through the
          drafts. Lets the sandbox terminal and v0 iframe coexist without
          getting clipped on shorter viewports. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>

      {/* Workflow run badge — concretely shows it's a Vercel Workflow run */}
      {runSessionId && (
        <div
          style={{
            padding: "8px 14px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(99,102,241,0.06)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--workflow)" }}>▲</span>
          <span style={{ color: "var(--text3)" }}>vercel workflow run</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={runSessionId}
          >
            {runSessionId}
          </span>
        </div>
      )}

      {/* Primitives + steps + fluid compute */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <PrimitivesGrid states={prims} stats={stats} />
        <FluidMeter
          elapsedMs={elapsedMs}
          activeMs={activeMs}
          running={runState === "running"}
        />
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1,
              color: "var(--text3)",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Workflow
          </div>
          <WorkflowSteps states={steps} />
        </div>
      </div>

      </div>{/* end scrollable middle */}

      {/* Error banner — only shown when something actually fails. */}
      {error && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(239,68,68,0.12)",
            color: "var(--danger)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            borderTop: "1px solid var(--border)",
            wordBreak: "break-word",
            flexShrink: 0,
          }}
        >
          error: {error}
        </div>
      )}
    </aside>
  );
}
