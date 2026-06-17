"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { PrimitivesGrid } from "./PrimitivesGrid";
import { WorkflowSteps } from "./WorkflowSteps";
import { FluidMeter } from "./FluidMeter";
import { GatewayMeter } from "./GatewayMeter";
import { useRun } from "./RunProvider";

const DEFAULT_PROMPT = "anthropic.com";

const MODELS = [
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    note: "Best for nuanced voice matching",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    note: "Cheaper, fast, 2M context",
  },
  {
    id: "openai/gpt-5",
    label: "GPT-5",
    provider: "openai",
    note: "Strong all-around",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    note: "Cheapest, fastest",
  },
];

interface AgentRunPanelProps {
  width: number;
  onWidthChange: (w: number) => void;
}

const MIN_WIDTH = 340;
const MAX_WIDTH = 720;

export function AgentRunPanel({ width, onWidthChange }: AgentRunPanelProps) {
  const run = useRun();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [model, setModel] = useState(MODELS[0].id);
  const running = run.runState === "running";

  // Drag-to-resize the panel from its left edge.
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = drag.startX - e.clientX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, drag.startW + dx));
      onWidthChange(next);
    },
    [onWidthChange],
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove]);

  function onResizeStart(e: React.MouseEvent) {
    dragRef.current = { startX: e.clientX, startW: width };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  function handleRun() {
    // Strip any existing directive the user typed manually, then prepend the
    // selected model so the agent's instructions can route to it.
    const cleaned = prompt.replace(/^\s*\[model:\s*[^\]]+\]\s*/, "").trim();
    const wrapped = `[model: ${model}] ${cleaned}`;
    run.startRun(wrapped);
  }

  return (
    <aside
      style={{
        width,
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
      {/* Drag handle for resizing the panel. 6px wide on the left edge. */}
      <div
        onMouseDown={onResizeStart}
        title="drag to resize"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: "ew-resize",
          zIndex: 3,
        }}
      />
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
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
          Agent prompt — paste a company URL
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
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
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "stretch",
            gap: 6,
          }}
        >
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={running}
            style={{
              flex: "0 0 140px",
              padding: "8px 6px 8px 10px",
              background: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              outline: "none",
              cursor: running ? "default" : "pointer",
              appearance: "none",
            }}
            title={MODELS.find((m) => m.id === model)?.note ?? ""}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              flex: 1,
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
                <Play size={12} /> Run
              </>
            )}
          </button>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text3)",
            lineHeight: 1.4,
          }}
        >
          {MODELS.find((m) => m.id === model)?.note} · same agent, swap
          providers via{" "}
          <a
            href="https://vercel.com/ai-gateway"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--gateway)", textDecoration: "none" }}
          >
            AI Gateway
          </a>
        </div>
      </div>

      {run.runSessionId && (
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
              flex: 1,
              minWidth: 0,
            }}
            title={run.runSessionId}
          >
            {run.runSessionId}
          </span>
          <a
            href="https://vercel.com/v0-gtm-team/sam-eve-primitives/observability"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "var(--workflow)",
              textDecoration: "none",
              fontSize: 10,
              flexShrink: 0,
            }}
          >
            observability ↗
          </a>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div
          style={{
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <PrimitivesGrid states={run.prims} stats={run.primStats} />
          <GatewayMeter
            modelId={run.modelId}
            calls={run.gatewayCalls}
            running={running}
            currentTool={
              run.runningFile
                ? run.runningFile.replace(/\.ts$/, "")
                : null
            }
          />
          <FluidMeter
            elapsedMs={run.elapsedMs}
            activeMs={run.activeMs}
            running={running}
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
            <WorkflowSteps
            states={run.steps}
            retries={run.stepRetries}
            streamCuts={run.streamCuts}
          />
          </div>
        </div>
      </div>

      {run.error && (
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
          error: {run.error}
        </div>
      )}
    </aside>
  );
}
