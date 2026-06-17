"use client";

import { useState } from "react";
import { ChevronRight, File as FileIcon } from "lucide-react";
import type { TreeNode } from "@/lib/types";

const TREE: TreeNode[] = [
  { type: "file", name: "agent.ts", depth: 0, badge: "M" },
  { type: "folder", name: "agent/", depth: 0, id: "agent" },
  { type: "folder", name: "instructions/", depth: 1, id: "instructions" },
  { type: "file", name: "system.md", depth: 2, badge: "active" },
  { type: "folder", name: "channels/", depth: 1, id: "channels" },
  { type: "file", name: "slack.ts", depth: 2 },
  { type: "file", name: "linear.ts", depth: 2 },
  { type: "folder", name: "tools/", depth: 1, id: "tools" },
  { type: "file", name: "research.ts", depth: 2 },
  { type: "file", name: "copywriter.ts", depth: 2 },
  { type: "file", name: "v0-builder.ts", depth: 2, badge: "new" },
  { type: "folder", name: "sandbox/", depth: 1, id: "sandbox-folder" },
  { type: "file", name: "sandbox.ts", depth: 2 },
  { type: "folder", name: "workspace/", depth: 2, id: "workspace" },
  { type: "folder", name: "semantic-layer/", depth: 3, id: "semantic-layer" },
  { type: "file", name: "catalog.yml", depth: 4, badge: "M" },
  { type: "folder", name: "config/", depth: 0, id: "config" },
  { type: "file", name: "gateway.json", depth: 1 },
  { type: "file", name: "connect.json", depth: 1 },
  { type: "file", name: "workflow.json", depth: 1 },
  { type: "folder", name: "app/", depth: 0, id: "app" },
  { type: "file", name: "page.tsx", depth: 1 },
  { type: "folder", name: "components/", depth: 1, id: "components" },
  { type: "file", name: "vercel.json", depth: 0 },
];

const ALL_FOLDER_IDS = TREE.filter((n) => n.type === "folder").map(
  (n) => n.id!,
);

interface Props {
  activeFile: string;
  runningFile?: string | null;
  onFileOpen: (filename: string) => void;
}

export function FileTree({ activeFile, runningFile, onFileOpen }: Props) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(ALL_FOLDER_IDS),
  );

  function toggleFolder(id: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Determine which nodes are visible by walking depth, hiding everything
  // nested under any closed folder.
  const visible: TreeNode[] = [];
  let hideBelow: number | null = null;
  for (const node of TREE) {
    if (hideBelow !== null && node.depth > hideBelow) continue;
    hideBelow = null;
    visible.push(node);
    if (node.type === "folder" && !openFolders.has(node.id!)) {
      hideBelow = node.depth;
    }
  }

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
        padding: "10px 0",
        userSelect: "none",
      }}
    >
      <div
        style={{
          color: "var(--text3)",
          fontSize: 10,
          letterSpacing: 1,
          padding: "0 14px 8px",
          textTransform: "uppercase",
        }}
      >
        Explorer
      </div>

      {visible.map((node, i) => {
        const isFolder = node.type === "folder";
        const isOpen = isFolder && openFolders.has(node.id!);
        const isActive = !isFolder && node.name === activeFile;
        const isRunning = !isFolder && node.name === runningFile;

        return (
          <button
            key={`${node.name}-${i}`}
            onClick={() =>
              isFolder ? toggleFolder(node.id!) : onFileOpen(node.name)
            }
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px 3px 0",
              paddingLeft: 8 + node.depth * 14,
              textAlign: "left",
              color: isRunning
                ? "var(--text)"
                : isActive
                  ? "var(--text)"
                  : "var(--text2)",
              background: isRunning
                ? "rgba(34,197,94,0.10)"
                : isActive
                  ? "rgba(99,102,241,0.08)"
                  : "transparent",
              borderLeft: isRunning
                ? "2px solid var(--success)"
                : isActive
                  ? "2px solid var(--workflow)"
                  : "2px solid transparent",
              transition: "background 120ms ease, color 120ms ease",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
            onMouseEnter={(e) => {
              if (!isActive && !isRunning)
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={(e) => {
              if (!isActive && !isRunning)
                e.currentTarget.style.background = "transparent";
            }}
          >
            {isFolder ? (
              <ChevronRight
                size={12}
                style={{
                  flexShrink: 0,
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 120ms ease",
                  color: "var(--text3)",
                }}
              />
            ) : (
              <FileIcon
                size={11}
                style={{
                  flexShrink: 0,
                  color: "var(--text3)",
                  marginLeft: 2,
                }}
              />
            )}
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {node.name}
              {isRunning && (
                <span
                  aria-label="running"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--success)",
                    boxShadow: "0 0 6px var(--success)",
                    animation: "pulse 1.2s ease-in-out infinite",
                    flexShrink: 0,
                  }}
                />
              )}
            </span>
            {node.badge && <Badge kind={node.badge} />}
          </button>
        );
      })}
    </aside>
  );
}

function Badge({ kind }: { kind: "M" | "active" | "new" }) {
  const styles: Record<typeof kind, { bg: string; fg: string; label: string }> =
    {
      M: {
        bg: "rgba(245,158,11,0.18)",
        fg: "var(--sandbox)",
        label: "M",
      },
      active: {
        bg: "rgba(34,197,94,0.18)",
        fg: "var(--success)",
        label: "active",
      },
      new: {
        bg: "rgba(99,102,241,0.18)",
        fg: "var(--workflow)",
        label: "new",
      },
    };
  const s = styles[kind];
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        background: s.bg,
        color: s.fg,
        padding: "1px 5px",
        borderRadius: 3,
        flexShrink: 0,
      }}
    >
      {s.label}
    </span>
  );
}
