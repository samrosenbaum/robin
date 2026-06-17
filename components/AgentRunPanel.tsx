"use client";

interface Props {
  onAutoOpenFile: (filename: string) => void;
}

export function AgentRunPanel({}: Props) {
  return (
    <aside
      style={{
        width: 380,
        flexShrink: 0,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: 16,
          color: "var(--text3)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        (agent run panel — step 7+)
      </div>
    </aside>
  );
}
