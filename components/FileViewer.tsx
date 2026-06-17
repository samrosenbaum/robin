"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { FILE_CONTENTS } from "@/lib/fileContents";
import { detectLang, highlightLine, tabAccent } from "@/lib/highlight";

interface Props {
  openFiles: string[];
  activeFile: string;
  onTabClick: (file: string) => void;
  onTabClose: (file: string) => void;
}

export function FileViewer({
  openFiles,
  activeFile,
  onTabClick,
  onTabClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the viewer to top whenever the active file changes (covers both
  // user clicks and agent-driven auto-switches).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeFile]);

  const content = FILE_CONTENTS[activeFile] ?? "";
  const lang = detectLang(activeFile);
  const lines = content.split("\n");

  return (
    <main
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          height: 36,
          display: "flex",
          alignItems: "stretch",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {openFiles.map((file) => {
          const isActive = file === activeFile;
          const accent = tabAccent(file);
          return (
            <div
              key={file}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabClick(file)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 12px",
                color: isActive ? "var(--text)" : "var(--text3)",
                background: isActive ? "var(--bg)" : "transparent",
                borderRight: "1px solid var(--border)",
                borderBottom: isActive
                  ? `2px solid ${accent}`
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "color 120ms ease, background 120ms ease",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: accent,
                  flexShrink: 0,
                }}
              />
              <span>{file}</span>
              {openFiles.length > 1 && (
                <button
                  aria-label={`close ${file}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(file);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    color: "var(--text3)",
                    opacity: isActive ? 0.8 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface2)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text3)";
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Code area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          lineHeight: 1.6,
          padding: "12px 0",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              padding: "0 16px",
              whiteSpace: "pre",
            }}
          >
            <span
              style={{
                color: "var(--text3)",
                userSelect: "none",
                width: 32,
                textAlign: "right",
                flexShrink: 0,
                opacity: 0.7,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1 }}>
              {highlightLine(line, lang).map((tok, j) => (
                <span key={j} style={{ color: tok.color }}>
                  {tok.text}
                </span>
              ))}
            </span>
          </div>
        ))}
        {lines.length === 0 && (
          <div style={{ padding: 16, color: "var(--text3)" }}>
            (no content)
          </div>
        )}
      </div>
    </main>
  );
}
