"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, Code2 } from "lucide-react";
import { TopBar } from "./TopBar";
import { FileTree } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { AgentRunPanel } from "./AgentRunPanel";
import { LogStream } from "./LogStream";
import { VisualsPanel } from "./VisualsPanel";
import { useRun, useFileOpenListener } from "./RunProvider";

type CenterView = "visuals" | "code";

export function DemoApp() {
  const run = useRun();
  const [openFiles, setOpenFiles] = useState<string[]>(["agent.ts"]);
  const [activeFile, setActiveFile] = useState<string>("agent.ts");
  const [centerView, setCenterView] = useState<CenterView>("visuals");

  const openFile = useCallback((filename: string) => {
    setOpenFiles((prev) =>
      prev.includes(filename) ? prev : [...prev, filename],
    );
    setActiveFile(filename);
  }, []);

  // Pull `file-open` events from the global run provider so the file
  // viewer auto-tracks the running tool, even after navigating away and
  // back to the demo route.
  useFileOpenListener(openFile);

  // Lock the viewport only on the demo route — marketing pages scroll.
  useEffect(() => {
    document.body.classList.add("demo-locked");
    return () => {
      document.body.classList.remove("demo-locked");
    };
  }, []);

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
          runningFile={run.runningFile}
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
          <CenterHeader view={centerView} onChange={setCenterView} />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {centerView === "visuals" ? (
              <VisualsPanel
                sandboxActive={run.sandboxActive}
                sandboxSnapshot={run.sandboxSnapshot}
                previewUrl={run.previewUrl}
                outputs={run.outputs}
              />
            ) : (
              <FileViewer
                openFiles={openFiles}
                activeFile={activeFile}
                onTabClick={setActiveFile}
                onTabClose={closeFile}
              />
            )}
          </div>
          <LogDrawer />
        </div>
        <AgentRunPanel />
      </div>
    </div>
  );
}

function CenterHeader({
  view,
  onChange,
}: {
  view: CenterView;
  onChange: (v: CenterView) => void;
}) {
  return (
    <div
      style={{
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        padding: "0 8px",
      }}
    >
      <ViewTab
        active={view === "visuals"}
        onClick={() => onChange("visuals")}
        icon={<Eye size={12} />}
        label="Visuals"
      />
      <ViewTab
        active={view === "code"}
        onClick={() => onChange("code")}
        icon={<Code2 size={12} />}
        label="Code"
      />
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0 14px",
        color: active ? "var(--text)" : "var(--text3)",
        borderBottom: active
          ? "2px solid var(--workflow)"
          : "2px solid transparent",
        background: active ? "var(--bg)" : "transparent",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const MIN_DRAWER_H = 60;
const COLLAPSED_DRAWER_H = 32;

function LogDrawer() {
  const run = useRun();
  const entries = run.logs;
  const [expanded, setExpanded] = useState(true);
  const [height, setHeight] = useState(() =>
    typeof window === "undefined"
      ? 400
      : Math.round(window.innerHeight * 0.45),
  );
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dy = drag.startY - e.clientY;
    const next = Math.max(
      MIN_DRAWER_H,
      Math.min(window.innerHeight - 200, drag.startH + dy),
    );
    setHeight(next);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove]);

  function onMouseDown(e: React.MouseEvent) {
    if (!expanded) return;
    dragRef.current = { startY: e.clientY, startH: height };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        height: expanded ? height : COLLAPSED_DRAWER_H,
        transition: dragRef.current ? "none" : "height 200ms ease",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {expanded && (
        <div
          onMouseDown={onMouseDown}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            cursor: "ns-resize",
            zIndex: 2,
          }}
          title="drag to resize"
        />
      )}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          height: COLLAPSED_DRAWER_H,
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
            {expanded && (
              <span style={{ marginLeft: 12, color: "var(--text3)" }}>
                · drag top edge to resize
              </span>
            )}
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
