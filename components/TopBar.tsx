"use client";

export function TopBar() {
  return (
    <header
      style={{
        height: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        fontSize: 13,
      }}
    >
      {/* ▲ Logo + project name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <polygon points="7,1 13,13 1,13" fill="var(--text)" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: 0.2,
            color: "var(--text)",
          }}
        >
          launch-intelligence
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* "Built with Eve" — clarifies Eve is the framework powering this app */}
      <a
        href="https://vercel.com/docs/eve"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--text2)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          textDecoration: "none",
        }}
      >
        <span style={{ color: "var(--text3)" }}>built with</span>
        <span style={{ color: "var(--text)" }}>eve</span>
        <span style={{ color: "var(--text3)" }}>↗</span>
      </a>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: "rgba(99, 102, 241, 0.15)",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          color: "var(--text)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--workflow)",
            boxShadow: "0 0 8px var(--workflow)",
          }}
        />
        deployed
      </div>
    </header>
  );
}
