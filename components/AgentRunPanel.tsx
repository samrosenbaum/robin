"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { PrimitivesGrid } from "./PrimitivesGrid";
import { WorkflowSteps } from "./WorkflowSteps";
import { FluidMeter } from "./FluidMeter";
import { GatewayMeter } from "./GatewayMeter";
import { useRun } from "./RunProvider";

const DEFAULT_PROMPT = "anthropic.com";

export function AgentRunPanel() {
  const run = useRun();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const running = run.runState === "running";

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
        <button
          onClick={() => run.startRun(prompt)}
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
            }}
            title={run.runSessionId}
          >
            {run.runSessionId}
          </span>
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
            <WorkflowSteps states={run.steps} />
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
