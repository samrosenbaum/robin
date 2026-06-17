"use client";

import { useEffect, useRef } from "react";
import type { LogEntry, LogTag } from "@/lib/types";

interface Props {
  entries: LogEntry[];
}

const TAG_STYLES: Record<LogTag, { bg: string; fg: string }> = {
  workflow: { bg: "rgba(99,102,241,0.15)", fg: "var(--workflow)" },
  sandbox: { bg: "rgba(245,158,11,0.15)", fg: "var(--sandbox)" },
  gateway: { bg: "rgba(16,185,129,0.15)", fg: "var(--gateway)" },
  connect: { bg: "rgba(59,130,246,0.15)", fg: "var(--connect)" },
  obs: { bg: "rgba(236,72,153,0.15)", fg: "var(--obs)" },
  v0: { bg: "rgba(168,85,247,0.15)", fg: "var(--v0)" },
  info: { bg: "rgba(161,161,170,0.12)", fg: "var(--text2)" },
};

// Wrap raw URLs and markdown links `[label](url)` in clickable anchors.
// The adapter already produces <span class="..."> tags that we keep
// untouched; we only mutate text content outside existing tags.
function linkify(html: string): string {
  // Replace markdown links first so the URL inside doesn't get double-linkified.
  let out = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer" class="loglink">${label}</a>`,
  );
  // Then any bare URL not already inside an href.
  out = out.replace(/(^|[^"=>])(https?:\/\/[^\s<)]+)/g, (_m, pre: string, url: string) => {
    return `${pre}<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer" class="loglink">${url}</a>`;
  });
  return out;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

export function LogStream({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflowY: "auto",
        padding: "10px 16px",
        background: "var(--bg)",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        lineHeight: 1.6,
      }}
    >
      {entries.length === 0 && (
        <div style={{ color: "var(--text3)", fontStyle: "italic" }}>
          waiting to run…
        </div>
      )}
      {entries.map((e, i) => {
        const s = TAG_STYLES[e.tag];
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "auto auto 1fr",
              gap: 8,
              padding: "1px 0",
              animation: "fade-in 160ms ease",
            }}
          >
            <span style={{ color: "var(--text3)" }}>{e.ts}</span>
            <span
              style={{
                padding: "0 5px",
                borderRadius: 3,
                background: s.bg,
                color: s.fg,
                fontSize: 9.5,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                height: 14,
                marginTop: 2,
              }}
            >
              {e.tag}
            </span>
            <span
              style={{ color: "var(--text2)", overflowWrap: "anywhere" }}
              dangerouslySetInnerHTML={{ __html: linkify(e.msg) }}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
