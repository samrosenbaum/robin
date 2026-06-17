"use client";

interface Props {
  activeFile: string;
  onFileOpen: (filename: string) => void;
}

export function FileTree({ activeFile }: Props) {
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--text2)",
        padding: 12,
      }}
    >
      <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 8 }}>
        EXPLORER
      </div>
      <div style={{ color: "var(--text3)" }}>active: {activeFile}</div>
      <div style={{ color: "var(--text3)", marginTop: 16 }}>
        (tree — step 5)
      </div>
    </aside>
  );
}
