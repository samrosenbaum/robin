"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TopBar } from "./TopBar";
import { FileTree } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { AgentRunPanel } from "./AgentRunPanel";
import { LogStream } from "./LogStream";
import type { LogEntry } from "@/lib/types";

export function DemoApp() {
  const [openFiles, setOpenFiles] = useState<string[]>(["agent.ts"]);
  const [activeFile, setActiveFile] = useState<string>("agent.ts");
  const [runningFile, setRunningFile] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(true);

  function openFile(filename: string) {
    setOpenFiles((prev) =>
      prev.includes(filename) ? prev : [...prev, filename],
    );
    setActiveFile(filename);
  }

  function closeFile(filename: string) {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f !== filename);
      if (filename === activeFile && next.length > 0) {
        setActiveFile(next[next.length - 1]);
      }
      return next;
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <TopBar />
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <FileTree
          activeFile={activeFile}
          runningFile={runningFile}
          onFileOpen={openFile}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <FileViewer
            openFiles={openFiles}
            activeFile={activeFile}
            onTabClick={setActiveFile}
            onTabClose={closeFile}
          />
          {/* Full-width "agent activity" log drawer below the file viewer */}
          <LogDrawer
            entries={logs}
            expanded={logExpanded}
            onToggle={() => setLogExpanded((v) => !v)}
          />
        </div>
        <AgentRunPanel
          onAutoOpenFile={openFile}
          onFileRunning={setRunningFile}
          logs={logs}
          setLogs={setLogs}
        />
      </div>
    </div>
  );
}

function LogDrawer({
  entries,
  expanded,
  onToggle,
}: {
  entries: LogEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        height: expanded ? "45vh" : 30,
        transition: "height 200ms ease",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          height: 30,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          background: "var(--surface2)",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          color: "var(--text2)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        agent activity
        {entries.length > 0 && (
          <span
            style={{
              marginLeft: "auto",
              color: "var(--text3)",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {entries.length} events
          </span>
        )}
      </button>
      {expanded && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <LogStream entries={entries} />
        </div>
      )}
    </div>
  );
}
