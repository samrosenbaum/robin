"use client";

import { useEffect, useRef } from "react";
import type { GatewayCall } from "@/lib/types";

interface Props {
  modelId: string | null;
  calls: GatewayCall[];
  running: boolean;
  // The tool the agent is currently executing (from running-file). Used to
  // show "in flight" while the next gateway call is happening.
  currentTool: string | null;
}

// Approximate Anthropic public pricing for claude-sonnet-4.* models, via
// Vercel AI Gateway. Values per 1M tokens.
const PRICING: Record<string, { in: number; out: number; cacheRead: number }> = {
  "anthropic/claude-sonnet-4.6": { in: 3, out: 15, cacheRead: 0.3 },
  "anthropic/claude-sonnet-4-6": { in: 3, out: 15, cacheRead: 0.3 },
  "anthropic/claude-haiku-4-5": { in: 0.8, out: 4, cacheRead: 0.08 },
  default: { in: 3, out: 15, cacheRead: 0.3 },
};

function priceFor(modelId: string | null) {
  if (!modelId) return PRICING.default;
  return PRICING[modelId] ?? PRICING.default;
}

function costOf(call: GatewayCall, modelId: string | null): number {
  const p = priceFor(modelId);
  return (
    (call.inputTokens * p.in +
      call.outputTokens * p.out +
      (call.cacheReadTokens ?? 0) * p.cacheRead) /
    1_000_000
  );
}

export function GatewayMeter({ modelId, calls, running, currentTool }: Props) {
  const totalIn = calls.reduce((s, c) => s + c.inputTokens, 0);
  const totalOut = calls.reduce((s, c) => s + c.outputTokens, 0);
  const totalCache = calls.reduce(
    (s, c) => s + (c.cacheReadTokens ?? 0),
    0,
  );
  const totalCost = calls.reduce((s, c) => s + costOf(c, modelId), 0);

  const inFlight =
    running &&
    currentTool &&
    !calls.some((c) => c.toolName === currentTool);

  // Auto-scroll the calls list to the bottom as new ones come in.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [calls.length]);

  return (
    <div
      style={{
        position: "relative",
        padding: "12px 14px",
        borderRadius: 8,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
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
            background: "var(--gateway)",
            boxShadow: running ? "0 0 6px var(--gateway)" : "none",
            animation: inFlight ? "pulse 1.5s ease-in-out infinite" : undefined,
          }}
        />
        AI Gateway
        <a
          href="https://vercel.com/ai-gateway"
          target="_blank"
          rel="noreferrer"
          style={{
            marginLeft: "auto",
            color: "var(--text3)",
            textDecoration: "none",
            fontSize: 10,
          }}
        >
          docs ↗
        </a>
      </div>

      {modelId && (
        <div
          style={{
            position: "relative",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text2)",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--bg)",
              border: "1px solid rgba(16,185,129,0.30)",
              color: "var(--gateway)",
              fontSize: 10,
            }}
          >
            anthropic
          </span>
          <span style={{ color: "var(--text)" }}>{modelId.split("/").pop()}</span>
        </div>
      )}

      {inFlight && (
        <div
          style={{
            position: "relative",
            padding: "6px 8px",
            borderRadius: 4,
            background: "rgba(16,185,129,0.10)",
            color: "var(--gateway)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--gateway)",
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
          thinking · about to call{" "}
          <span style={{ color: "var(--text)" }}>{currentTool}</span>
        </div>
      )}

      {calls.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "relative",
            maxHeight: 140,
            overflowY: "auto",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "4px 0",
            marginBottom: 8,
          }}
        >
          {calls.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 8,
                padding: "3px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--text2)",
                lineHeight: 1.5,
                alignItems: "baseline",
              }}
            >
              <span style={{ color: "var(--text3)" }}>{c.ts}</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--text)",
                }}
              >
                step {c.stepIndex}
                {c.toolName ? ` · ${c.toolName}` : ""}
              </span>
              <span style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                {c.inputTokens.toLocaleString()}↓ {c.outputTokens.toLocaleString()}↑
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
        }}
      >
        <Stat label="calls" value={String(calls.length)} />
        <Stat
          label="tokens"
          value={(totalIn + totalOut).toLocaleString()}
        />
        <Stat
          label="cost"
          value={`$${totalCost.toFixed(4)}`}
          highlighted
        />
      </div>
      {totalCache > 0 && (
        <div
          style={{
            position: "relative",
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text3)",
          }}
        >
          + {totalCache.toLocaleString()} cache-read tokens (90% discount)
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        padding: "4px 6px",
        borderRadius: 4,
        background: highlighted ? "var(--bg)" : "transparent",
        border: highlighted
          ? "1px solid rgba(16,185,129,0.30)"
          : "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: 0.5,
          color: "var(--text3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 12,
          color: highlighted ? "var(--gateway)" : "var(--text2)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
