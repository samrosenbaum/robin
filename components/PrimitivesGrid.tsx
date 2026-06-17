"use client";

import type { PrimitiveId, PrimitiveState } from "@/lib/types";

interface PrimitiveDef {
  id: PrimitiveId;
  name: string;
  color: string;
  statLabel: string;
}

const PRIMITIVES: PrimitiveDef[] = [
  { id: "workflow", name: "Workflow", color: "var(--workflow)", statLabel: "state" },
  { id: "sandbox", name: "Sandbox", color: "var(--sandbox)", statLabel: "exec" },
  { id: "gateway", name: "AI Gateway", color: "var(--gateway)", statLabel: "model" },
  { id: "connect", name: "Connect", color: "var(--connect)", statLabel: "tokens" },
];

interface Props {
  states: Record<PrimitiveId, PrimitiveState>;
  stats: Record<PrimitiveId, string>;
}

export function PrimitivesGrid({ states, stats }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
      {PRIMITIVES.map((p) => {
        const isActive = states[p.id] === "active";
        return (
          <div
            key={p.id}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              boxShadow: isActive
                ? `0 0 0 1px ${p.color}, 0 0 14px -4px ${p.color}`
                : "none",
              opacity: isActive ? 1 : 0.55,
              transition:
                "opacity 200ms ease, box-shadow 200ms ease, transform 200ms ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: p.color,
                  boxShadow: isActive ? `0 0 6px ${p.color}` : "none",
                  animation: isActive ? "pulse 1.5s ease-in-out infinite" : undefined,
                }}
              />
              {p.name}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text3)",
                letterSpacing: 0.3,
              }}
            >
              {p.statLabel}
            </div>
            <div
              style={{
                marginTop: 2,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={stats[p.id]}
            >
              {stats[p.id] || "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
