"use client";

interface Props {
  // Wall-clock elapsed since run started (ms). 0 when idle.
  elapsedMs: number;
  // Estimated active CPU time (ms) — the part Fluid actually bills for.
  activeMs: number;
  // True while a run is in flight.
  running: boolean;
}

// Approximate per-CPU-second rates for a 1 vCPU function. Numbers are
// rounded for demo clarity; real prices vary by region/plan.
//
// AWS Lambda: $0.0000166667 per GB-second of *full duration*. For a
//   1 GB allocation that's ~$0.00001667/s. Lambda bills idle wait time.
// Vercel Functions on Fluid: ~$0.128 per *active* vCPU-hour (~$0.0000356/s).
//   Fluid bills only CPU work, not wait time.
const RATE_LAMBDA_PER_SEC = 0.00001667;
const RATE_FLUID_PER_SEC = 0.00003556;

function lambdaCost(elapsedMs: number): number {
  return (elapsedMs / 1000) * RATE_LAMBDA_PER_SEC;
}
function fluidCost(activeMs: number): number {
  return (activeMs / 1000) * RATE_FLUID_PER_SEC;
}

function fmt(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  if (n >= 0.001) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(5)}`;
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

      {elapsedMs === 0 ? (
        <div
          style={{
            position: "relative",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--text3)",
            lineHeight: 1.5,
          }}
        >
          active CPU is billed; idle time is free
        </div>
      ) : (
        <Savings elapsedMs={elapsedMs} activeMs={activeMs} ratio={ratio} />
      )}
    </div>
  );
}

function Savings({
  elapsedMs,
  activeMs,
  ratio,
}: {
  elapsedMs: number;
  activeMs: number;
  ratio: number;
}) {
  const lambda = lambdaCost(elapsedMs);
  const fluid = fluidCost(activeMs);
  const saved = Math.max(0, lambda - fluid);
  const pctSaved =
    lambda > 0 ? Math.round((saved / lambda) * 100) : 0;
  // Monthly projection at a modest 1,000 runs/day for the same profile.
  const monthlyLambda = lambda * 1000 * 30;
  const monthlyFluid = fluid * 1000 * 30;
  const monthlySaved = Math.max(0, monthlyLambda - monthlyFluid);

  return (
    <div
      style={{
        position: "relative",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--text3)",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <CostCell
          label="this run on Lambda"
          value={fmt(lambda)}
          sub={`${(elapsedMs / 1000).toFixed(1)}s × all-duration billing`}
          dim
        />
        <CostCell
          label="this run on Fluid"
          value={fmt(fluid)}
          sub={`${(activeMs / 1000).toFixed(2)}s × active CPU only`}
          color="var(--workflow)"
          highlighted
        />
      </div>
      <div
        style={{
          padding: "6px 8px",
          borderRadius: 4,
          background: "rgba(99,102,241,0.10)",
          color: "var(--text)",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        save{" "}
        <span style={{ color: "var(--workflow)", fontWeight: 500 }}>
          {fmt(saved)} ({pctSaved}%)
        </span>{" "}
        per run
        <span style={{ color: "var(--text3)" }}>
          {" "}
          · at 1k runs/day →{" "}
          <span style={{ color: "var(--text)" }}>
            {fmt(monthlySaved)}/mo saved
          </span>
        </span>
      </div>
      <div
        style={{
          marginTop: 6,
          color: "var(--text3)",
          fontSize: 10,
        }}
      >
        {ratio}% of wall time was I/O wait on the model — not billable on
        Vercel
      </div>
    </div>
  );
}

function CostCell({
  label,
  value,
  sub,
  color,
  highlighted,
  dim,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  highlighted?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      style={{
        padding: "6px 8px",
        borderRadius: 4,
        background: highlighted ? "var(--bg)" : "transparent",
        border: highlighted
          ? "1px solid rgba(99,102,241,0.30)"
          : "1px solid var(--border)",
        opacity: dim ? 0.7 : 1,
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: color ?? "var(--text)",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            marginTop: 2,
            color: "var(--text3)",
            fontSize: 9.5,
          }}
        >
          {sub}
        </div>
      )}
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
