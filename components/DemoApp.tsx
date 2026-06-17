"use client";

import { useState } from "react";
import { TopBar } from "./TopBar";
import { FileTree } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { AgentRunPanel } from "./AgentRunPanel";

export function DemoApp() {
  // Open tabs in the file viewer. The active file is the one currently displayed.
  const [openFiles, setOpenFiles] = useState<string[]>(["agent.ts"]);
  const [activeFile, setActiveFile] = useState<string>("agent.ts");

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
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <FileTree
          activeFile={activeFile}
          onFileOpen={openFile}
        />
        <FileViewer
          openFiles={openFiles}
          activeFile={activeFile}
          onTabClick={setActiveFile}
          onTabClose={closeFile}
        />
        <AgentRunPanel onAutoOpenFile={openFile} />
      </div>
    </div>
  );
}
