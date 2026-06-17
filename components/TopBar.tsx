"use client";

export function TopBar() {
  const tabs = ["Explorer", "Agent Run", "Observability"] as const;

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
      {/* ▲ Logo */}
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
          eve
        </span>
      </div>

      <Separator />

      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text3)",
        }}
      >
        launch-intelligence
      </span>

      <Separator />

      <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {tabs.map((tab, i) => (
          <button
            key={tab}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 12,
              color: i === 0 ? "var(--text)" : "var(--text3)",
              background: i === 0 ? "var(--surface2)" : "transparent",
              border:
                i === 0
                  ? "1px solid var(--border)"
                  : "1px solid transparent",
              transition: "color 120ms ease, background 120ms ease",
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

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

function Separator() {
  return (
    <span
      style={{
        width: 1,
        height: 14,
        background: "var(--border)",
        display: "inline-block",
      }}
    />
  );
}
