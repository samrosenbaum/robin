"use client";

import { useEffect, useRef, useState } from "react";
import type { SandboxSnapshot } from "@/lib/types";

type Phase = "idle" | "booting" | "mounting" | "writing" | "running" | "done";

interface Props {
  // Goes from "idle" → "booting" when build_landing_page starts, then animates
  // through phases. Snaps to "done" with real data once the result arrives.
  active: boolean;
  snapshot: SandboxSnapshot | null;
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  booting: "booting microVM (firecracker, node22)",
  mounting: "mounting /workspace",
  writing: "writing v0-generated files to /workspace/v0-out/",
  running: "running wc -l",
  done: "sandbox destroyed",
};

const PHASE_ORDER: Phase[] = ["booting", "mounting", "writing", "running"];

export function SandboxTerminal({ active, snapshot }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const startedRef = useRef(false);

  // Drive the boot animation when active flips true.
  useEffect(() => {
    if (!active) {
      setPhase("idle");
      setLines([]);
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let i = 0;

    function next() {
      if (cancelled) return;
      if (i >= PHASE_ORDER.length) return;
      const p = PHASE_ORDER[i++];
      setPhase(p);
      setLines((prev) => [
        ...prev,
        `● ${PHASE_LABELS[p]}`,
      ]);
      // Pace each phase about 4-6s so the prospect can read it.
      const delay = p === "writing" ? 6000 : p === "running" ? 5000 : 4000;
      setTimeout(next, delay);
    }
    next();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // When the real snapshot arrives, replay the actual data.
  useEffect(() => {
    if (!snapshot) return;
    setPhase("done");
    setLines([
      `● booting microVM (firecracker, node22)`,
      `  sandbox id: ${snapshot.id}`,
      `● mounting /workspace`,
      `● writing ${snapshot.files.length} files to /workspace/v0-out/`,
      ...snapshot.files.slice(0, 5).map((f) => `    + v0-out/${f}`),
      ...(snapshot.files.length > 5
        ? [`    … and ${snapshot.files.length - 5} more`]
        : []),
      `$ ${snapshot.command}`,
      `  ${snapshot.stdout || "(no output)"}`,
      `✓ exit 0 · ${(snapshot.elapsedMs / 1000).toFixed(1)}s`,
      `● sandbox destroyed`,
    ]);
  }, [snapshot]);

  if (!active && !snapshot) return null;

  const headerLabel = snapshot
    ? `sandbox · ${snapshot.id.slice(0, 18)}…`
    : `sandbox · booting`;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "#0a0a0a",
        overflow: "hidden",
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "rgba(245,158,11,0.10)",
          borderBottom: "1px solid var(--border)",
          fontSize: 10,
          letterSpacing: 0.8,
          color: "var(--text2)",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--sandbox)",
            boxShadow: phase !== "done" ? "0 0 6px var(--sandbox)" : "none",
            animation:
              phase !== "done" && phase !== "idle"
                ? "pulse 1.2s ease-in-out infinite"
                : undefined,
          }}
        />
        <span style={{ flex: 1 }}>{headerLabel}</span>
        {snapshot ? (
          <span style={{ color: "var(--text3)" }}>
            {(snapshot.elapsedMs / 1000).toFixed(1)}s · {snapshot.totalLines} lines
          </span>
        ) : (
          <span style={{ color: "var(--sandbox)" }}>running…</span>
        )}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "10px 12px",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          lineHeight: 1.6,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 220,
          overflowY: "auto",
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: "var(--text3)" }}>starting…</span>
        ) : (
          lines.map((l, i) => {
            const isCommand = l.startsWith("$ ");
            const isOk = l.startsWith("✓");
            const isFile = l.startsWith("    +") || l.startsWith("    …");
            return (
              <div
                key={i}
                style={{
                  color: isCommand
                    ? "var(--sandbox)"
                    : isOk
                      ? "var(--success)"
                      : isFile
                        ? "var(--text2)"
                        : "var(--text)",
                  animation: "fade-in 200ms ease",
                }}
              >
                {l}
              </div>
            );
          })
        )}
      </pre>
    </div>
  );
}
