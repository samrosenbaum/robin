"use client";

import { MarketingNav } from "./MarketingNav";

interface Props {
  children: React.ReactNode;
}

export function MarketingPage({ children }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MarketingNav compact />
      <main
        style={{
          flex: 1,
          padding: "48px 24px 96px",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>{children}</div>
      </main>
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text3)",
          textAlign: "center",
        }}
      >
        launch-intelligence · built on Vercel · composed with{" "}
        <a
          href="https://vercel.com/blog/introducing-eve"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--text2)" }}
        >
          eve
        </a>
      </footer>
    </div>
  );
}

// Reusable section block with optional number, title, kicker.
export function MarketingSection({
  number,
  kicker,
  title,
  children,
}: {
  number?: string;
  kicker?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 80 }}>
      {(number || kicker) && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--text3)",
            marginBottom: 12,
          }}
        >
          {number && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text2)",
              }}
            >
              {number}
            </span>
          )}
          {kicker && <span>{kicker}</span>}
        </div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: -0.4,
          color: "var(--text)",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: 20 }}>{children}</div>
    </section>
  );
}

export function Hero({
  kicker,
  title,
  subtitle,
  ctas,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  ctas?: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <header style={{ marginTop: 12 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          borderRadius: 999,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--text2)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--workflow)",
            boxShadow: "0 0 6px var(--workflow)",
          }}
        />
        {kicker}
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 56,
          fontWeight: 600,
          letterSpacing: -1,
          color: "var(--text)",
          lineHeight: 1.05,
          maxWidth: 880,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: "20px 0 0",
          fontSize: 18,
          lineHeight: 1.55,
          color: "var(--text2)",
          maxWidth: 720,
        }}
      >
        {subtitle}
      </p>
      {ctas && (
        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          {ctas.map((c, i) => (
            <a
              key={i}
              href={c.href}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                background: c.primary ? "var(--text)" : "var(--surface2)",
                color: c.primary ? "var(--bg)" : "var(--text)",
                border: "1px solid var(--border)",
                textDecoration: "none",
              }}
            >
              {c.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

export function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 8,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 22,
          color: "var(--text)",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 2,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text3)",
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function PrimitiveCard({
  name,
  color,
  description,
  detail,
}: {
  name: string;
  color: string;
  description: string;
  detail?: string;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 10,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${color}14 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text)",
          }}
        >
          {name}
        </span>
      </div>
      <p
        style={{
          position: "relative",
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--text2)",
        }}
      >
        {description}
      </p>
      {detail && (
        <p
          style={{
            position: "relative",
            margin: "8px 0 0",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--text3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
