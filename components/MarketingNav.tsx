"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Demo" },
  { href: "/harness", label: "Harness" },
  { href: "/infrastructure", label: "Infrastructure" },
];

export function MarketingNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-sans)",
        position: compact ? "sticky" : "relative",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(8px)",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text)",
          textDecoration: "none",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <polygon points="7,1 13,13 1,13" fill="var(--text)" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text)",
          }}
        >
          launch-intelligence
        </span>
      </Link>

      <nav style={{ display: "flex", gap: 4, marginLeft: 12 }}>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: active ? "var(--text)" : "var(--text3)",
                background: active ? "var(--surface2)" : "transparent",
                textDecoration: "none",
                transition: "color 120ms ease, background 120ms ease",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <a
        href="https://vercel.com/blog/introducing-eve"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 999,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--text2)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          textDecoration: "none",
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
        built with eve ↗
      </a>
    </header>
  );
}
