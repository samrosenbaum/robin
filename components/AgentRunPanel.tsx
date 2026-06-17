"use client";

import { useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import type {
  LogEntry,
  OutputCard,
  PrimitiveId,
  PrimitiveState,
  RunEvent,
  RunState,
  StepName,
  StepState,
} from "@/lib/types";
import { PrimitivesGrid } from "./PrimitivesGrid";
import { WorkflowSteps } from "./WorkflowSteps";
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
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

export function AgentRunPanel({ onAutoOpenFile, logs, setLogs }: Props) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [runState, setRunState] = useState<RunState>("idle");
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [prims, setPrims] = useState(INITIAL_PRIMS);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [outputs, setOutputs] = useState<OutputCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runSessionId, setRunSessionId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // logs count is what `useEffect` in LogStream needs to react to; keep
  // it locally referenced so the linter doesn't think `logs` is unused.
  void logs;

  function reset() {
    setLogs([]);
    setSteps(INITIAL_STEPS);
    setPrims(INITIAL_PRIMS);
    setStats(INITIAL_STATS);
    setOutputs([]);
    setError(null);
    setRunSessionId(null);
    setPreviewUrl(null);
  }

  async function startRun() {
    reset();
    setRunState("running");
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
      }}
    >
      {/* Prompt area */}
      <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
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

      {/* Primitives + steps */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <PrimitivesGrid states={prims} stats={stats} />
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

      {/* Live v0 preview — fills in once build_landing_page returns. */}
      {previewUrl && (
        <div style={{ padding: "0 14px 14px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1,
              color: "var(--text3)",
              marginBottom: 6,
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            v0 preview
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--v0)",
                textDecoration: "none",
                fontSize: 11,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              open ↗
            </a>
          </div>
          <iframe
            src={previewUrl}
            title="v0 preview"
            style={{
              width: "100%",
              height: 240,
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "white",
            }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      )}

      {/* Outputs + status footer — log stream rendered outside this panel
          (full-width bottom drawer in DemoApp). */}
      <div style={{ flex: 1, minHeight: 0 }} />
      <div style={{ padding: 12, fontFamily: "var(--font-mono)", fontSize: 11 }}>
        {error && (
          <div
            style={{
              padding: "6px 8px",
              borderRadius: 4,
              background: "rgba(239,68,68,0.12)",
              color: "var(--danger)",
              marginBottom: 8,
              wordBreak: "break-word",
            }}
          >
            error: {error}
          </div>
        )}
        {outputs.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {outputs.map((o, i) => (
              <a
                key={i}
                href={o.href ?? "#"}
                target={o.href ? "_blank" : undefined}
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  textDecoration: "none",
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: o.color,
                  }}
                />
                {o.label}
                <span style={{ color: "var(--text3)" }}>{o.icon}</span>
              </a>
            ))}
          </div>
        )}
        <div style={{ color: "var(--text3)" }}>
          {runState === "idle" && "demo controls"}
          {runState === "running" && "live run"}
          {runState === "done" && "run complete"}
        </div>
      </div>
    </aside>
  );
}
