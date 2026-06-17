"use client";

interface Props {
  openFiles: string[];
  activeFile: string;
  onTabClick: (file: string) => void;
  onTabClose: (file: string) => void;
}

export function FileViewer({ openFiles, activeFile }: Props) {
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
        }}
      >
        {openFiles.map((f) => (
          <div
            key={f}
            style={{
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              color: f === activeFile ? "var(--text)" : "var(--text3)",
              borderRight: "1px solid var(--border)",
              background:
                f === activeFile ? "var(--bg)" : "transparent",
            }}
          >
            {f}
          </div>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text3)",
        }}
      >
        (file viewer — step 6)
      </div>
    </main>
  );
}
