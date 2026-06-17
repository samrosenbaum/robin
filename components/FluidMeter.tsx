"use client";

interface Props {
  // Wall-clock elapsed since run started (ms). 0 when idle.
  elapsedMs: number;
  // Estimated active CPU time (ms) — the part Fluid actually bills for.
  activeMs: number;
  // True while a run is in flight.
  running: boolean;
}

export function FluidMeter({ elapsedMs, activeMs, running }: Props) {
  const waitMs = Math.max(0, elapsedMs - activeMs);
  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const activeSec = (activeMs / 1000).toFixed(2);
  const waitSec = (waitMs / 1000).toFixed(1);
  const ratio = elapsedMs > 0 ? Math.round((1 - activeMs / elapsedMs) * 100) : 0;

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
            "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
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
            background: "var(--workflow)",
            boxShadow: running ? "0 0 6px var(--workflow)" : "none",
            animation: running ? "pulse 1.5s ease-in-out infinite" : undefined,
          }}
        />
        Fluid Compute
        <a
          href="https://vercel.com/fluid"
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

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <Counter
          label="active cpu"
          value={`${activeSec}s`}
          color="var(--text)"
          highlighted
          hint="billed"
        />
        <Counter
          label="i/o wait"
          value={`${waitSec}s`}
          color="var(--text2)"
          hint="free"
        />
      </div>

      <div
        style={{
          position: "relative",
          height: 4,
          borderRadius: 999,
          background: "var(--border)",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: elapsedMs > 0 ? `${(activeMs / elapsedMs) * 100}%` : "0%",
            height: "100%",
            background: "var(--workflow)",
            transition: "width 200ms ease",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--text3)",
          lineHeight: 1.5,
        }}
      >
        {elapsedMs === 0
          ? "active CPU is billed; idle time is free"
          : `${ratio}% of wall time was I/O wait on the model — not billable on Vercel. Traditional serverless would charge for all ${elapsedSec}s.`}
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  color,
  highlighted,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  highlighted?: boolean;
  hint?: string;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        background: highlighted ? "var(--bg)" : "transparent",
        border: highlighted
          ? "1px solid rgba(99,102,241,0.30)"
          : "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "var(--text3)",
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {hint && (
          <span
            style={{
              color: highlighted ? "var(--workflow)" : "var(--text3)",
              letterSpacing: 0,
              textTransform: "none",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 17,
          color,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}
