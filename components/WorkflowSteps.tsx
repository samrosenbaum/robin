"use client";

import { Check, Zap, RotateCw } from "lucide-react";
import type { StepName, StepState } from "@/lib/types";

const STEPS: StepName[] = ["research", "tailor", "generate", "verify"];

interface Props {
  states: Record<StepName, StepState>;
  retries?: Record<StepName, number>;
  streamCuts?: { atEventCount: number; ts: string }[];
}

export function WorkflowSteps({ states, retries, streamCuts }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {STEPS.map((step, i) => {
        const state = states[step];
        const retryCount = retries?.[step] ?? 0;
        const isLast = i === STEPS.length - 1;
        return (
          <div
            key={step}
            style={{ display: "flex", alignItems: "stretch", gap: 10 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 16,
                flexShrink: 0,
              }}
            >
              <StepIcon state={state} retried={retryCount > 0} />
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    width: 1,
                    background:
                      state === "done"
                        ? "var(--success)"
                        : state === "running"
                          ? "var(--workflow)"
                          : "var(--border)",
                    minHeight: 14,
                    opacity: state === "pending" ? 0.4 : 1,
                  }}
                />
              )}
            </div>
            <div
              style={{
                padding: "1px 0 14px",
                color:
                  state === "running"
                    ? "var(--text)"
                    : state === "interrupted"
                      ? "var(--warning)"
                      : state === "done"
                        ? "var(--text2)"
                        : "var(--text3)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {step}
              {state === "running" && (
                <span style={{ color: "var(--text3)" }}>…running</span>
              )}
              {retryCount > 0 && (
                <span
                  title={`retried ${retryCount} time${retryCount > 1 ? "s" : ""}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: "rgba(245,158,11,0.15)",
                    color: "var(--warning)",
                    fontSize: 10,
                    letterSpacing: 0.3,
                  }}
                >
                  <RotateCw size={9} /> ×{retryCount}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {streamCuts && streamCuts.length > 0 && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.30)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--warning)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Zap size={11} />
          <span>
            {streamCuts.length} function {streamCuts.length === 1 ? "kill" : "kills"} survived
          </span>
          <span style={{ color: "var(--text3)", marginLeft: "auto" }}>
            Workflow resumed
          </span>
        </div>
      )}
    </div>
  );
}

function StepIcon({
  state,
  retried,
}: {
  state: StepState;
  retried?: boolean;
}) {
  const base = {
    width: 14,
    height: 14,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as const;
  if (state === "done") {
    return (
      <div
        style={{
          ...base,
          background: retried ? "var(--warning)" : "var(--success)",
        }}
      >
        {retried ? (
          <RotateCw size={8} strokeWidth={3} color="var(--bg)" />
        ) : (
          <Check size={9} strokeWidth={3} color="var(--bg)" />
        )}
      </div>
    );
  }
  if (state === "running") {
    return (
      <div
        style={{
          ...base,
          border: "1.5px solid var(--workflow)",
          borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
        }}
      />
    );
  }
  if (state === "interrupted") {
    return (
      <div style={{ ...base, background: "rgba(245,158,11,0.15)" }}>
        <Zap size={10} color="var(--warning)" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div
      style={{ ...base, border: "1.5px solid var(--border2)", opacity: 0.7 }}
    />
  );
}
