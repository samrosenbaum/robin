"use client";

import { Check, Zap } from "lucide-react";
import type { StepName, StepState } from "@/lib/types";

const STEPS: StepName[] = ["research", "copy", "v0 build", "outreach"];

interface Props {
  states: Record<StepName, StepState>;
}

export function WorkflowSteps({ states }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {STEPS.map((step, i) => {
        const state = states[step];
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
              <StepIcon state={state} />
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
              }}
            >
              {step}
              {state === "running" && (
                <span style={{ color: "var(--text3)", marginLeft: 8 }}>
                  …running
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
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
      <div style={{ ...base, background: "var(--success)" }}>
        <Check size={9} strokeWidth={3} color="var(--bg)" />
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
